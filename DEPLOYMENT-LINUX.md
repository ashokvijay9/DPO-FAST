# 🚀 **DEPLOY COMPLETO EM SERVIDOR LINUX**

## **📋 Visão Geral**
Este guia completo permite migrar sua plataforma LGPD para um **servidor Linux próprio**, eliminando completamente as dependências do Replit e Supabase.

---

## **🖥️ REQUISITOS DO SERVIDOR**

### **💾 Especificações Mínimas**
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **RAM**: 2GB mínimo (4GB recomendado)
- **Storage**: 20GB SSD (50GB+ recomendado)
- **CPU**: 2 cores mínimo
- **Network**: IP público com porta 80/443 abertas

### **🌐 DNS/Domínio**
- Domínio próprio (ex: `suaempresa.com`)
- Subdomínio para API (ex: `dpo.suaempresa.com`)

---

## **⚙️ INSTALAÇÃO STEP-BY-STEP**

### **1️⃣ Preparar Servidor Linux**

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependências básicas
sudo apt install -y curl wget git nginx certbot python3-certbot-nginx ufw htop

# Configurar firewall
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw --force enable
```

### **2️⃣ Instalar Node.js 20**

```bash
# Instalar Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalação
node --version  # Deve mostrar v20.x.x
npm --version   # Deve mostrar 10.x.x

# Instalar PM2 globalmente
sudo npm install -g pm2
```

### **3️⃣ Instalar PostgreSQL**

```bash
# Instalar PostgreSQL 15
sudo apt install -y postgresql postgresql-contrib

# Iniciar e habilitar serviço
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Configurar usuário e banco
sudo -u postgres psql << EOF
CREATE DATABASE dpo_fast_production;
CREATE USER dpo_user WITH ENCRYPTED PASSWORD 'SUA_SENHA_SUPER_SEGURA_AQUI';
GRANT ALL PRIVILEGES ON DATABASE dpo_fast_production TO dpo_user;
ALTER USER dpo_user CREATEDB;
\\q
EOF

# Configurar acesso remoto (se necessário)
sudo nano /etc/postgresql/15/main/postgresql.conf
# Adicionar: listen_addresses = 'localhost'

sudo nano /etc/postgresql/15/main/pg_hba.conf  
# Adicionar: local   all             dpo_user                                md5

# Reiniciar PostgreSQL
sudo systemctl restart postgresql
```

### **4️⃣ Criar Usuário da Aplicação**

```bash
# Criar usuário específico para a aplicação
sudo adduser --system --home /opt/dpo-fast --shell /bin/bash dpo-app
sudo mkdir -p /opt/dpo-fast
sudo chown -R dpo-app:dpo-app /opt/dpo-fast
```

### **5️⃣ Deploy da Aplicação**

```bash
# Trocar para usuário da aplicação
sudo -u dpo-app -i

# Clonar/copiar código para servidor
cd /opt/dpo-fast
git clone <SEU_REPOSITORIO> app
# OU copiar arquivos via SCP/SFTP

cd app

# Instalar dependências
npm ci --production

# Criar arquivo de ambiente
cp .env.local.example .env
nano .env
```

**Editar `.env` com suas configurações:**
```env
# Banco de dados
DATABASE_URL="postgresql://dpo_user:SUA_SENHA_SUPER_SEGURA_AQUI@localhost:5432/dpo_fast_production"

# JWT Secret (GERAR CHAVE SEGURA!)
JWT_SECRET="sua-chave-jwt-super-secreta-de-pelo-menos-32-caracteres"

# Ambiente
NODE_ENV=production
PORT=3000

# SSL/HTTPS (depois de configurar)
HTTPS_ENABLED=true
```

```bash
# Aplicar schema no banco
npm run db:push --force

# Criar diretórios necessários
mkdir -p uploads/documents
chmod 755 uploads/

# Build da aplicação
npm run build
```

---

## **🔧 CONFIGURAÇÕES DE PRODUÇÃO**

### **📁 PM2 - Gerenciador de Processo**

```bash
# Como usuário dpo-app
cd /opt/dpo-fast/app

# Criar arquivo de configuração PM2
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'dpo-fast-api',
    script: 'server/index.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/opt/dpo-fast/logs/error.log',
    out_file: '/opt/dpo-fast/logs/out.log',
    log_file: '/opt/dpo-fast/logs/combined.log',
    time: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
}
EOF

# Criar diretório de logs
mkdir -p /opt/dpo-fast/logs

# Iniciar aplicação
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# Configurar autostart (executar comando mostrado)
```

### **🌐 Nginx - Reverse Proxy**

```bash
# Voltar para usuário root
exit

# Criar configuração do Nginx
sudo nano /etc/nginx/sites-available/dpo-fast
```

**Conteúdo do arquivo `/etc/nginx/sites-available/dpo-fast`:**
```nginx
server {
    listen 80;
    server_name dpo.suaempresa.com;  # Substituir pelo seu domínio
    
    # Redirect HTTP to HTTPS (depois de configurar SSL)
    # return 301 https://$server_name$request_uri;
    
    # Configuração temporária (antes do SSL)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Servir arquivos estáticos
    location /uploads/ {
        alias /opt/dpo-fast/app/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Configurações de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

```bash
# Ativar site
sudo ln -s /etc/nginx/sites-available/dpo-fast /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

### **🔐 SSL/HTTPS com Let's Encrypt**

```bash
# Obter certificado SSL
sudo certbot --nginx -d dpo.suaempresa.com

# Testar renovação automática
sudo certbot renew --dry-run

# Configurar renovação automática (crontab)
sudo crontab -e
# Adicionar: 0 12 * * * /usr/bin/certbot renew --quiet
```

---

## **📊 MONITORAMENTO E BACKUP**

### **📈 Monitoramento PM2**

```bash
# Ver status
pm2 status
pm2 logs dpo-fast-api
pm2 monit

# Restart/reload
pm2 restart dpo-fast-api
pm2 reload dpo-fast-api
```

### **💾 Backup Automático**

```bash
# Criar script de backup
sudo nano /opt/dpo-fast/backup.sh
```

**Conteúdo do script:**
```bash
#!/bin/bash

BACKUP_DIR="/opt/dpo-fast/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="dpo_fast_production"
DB_USER="dpo_user"

# Criar diretório se não existir
mkdir -p $BACKUP_DIR

# Backup do banco
export PGPASSWORD='SUA_SENHA_SUPER_SEGURA_AQUI'
pg_dump -h localhost -U $DB_USER -d $DB_NAME > $BACKUP_DIR/db_backup_$DATE.sql

# Backup dos uploads
tar -czf $BACKUP_DIR/uploads_backup_$DATE.tar.gz -C /opt/dpo-fast/app uploads/

# Limpar backups antigos (manter 7 dias)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup realizado: $DATE"
```

```bash
# Dar permissões
sudo chmod +x /opt/dpo-fast/backup.sh
sudo chown dpo-app:dpo-app /opt/dpo-fast/backup.sh

# Configurar execução automática (crontab do usuário dpo-app)
sudo -u dpo-app crontab -e
# Adicionar: 0 2 * * * /opt/dpo-fast/backup.sh >> /opt/dpo-fast/logs/backup.log 2>&1
```

---

## **🚀 COMANDOS ÚTEIS**

### **🔧 Gerenciamento da Aplicação**
```bash
# Ver logs em tempo real
sudo -u dpo-app pm2 logs dpo-fast-api --lines 100

# Restart da aplicação
sudo -u dpo-app pm2 restart dpo-fast-api

# Atualizar código
cd /opt/dpo-fast/app
sudo -u dpo-app git pull
sudo -u dpo-app npm ci --production
sudo -u dpo-app npm run build
sudo -u dpo-app pm2 restart dpo-fast-api
```

### **🗃️ Banco de Dados**
```bash
# Conectar ao banco
sudo -u postgres psql -d dpo_fast_production

# Criar primeiro usuário admin
sudo -u postgres psql -d dpo_fast_production -c "UPDATE users SET role = 'admin' WHERE email = 'admin@suaempresa.com';"

# Ver tabelas
sudo -u postgres psql -d dpo_fast_production -c "\\dt"
```

### **🔍 Diagnóstico**
```bash
# Status dos serviços
sudo systemctl status nginx
sudo systemctl status postgresql
sudo -u dpo-app pm2 status

# Verificar portas
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443
sudo netstat -tlnp | grep :3000

# Logs do sistema
sudo journalctl -u nginx -f
sudo journalctl -u postgresql -f
```

---

## **🎯 ACESSO À APLICAÇÃO**

Após configurar tudo:

1. **Frontend**: `https://dpo.suaempresa.com`
2. **API**: `https://dpo.suaempresa.com/api`
3. **Uploads**: `https://dpo.suaempresa.com/uploads`

### **👤 Primeiro Admin**
```bash
# 1. Registrar via API ou frontend
# 2. Promover para admin no banco:
sudo -u postgres psql -d dpo_fast_production -c "UPDATE users SET role = 'admin' WHERE email = 'seu@email.com';"
```

---

## **🔒 SEGURANÇA EM PRODUÇÃO**

- ✅ **Firewall UFW** configurado
- ✅ **SSL/HTTPS** obrigatório  
- ✅ **Headers de segurança** no Nginx
- ✅ **Usuário separado** para aplicação
- ✅ **Backup automático** diário
- ✅ **JWT secrets** seguros

**🎉 SUA APLICAÇÃO AGORA RODA 100% NO SEU SERVIDOR!**