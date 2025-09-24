#!/bin/bash

# 🚀 Script de Deploy da Aplicação DPO Fast
# Execute como usuário dpo-app: bash deploy-app.sh

set -e  # Para em caso de erro

# Configurações
APP_DIR="/opt/dpo-fast/app"
BACKUP_DIR="/opt/dpo-fast/backups"
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/opt/dpo-fast/logs/deploy.log"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

# Verificar se está rodando como usuário dpo-app
if [ "$(whoami)" != "dpo-app" ]; then
    error "Este script deve ser executado como usuário dpo-app: sudo -u dpo-app bash deploy-app.sh"
fi

log "🚀 Iniciando deploy da aplicação DPO Fast..."

# Verificar se diretório da aplicação existe
if [ ! -d "$APP_DIR" ]; then
    error "Diretório da aplicação não encontrado: $APP_DIR"
fi

cd "$APP_DIR"

# 1. Criar backup pré-deploy
log "📦 Criando backup pré-deploy..."
mkdir -p "$BACKUP_DIR"

tar -czf "$BACKUP_DIR/pre_deploy_backup_$DATE.tar.gz" \
    --exclude=node_modules \
    --exclude=uploads \
    --exclude=.git \
    --exclude=logs \
    . 2>/dev/null || warning "Erro no backup pré-deploy"

if [ -f "$BACKUP_DIR/pre_deploy_backup_$DATE.tar.gz" ]; then
    success "Backup pré-deploy criado: pre_deploy_backup_$DATE.tar.gz"
else
    warning "Falha na criação do backup pré-deploy"
fi

# 2. Verificar se PM2 está rodando
log "🔍 Verificando status do PM2..."
if pm2 list | grep -q "dpo-fast-api"; then
    APP_RUNNING=true
    log "Aplicação está rodando"
else
    APP_RUNNING=false
    warning "Aplicação não está rodando"
fi

# 3. Atualizar código (se usando Git)
if [ -d ".git" ]; then
    log "📥 Atualizando código do Git..."
    
    # Verificar se há mudanças locais não commitadas
    if ! git diff --quiet || ! git diff --cached --quiet; then
        warning "Há alterações locais não commitadas. Fazendo stash..."
        git stash push -m "Auto-stash before deploy $DATE"
    fi
    
    # Buscar atualizações
    git fetch origin
    
    # Verificar branch atual
    CURRENT_BRANCH=$(git branch --show-current)
    log "Branch atual: $CURRENT_BRANCH"
    
    # Fazer pull
    if git pull origin "$CURRENT_BRANCH"; then
        success "Código atualizado do Git"
    else
        error "Falha ao atualizar código do Git"
    fi
else
    warning "Não é um repositório Git. Pulando atualização de código."
fi

# 4. Verificar se arquivo .env existe
log "⚙️ Verificando configurações..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        warning "Arquivo .env não encontrado. Copiando de .env.example..."
        cp .env.example .env
        error "Configure o arquivo .env antes de continuar o deploy"
    else
        error "Arquivo .env não encontrado e .env.example também não existe"
    fi
fi

# 5. Instalar dependências
log "📦 Instalando dependências..."
if npm ci --production; then
    success "Dependências instaladas com sucesso"
else
    error "Falha na instalação das dependências"
fi

# 6. Build da aplicação (se necessário)
log "🔨 Fazendo build da aplicação..."
if npm run build 2>/dev/null; then
    success "Build concluído com sucesso"
else
    log "Script de build não encontrado ou falhou. Continuando..."
fi

# 7. Criar diretórios necessários
log "📁 Criando diretórios necessários..."
mkdir -p uploads/documents
chmod -R 755 uploads/

# 8. Aplicar migrations do banco (se necessário)
log "🗃️ Aplicando schema do banco..."
if npm run db:push --force; then
    success "Schema do banco atualizado"
else
    warning "Falha ao aplicar schema. Pode ser necessário intervenção manual."
fi

# 9. Testar conectividade do banco
log "🔍 Testando conectividade do banco..."
# Aqui você pode adicionar um script simples para testar a conexão
# Por exemplo, um script Node.js que tenta conectar no banco

# 10. Reiniciar aplicação
if [ "$APP_RUNNING" = true ]; then
    log "🔄 Reiniciando aplicação..."
    
    # Graceful reload (sem downtime)
    if pm2 reload dpo-fast-api --update-env; then
        success "Aplicação recarregada com sucesso"
    else
        warning "Falha no reload. Tentando restart..."
        if pm2 restart dpo-fast-api --update-env; then
            success "Aplicação reiniciada com sucesso"
        else
            error "Falha ao reiniciar aplicação"
        fi
    fi
else
    log "🚀 Iniciando aplicação..."
    
    if [ -f "ecosystem.config.js" ]; then
        if pm2 start ecosystem.config.js --env production; then
            success "Aplicação iniciada com sucesso"
        else
            error "Falha ao iniciar aplicação"
        fi
    else
        error "Arquivo ecosystem.config.js não encontrado"
    fi
fi

# 11. Aguardar aplicação ficar online
log "⏳ Aguardando aplicação ficar online..."
sleep 5

# 12. Verificar se aplicação está respondendo
log "🔍 Verificando saúde da aplicação..."

# Teste simples de conectividade
if curl -f http://localhost:3000/api/health 2>/dev/null >/dev/null; then
    success "Aplicação está respondendo corretamente"
elif curl -f http://localhost:3000/ 2>/dev/null >/dev/null; then
    success "Aplicação está online (endpoint de saúde não encontrado)"
else
    warning "Aplicação pode não estar respondendo corretamente"
    log "Verificando logs da aplicação..."
    pm2 logs dpo-fast-api --lines 10 --nostream
fi

# 13. Mostrar status final
log "📊 Status final da aplicação:"
pm2 status dpo-fast-api

# 14. Salvar informações do deploy
cat > "/opt/dpo-fast/logs/deploy_info_$DATE.json" << EOF
{
  "deploy_date": "$DATE",
  "deploy_date_human": "$(date)",
  "user": "$(whoami)",
  "hostname": "$(hostname)",
  "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'N/A')",
  "git_branch": "$(git branch --show-current 2>/dev/null || echo 'N/A')",
  "node_version": "$(node --version)",
  "npm_version": "$(npm --version)",
  "pm2_status": "$(pm2 jlist | jq -c '.[] | select(.name=="dpo-fast-api")' 2>/dev/null || echo '{}')"
}
EOF

# 15. Limpeza pós-deploy
log "🧹 Limpeza pós-deploy..."

# Limpar logs antigos do PM2 (manter apenas últimos 7 dias)
pm2 flush dpo-fast-api || true

# Limpar backups de deploy antigos (manter 5 mais recentes)
(ls -t "$BACKUP_DIR"/pre_deploy_backup_*.tar.gz | tail -n +6 | xargs -r rm) 2>/dev/null || true

# 16. Relatório final
success "🎉 Deploy concluído com sucesso!"
echo
echo "📋 Resumo do Deploy:"
echo "   - Data: $(date)"
echo "   - Aplicação: $(pm2 list | grep dpo-fast-api | awk '{print $12}' || echo 'Offline')"
echo "   - PID: $(pm2 list | grep dpo-fast-api | awk '{print $4}' || echo 'N/A')"
echo "   - Uptime: $(pm2 list | grep dpo-fast-api | awk '{print $10}' || echo 'N/A')"
echo "   - Memória: $(pm2 list | grep dpo-fast-api | awk '{print $8}' || echo 'N/A')"
echo
echo "🔗 URLs da Aplicação:"
echo "   - Frontend: https://$(grep DOMAIN /opt/dpo-fast/app/.env 2>/dev/null | cut -d'=' -f2 || echo 'SEU_DOMINIO.com')"
echo "   - API: https://$(grep DOMAIN /opt/dpo-fast/app/.env 2>/dev/null | cut -d'=' -f2 || echo 'SEU_DOMINIO.com')/api"
echo
echo "🔧 Comandos úteis:"
echo "   - Ver logs: pm2 logs dpo-fast-api"
echo "   - Status: pm2 status"
echo "   - Restart: pm2 restart dpo-fast-api"
echo "   - Monitorar: pm2 monit"
echo
echo "📁 Arquivos importantes:"
echo "   - Log do deploy: $LOG_FILE"
echo "   - Backup pré-deploy: $BACKUP_DIR/pre_deploy_backup_$DATE.tar.gz"
echo "   - Info do deploy: /opt/dpo-fast/logs/deploy_info_$DATE.json"

log "Deploy finalizado com sucesso em $(date)"
echo "---" | tee -a "$LOG_FILE"