#!/bin/bash

# 🚀 Script de Instalação Automática - Servidor Linux DPO Fast
# Execute como root: bash install-server.sh

set -e  # Para em caso de erro

echo "🚀 Iniciando instalação do DPO Fast no servidor Linux..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir mensagens coloridas
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
    print_error "Este script deve ser executado como root (sudo bash install-server.sh)"
    exit 1
fi

# Verificar sistema operacional
if ! command -v apt &> /dev/null; then
    print_error "Este script foi feito para sistemas baseados em Debian/Ubuntu"
    exit 1
fi

# Solicitar informações do usuário
print_status "Configurando instalação..."
read -p "Digite o domínio da aplicação (ex: dpo.suaempresa.com): " DOMAIN
read -p "Digite o email para SSL/Let's Encrypt: " EMAIL
read -s -p "Digite a senha do banco de dados PostgreSQL: " DB_PASSWORD
echo

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ] || [ -z "$DB_PASSWORD" ]; then
    print_error "Todos os campos são obrigatórios!"
    exit 1
fi

# Atualizar sistema
print_status "Atualizando sistema..."
apt update && apt upgrade -y

# Instalar dependências básicas
print_status "Instalando dependências básicas..."
apt install -y curl wget git nginx certbot python3-certbot-nginx ufw htop fail2ban unzip

# Configurar firewall
print_status "Configurando firewall..."
ufw allow ssh
ufw allow http
ufw allow https
ufw --force enable

# Configurar fail2ban
print_status "Configurando fail2ban..."
systemctl enable fail2ban
systemctl start fail2ban

# Instalar Node.js 20
print_status "Instalando Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Verificar instalação do Node.js
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
print_success "Node.js $NODE_VERSION e npm $NPM_VERSION instalados com sucesso"

# Instalar PM2 globalmente
print_status "Instalando PM2..."
npm install -g pm2

# Instalar PostgreSQL
print_status "Instalando PostgreSQL..."
apt install -y postgresql postgresql-contrib

# Configurar PostgreSQL
print_status "Configurando PostgreSQL..."
systemctl start postgresql
systemctl enable postgresql

# Criar usuário e banco de dados
print_status "Criando banco de dados e usuário..."
sudo -u postgres psql << EOF
CREATE DATABASE dpo_fast_production;
CREATE USER dpo_user WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE dpo_fast_production TO dpo_user;
ALTER USER dpo_user CREATEDB;
\q
EOF

print_success "Banco de dados 'dpo_fast_production' criado com sucesso"

# Criar usuário da aplicação
print_status "Criando usuário da aplicação..."
if ! id "dpo-app" &>/dev/null; then
    adduser --system --home /opt/dpo-fast --shell /bin/bash --group dpo-app
fi

mkdir -p /opt/dpo-fast/{app,logs,backups}
chown -R dpo-app:dpo-app /opt/dpo-fast

# Configurar Nginx
print_status "Configurando Nginx..."
rm -f /etc/nginx/sites-enabled/default

# Criar configuração básica do Nginx (sem SSL inicialmente)
cat > /etc/nginx/sites-available/dpo-fast << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    
    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone \$binary_remote_addr zone=login:10m rate=5r/m;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline' 'unsafe-eval'" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Proxy para aplicação Node.js
    location / {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Rate limiting especial para login
    location /api/auth/login {
        limit_req zone=login burst=3 nodelay;
        
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Servir uploads
    location /uploads/ {
        alias /opt/dpo-fast/app/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Bloquear arquivos sensíveis
    location ~ /\.(ht|git|env) {
        deny all;
        return 404;
    }
    
    access_log /var/log/nginx/dpo-fast-access.log;
    error_log /var/log/nginx/dpo-fast-error.log;
}
EOF

# Ativar site
ln -sf /etc/nginx/sites-available/dpo-fast /etc/nginx/sites-enabled/

# Testar configuração do Nginx
if nginx -t; then
    print_success "Configuração do Nginx OK"
    systemctl restart nginx
else
    print_error "Erro na configuração do Nginx"
    exit 1
fi

# Configurar SSL/HTTPS
print_status "Configurando SSL com Let's Encrypt..."
if certbot --nginx -d "$DOMAIN" --email "$EMAIL" --agree-tos --non-interactive; then
    print_success "Certificado SSL instalado com sucesso"
    
    # Configurar renovação automática
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
else
    print_warning "Falha ao instalar SSL. Você pode configurar manualmente mais tarde com: certbot --nginx -d $DOMAIN"
fi

# Criar arquivo de ambiente de exemplo
print_status "Criando arquivo de ambiente de exemplo..."
cat > /opt/dpo-fast/app/.env.example << EOF
# Banco de dados
DATABASE_URL="postgresql://dpo_user:$DB_PASSWORD@localhost:5432/dpo_fast_production"

# JWT Secret (GERAR CHAVE SEGURA!)
JWT_SECRET="$(openssl rand -base64 32)"

# Ambiente
NODE_ENV=production
PORT=3000

# Domain
DOMAIN=$DOMAIN

# SSL/HTTPS
HTTPS_ENABLED=true
EOF

chown dpo-app:dpo-app /opt/dpo-fast/app/.env.example

# Criar configuração PM2
print_status "Criando configuração PM2..."
cat > /opt/dpo-fast/app/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'dpo-fast-api',
    script: 'server/index.js',
    instances: 2,
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/opt/dpo-fast/logs/error.log',
    out_file: '/opt/dpo-fast/logs/out.log',
    log_file: '/opt/dpo-fast/logs/combined.log',
    time: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '1G',
    autorestart: true,
    merge_logs: true
  }]
}
EOF

chown dpo-app:dpo-app /opt/dpo-fast/app/ecosystem.config.js

# Criar script de backup
print_status "Configurando backup automático..."
cat > /opt/dpo-fast/backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/opt/dpo-fast/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="dpo_fast_production"
DB_USER="dpo_user"

mkdir -p $BACKUP_DIR

# Backup do banco
export PGPASSWORD='DB_PASSWORD_PLACEHOLDER'
pg_dump -h localhost -U $DB_USER -d $DB_NAME > $BACKUP_DIR/db_backup_$DATE.sql

# Backup dos uploads
tar -czf $BACKUP_DIR/uploads_backup_$DATE.tar.gz -C /opt/dpo-fast/app uploads/ 2>/dev/null || true

# Limpar backups antigos (manter 7 dias)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup realizado: $DATE"
EOF

# Substituir placeholder da senha
sed -i "s/DB_PASSWORD_PLACEHOLDER/$DB_PASSWORD/g" /opt/dpo-fast/backup.sh

chmod +x /opt/dpo-fast/backup.sh
chown dpo-app:dpo-app /opt/dpo-fast/backup.sh

# Configurar cron para backup (como usuário dpo-app)
sudo -u dpo-app crontab -l 2>/dev/null | { cat; echo "0 2 * * * /opt/dpo-fast/backup.sh >> /opt/dpo-fast/logs/backup.log 2>&1"; } | sudo -u dpo-app crontab -

# Criar script de deploy
print_status "Criando script de deploy..."
cat > /opt/dpo-fast/deploy.sh << 'EOF'
#!/bin/bash

# Script de deploy da aplicação DPO Fast
# Execute como usuário dpo-app

set -e

APP_DIR="/opt/dpo-fast/app"
BACKUP_DIR="/opt/dpo-fast/backups"
DATE=$(date +%Y%m%d_%H%M%S)

echo "🚀 Iniciando deploy da aplicação..."

cd $APP_DIR

# Backup antes do deploy
echo "📦 Criando backup pré-deploy..."
tar -czf $BACKUP_DIR/pre_deploy_backup_$DATE.tar.gz . --exclude=node_modules --exclude=uploads

# Atualizar código (se usando Git)
if [ -d ".git" ]; then
    echo "📥 Atualizando código do Git..."
    git pull origin main
fi

# Instalar dependências
echo "📦 Instalando dependências..."
npm ci --production

# Build da aplicação
echo "🔨 Fazendo build da aplicação..."
npm run build 2>/dev/null || echo "Build step not found, skipping..."

# Aplicar migrations do banco
echo "🗃️ Aplicando migrations do banco..."
npm run db:push --force

# Restart da aplicação
echo "🔄 Reiniciando aplicação..."
pm2 restart dpo-fast-api

echo "✅ Deploy concluído com sucesso!"
pm2 status
EOF

chmod +x /opt/dpo-fast/deploy.sh
chown dpo-app:dpo-app /opt/dpo-fast/deploy.sh

print_success "Instalação base concluída com sucesso!"
print_status "Próximos passos:"
echo
echo "1. 📁 Copie o código da sua aplicação para: /opt/dpo-fast/app/"
echo "2. ⚙️ Configure o arquivo .env baseado no .env.example"
echo "3. 🚀 Execute o deploy com: sudo -u dpo-app /opt/dpo-fast/deploy.sh"
echo "4. 👤 Crie o primeiro usuário admin após o deploy"
echo
echo "📊 Informações importantes:"
echo "   - Domínio: https://$DOMAIN"
echo "   - Usuário da aplicação: dpo-app"
echo "   - Diretório da aplicação: /opt/dpo-fast/app/"
echo "   - Logs: /opt/dpo-fast/logs/"
echo "   - Backups: /opt/dpo-fast/backups/"
echo
echo "🔧 Comandos úteis:"
echo "   - Ver logs: sudo -u dpo-app pm2 logs dpo-fast-api"
echo "   - Status: sudo -u dpo-app pm2 status"
echo "   - Restart: sudo -u dpo-app pm2 restart dpo-fast-api"
echo "   - Deploy: sudo -u dpo-app /opt/dpo-fast/deploy.sh"
echo "   - Backup manual: sudo -u dpo-app /opt/dpo-fast/backup.sh"
echo
print_success "Servidor configurado e pronto para receber a aplicação!"