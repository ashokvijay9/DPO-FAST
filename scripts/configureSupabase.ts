// Script para configurar conexão com Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

console.log('🔧 Configurando Supabase...')
console.log('📡 Supabase URL:', supabaseUrl)
console.log('🔑 Service Key:', serviceKey ? `${serviceKey.substring(0, 20)}...` : 'Não encontrada')

// Extract project reference from URL
const urlMatch = supabaseUrl.match(/https:\/\/([a-zA-Z0-9]+)\.supabase\.co/)
const projectRef = urlMatch ? urlMatch[1] : null

console.log('🎯 Project Reference:', projectRef)

if (projectRef) {
  // Construct database URL
  // For Supabase, the database URL is typically:
  // postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
  
  console.log('📋 Para conectar ao Supabase PostgreSQL:')
  console.log('1. Use a URL do formato: postgresql://postgres:[password]@db.' + projectRef + '.supabase.co:5432/postgres')
  console.log('2. A [password] é a senha do banco PostgreSQL (não a service key)')
  console.log('3. Você pode encontrar essa URL no painel do Supabase em Settings > Database')
  console.log('')
  console.log('🔗 Para obter a URL exata:')
  console.log('- Acesse: ' + supabaseUrl + '/project/' + projectRef + '/settings/database')
  console.log('- Copie a "Connection string" na aba Database')
  console.log('')
  console.log('⚡ Alternativamente, vamos usar uma conexão direta via API...')
  
} else {
  console.error('❌ Não foi possível extrair o project reference da URL:', supabaseUrl)
}

// Create a simple test to verify Supabase access
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(supabaseUrl, serviceKey)

async function testSupabaseConnection() {
  console.log('\n🧪 Testando conexão com Supabase...')
  
  try {
    // Try to get database info
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(5)
    
    if (error) {
      console.log('⚠️  Supabase vazio (esperado):', error.message)
    } else {
      console.log('📊 Tabelas existentes no Supabase:', data?.length || 0)
      if (data && data.length > 0) {
        console.log('📋 Tabelas:', data.map((t: any) => t.table_name).join(', '))
      }
    }
    
    console.log('✅ Conexão com Supabase funcionando!')
    return true
    
  } catch (error) {
    console.error('❌ Erro na conexão:', error)
    return false
  }
}

testSupabaseConnection().catch(console.error)