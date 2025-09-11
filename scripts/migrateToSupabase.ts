import { Pool } from '@neondatabase/serverless'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Current Neon database
const currentDbUrl = process.env.DATABASE_URL_CURRENT || ''
const currentPool = new Pool({ connectionString: currentDbUrl })

// Supabase database
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabaseDbUrl = process.env.DATABASE_URL || '' // This should be the Supabase connection string

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const supabasePool = new Pool({ connectionString: supabaseDbUrl })

async function exportData() {
  console.log('🔄 Exporting data from current database...')
  
  const client = await currentPool.connect()
  
  try {
    // Export users
    const usersResult = await client.query('SELECT * FROM users ORDER BY created_at')
    
    // Export company_profiles
    const profilesResult = await client.query('SELECT * FROM company_profiles ORDER BY created_at')
    
    // Export company_sectors
    const sectorsResult = await client.query('SELECT * FROM company_sectors ORDER BY created_at')
    
    // Export questionnaire_responses
    const responsesResult = await client.query('SELECT * FROM questionnaire_responses ORDER BY created_at')
    
    // Export documents
    const documentsResult = await client.query('SELECT * FROM documents ORDER BY created_at')
    
    // Export compliance_tasks
    const tasksResult = await client.query('SELECT * FROM compliance_tasks ORDER BY created_at')
    
    // Export compliance_reports
    const reportsResult = await client.query('SELECT * FROM compliance_reports ORDER BY created_at')
    
    // Export audit_log
    const auditResult = await client.query('SELECT * FROM audit_log ORDER BY created_at')
    
    const exportData = {
      users: usersResult.rows,
      company_profiles: profilesResult.rows,
      company_sectors: sectorsResult.rows,
      questionnaire_responses: responsesResult.rows,
      documents: documentsResult.rows,
      compliance_tasks: tasksResult.rows,
      compliance_reports: reportsResult.rows,
      audit_log: auditResult.rows,
      exported_at: new Date().toISOString()
    }
    
    // Save export to file
    const exportPath = path.join(process.cwd(), 'migration_export.json')
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2))
    
    console.log(`✅ Data exported successfully to ${exportPath}`)
    console.log(`📊 Export summary:`)
    console.log(`   - Users: ${exportData.users.length}`)
    console.log(`   - Company Profiles: ${exportData.company_profiles.length}`)
    console.log(`   - Company Sectors: ${exportData.company_sectors.length}`)
    console.log(`   - Questionnaire Responses: ${exportData.questionnaire_responses.length}`)
    console.log(`   - Documents: ${exportData.documents.length}`)
    console.log(`   - Compliance Tasks: ${exportData.compliance_tasks.length}`)
    console.log(`   - Compliance Reports: ${exportData.compliance_reports.length}`)
    console.log(`   - Audit Logs: ${exportData.audit_log.length}`)
    
    return exportData
    
  } finally {
    client.release()
  }
}

async function importData(data: any) {
  console.log('🔄 Importing data to Supabase...')
  
  const client = await supabasePool.connect()
  
  try {
    // Import in order of dependencies
    
    // 1. Users first (no dependencies)
    if (data.users.length > 0) {
      console.log('📥 Importing users...')
      for (const user of data.users) {
        await client.query(
          `INSERT INTO users (id, email, first_name, last_name, profile_image_url, company, role, subscription_status, subscription_plan, stripe_customer_id, stripe_subscription_id, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
           ON CONFLICT (id) DO NOTHING`,
          [user.id, user.email, user.first_name, user.last_name, user.profile_image_url, user.company, user.role, user.subscription_status, user.subscription_plan, user.stripe_customer_id, user.stripe_subscription_id, user.created_at, user.updated_at]
        )
      }
    }
    
    // 2. Company profiles (depends on users)
    if (data.company_profiles.length > 0) {
      console.log('📥 Importing company profiles...')
      for (const profile of data.company_profiles) {
        await client.query(
          `INSERT INTO company_profiles (id, user_id, company_name, industry, size, address, phone, website, tax_id, legal_representative, dpo_name, dpo_email, dpo_phone, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) 
           ON CONFLICT (id) DO NOTHING`,
          [profile.id, profile.user_id, profile.company_name, profile.industry, profile.size, profile.address, profile.phone, profile.website, profile.tax_id, profile.legal_representative, profile.dpo_name, profile.dpo_email, profile.dpo_phone, profile.created_at, profile.updated_at]
        )
      }
    }
    
    // 3. Company sectors (depends on users)
    if (data.company_sectors.length > 0) {
      console.log('📥 Importing company sectors...')
      for (const sector of data.company_sectors) {
        await client.query(
          `INSERT INTO company_sectors (id, user_id, name, description, is_active, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7) 
           ON CONFLICT (id) DO NOTHING`,
          [sector.id, sector.user_id, sector.name, sector.description, sector.is_active, sector.created_at, sector.updated_at]
        )
      }
    }
    
    // 4. Questionnaire responses (depends on users and sectors)
    if (data.questionnaire_responses.length > 0) {
      console.log('📥 Importing questionnaire responses...')
      for (const response of data.questionnaire_responses) {
        await client.query(
          `INSERT INTO questionnaire_responses (id, user_id, sector_id, question_id, answer, observations, is_complete, compliance_score, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
           ON CONFLICT (id) DO NOTHING`,
          [response.id, response.user_id, response.sector_id, response.question_id, response.answer, response.observations, response.is_complete, response.compliance_score, response.created_at, response.updated_at]
        )
      }
    }
    
    // 5. Documents (depends on users and questionnaire_responses)
    if (data.documents.length > 0) {
      console.log('📥 Importing documents...')
      for (const doc of data.documents) {
        await client.query(
          `INSERT INTO documents (id, user_id, name, category, file_name, file_size, file_type, file_url, status, questionnaire_response_id, description, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
           ON CONFLICT (id) DO NOTHING`,
          [doc.id, doc.user_id, doc.name, doc.category, doc.file_name, doc.file_size, doc.file_type, doc.file_url, doc.status, doc.questionnaire_response_id, doc.description, doc.created_at, doc.updated_at]
        )
      }
    }
    
    // 6. Compliance tasks (depends on users)
    if (data.compliance_tasks.length > 0) {
      console.log('📥 Importing compliance tasks...')
      for (const task of data.compliance_tasks) {
        await client.query(
          `INSERT INTO compliance_tasks (id, user_id, title, description, category, priority, status, due_date, completed_at, created_by, assigned_to, questionnaire_response_id, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
           ON CONFLICT (id) DO NOTHING`,
          [task.id, task.user_id, task.title, task.description, task.category, task.priority, task.status, task.due_date, task.completed_at, task.created_by, task.assigned_to, task.questionnaire_response_id, task.created_at, task.updated_at]
        )
      }
    }
    
    // 7. Compliance reports (depends on users)
    if (data.compliance_reports.length > 0) {
      console.log('📥 Importing compliance reports...')
      for (const report of data.compliance_reports) {
        await client.query(
          `INSERT INTO compliance_reports (id, user_id, title, content, report_type, status, generated_at, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
           ON CONFLICT (id) DO NOTHING`,
          [report.id, report.user_id, report.title, report.content, report.report_type, report.status, report.generated_at, report.created_at, report.updated_at]
        )
      }
    }
    
    // 8. Audit log (depends on users)
    if (data.audit_log.length > 0) {
      console.log('📥 Importing audit logs...')
      for (const log of data.audit_log) {
        await client.query(
          `INSERT INTO audit_log (id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
           ON CONFLICT (id) DO NOTHING`,
          [log.id, log.user_id, log.action, log.resource_type, log.resource_id, log.details, log.ip_address, log.user_agent, log.created_at]
        )
      }
    }
    
    console.log('✅ Data import completed successfully!')
    
  } finally {
    client.release()
  }
}

async function migrateFiles() {
  console.log('🔄 Migrating files to Supabase Storage...')
  
  const uploadsDir = path.join(process.cwd(), 'uploads')
  
  if (!fs.existsSync(uploadsDir)) {
    console.log('📁 No uploads directory found, skipping file migration')
    return
  }
  
  const files = fs.readdirSync(uploadsDir, { withFileTypes: true })
    .filter(dirent => dirent.isFile())
    .map(dirent => dirent.name)
  
  console.log(`📁 Found ${files.length} files to migrate`)
  
  for (const fileName of files) {
    try {
      const filePath = path.join(uploadsDir, fileName)
      const fileBuffer = fs.readFileSync(filePath)
      const stats = fs.statSync(filePath)
      
      // Determine content type based on file extension
      const ext = path.extname(fileName).toLowerCase()
      let contentType = 'application/octet-stream'
      
      switch (ext) {
        case '.pdf':
          contentType = 'application/pdf'
          break
        case '.doc':
          contentType = 'application/msword'
          break
        case '.docx':
          contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          break
        case '.jpg':
        case '.jpeg':
          contentType = 'image/jpeg'
          break
        case '.png':
          contentType = 'image/png'
          break
      }
      
      // Upload to Supabase Storage
      const { data, error } = await supabaseAdmin.storage
        .from('documents')
        .upload(`migrated/${fileName}`, fileBuffer, {
          contentType,
          upsert: true
        })
      
      if (error) {
        console.error(`❌ Failed to upload ${fileName}: ${error.message}`)
      } else {
        console.log(`✅ Uploaded ${fileName} (${stats.size} bytes)`)
      }
      
    } catch (error) {
      console.error(`❌ Error processing file ${fileName}:`, error)
    }
  }
  
  console.log('✅ File migration completed!')
}

async function main() {
  try {
    console.log('🚀 Starting migration to Supabase...\n')
    
    // Step 1: Export current data
    const exportedData = await exportData()
    
    console.log('\n')
    
    // Step 2: Import to Supabase
    await importData(exportedData)
    
    console.log('\n')
    
    // Step 3: Migrate files
    await migrateFiles()
    
    console.log('\n✨ Migration completed successfully!')
    console.log('🔧 Next steps:')
    console.log('   1. Update DATABASE_URL to point to Supabase')
    console.log('   2. Test the application with Supabase')
    console.log('   3. Update file URLs in documents table to use Supabase Storage')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await currentPool.end()
    await supabasePool.end()
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export { main as migrateToSupabase }