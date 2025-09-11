-- DPO LGPD Platform Schema para Supabase
-- Execute este script no painel SQL do Supabase

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de usuários
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

-- Tabela de perfis de empresa
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
  is_completed BOOLEAN DEFAULT FALSE,
  sectors JSONB,
  custom_sectors JSONB,
  employee_count_type VARCHAR,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Tabela de setores da empresa
CREATE TABLE IF NOT EXISTS company_sectors (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id),
  name VARCHAR,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Tabela de respostas do questionário
CREATE TABLE IF NOT EXISTS questionnaire_responses (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id),
  sector_id VARCHAR REFERENCES company_sectors(id),
  question_id INTEGER,
  answer JSONB,
  observations TEXT,
  is_complete BOOLEAN DEFAULT FALSE,
  compliance_score REAL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Tabela de documentos
CREATE TABLE IF NOT EXISTS documents (
  id VARCHAR PRIMARY KEY,
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
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Tabela de tarefas de compliance
CREATE TABLE IF NOT EXISTS compliance_tasks (
  id VARCHAR PRIMARY KEY,
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
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Tabela de relatórios de compliance
CREATE TABLE IF NOT EXISTS compliance_reports (
  id VARCHAR PRIMARY KEY,
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
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Tabela de log de auditoria
CREATE TABLE IF NOT EXISTS audit_log (
  id VARCHAR PRIMARY KEY,
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
  created_at TIMESTAMPTZ
);

-- Tabela de histórico de status de tarefas
CREATE TABLE IF NOT EXISTS task_status_history (
  id VARCHAR PRIMARY KEY,
  task_id VARCHAR REFERENCES compliance_tasks(id),
  previous_status VARCHAR,
  new_status VARCHAR,
  changed_by VARCHAR,
  notes TEXT,
  created_at TIMESTAMPTZ
);

-- Tabela de notificações
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id),
  title VARCHAR,
  message TEXT,
  type VARCHAR,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

-- Tabela de sessões (para autenticação)
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMPTZ NOT NULL
);

-- Inserir dados iniciais de usuários
INSERT INTO users (id, email, first_name, last_name, profile_image_url, company, subscription_status, stripe_customer_id, stripe_subscription_id, created_at, updated_at, subscription_plan, role, auth_user_id) VALUES 
('42035701', 'projetossolutiondev@gmail.com', 'Solution', 'Dev', null, 'Solution Soluções em TI', 'active', null, null, '2025-08-21T19:42:32.44422', '2025-09-03T12:55:36.796', 'pro', 'admin', null),
('32338362', 'felipesadrak2@gmail.com', 'Felipe Sadrak', 'dos Santos', 'https://storage.googleapis.com/replit/images/1712745603504_d49cf02af30d4d242b573692cce6858c.jpeg', null, 'inactive', null, null, '2025-08-26T17:36:25.990159', '2025-09-03T13:06:37.51', 'free', 'user', null)
ON CONFLICT (id) DO NOTHING;

-- Inserir dados da empresa
INSERT INTO company_profiles (id, user_id, company_name, departments, company_size, employee_count, industry, primary_contact, phone, address, is_completed, sectors, custom_sectors, employee_count_type, created_at, updated_at) VALUES 
('17da4cb0-e595-4401-8237-2ccb76024d7a', '42035701', 'Solution Soluções em TI', '["Recursos Humanos", "Financeiro", "Tecnologia da Informação", "Jurídico"]', 'small', '11', '', 'Wagner Ramos', '1125003068', '', true, '["Recursos Humanos", "Financeiro", "Tecnologia da Informação", "Jurídico"]', '[]', 'range', '2025-08-26T17:23:23.924387', '2025-08-26T17:23:23.924387')
ON CONFLICT (id) DO NOTHING;

-- Inserir setores da empresa
INSERT INTO company_sectors (id, user_id, name, description, is_active, created_at, updated_at) VALUES 
('e5f88f0d-8ec5-4cbc-ac84-b5c2ce42adf9', '42035701', 'Vendas', '', true, '2025-09-03T18:13:10.027302', '2025-09-03T18:13:10.027302'),
('f96450ea-baa9-41c1-922f-13d68f29d941', '42035701', 'Recursos Humanos', 'Setor importado do perfil da empresa', true, '2025-09-03T18:17:28.144157', '2025-09-03T18:17:28.144157'),
('4dcb165b-416e-4b36-a5a7-b5ccc1c5f255', '42035701', 'Financeiro', 'Setor importado do perfil da empresa', true, '2025-09-03T18:17:28.19311', '2025-09-03T18:17:28.19311'),
('d24ddc4c-5f96-4465-853e-ec290b8edd6c', '42035701', 'Tecnologia da Informação', 'Setor importado do perfil da empresa', true, '2025-09-03T18:17:28.235', '2025-09-03T18:17:28.235'),
('43960bb3-584a-4d49-955f-89fa4dba2924', '42035701', 'Jurídico', 'Setor importado do perfil da empresa', true, '2025-09-03T18:17:28.277024', '2025-09-03T18:17:28.277024')
ON CONFLICT (id) DO NOTHING;

-- Inserir documento
INSERT INTO documents (id, user_id, name, category, file_name, file_size, file_type, file_url, status, questionnaire_response_id, description, created_at, updated_at) VALUES 
('3edca6e5-8ba3-48ad-95e9-e64a765c44bc', '42035701', 'RelaÃ§Ã£o de perguntas para mapeamento software DPO.docx', 'compliance_task', 'RelaÃ§Ã£o de perguntas para mapeamento software DPO.docx', 21898, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '/uploads/e59b0d30c853d7441caa9a2d4d12f6bd', 'valid', null, 'Documento anexado à tarefa: Implementar Medidas de Segurança', '2025-09-03T12:43:05.644911', '2025-09-03T12:43:05.644911')
ON CONFLICT (id) DO NOTHING;

-- Sucesso!
SELECT 'Schema DPO LGPD aplicado com sucesso no Supabase!' as status;