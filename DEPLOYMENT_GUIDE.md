# Guia de Deploy - DPO Fast

## Visão Geral
Este guia fornece instruções completas para deploy do sistema DPO Fast com funcionalidade de to-do lists integrada.

## Pré-requisitos

### Sistema
- Node.js 18+ 
- PostgreSQL 13+
- Redis (para sessões - opcional)
- 2GB RAM mínimo
- 10GB espaço em disco

### Variáveis de Ambiente Obrigatórias

```bash
# Banco de Dados
DATABASE_URL="postgresql://user:password@localhost:5432/dpofast"

# Autenticação Replit
REPLIT_CLIENT_ID="seu_client_id"
REPLIT_CLIENT_SECRET="seu_client_secret"

# Stripe (Pagamentos)
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."

# Sessão
SESSION_SECRET="sua_chave_secreta_forte"

# Ambiente
NODE_ENV="production"
PORT="5000"
```

## Preparação do Ambiente

### 1. Configuração do Banco de Dados

```sql
-- Criar database
CREATE DATABASE dpofast;

-- Criar usuário específico
CREATE USER dpofast_user WITH PASSWORD 'senha_forte';
GRANT ALL PRIVILEGES ON DATABASE dpofast TO dpofast_user;

-- Conectar ao database
\c dpofast;

-- Configurar permissões
GRANT ALL ON SCHEMA public TO dpofast_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO dpofast_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO dpofast_user;
```

### 2. Configuração de Arquivos

```bash
# Clone do repositório
git clone [REPO_URL]
cd dpo-fast

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas configurações
```

### 3. Migrações do Banco

```bash
# Gerar e aplicar migrações
npm run db:push

# Verificar estrutura
npm run db:studio
```

## Deploy em Produção

### Opção 1: Deploy no Replit (Recomendado)

#### Vantagens
- Configuração automática de ambiente
- Banco PostgreSQL incluído
- SSL/TLS automático
- Monitoramento integrado
- Backup automático

#### Passos

1. **Importar Projeto no Replit**
   ```bash
   # No Replit, importe o repositório Git
   # Configure as variáveis de ambiente no painel
   ```

2. **Configurar Secrets**
   ```bash
   # No painel do Replit, adicione:
   - DATABASE_URL (gerado automaticamente)
   - STRIPE_SECRET_KEY
   - STRIPE_PUBLISHABLE_KEY
   - SESSION_SECRET
   ```

3. **Deploy Automático**
   ```bash
   # Execute o comando de build
   npm run build
   
   # O Replit fará deploy automático
   # URL será gerada: https://[nome-projeto].[username].repl.co
   ```

### Opção 2: Deploy em VPS/Cloud

#### Requisitos do Servidor
```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PostgreSQL
sudo apt install postgresql postgresql-contrib

# Instalar PM2 para gerenciamento de processo
sudo npm install -g pm2
```

#### Configuração do Projeto

```bash
# Upload do código
scp -r ./dpo-fast user@servidor:/opt/dpo-fast
ssh user@servidor

# Navegar para diretório
cd /opt/dpo-fast

# Instalar dependências de produção
npm ci --production

# Build do projeto
npm run build

# Configurar permissões
sudo chown -R $USER:$USER /opt/dpo-fast
chmod +x scripts/*.sh
```

#### Configuração do PM2

```bash
# Criar arquivo ecosystem.config.js
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'dpo-fast',
    script: 'server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    log_file: '/var/log/dpo-fast/combined.log',
    out_file: '/var/log/dpo-fast/out.log',
    error_file: '/var/log/dpo-fast/error.log',
    max_memory_restart: '1G'
  }]
};
EOF

# Criar diretório de logs
sudo mkdir -p /var/log/dpo-fast
sudo chown $USER:$USER /var/log/dpo-fast

# Iniciar aplicação
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Opção 3: Deploy com Docker

#### Dockerfile

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Instalar dependências do sistema
RUN apk add --no-cache postgresql-client

# Copiar arquivos necessários
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/package*.json ./

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

EXPOSE 5000

CMD ["npm", "start"]
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/dpofast
      - SESSION_SECRET=${SESSION_SECRET}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=dpofast
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
```

#### Deploy com Docker

```bash
# Build e start
docker-compose up -d

# Verificar logs
docker-compose logs -f app

# Executar migrações
docker-compose exec app npm run db:push
```

## Configuração de SSL/TLS

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name seu-dominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seu-dominio.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Monitoramento e Logs

### Configuração de Logs

```bash
# Instalar ferramentas de log
sudo apt install logrotate

# Configurar rotação de logs
sudo cat > /etc/logrotate.d/dpo-fast << EOF
/var/log/dpo-fast/*.log {
    daily
    missingok
    rotate 14
    compress
    notifempty
    create 0640 $USER $USER
    postrotate
        pm2 reload dpo-fast
    endscript
}
EOF
```

### Métricas de Sistema

```bash
# Instalar ferramentas de monitoramento
sudo apt install htop iotop nethogs

# Configurar alertas básicos
cat > /opt/dpo-fast/scripts/health-check.sh << 'EOF'
#!/bin/bash

# Verificar se aplicação está rodando
if ! pm2 list | grep -q "dpo-fast.*online"; then
    echo "ALERT: DPO Fast application is down" | mail -s "DPO Fast Alert" admin@empresa.com
    pm2 restart dpo-fast
fi

# Verificar uso de memória
MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')
if [ $MEMORY_USAGE -gt 80 ]; then
    echo "ALERT: High memory usage: ${MEMORY_USAGE}%" | mail -s "Memory Alert" admin@empresa.com
fi

# Verificar conexão com banco
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "ALERT: Database connection failed" | mail -s "Database Alert" admin@empresa.com
fi
EOF

chmod +x /opt/dpo-fast/scripts/health-check.sh

# Agendar verificação a cada 5 minutos
echo "*/5 * * * * /opt/dpo-fast/scripts/health-check.sh" | crontab -
```

## Backup e Recuperação

### Backup Automático do Banco

```bash
# Script de backup
cat > /opt/dpo-fast/scripts/backup-db.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/opt/backups/dpo-fast"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/dpofast_backup_$DATE.sql"

mkdir -p $BACKUP_DIR

# Fazer backup
pg_dump $DATABASE_URL > $BACKUP_FILE

# Comprimir
gzip $BACKUP_FILE

# Manter apenas últimos 7 dias
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

# Upload para cloud storage (opcional)
# aws s3 cp $BACKUP_FILE.gz s3://seu-bucket/backups/
EOF

chmod +x /opt/dpo-fast/scripts/backup-db.sh

# Agendar backup diário às 2h
echo "0 2 * * * /opt/dpo-fast/scripts/backup-db.sh" | crontab -
```

### Restauração

```bash
# Restaurar do backup
gunzip backup_file.sql.gz
psql $DATABASE_URL < backup_file.sql

# Reiniciar aplicação
pm2 restart dpo-fast
```

## Validação do Deploy

### Checklist Pós-Deploy

1. **Conectividade**
   ```bash
   # Verificar se aplicação responde
   curl -f https://seu-dominio.com/api/health
   
   # Verificar SSL
   curl -I https://seu-dominio.com
   ```

2. **Banco de Dados**
   ```bash
   # Verificar conexão
   psql $DATABASE_URL -c "SELECT version();"
   
   # Verificar tabelas
   psql $DATABASE_URL -c "\dt"
   ```

3. **Funcionalidades**
   ```bash
   # Testar login
   curl -X POST https://seu-dominio.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@test.com","password":"test"}'
   
   # Testar criação de tarefa
   curl -X GET https://seu-dominio.com/api/compliance-tasks \
     -H "Authorization: Bearer TOKEN"
   ```

4. **Performance**
   ```bash
   # Testar tempo de resposta
   curl -w "@curl-format.txt" -o /dev/null -s https://seu-dominio.com/
   
   # Verificar uso de recursos
   htop
   ```

### Teste de Fluxo Completo

```bash
# 1. Criar conta
# 2. Completar questionário
# 3. Gerar to-do list
# 4. Anexar documento a tarefa
# 5. Enviar para revisão
# 6. Admin aprovar tarefa
# 7. Gerar relatório final
# 8. Verificar logs de auditoria
```

## Troubleshooting Comum

### Problemas de Conexão de Banco

```bash
# Verificar status do PostgreSQL
sudo systemctl status postgresql

# Verificar logs
sudo journalctl -u postgresql -f

# Testar conexão manual
psql $DATABASE_URL
```

### Problemas de Memória

```bash
# Verificar uso de memória
free -h
pm2 monit

# Reiniciar aplicação se necessário
pm2 restart dpo-fast

# Configurar swap se necessário
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Problemas de SSL

```bash
# Verificar certificados
openssl x509 -in /path/to/cert.pem -text -noout

# Renovar Let's Encrypt
sudo certbot renew

# Testar configuração nginx
sudo nginx -t
sudo systemctl reload nginx
```

## Manutenção Periódica

### Tarefas Semanais
- [ ] Verificar logs de erro
- [ ] Revisar métricas de performance
- [ ] Testar backups
- [ ] Verificar atualizações de segurança

### Tarefas Mensais
- [ ] Atualizar dependências
- [ ] Revisar logs de auditoria
- [ ] Otimizar banco de dados
- [ ] Testar procedimentos de recuperação

### Tarefas Trimestrais
- [ ] Atualizar certificados SSL
- [ ] Revisar configurações de segurança
- [ ] Testar cenários de disaster recovery
- [ ] Atualizar documentação

## Contatos de Suporte

- **Urgente**: [telefone-urgencia]
- **Email**: [email-suporte]
- **Documentação**: [url-docs]
- **Status**: [url-status-page]