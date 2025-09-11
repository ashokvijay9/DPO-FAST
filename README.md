# DPO Fast - Micro-SaaS para Adequação à LGPD

## 📖 Descrição
O **DPO Fast** é um Micro-SaaS (Software as a Service) projetado para ajudar empresas a avaliarem e melhorarem sua conformidade com a Lei Geral de Proteção de Dados (LGPD) no Brasil. Ele oferece uma plataforma intuitiva para assinantes realizarem avaliações através de questionários iterativos, gerarem relatórios personalizados por setor da empresa, gerenciarem to-do lists de ações corretivas e enviarem documentos para validação por uma equipe de Data Protection Officers (DPOs). O sistema promove a adequação à LGPD de forma eficiente, com foco em segurança, escalabilidade e usabilidade.

O nome "DPO Fast" reflete o foco em agilizar o processo de designação e gestão de um Data Protection Officer (DPO), facilitando a conformidade regulatória para pequenas e médias empresas.

 ⚙️ Funcionalidades Principais
### 👤 Para Assinantes (Usuários)
- **Cadastro e Login**: Sistema de autenticação seguro com suporte a e-mail/senha e provedores como Google.
- **Gerenciamento de Setores**: Os usuários podem cadastrar setores da empresa (ex.: RH, TI, Vendas) para avaliações personalizadas.
- **Questionário Iterativo**: Um formulário dinâmico adaptado por setor, com perguntas sobre conformidade à LGPD. Permite anexar documentos e calcular o nível de adequação.
- **Geração de Relatórios**: Relatórios em PDF gerados por setor, usando IA (Qwen AI) para analisar respostas, destacar conformidades, não conformidades e to-do lists. Inclui resumo, percentual de adequação e recomendações.
- **To-Do Lists**: Funciona como tarefas do Microsoft Teams. Cada item da lista (gerado a partir de não conformidades) permite anexar documentos, adicionar comentários e enviar para validação. Após envio, o status é atualizado (pendente, em revisão, aprovado ou revogado), com possibilidade de reenvio em caso de rejeição.
- **Gerenciamento de Documentos**: Seção para visualizar, baixar e gerenciar documentos anexados e relatórios gerados.
- **Assinaturas**: Integração com Stripe para planos mensais/anuais, controlando acesso baseado no status de pagamento.
- **Notificações**: Alertas por e-mail para confirmações, aprovações/rejeições e atualizações de status.

### 👨‍💼 Para Admins (Equipe de DPOs)
- **Painel Administrativo**: Acesso restrito para revisar documentos e tarefas enviadas pelos assinantes.
- **Lista de Assinantes e Métricas**: Visão geral de assinantes ativos, documentos pendentes e métricas avançadas (ex.: gráficos de níveis de adequação).
- **Revisão de Documentos e Tarefas**: Aprovar ou revogar (rejeitar com motivo) documentos e tarefas, atualizando status e notificando assinantes.
- **Visualização de Relatórios**: Acesso a relatórios por setor para validação consolidada.
- **Auditoria**: Registro automático de ações para rastreabilidade.

## 🔄 Fluxo Geral de Funcionamento
1. O assinante se cadastra, configura setores e responde ao questionário por setor.
2. O sistema usa Qwen AI para gerar relatórios e to-do lists por setor.
3. O assinante completa tarefas na to-do list, anexa documentos e envia para validação.
4. Admins revisam no painel, aprovam/revogam e notificam.
5. Após aprovações, o progresso é atualizado, e relatórios finais são gerados para comprovação de adequação.

## 🛠️ Tecnologias Utilizadas
- **Frontend**: React, HTML, CSS, JavaScript, TypeScript para interfaces responsivas e intuitivas.
- **Backend e Banco de Dados**: Supabase (PostgreSQL para dados relacionais, Auth para autenticação, Storage para arquivos). Migrado de Replit Database para maior escalabilidade e funcionalidades relacionais.
- **Integrações Externas**:
  - Stripe para gerenciamento de assinaturas e pagamentos.
- **Hospedagem**: Firebase Hosting (para escalabilidade automática), com integração ao Supabase como backend principal.

## 🚀 Instalação e Configuração
### Requisitos
- Conta no Supabase (para banco de dados, auth e storage).
- Conta no Stripe (para assinaturas).
- Conta no Firebase (para hosting e extensões, se mantido híbrido).

### 📋 Passos de Configuração
1. **Clone o Repositório**:
   ```
   git clone https://github.com/seu-repo/dpo-fast.git
   cd dpo-fast
   ```

2. **Configurar Supabase**:
   - Crie um projeto no dashboard do Supabase.
   - Defina tabelas no PostgreSQL (ex.: users, respostas, documentos) com Row Level Security (RLS) para acessos restritos.
   - Configure Auth com provedores desejados.
   - Crie buckets no Storage para documentos.
   - Adicione variáveis de ambiente no arquivo `.env` ou no ambiente de deploy:
     ```
     SUPABASE_URL=seu-supabase-url
     SUPABASE_KEY=seu-supabase-key
     ```

3. **Instalar Dependências**:
   - Para o frontend (se usando npm): `npm install supabase-js stripe bootstrap chart.js`.
   - Integre o cliente Supabase no JS para autenticação e queries.

4. **Configurar Stripe e Qwen AI**:
   - No dashboard do Stripe, crie produtos para planos de assinatura.
   - Obtenha API keys e configure webhooks para atualizações de status.
   - Para Qwen AI, configure prompts personalizados na API e integre chamadas no código de geração de relatórios.

5. **Migrar Dados (se aplicável)**:
   - Exporte dados antigos (ex.: de Replit DB) para JSON/CSV.
   - Importe para Supabase usando o dashboard ou scripts.

6. **Deploy**:
   - Use Firebase CLI para hospedar: `firebase deploy`.
   - Ou deploy no Replit/Vercel/Netlify, configurando o Supabase como backend remoto.

### Ambiente de Desenvolvimento
- Use VS Code ou Replit para edição.
- Teste localmente com Supabase emuladores (se disponível) ou ambiente de staging.

## Uso
- **Para Assinantes**: Acesse via navegador, cadastre-se, configure setores, responda questionários e gerencie to-do lists.
- **Para Admins**: Login com role "admin"; revise envios no painel.
- Monitore assinaturas no Stripe e auditorias no Supabase.

## Dicas de Manutenção
- **Atualizações**: Monitore dependências (ex.: `npm update`) e atualize Supabase schemas via SQL migrations para evitar quebras.
- **Segurança**: Revise RLS policies regularmente; use backups automáticos do Supabase; audite logs de ações sensíveis.
- **Escalabilidade**: Otimize queries SQL com índices; use caching para relatórios frequentes; monitore custos no Supabase e Stripe.
- **Debugging**: Use console logs no JS; teste fluxos end-to-end (ex.: questionário → relatório via Qwen AI → validação).
- **Backups**: Configure backups diários no Supabase; exporte dados periodicamente.
- **Integrações**: Verifique API keys de Qwen AI e Stripe; teste webhooks em ambiente de sandbox.
- **Problemas Comuns**: Se migração de dados falhar, verifique mapeamentos de campos; para erros de IA, refine prompts para Qwen AI.
- **Contribuição**: Fork o repo, crie branches para features, e submeta pull requests com testes.

## Licença
MIT License - Sinta-se livre para usar e modificar, com atribuição.

Para mais detalhes, contate a equipe de desenvolvimento em [felipesadrak2@gmail.com].
