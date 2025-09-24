#!/bin/bash

# 💾 Sistema de Backup Automático - DPO Fast
# Este script deve rodar como usuário dpo-app via crontab

# Configurações
BACKUP_DIR="/opt/dpo-fast/backups"
APP_DIR="/opt/dpo-fast/app"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="dpo_fast_production"
DB_USER="dpo_user"
RETENTION_DAYS=7

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log "🚀 Iniciando backup automático..."

# Criar diretório de backup se não existir
mkdir -p "$BACKUP_DIR"

# 1. Backup do banco de dados PostgreSQL
log "📊 Fazendo backup do banco de dados..."
if [ ! -z "$PGPASSWORD" ]; then
    pg_dump -h localhost -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_DIR/db_backup_$DATE.sql"
    if [ $? -eq 0 ]; then
        success "Backup do banco salvo: db_backup_$DATE.sql"
        
        # Comprimir backup do banco
        gzip "$BACKUP_DIR/db_backup_$DATE.sql"
        success "Backup do banco comprimido: db_backup_$DATE.sql.gz"
    else
        error "Falha no backup do banco de dados"
    fi
else
    error "Variável PGPASSWORD não definida. Configure a senha do banco."
fi

# 2. Backup dos arquivos enviados (uploads)
log "📁 Fazendo backup dos arquivos..."
if [ -d "$APP_DIR/uploads" ]; then
    tar -czf "$BACKUP_DIR/uploads_backup_$DATE.tar.gz" -C "$APP_DIR" uploads/
    if [ $? -eq 0 ]; then
        success "Backup dos arquivos salvo: uploads_backup_$DATE.tar.gz"
    else
        error "Falha no backup dos arquivos"
    fi
else
    warning "Diretório de uploads não encontrado: $APP_DIR/uploads"
fi

# 3. Backup da configuração (.env)
log "⚙️ Fazendo backup da configuração..."
if [ -f "$APP_DIR/.env" ]; then
    cp "$APP_DIR/.env" "$BACKUP_DIR/env_backup_$DATE"
    success "Backup da configuração salvo: env_backup_$DATE"
else
    warning "Arquivo .env não encontrado"
fi

# 4. Backup do código (opcional - apenas se não estiver usando Git)
log "💻 Fazendo backup do código..."
tar -czf "$BACKUP_DIR/code_backup_$DATE.tar.gz" \
    -C "$APP_DIR" . \
    --exclude=node_modules \
    --exclude=uploads \
    --exclude=.git \
    --exclude=logs \
    --exclude=.env \
    2>/dev/null

if [ $? -eq 0 ]; then
    success "Backup do código salvo: code_backup_$DATE.tar.gz"
else
    warning "Falha no backup do código (pode ser normal)"
fi

# 5. Criar arquivo de metadados do backup
cat > "$BACKUP_DIR/backup_metadata_$DATE.json" << EOF
{
  "timestamp": "$DATE",
  "date_human": "$(date)",
  "hostname": "$(hostname)",
  "database": "$DB_NAME",
  "files": {
    "database": "db_backup_$DATE.sql.gz",
    "uploads": "uploads_backup_$DATE.tar.gz",
    "config": "env_backup_$DATE",
    "code": "code_backup_$DATE.tar.gz"
  },
  "sizes": {
    "database_mb": "$(du -m "$BACKUP_DIR/db_backup_$DATE.sql.gz" 2>/dev/null | cut -f1 || echo 0)",
    "uploads_mb": "$(du -m "$BACKUP_DIR/uploads_backup_$DATE.tar.gz" 2>/dev/null | cut -f1 || echo 0)",
    "code_mb": "$(du -m "$BACKUP_DIR/code_backup_$DATE.tar.gz" 2>/dev/null | cut -f1 || echo 0)"
  }
}
EOF

success "Metadados do backup salvos: backup_metadata_$DATE.json"

# 6. Limpeza de backups antigos
log "🧹 Limpando backups antigos (>$RETENTION_DAYS dias)..."

# Limpar backups do banco
find "$BACKUP_DIR" -name "db_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
deleted_db=$(find "$BACKUP_DIR" -name "db_backup_*.sql.gz" -mtime +$RETENTION_DAYS 2>/dev/null | wc -l)

# Limpar backups de uploads
find "$BACKUP_DIR" -name "uploads_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete
deleted_uploads=$(find "$BACKUP_DIR" -name "uploads_backup_*.tar.gz" -mtime +$RETENTION_DAYS 2>/dev/null | wc -l)

# Limpar backups de código
find "$BACKUP_DIR" -name "code_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete
deleted_code=$(find "$BACKUP_DIR" -name "code_backup_*.tar.gz" -mtime +$RETENTION_DAYS 2>/dev/null | wc -l)

# Limpar configurações antigas
find "$BACKUP_DIR" -name "env_backup_*" -mtime +$RETENTION_DAYS -delete
deleted_env=$(find "$BACKUP_DIR" -name "env_backup_*" -mtime +$RETENTION_DAYS 2>/dev/null | wc -l)

# Limpar metadados antigos
find "$BACKUP_DIR" -name "backup_metadata_*.json" -mtime +$RETENTION_DAYS -delete
deleted_meta=$(find "$BACKUP_DIR" -name "backup_metadata_*.json" -mtime +$RETENTION_DAYS 2>/dev/null | wc -l)

total_deleted=$((deleted_db + deleted_uploads + deleted_code + deleted_env + deleted_meta))
if [ $total_deleted -gt 0 ]; then
    success "Removidos $total_deleted arquivos antigos"
else
    log "Nenhum arquivo antigo para remover"
fi

# 7. Estatísticas finais
log "📈 Estatísticas do backup:"
echo "   - Backups no diretório: $(ls -1 "$BACKUP_DIR"/backup_metadata_*.json 2>/dev/null | wc -l)"
echo "   - Espaço total usado: $(du -sh "$BACKUP_DIR" | cut -f1)"
echo "   - Backup mais recente: $DATE"

# 8. Verificar integridade dos backups (teste básico)
log "🔍 Verificando integridade..."

# Verificar se banco pode ser lido
if [ -f "$BACKUP_DIR/db_backup_$DATE.sql.gz" ]; then
    if zcat "$BACKUP_DIR/db_backup_$DATE.sql.gz" | head -5 | grep -q "PostgreSQL"; then
        success "Backup do banco parece íntegro"
    else
        warning "Backup do banco pode estar corrompido"
    fi
fi

# Verificar se uploads podem ser listados
if [ -f "$BACKUP_DIR/uploads_backup_$DATE.tar.gz" ]; then
    if tar -tzf "$BACKUP_DIR/uploads_backup_$DATE.tar.gz" >/dev/null 2>&1; then
        success "Backup de uploads parece íntegro"
    else
        warning "Backup de uploads pode estar corrompido"
    fi
fi

# 9. Log final
success "🎉 Backup concluído com sucesso!"
echo
echo "📋 Arquivos criados:"
ls -lh "$BACKUP_DIR"/*_$DATE* 2>/dev/null || echo "Nenhum arquivo encontrado"

# 10. Opcional: Enviar notificação (descomente se quiser)
# curl -X POST "https://api.telegram.org/bot<SEU_TOKEN>/sendMessage" \
#      -d chat_id=<SEU_CHAT_ID> \
#      -d text="✅ Backup do DPO Fast concluído: $DATE"

log "Backup finalizado em $(date)"
echo "---"