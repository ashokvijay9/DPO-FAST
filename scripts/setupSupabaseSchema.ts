import { Pool } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import * as schema from '../shared/schema.js'

// Get Supabase connection URL from DATABASE_URL environment variable
const supabaseDbUrl = process.env.DATABASE_URL || ''

console.log('🚀 Setting up Supabase schema...')
console.log(`📡 Connecting to: ${supabaseDbUrl.substring(0, 30)}...`)

const pool = new Pool({ connectionString: supabaseDbUrl })
const db = drizzle(pool, { schema })

async function createTables() {
  console.log('📋 Creating tables in Supabase...')
  
  try {
    // Check if tables already exist
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `)
    
    console.log(`📊 Found ${result.rows.length} existing tables`)
    
    if (result.rows.length === 0) {
      console.log('🆕 No tables found - Supabase is empty, ready for schema application')
    } else {
      console.log('📋 Existing tables:', result.rows.map(r => r.table_name).join(', '))
    }
    
    console.log('✅ Schema setup completed!')
    console.log('🔧 Next step: Run `npm run db:push` to apply complete schema to Supabase')
    
  } catch (error) {
    console.error('❌ Error setting up schema:', error)
    throw error
  } finally {
    await pool.end()
  }
}

createTables().catch(console.error)