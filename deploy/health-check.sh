#!/bin/bash

# 🔍 Script de Verificação de Saúde - DPO Fast
# Verifica se todos os serviços estão funcionando corretamente

# Configurações
APP_URL="http://localhost:3000"
DB_NAME="dpo_fast_production"
DB_USER="dpo_user"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

success() {
    echo -e "${GREEN}✅${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

error() {
    echo -e "${RED}❌${NC} $1"
}

info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

# Função para testar conectividade
test_connectivity() {
    local url=$1
    local name=$2
    
    if curl -s -f "$url" >/dev/null 2>&1; then
        success "$name está respondendo"
        return 0
    else
        error "$name não está respondendo"
        return 1
    fi
}

# Função para testar banco de dados
test_database() {
    if command -v psql >/dev/null 2>&1; then
        if PGPASSWORD="$PGPASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
            success "Banco de dados PostgreSQL conectando corretamente"
            return 0
        else
            error "Falha na conexão com PostgreSQL"
            return 1
        fi
    else
        warning "psql não instalado, não é possível testar banco"
        return 1
    fi
}

echo "🔍 VERIFICAÇÃO DE SAÚDE DO DPO FAST"
echo "$(date)"
echo "Servidor: $(hostname)"

# 1. Verificar se os serviços estão rodando
header "SERVIÇOS DO SISTEMA"

# PostgreSQL
if systemctl is-active --quiet postgresql; then
    success "PostgreSQL está rodando"
else
    error "PostgreSQL não está rodando"
    echo "   Tente: sudo systemctl start postgresql"
fi

# Nginx
if systemctl is-active --quiet nginx; then
    success "Nginx está rodando"
else
    error "Nginx não está rodando"
    echo "   Tente: sudo systemctl start nginx"
fi

# 2. Verificar aplicação Node.js (PM2)
header "APLICAÇÃO NODE.JS"

if command -v pm2 >/dev/null 2>&1; then
    PM2_STATUS=$(pm2 jlist 2>/dev/null | jq -r '.[] | select(.name=="dpo-fast-api") | .pm2_env.status' 2>/dev/null)
    
    if [ "$PM2_STATUS" = "online" ]; then
        success "Aplicação DPO Fast está online no PM2"
        
        # Mostrar informações detalhadas
        PM2_INFO=$(pm2 jlist | jq -r '.[] | select(.name=="dpo-fast-api")')
        UPTIME=$(echo "$PM2_INFO" | jq -r '.pm2_env.pm_uptime' | xargs -I {} date -d @{} '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "N/A")
        MEMORY=$(echo "$PM2_INFO" | jq -r '.memory' | numfmt --to=iec 2>/dev/null || echo "N/A")
        CPU=$(echo "$PM2_INFO" | jq -r '.cpu' || echo "N/A")
        
        info "   Uptime: $UPTIME"
        info "   Memória: $MEMORY"
        info "   CPU: ${CPU}%"
    else
        error "Aplicação DPO Fast não está rodando no PM2"
        echo "   Status: $PM2_STATUS"
        echo "   Tente: sudo -u dpo-app pm2 start /opt/dpo-fast/app/ecosystem.config.js --env production"
    fi
else
    error "PM2 não está instalado ou não está no PATH"
fi

# 3. Verificar conectividade HTTP
header "CONECTIVIDADE HTTP"

test_connectivity "$APP_URL" "Aplicação local (porta 3000)"

# Testar diferentes endpoints
test_connectivity "$APP_URL/api" "API endpoint"
test_connectivity "$APP_URL/api/health" "Health check endpoint" || info "   Health endpoint pode não existir (normal)"

# 4. Verificar banco de dados
header "BANCO DE DADOS"

test_database

# Testar se tabelas existem
if command -v psql >/dev/null 2>&1 && [ ! -z "$PGPASSWORD" ]; then
    TABLE_COUNT=$(PGPASSWORD="$PGPASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
    
    if [ "$TABLE_COUNT" -gt 0 ]; then
        success "Banco tem $TABLE_COUNT tabelas criadas"
    else
        warning "Banco parece estar vazio (0 tabelas)"
        echo "   Tente: cd /opt/dpo-fast/app && npm run db:push"
    fi
fi

# 5. Verificar arquivos e diretórios
header "ARQUIVOS E DIRETÓRIOS"

# Verificar diretório da aplicação
if [ -d "/opt/dpo-fast/app" ]; then
    success "Diretório da aplicação existe"
    
    # Verificar arquivos importantes
    if [ -f "/opt/dpo-fast/app/.env" ]; then
        success "Arquivo .env existe"
    else
        error "Arquivo .env não encontrado"
        echo "   Crie baseado no .env.example"
    fi
    
    if [ -f "/opt/dpo-fast/app/package.json" ]; then
        success "package.json encontrado"
    else
        error "package.json não encontrado"
    fi
    
    if [ -d "/opt/dpo-fast/app/node_modules" ]; then
        success "node_modules existe"
    else
        warning "node_modules não encontrado"
        echo "   Execute: npm install"
    fi
else
    error "Diretório da aplicação não encontrado"
fi

# Verificar diretório de uploads
if [ -d "/opt/dpo-fast/app/uploads" ]; then
    success "Diretório de uploads existe"
    
    UPLOADS_SIZE=$(du -sh /opt/dpo-fast/app/uploads 2>/dev/null | cut -f1)
    info "   Tamanho dos uploads: $UPLOADS_SIZE"
else
    warning "Diretório de uploads não encontrado"
    echo "   Crie com: mkdir -p /opt/dpo-fast/app/uploads/documents"
fi

# 6. Verificar logs
header "LOGS E MONITORAMENTO"

# Logs da aplicação
if [ -d "/opt/dpo-fast/logs" ]; then
    success "Diretório de logs existe"
    
    LOGS_SIZE=$(du -sh /opt/dpo-fast/logs 2>/dev/null | cut -f1)
    info "   Tamanho dos logs: $LOGS_SIZE"
    
    # Verificar se há erros recentes
    if [ -f "/opt/dpo-fast/logs/error.log" ]; then
        RECENT_ERRORS=$(tail -100 /opt/dpo-fast/logs/error.log 2>/dev/null | grep -c "$(date +%Y-%m-%d)" || echo 0)
        if [ "$RECENT_ERRORS" -gt 0 ]; then
            warning "Encontrados $RECENT_ERRORS erros hoje nos logs"
            echo "   Verifique: tail -f /opt/dpo-fast/logs/error.log"
        else
            success "Nenhum erro recente nos logs"
        fi
    fi
else
    warning "Diretório de logs não encontrado"
fi

# 7. Verificar recursos do sistema
header "RECURSOS DO SISTEMA"

# Memória
MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.1f%%", $3/$2 * 100.0)}')
success "Uso de memória: $MEMORY_USAGE"

# Disco
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}')
success "Uso de disco (/): $DISK_USAGE"

# Load average
LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | sed 's/^[ \t]*//')
info "Load average: $LOAD_AVG"

# 8. Verificar conectividade externa (SSL)
header "CONECTIVIDADE EXTERNA"

if [ ! -z "$DOMAIN" ]; then
    if curl -s -f "https://$DOMAIN" >/dev/null 2>&1; then
        success "Site público acessível via HTTPS"
    else
        if curl -s -f "http://$DOMAIN" >/dev/null 2>&1; then
            warning "Site acessível via HTTP (sem SSL)"
        else
            error "Site não está acessível externamente"
        fi
    fi
else
    warning "Domínio não configurado na variável DOMAIN"
fi

# 9. Verificar certificado SSL
if command -v openssl >/dev/null 2>&1 && [ ! -z "$DOMAIN" ]; then
    SSL_EXPIRY=$(openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" < /dev/null 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
    
    if [ ! -z "$SSL_EXPIRY" ]; then
        SSL_EXPIRY_EPOCH=$(date -d "$SSL_EXPIRY" +%s)
        CURRENT_EPOCH=$(date +%s)
        DAYS_UNTIL_EXPIRY=$(( (SSL_EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))
        
        if [ "$DAYS_UNTIL_EXPIRY" -lt 30 ]; then
            warning "Certificado SSL expira em $DAYS_UNTIL_EXPIRY dias"
            echo "   Execute: sudo certbot renew"
        else
            success "Certificado SSL válido por $DAYS_UNTIL_EXPIRY dias"
        fi
    fi
fi

# 10. Resumo final
header "RESUMO"

echo "📊 Status geral do sistema:"
echo "   - Hora da verificação: $(date)"
echo "   - Aplicação: $(pm2 list 2>/dev/null | grep dpo-fast-api | awk '{print $12}' || echo 'Não rodando')"
echo "   - Banco de dados: $(systemctl is-active postgresql)"
echo "   - Proxy web: $(systemctl is-active nginx)"
echo "   - Uso de recursos: CPU ${LOAD_AVG%,*}, RAM $MEMORY_USAGE, Disco $DISK_USAGE"

echo -e "\n🔧 Comandos úteis:"
echo "   - Ver logs da app: sudo -u dpo-app pm2 logs dpo-fast-api"
echo "   - Status PM2: sudo -u dpo-app pm2 status"
echo "   - Reiniciar app: sudo -u dpo-app pm2 restart dpo-fast-api"
echo "   - Verificar Nginx: sudo nginx -t && sudo systemctl status nginx"
echo "   - Logs do sistema: sudo journalctl -u nginx -f"

echo -e "\n✅ Verificação concluída!"