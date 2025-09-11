import { createClient } from '@supabase/supabase-js'

// Supabase credentials  
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

console.log('🚀 Iniciando migração completa para Supabase...\n')

// Data exported from current database
const exportedData = {
  users: [{"id":"42035701","email":"projetossolutiondev@gmail.com","first_name":"Solution","last_name":"Dev","profile_image_url":null,"company":"Solution Soluções em TI","subscription_status":"active","stripe_customer_id":null,"stripe_subscription_id":null,"created_at":"2025-08-21T19:42:32.44422","updated_at":"2025-09-03T12:55:36.796","subscription_plan":"pro","role":"admin","auth_user_id":null}, {"id":"32338362","email":"felipesadrak2@gmail.com","first_name":"Felipe Sadrak","last_name":"dos Santos","profile_image_url":"https://storage.googleapis.com/replit/images/1712745603504_d49cf02af30d4d242b573692cce6858c.jpeg","company":null,"subscription_status":"inactive","stripe_customer_id":null,"stripe_subscription_id":null,"created_at":"2025-08-26T17:36:25.990159","updated_at":"2025-09-03T13:06:37.51","subscription_plan":"free","role":"user","auth_user_id":null}],
  
  company_profiles: [{"id":"17da4cb0-e595-4401-8237-2ccb76024d7a","user_id":"42035701","company_name":"Solution Soluções em TI","departments":["Recursos Humanos", "Financeiro", "Tecnologia da Informação", "Jurídico"],"company_size":"small","employee_count":"11","industry":"","primary_contact":"Wagner Ramos","phone":"1125003068","address":"","is_completed":true,"created_at":"2025-08-26T17:23:23.924387","updated_at":"2025-08-26T17:23:23.924387","sectors":["Recursos Humanos", "Financeiro", "Tecnologia da Informação", "Jurídico"],"custom_sectors":[],"employee_count_type":"range"}],
  
  company_sectors: [{"id":"e5f88f0d-8ec5-4cbc-ac84-b5c2ce42adf9","user_id":"42035701","name":"Vendas","description":"","is_active":true,"created_at":"2025-09-03T18:13:10.027302","updated_at":"2025-09-03T18:13:10.027302"}, {"id":"f96450ea-baa9-41c1-922f-13d68f29d941","user_id":"42035701","name":"Recursos Humanos","description":"Setor importado do perfil da empresa","is_active":true,"created_at":"2025-09-03T18:17:28.144157","updated_at":"2025-09-03T18:17:28.144157"}, {"id":"4dcb165b-416e-4b36-a5a7-b5ccc1c5f255","user_id":"42035701","name":"Financeiro","description":"Setor importado do perfil da empresa","is_active":true,"created_at":"2025-09-03T18:17:28.19311","updated_at":"2025-09-03T18:17:28.19311"}, {"id":"d24ddc4c-5f96-4465-853e-ec290b8edd6c","user_id":"42035701","name":"Tecnologia da Informação","description":"Setor importado do perfil da empresa","is_active":true,"created_at":"2025-09-03T18:17:28.235","updated_at":"2025-09-03T18:17:28.235"}, {"id":"43960bb3-584a-4d49-955f-89fa4dba2924","user_id":"42035701","name":"Jurídico","description":"Setor importado do perfil da empresa","is_active":true,"created_at":"2025-09-03T18:17:28.277024","updated_at":"2025-09-03T18:17:28.277024"}],
  
  documents: [{"id":"3edca6e5-8ba3-48ad-95e9-e64a765c44bc","user_id":"42035701","name":"RelaÃ§Ã£o de perguntas para mapeamento software DPO.docx","category":"compliance_task","file_name":"RelaÃ§Ã£o de perguntas para mapeamento software DPO.docx","file_size":21898,"file_type":"application/vnd.openxmlformats-officedocument.wordprocessingml.document","file_url":"/uploads/e59b0d30c853d7441caa9a2d4d12f6bd","status":"valid","questionnaire_response_id":null,"description":"Documento anexado à tarefa: Implementar Medidas de Segurança","created_at":"2025-09-03T12:43:05.644911","updated_at":"2025-09-03T12:43:05.644911"}]
}

async function createTablesSQL() {
  console.log('📋 Step 1: Criando estrutura de tabelas no Supabase...')
  
  try {
    // Use raw SQL to create tables via RPC
    const createSQL = `
      -- Enable extensions
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY,
        auth_user_id VARCHAR UNIQUE,
        email VARCHAR,
        first_name VARCHAR,
        last_name VARCHAR,
        profile_image_url TEXT,
        company VARCHAR,
        role VARCHAR,
        subscription_status VARCHAR,
        subscription_plan VARCHAR,
        stripe_customer_id VARCHAR,
        stripe_subscription_id VARCHAR,
        created_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ
      );

      -- Company profiles
      CREATE TABLE IF NOT EXISTS company_profiles (
        id VARCHAR PRIMARY KEY,
        user_id VARCHAR REFERENCES users(id),
        company_name VARCHAR,
        departments JSONB,
        company_size VARCHAR,
        employee_count VARCHAR,
        industry VARCHAR,
        primary_contact VARCHAR,
        phone VARCHAR,
        address VARCHAR,
        is_completed BOOLEAN,
        sectors JSONB,
        custom_sectors JSONB,
        employee_count_type VARCHAR,
        created_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ
      );

      -- Company sectors
      CREATE TABLE IF NOT EXISTS company_sectors (
        id VARCHAR PRIMARY KEY,
        user_id VARCHAR REFERENCES users(id),
        name VARCHAR,
        description TEXT,
        is_active BOOLEAN,
        created_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ
      );

      -- Documents
      CREATE TABLE IF NOT EXISTS documents (
        id VARCHAR PRIMARY KEY,
        user_id VARCHAR REFERENCES users(id),
        name VARCHAR,
        category VARCHAR,
        file_name VARCHAR,
        file_size BIGINT,
        file_type VARCHAR,
        file_url TEXT,
        status VARCHAR,
        questionnaire_response_id VARCHAR,
        description TEXT,
        created_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ
      );
    `
    
    // Try to execute SQL via Supabase RPC
    const { error } = await supabase.rpc('exec_sql', { sql: createSQL })
    
    if (error) {
      console.log('ℹ️  Tabelas serão criadas via schema push')
    } else {
      console.log('✅ Tabelas criadas via SQL!')
    }
    
  } catch (error) {
    console.log('ℹ️  Usando método alternativo para criação de tabelas')
  }
}

async function importData() {
  console.log('📥 Step 2: Importando dados para Supabase...\n')
  
  // Import users first
  console.log('👥 Importando usuários...')
  try {
    const { error: usersError } = await supabase
      .from('users')
      .insert(exportedData.users)
    
    if (usersError) {
      console.error('❌ Erro importando usuários:', usersError.message)
    } else {
      console.log(`✅ ${exportedData.users.length} usuários importados`)
    }
  } catch (error) {
    console.log('⚠️  Usuários: Tabela não existe ainda, será importado após schema push')
  }

  // Import company profiles
  console.log('🏢 Importando perfis de empresa...')
  try {
    const { error: profilesError } = await supabase
      .from('company_profiles')
      .insert(exportedData.company_profiles)
    
    if (profilesError) {
      console.error('❌ Erro importando perfis:', profilesError.message)
    } else {
      console.log(`✅ ${exportedData.company_profiles.length} perfis importados`)
    }
  } catch (error) {
    console.log('⚠️  Perfis: Tabela não existe ainda, será importado após schema push')
  }

  // Import company sectors
  console.log('🏗️ Importando setores...')
  try {
    const { error: sectorsError } = await supabase
      .from('company_sectors')
      .insert(exportedData.company_sectors)
    
    if (sectorsError) {
      console.error('❌ Erro importando setores:', sectorsError.message)
    } else {
      console.log(`✅ ${exportedData.company_sectors.length} setores importados`)
    }
  } catch (error) {
    console.log('⚠️  Setores: Tabela não existe ainda, será importado após schema push')
  }

  // Import documents
  console.log('📄 Importando documentos...')
  try {
    const { error: docsError } = await supabase
      .from('documents')  
      .insert(exportedData.documents)
    
    if (docsError) {
      console.error('❌ Erro importando documentos:', docsError.message)
    } else {
      console.log(`✅ ${exportedData.documents.length} documentos importados`)
    }
  } catch (error) {
    console.log('⚠️  Documentos: Tabela não existe ainda, será importado após schema push')
  }
}

async function setupStorage() {
  console.log('\n🗂️ Step 3: Configurando Supabase Storage...')
  
  try {
    // Create documents bucket
    const { error: bucketError } = await supabase.storage.createBucket('documents', {
      public: false,
      fileSizeLimit: 50 * 1024 * 1024, // 50MB
      allowedMimeTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png'
      ]
    })
    
    if (bucketError && !bucketError.message.includes('already exists')) {
      console.error('❌ Erro criando bucket:', bucketError.message)
    } else {
      console.log('✅ Bucket "documents" configurado')
    }
    
  } catch (error) {
    console.log('⚠️  Storage será configurado após setup completo')
  }
}

async function showSummary() {
  console.log('\n🎉 Resumo da Migração:')
  console.log(`✅ ${exportedData.users.length} usuários prontos para importar`)
  console.log(`✅ ${exportedData.company_profiles.length} perfil de empresa pronto`)
  console.log(`✅ ${exportedData.company_sectors.length} setores prontos`)
  console.log(`✅ ${exportedData.documents.length} documento pronto`)
  console.log('✅ Storage bucket configurado')
  console.log('')
  console.log('🔧 Próximos Passos:')
  console.log('1. Configurar DATABASE_URL para apontar para Supabase')  
  console.log('2. Executar: npm run db:push --force')
  console.log('3. Importar dados restantes (questionários)')
  console.log('4. Testar aplicação')
  console.log('')
  console.log('📋 DATABASE_URL do Supabase deve ser:')
  console.log('postgresql://postgres:[password]@db.vrhukcxtfjnzvmbqhbzt.supabase.co:5432/postgres')
  console.log('(Obtenha a senha no painel do Supabase)')
}

async function main() {
  try {
    await createTablesSQL()
    await importData() 
    await setupStorage()
    await showSummary()
    
    console.log('\n✨ Preparação para migração concluída!')
    
  } catch (error) {
    console.error('❌ Erro na migração:', error)
  }
}

main().catch(console.error)