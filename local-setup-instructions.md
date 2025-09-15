# 🚀 **Configuração para PostgreSQL Local**

## **📦 1. Dependências Instaladas**
- **bcrypt** - Para hash de senhas local
- **@types/bcrypt** - Tipos TypeScript

## **🔧 2. Componentes Criados**

### **Autenticação Local (`server/middleware/localAuth.ts`)**
- Substitui Supabase Auth
- Usa JWT para autenticação
- Hash de senhas com bcrypt
- Middleware `isAuthenticated` para rotas protegidas

### **Storage Local (`server/storage/localStorage.ts`)**
- Substitui Supabase Storage
- Usa sistema de arquivos local (`./uploads/documents/`)
- Upload, download, listagem e exclusão de arquivos
- URLs públicas via `/uploads/documents/`

### **Rotas de Autenticação (`server/routes/localAuth.ts`)**
- `POST /api/auth/register` - Cadastro de usuários
- `POST /api/auth/login` - Login com email/senha
- `GET /api/auth/user` - Obter usuário atual
- `POST /api/auth/logout` - Logout

### **Schema Atualizado (`shared/schema.ts`)**
- Campo `password` adicionado na tabela `users`
- Método `getAllUsers()` no storage

## **⚙️ 3. Configuração Local**

### **Variáveis de Ambiente (`.env`)**
```env
# PostgreSQL Local
DATABASE_URL="postgresql://usuario:senha@localhost:5432/dpo_fast_db"

# JWT Secret (mude em produção)
JWT_SECRET="your-super-secret-jwt-key-change-in-production"

# Outras configurações
NODE_ENV=development
PORT=5000
```

### **PostgreSQL Local**
```bash
# 1. Instalar PostgreSQL
sudo apt install postgresql postgresql-contrib  # Ubuntu
brew install postgresql                         # macOS

# 2. Criar banco de dados
sudo -u postgres createdb dpo_fast_db

# 3. Criar usuário
sudo -u postgres psql
CREATE USER dpo_user WITH PASSWORD 'sua_senha_aqui';
GRANT ALL PRIVILEGES ON DATABASE dpo_fast_db TO dpo_user;
\q
```

### **Migração do Schema**
```bash
# Aplicar schema no banco local
npm run db:push
```

## **🎯 4. Funcionamento**

### **Fluxo de Autenticação**
1. Usuário faz `POST /api/auth/register` ou `POST /api/auth/login`
2. Servidor gera JWT token
3. Frontend armazena token e envia em requisições: `Authorization: Bearer <token>`
4. Middleware `isAuthenticated` valida token e carrega usuário

### **Armazenamento de Arquivos**
1. Upload via `localStorageService.uploadFile()`
2. Arquivos salvos em `./uploads/documents/`
3. Servidos via Express static: `GET /uploads/documents/arquivo.pdf`

### **Banco de Dados**
- Usa Drizzle ORM (mantido)
- Conecta direto ao PostgreSQL local
- Todas as tabelas e relações mantidas

## **🔄 5. Próximos Passos**
1. Configurar PostgreSQL local
2. Atualizar `.env` com DATABASE_URL local
3. Executar `npm run db:push`
4. Testar login/cadastro local
5. Verificar upload de arquivos

## **🚫 6. Componentes Removidos**
- ❌ Supabase Auth
- ❌ Supabase Storage  
- ❌ Dependência de Supabase URLs

## **✅ 7. Componentes Mantidos**
- ✅ Drizzle ORM
- ✅ Express server
- ✅ Frontend React
- ✅ Todas as funcionalidades de negócio
- ✅ Estrutura de dados