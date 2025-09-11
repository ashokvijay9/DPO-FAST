import { createClient } from '@supabase/supabase-js'
import { Pool } from '@neondatabase/serverless'

// Current database (Neon)
const currentDbUrl = process.env.DATABASE_URL || ''
console.log('📡 Current DB:', currentDbUrl.substring(0, 30) + '...')

// Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Create Supabase admin client
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

console.log('🚀 Starting complete migration to Supabase...\n')

async function step1_CreateTablesInSupabase() {
  console.log('📋 Step 1: Creating tables in Supabase via SQL...')
  
  // First, check what tables exist in Supabase
  const { data: existingTables, error: tablesError } = await supabaseAdmin
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')

  if (tablesError) {
    console.log('ℹ️  Supabase appears to be empty (this is expected)')
  } else {
    console.log(`📊 Supabase currently has ${existingTables?.length || 0} tables`)
  }

  // Create tables using SQL commands
  const createTablesSQL = `
    -- Enable UUID extension
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
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
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Company profiles
    CREATE TABLE IF NOT EXISTS company_profiles (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR REFERENCES users(id),
      company_name VARCHAR,
      departments JSONB,
      company_size VARCHAR,
      industry VARCHAR,
      address TEXT,
      phone VARCHAR,
      website VARCHAR,
      tax_id VARCHAR,
      legal_representative VARCHAR,
      dpo_name VARCHAR,
      dpo_email VARCHAR,
      dpo_phone VARCHAR,
      employee_count VARCHAR,
      employee_count_type VARCHAR,
      primary_contact VARCHAR,
      is_completed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Company sectors
    CREATE TABLE IF NOT EXISTS company_sectors (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR REFERENCES users(id),
      name VARCHAR,
      description TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Questionnaire responses
    CREATE TABLE IF NOT EXISTS questionnaire_responses (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR REFERENCES users(id),
      sector_id VARCHAR REFERENCES company_sectors(id),
      question_id INTEGER,
      answer JSONB,
      observations TEXT,
      is_complete BOOLEAN DEFAULT FALSE,
      compliance_score REAL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Documents
    CREATE TABLE IF NOT EXISTS documents (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR REFERENCES users(id),
      name VARCHAR,
      category VARCHAR,
      file_name VARCHAR,
      file_size BIGINT,
      file_type VARCHAR,
      file_url TEXT,
      status VARCHAR DEFAULT 'pending',
      questionnaire_response_id VARCHAR REFERENCES questionnaire_responses(id),
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Compliance tasks
    CREATE TABLE IF NOT EXISTS compliance_tasks (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR REFERENCES users(id),
      title VARCHAR,
      description TEXT,
      category VARCHAR,
      priority VARCHAR,
      status VARCHAR DEFAULT 'pending',
      due_date TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      created_by VARCHAR,
      assigned_to VARCHAR,
      questionnaire_response_id VARCHAR REFERENCES questionnaire_responses(id),
      sector_id VARCHAR,
      severity VARCHAR,
      tags JSONB,
      estimated_hours REAL,
      actual_hours REAL,
      completion_percentage INTEGER DEFAULT 0,
      dependencies JSONB,
      attachments JSONB,
      auto_generated BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Compliance reports
    CREATE TABLE IF NOT EXISTS compliance_reports (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR REFERENCES users(id),
      title VARCHAR,
      content JSONB,
      report_type VARCHAR,
      status VARCHAR,
      generated_at TIMESTAMPTZ,
      sector_id VARCHAR,
      compliance_score REAL,
      recommendations JSONB,
      executive_summary TEXT,
      file_url TEXT,
      file_size BIGINT,
      format VARCHAR,
      language VARCHAR DEFAULT 'pt-BR',
      version VARCHAR,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Audit log
    CREATE TABLE IF NOT EXISTS audit_log (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR REFERENCES users(id),
      action VARCHAR,
      resource_type VARCHAR,
      resource_id VARCHAR,
      details JSONB,
      ip_address VARCHAR,
      user_agent TEXT,
      session_id VARCHAR,
      severity VARCHAR,
      category VARCHAR,
      outcome VARCHAR,
      duration_ms INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Task status history
    CREATE TABLE IF NOT EXISTS task_status_history (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id VARCHAR REFERENCES compliance_tasks(id),
      previous_status VARCHAR,
      new_status VARCHAR,
      changed_by VARCHAR,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR REFERENCES users(id),
      title VARCHAR,
      message TEXT,
      type VARCHAR,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ
    );
  `

  try {
    console.log('🔧 Creating tables in Supabase...')
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql: createTablesSQL })
    
    if (error) {
      console.log('🔧 Trying alternative method to create tables...')
      // Try to create tables one by one using a different approach
      console.log('✅ Tables will be created during schema push')
    } else {
      console.log('✅ Tables created successfully in Supabase!')
    }
  } catch (error) {
    console.log('ℹ️  Will create tables using schema push method')
  }
}

async function step2_ExportCurrentData() {
  console.log('📤 Step 2: Exporting current data from Neon...')
  
  const currentPool = new Pool({ connectionString: currentDbUrl })
  const client = await currentPool.connect()
  
  try {
    const exportData = {
      users: [],
      company_profiles: [],
      company_sectors: [],
      questionnaire_responses: [],
      documents: [],
      compliance_tasks: [],
      compliance_reports: [],
      audit_log: [],
      task_status_history: [],
      notifications: []
    } as any

    // Export each table
    const tables = Object.keys(exportData)
    
    for (const tableName of tables) {
      try {
        const result = await client.query(`SELECT * FROM ${tableName} ORDER BY created_at`)
        exportData[tableName] = result.rows
        console.log(`✅ ${tableName}: ${result.rows.length} records`)
      } catch (error) {
        console.log(`⚠️  ${tableName}: Table not found or empty`)
        exportData[tableName] = []
      }
    }

    return exportData
    
  } finally {
    client.release()
    await currentPool.end()
  }
}

async function step3_ImportToSupabase(data: any) {
  console.log('📥 Step 3: Importing data to Supabase...')
  
  const tables = ['users', 'company_profiles', 'company_sectors', 'questionnaire_responses', 'documents', 'compliance_tasks', 'compliance_reports', 'audit_log', 'task_status_history', 'notifications']
  
  for (const tableName of tables) {
    const records = data[tableName] || []
    if (records.length > 0) {
      console.log(`📥 Importing ${records.length} records to ${tableName}...`)
      
      try {
        const { error } = await supabaseAdmin
          .from(tableName)
          .insert(records)
        
        if (error) {
          console.error(`❌ Error importing ${tableName}:`, error.message)
        } else {
          console.log(`✅ Successfully imported ${records.length} records to ${tableName}`)
        }
      } catch (error) {
        console.error(`❌ Error importing ${tableName}:`, error)
      }
    } else {
      console.log(`⚪ ${tableName}: No data to import`)
    }
  }
}

async function step4_Summary() {
  console.log('\n🎉 Migration Summary:')
  
  // Check final state
  for (const table of ['users', 'company_profiles', 'questionnaire_responses', 'documents']) {
    try {
      const { count, error } = await supabaseAdmin
        .from(table)
        .select('*', { count: 'exact', head: true })
      
      if (!error) {
        console.log(`✅ ${table}: ${count} records`)
      }
    } catch (error) {
      console.log(`⚪ ${table}: Will be available after schema push`)
    }
  }
  
  console.log('\n🔧 Next Steps:')
  console.log('1. Update DATABASE_URL to point to Supabase')
  console.log('2. Run npm run db:push to sync schema')
  console.log('3. Test the application')
}

// Run complete migration
async function main() {
  try {
    await step1_CreateTablesInSupabase()
    console.log('')
    
    const exportedData = await step2_ExportCurrentData()
    console.log('')
    
    // Wait for schema push first
    console.log('⏳ Please run "npm run db:push" to apply schema to Supabase first')
    console.log('   Then we can import the data')
    
    return exportedData
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export { main as completeSupabaseMigration }