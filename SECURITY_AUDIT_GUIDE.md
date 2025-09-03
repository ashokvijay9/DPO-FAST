# Guia de Segurança e Auditoria - DPO Fast

## Visão Geral
O sistema DPO Fast implementa controles de segurança robustos e auditoria completa para garantir a proteção de dados e conformidade com a LGPD.

## Controles de Acesso

### Níveis de Permissão

#### 1. **Usuário Padrão (user)**
- **Acesso**: Apenas aos próprios recursos (tarefas, documentos, relatórios)
- **Operações Permitidas**:
  - Visualizar próprias tarefas de conformidade
  - Fazer upload de documentos nas próprias tarefas
  - Enviar tarefas para revisão
  - Reenviar tarefas rejeitadas
  - Gerar relatórios próprios

#### 2. **Administrador (admin)**
- **Acesso**: Todos os recursos do sistema
- **Operações Permitidas**:
  - Revisar e aprovar/rejeitar tarefas de todos os usuários
  - Visualizar documentos de qualquer usuário
  - Acessar painel administrativo completo
  - Gerar relatórios de auditoria de segurança
  - Visualizar logs de auditoria

### Validação de Permissões

O sistema utiliza a função `hasAccess()` para validar permissões:

```typescript
// Exemplo de verificação de acesso
const accessCheck = hasAccess(userId, resourceUserId, userRole);
if (!accessCheck.hasAccess) {
  // Acesso negado - log de auditoria gerado automaticamente
  return res.status(403).json({ message: 'Access denied' });
}
```

## Sistema de Auditoria

### Logs Automáticos

Todas as ações são automaticamente registradas com:
- **Usuário**: ID do usuário que executou a ação
- **Ação**: Tipo de operação (view, create, update, delete, submit, approve, reject)
- **Recurso**: Tipo e ID do recurso acessado
- **Resultado**: Sucesso ou falha da operação
- **Detalhes**: Informações específicas da operação
- **Metadados**: IP, User-Agent, timestamp

### Eventos Auditados

#### Tarefas de Conformidade
- Visualização de lista de tarefas
- Visualização de tarefa específica
- Upload de documentos
- Envio para revisão
- Aprovação/rejeição por admin
- Reenvio após rejeição

#### Documentos
- Upload de arquivos
- Visualização de documentos
- Download de arquivos
- Validação de integridade

#### Acesso
- Tentativas de acesso negado
- Violações de rate limiting
- Atividades suspeitas

## Verificação de Integridade de Documentos

### Validações Implementadas

1. **Tamanho do Arquivo**: Máximo 10MB
2. **Tipos Permitidos**: PDF, DOCX, DOC, JPEG, PNG, GIF
3. **Consistência**: Extensão do arquivo vs MIME type
4. **Nome do Arquivo**: Validação de caracteres e formato

### Exemplo de Validação

```typescript
const integrity = verifyDocumentIntegrity({
  fileName: file.originalname,
  fileSize: file.size,
  fileType: file.mimetype
});

if (!integrity.isValid) {
  // Documento rejeitado com log de auditoria
  return res.status(400).json({ 
    message: "Documento inválido", 
    errors: integrity.errors 
  });
}
```

## Rate Limiting

### Limites Configurados

- **Listagem de tarefas**: 100 por hora
- **Upload de documentos**: 20 por hora
- **Operações gerais**: 50 por hora

### Detecção de Abuso

O sistema detecta automaticamente:
- Múltiplas tentativas de acesso negado
- Atividade excessiva em curto período
- Acesso de múltiplos IPs por usuário

## Relatórios de Segurança

### Métricas Monitoradas

- Total de ações executadas
- Taxa de falhas de operações
- Atividades suspeitas detectadas
- Violações de rate limiting
- Padrões de acesso a recursos

### Alertas de Segurança

O sistema gera alertas para:
- Mais de 50 ações por hora por usuário
- Mais de 10 tentativas de acesso negado
- Acesso de mais de 5 IPs diferentes por usuário

## Instruções de Teste

### 1. Teste de Controle de Acesso

#### Teste 1: Acesso Próprio vs Alheio
```bash
# Como usuário normal, tente acessar tarefa de outro usuário
curl -X GET "/api/compliance-tasks/[TASK_ID_DE_OUTRO_USUARIO]" \
  -H "Authorization: Bearer [USER_TOKEN]"

# Resultado esperado: 403 Forbidden + log de auditoria
```

#### Teste 2: Acesso Admin
```bash
# Como admin, acesse qualquer tarefa
curl -X GET "/api/compliance-tasks/[QUALQUER_TASK_ID]" \
  -H "Authorization: Bearer [ADMIN_TOKEN]"

# Resultado esperado: 200 OK + log de auditoria com accessLevel: 'admin'
```

### 2. Teste de Integridade de Documentos

#### Teste 1: Arquivo Inválido
```bash
# Upload de arquivo com extensão incorreta
curl -X POST "/api/compliance-tasks/[TASK_ID]/documents" \
  -F "documents=@arquivo.txt" \
  -H "Authorization: Bearer [TOKEN]"

# Resultado esperado: 400 Bad Request com detalhes do erro
```

#### Teste 2: Arquivo Muito Grande
```bash
# Upload de arquivo > 10MB
curl -X POST "/api/compliance-tasks/[TASK_ID]/documents" \
  -F "documents=@arquivo_grande.pdf" \
  -H "Authorization: Bearer [TOKEN]"

# Resultado esperado: 400 Bad Request
```

### 3. Teste de Rate Limiting

#### Teste 1: Exceder Limite de Upload
```bash
# Execute 25 uploads em sequência rápida
for i in {1..25}; do
  curl -X POST "/api/compliance-tasks/[TASK_ID]/documents" \
    -F "documents=@test.pdf" \
    -H "Authorization: Bearer [TOKEN]"
done

# Resultado esperado: Primeiros 20 sucesso, depois 429 Too Many Requests
```

### 4. Teste de Auditoria

#### Verificar Logs
```bash
# Acesse o painel admin para ver logs de auditoria
curl -X GET "/api/admin/audit-logs" \
  -H "Authorization: Bearer [ADMIN_TOKEN]"

# Verifique se todas as ações testadas foram registradas
```

### 5. Teste de Fluxo Completo de Segurança

```bash
# 1. Usuário faz upload de documento
curl -X POST "/api/compliance-tasks/[TASK_ID]/documents" \
  -F "documents=@documento_valido.pdf" \
  -H "Authorization: Bearer [USER_TOKEN]"

# 2. Usuário envia tarefa para revisão
curl -X PATCH "/api/compliance-tasks/[TASK_ID]/submit" \
  -H "Content-Type: application/json" \
  -d '{"userComments": "Documento anexado conforme solicitado"}' \
  -H "Authorization: Bearer [USER_TOKEN]"

# 3. Admin aprova a tarefa
curl -X PATCH "/api/admin/tasks/[TASK_ID]/approve" \
  -H "Content-Type: application/json" \
  -d '{"adminComments": "Documento aprovado", "status": "approved"}' \
  -H "Authorization: Bearer [ADMIN_TOKEN]"

# 4. Verificar logs de auditoria para todo o fluxo
curl -X GET "/api/admin/audit-logs?resourceId=[TASK_ID]" \
  -H "Authorization: Bearer [ADMIN_TOKEN]"
```

## Verificação de Segurança Periódica

### Checklist Mensal

- [ ] Revisar relatórios de auditoria para atividades suspeitas
- [ ] Verificar taxa de falhas de operações
- [ ] Analisar padrões de acesso incomuns
- [ ] Validar funcionamento dos controles de rate limiting
- [ ] Testar cenários de acesso negado

### Métricas de Segurança

Execute o relatório de segurança automático:

```bash
curl -X GET "/api/admin/security-audit?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer [ADMIN_TOKEN]"
```

## Conformidade LGPD

### Proteção de Dados Implementada

1. **Controle de Acesso**: Usuários só acessam próprios dados
2. **Auditoria Completa**: Todos os acessos são registrados
3. **Integridade**: Documentos são validados antes do armazenamento
4. **Transparência**: Logs permitem rastreabilidade completa
5. **Segurança**: Rate limiting previne ataques

### Direitos dos Titulares

O sistema suporta:
- **Acesso**: Usuários podem visualizar todos os seus dados
- **Correção**: Podem atualizar informações através de tarefas
- **Exclusão**: Admins podem remover dados mediante solicitação
- **Portabilidade**: Relatórios exportam dados em formato estruturado

## Troubleshooting

### Problemas Comuns

#### Erro 403 - Access Denied
- Verificar se usuário está tentando acessar recurso próprio
- Confirmar nível de permissão (user vs admin)
- Checar logs de auditoria para detalhes

#### Erro 429 - Rate Limit
- Verificar frequência de requisições
- Aguardar reset do limite (1 hora)
- Implementar backoff exponencial no cliente

#### Falhas na Validação de Documentos
- Verificar tipo MIME vs extensão do arquivo
- Confirmar tamanho do arquivo (< 10MB)
- Validar formato do nome do arquivo

### Logs de Debug

Para desenvolvimento, ative logs detalhados:

```bash
export DEBUG_AUDIT=true
export LOG_LEVEL=debug
npm run dev
```

## Próximos Passos

### Melhorias Futuras

1. **Criptografia**: Implementar criptografia de documentos em repouso
2. **Autenticação Dupla**: Adicionar 2FA para admins
3. **Alertas Real-time**: Notificações automáticas para atividades suspeitas
4. **Backup de Logs**: Arquivamento seguro de logs de auditoria
5. **Compliance Dashboard**: Painel visual para métricas de segurança

### Integrações

- **SIEM**: Envio de logs para sistemas de monitoramento
- **Alertas**: Integração com sistemas de notificação
- **Backup**: Sincronização com soluções de backup corporativo