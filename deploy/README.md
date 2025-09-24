# 📁 **ARQUIVOS DE DEPLOY PARA SERVIDOR LINUX**

Este diretório contém todos os arquivos necessários para fazer deploy da plataforma DPO Fast em um servidor Linux próprio, removendo completamente as dependências do Replit e Supabase.

## 📋 **Arquivos Incluídos**

### 🚀 **Scripts de Instalação**
- **`install-server.sh`** - Script automático de instalação completa do servidor
- **`deploy-app.sh`** - Script de deploy da aplicação

### ⚙️ **Configurações**
- **`ecosystem.config.js`** - Configuração PM2 para produção
- **`nginx-config`** - Configuração Nginx com SSL e otimizações
- **`production.env.example`** - Arquivo de ambiente para produção

### 💾 **Backup e Monitoramento**
- **`backup-system.sh`** - Sistema de backup automático
- **`health-check.sh`** - Script de verificação de saúde do sistema

---

## 🚀 **INSTALAÇÃO RÁPIDA**

### **1️⃣ Preparar Servidor**
```bash
# No seu servidor Linux (Ubuntu/Debian)
wget https://raw.githubusercontent.com/SEU_USUARIO/SEU_REPO/main/deploy/install-server.sh
chmod +x install-server.sh
sudo bash install-server.sh
```

### **2️⃣ Copiar Código da Aplicação**
```bash
# Opção A: Via Git
sudo -u dpo-app git clone https://github.com/SEU_USUARIO/SEU_REPO.git /opt/dpo-fast/app

# Opção B: Via SCP/SFTP
scp -r ./sua-aplicacao/ usuario@servidor:/opt/dpo-fast/app/
sudo chown -R dpo-app:dpo-app /opt/dpo-fast/app/
```

### **3️⃣ Configurar e Fazer Deploy**
```bash
# Configurar ambiente
sudo -u dpo-app cp /opt/dpo-fast/app/deploy/production.env.example /opt/dpo-fast/app/.env
sudo -u dpo-app nano /opt/dpo-fast/app/.env

# Fazer deploy
sudo -u dpo-app bash /opt/dpo-fast/deploy.sh
```

---

## 📋 **GUIA DETALHADO**

### **📖 Documentação Completa**
Consulte `../DEPLOYMENT-LINUX.md` para instruções detalhadas passo a passo.

### **🔧 Como Usar Cada Script**

#### **install-server.sh**
Instala e configura automaticamente:
- Node.js 20 + PM2
- PostgreSQL 15
- Nginx + SSL (Let's Encrypt)
- Firewall + Fail2ban
- Usuário e diretórios da aplicação

```bash
sudo bash install-server.sh
# Siga as instruções na tela
```

#### **deploy-app.sh**
Deploy completo da aplicação:
- Backup pré-deploy
- Atualização de código (Git)
- Instalação de dependências
- Build da aplicação
- Migrations do banco
- Restart da aplicação

```bash
sudo -u dpo-app bash deploy-app.sh
```

#### **backup-system.sh**
Backup automático de:
- Banco de dados PostgreSQL
- Arquivos de upload
- Configurações (.env)
- Código fonte

```bash
# Execução manual
sudo -u dpo-app bash backup-system.sh

# Automático (crontab já configurado)
# Roda diariamente às 2:00 AM
```

#### **health-check.sh**
Verifica saúde completa do sistema:
- Serviços (PostgreSQL, Nginx, PM2)
- Conectividade (HTTP/HTTPS)
- Recursos (CPU, RAM, Disco)
- Certificado SSL
- Logs de erro

```bash
bash health-check.sh
```

---

## ⚙️ **CONFIGURAÇÕES**

### **ecosystem.config.js**
Configuração PM2 otimizada para produção:
- 2 instâncias em cluster
- Auto-restart em caso de falha
- Logs organizados
- Limite de memória

### **nginx-config**
Nginx com:
- SSL/HTTPS obrigatório
- Rate limiting
- Headers de segurança
- Compressão Gzip
- Proxy para Node.js

### **production.env.example**
Template completo de variáveis para produção:
- Banco PostgreSQL local
- JWT secrets
- Configurações de segurança
- Opcionais: email, Stripe, monitoramento

---

## 🔄 **FLUXO DE TRABALHO**

### **Deploy Inicial**
1. Executar `install-server.sh` no servidor
2. Copiar código da aplicação
3. Configurar arquivo `.env`
4. Executar `deploy-app.sh`
5. Criar primeiro usuário admin

### **Atualizações**
1. Atualizar código (Git push)
2. Executar `deploy-app.sh`
3. Verificar com `health-check.sh`

### **Manutenção**
- Backup automático diário
- Monitoramento via PM2
- Renovação SSL automática
- Verificação de saúde regular

---

## 🔍 **TROUBLESHOOTING**

### **Problemas Comuns**

#### Aplicação não inicia
```bash
# Verificar logs
sudo -u dpo-app pm2 logs dpo-fast-api

# Verificar configuração
sudo -u dpo-app pm2 restart dpo-fast-api
```

#### Banco de dados não conecta
```bash
# Verificar se PostgreSQL está rodando
sudo systemctl status postgresql

# Testar conexão
sudo -u postgres psql -d dpo_fast_production -c "SELECT version();"
```

#### SSL não funciona
```bash
# Verificar certificado
sudo certbot certificates

# Renovar manualmente
sudo certbot renew
```

#### Site não acessível
```bash
# Verificar Nginx
sudo nginx -t
sudo systemctl status nginx

# Verificar firewall
sudo ufw status
```

---

## 📞 **SUPORTE**

### **Logs Importantes**
- Aplicação: `/opt/dpo-fast/logs/`
- Nginx: `/var/log/nginx/`
- PostgreSQL: `/var/log/postgresql/`
- Sistema: `journalctl -f`

### **Comandos Úteis**
```bash
# Status geral
bash health-check.sh

# Logs em tempo real
sudo -u dpo-app pm2 logs dpo-fast-api --lines 50

# Reiniciar tudo
sudo systemctl restart nginx postgresql
sudo -u dpo-app pm2 restart all

# Backup manual
sudo -u dpo-app bash backup-system.sh
```

---

## 🎯 **RESULTADO FINAL**

Após executar todos os scripts, você terá:

✅ **Servidor Linux configurado** com todos os serviços  
✅ **Aplicação rodando** em https://seu-dominio.com  
✅ **Banco PostgreSQL local** funcionando  
✅ **SSL/HTTPS** configurado automaticamente  
✅ **Backup automático** diário  
✅ **Monitoramento** via PM2  
✅ **Logs centralizados** e organizados  

**🎉 Sua aplicação DPO Fast rodando 100% no seu servidor!**