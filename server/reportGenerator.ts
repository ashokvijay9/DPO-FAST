export interface ReportData {
  user: {
    firstName?: string;
    lastName?: string;
    email?: string;
    company?: string;
  };
  questionnaireResponse: {
    answer: string;
    complianceScore?: number;
  };
  complianceTasks: Array<{
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    completedAt?: string;
    approvedAt?: string;
    progress?: number;
    category?: string;
    lgpdRequirement?: string;
  }>;
  questions: Array<{
    question: string;
  }>;
}

export async function generateComplianceReportHTML(reportData: ReportData, planType: string = 'free'): Promise<{ html: string; filename: string }> {
  // Calculate detailed compliance metrics
  const answers = JSON.parse(reportData.questionnaireResponse.answer);
  const compliance = calculateDetailedCompliance(answers, reportData.questions);
  
  const html = generateReportHTML(reportData, compliance, planType);
  
  const timestamp = new Date().toISOString().slice(0, 10);
  const companyName = reportData.user.company ? 
    reportData.user.company.replace(/[^a-zA-Z0-9]/g, '_') : 'empresa';
  const filename = `relatorio_conformidade_${companyName}_${timestamp}.html`;

  return {
    html,
    filename
  };
}

function calculateDetailedCompliance(answers: string[], questions: any[]) {
  const totalQuestions = answers.length;
  let compliantAnswers = 0;
  let partiallyCompliantAnswers = 0;
  let nonCompliantAnswers = 0;

  const categoryBreakdown = {
    dataGovernance: { compliant: 0, partial: 0, total: 0 },
    dataCollection: { compliant: 0, partial: 0, total: 0 },
    consent: { compliant: 0, partial: 0, total: 0 },
    dataStorage: { compliant: 0, partial: 0, total: 0 },
    dataSharing: { compliant: 0, partial: 0, total: 0 },
    rights: { compliant: 0, partial: 0, total: 0 },
    security: { compliant: 0, partial: 0, total: 0 },
    breach: { compliant: 0, partial: 0, total: 0 },
    training: { compliant: 0, partial: 0, total: 0 },
    documentation: { compliant: 0, partial: 0, total: 0 }
  };

  answers.forEach((answer, index) => {
    const question = questions[index];
    if (!question) return;

    const category = getQuestionCategory(question.question);

    categoryBreakdown[category as keyof typeof categoryBreakdown].total++;

    if (answer === 'sim') {
      compliantAnswers++;
      categoryBreakdown[category as keyof typeof categoryBreakdown].compliant++;
    } else if (answer === 'parcial') {
      partiallyCompliantAnswers++;
      categoryBreakdown[category as keyof typeof categoryBreakdown].partial++;
    } else {
      nonCompliantAnswers++;
    }
  });

  const overallScore = Math.round(((compliantAnswers * 100) + (partiallyCompliantAnswers * 50)) / (totalQuestions * 100) * 100);

  return {
    overallScore,
    totalQuestions,
    compliantAnswers,
    partiallyCompliantAnswers,
    nonCompliantAnswers,
    categoryBreakdown
  };
}

function generateReportHTML(reportData: ReportData, compliance: any, planType: string = 'free'): string {
  const userName = reportData.user.firstName && reportData.user.lastName 
    ? `${reportData.user.firstName} ${reportData.user.lastName}` 
    : reportData.user.email || 'Usuário';
  
  const companyName = reportData.user.company || 'Empresa';
  const reportDate = new Date().toLocaleDateString('pt-BR');
  
  const answers = JSON.parse(reportData.questionnaireResponse.answer);
  
  const priorityTasks = reportData.complianceTasks
    .filter(task => task.status === 'pending')
    .sort((a, b) => {
      const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - 
             (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
    })
    .slice(0, 10);

  // Calculate task completion metrics
  const taskMetrics = calculateTaskMetrics(reportData.complianceTasks);

  // Analyze compliance by areas based on questionnaire answers
  const complianceAnalysis = analyzeComplianceByAreas(answers, reportData.questions);

  return generateLGPDCompliantReport(reportData, compliance, complianceAnalysis, userName, companyName, reportDate, priorityTasks, taskMetrics, planType);
}

function analyzeComplianceByAreas(answers: string[], questions: any[]): any {
  const areas = {
    dataGovernance: { good: [], improve: [] },
    dataCollection: { good: [], improve: [] },
    consent: { good: [], improve: [] },
    dataStorage: { good: [], improve: [] },
    dataSharing: { good: [], improve: [] },
    rights: { good: [], improve: [] },
    security: { good: [], improve: [] },
    breach: { good: [], improve: [] },
    training: { good: [], improve: [] },
    documentation: { good: [], improve: [] }
  };

  answers.forEach((answer, index) => {
    const question = questions[index];
    if (!question) return;

    const area = getQuestionArea(question.question);
    
    if (answer === 'sim') {
      (areas as any)[area].good.push(question.question);
    } else if (answer === 'não' || answer === 'parcial') {
      (areas as any)[area].improve.push(question.question);
    }
  });

  return areas;
}

function getQuestionArea(questionText: string): string {
  const questionLower = questionText.toLowerCase();
  
  if (questionLower.includes('política') || questionLower.includes('dpo') || questionLower.includes('responsável')) {
    return 'dataGovernance';
  }
  if (questionLower.includes('coleta') || questionLower.includes('dados pessoais')) {
    return 'dataCollection';
  }
  if (questionLower.includes('consentimento') || questionLower.includes('autorização')) {
    return 'consent';
  }
  if (questionLower.includes('armazenamento') || questionLower.includes('retenção')) {
    return 'dataStorage';
  }
  if (questionLower.includes('compartilhamento') || questionLower.includes('terceiros')) {
    return 'dataSharing';
  }
  if (questionLower.includes('direitos') || questionLower.includes('titular')) {
    return 'rights';
  }
  if (questionLower.includes('segurança') || questionLower.includes('proteção') || questionLower.includes('criptografia')) {
    return 'security';
  }
  if (questionLower.includes('vazamento') || questionLower.includes('incidente') || questionLower.includes('violação')) {
    return 'breach';
  }
  if (questionLower.includes('treinamento') || questionLower.includes('capacitação')) {
    return 'training';
  }
  
  return 'documentation';
}

function getQuestionCategory(questionText: string): string {
  return getQuestionArea(questionText);
}

function calculateTaskMetrics(tasks: any[]) {
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'completed' || t.status === 'approved').length;
  const pending = tasks.filter(t => t.status === 'pending').length;
  const inReview = tasks.filter(t => t.status === 'in_review').length;
  const approved = tasks.filter(t => t.status === 'approved').length;
  const rejected = tasks.filter(t => t.status === 'rejected').length;
  
  const completionRate = total > 0 ? Math.round((approved / total) * 100) : 0;
  
  // Group tasks by category
  const categoryBreakdown = tasks.reduce((acc, task) => {
    const category = task.category || 'general';
    if (!acc[category]) {
      acc[category] = { total: 0, completed: 0, pending: 0, approved: 0 };
    }
    acc[category].total++;
    if (task.status === 'completed' || task.status === 'approved') {
      acc[category].completed++;
    }
    if (task.status === 'pending') {
      acc[category].pending++;
    }
    if (task.status === 'approved') {
      acc[category].approved++;
    }
    return acc;
  }, {} as any);

  return {
    total,
    completed,
    pending,
    inReview,
    approved,
    rejected,
    completionRate,
    categoryBreakdown,
    recentlyCompleted: tasks
      .filter(t => t.status === 'approved' && t.completedAt)
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      .slice(0, 5),
    highPriorityPending: tasks
      .filter(t => t.status === 'pending' && t.priority === 'high')
      .length
  };
}

function generateLGPDCompliantReport(reportData: ReportData, compliance: any, complianceAnalysis: any, userName: string, companyName: string, reportDate: string, priorityTasks: any[], taskMetrics: any, planType: string = 'free'): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Política de Segurança da Informação e Conformidade LGPD - ${companyName}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Times New Roman', serif;
            line-height: 1.6;
            color: #333;
            background: #fff;
            padding: 20px;
        }
        
        .document-header {
            text-align: center;
            margin-bottom: 40px;
            padding: 30px;
            border-bottom: 3px solid #2c3e50;
        }
        
        .document-header h1 {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #2c3e50;
            text-transform: uppercase;
        }
        
        .document-header h2 {
            font-size: 18px;
            color: #34495e;
            margin-bottom: 5px;
        }
        
        .document-header .info {
            font-size: 14px;
            color: #7f8c8d;
            margin-top: 15px;
        }
        
        .section {
            margin-bottom: 30px;
            padding: 20px;
            border-left: 4px solid #3498db;
            background: #f8f9fa;
        }
        
        .section h3 {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 15px;
            color: #2c3e50;
            text-transform: uppercase;
        }
        
        .policy-text {
            font-size: 14px;
            text-align: justify;
            margin-bottom: 15px;
            text-indent: 30px;
        }
        
        .compliance-metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        
        .metric-card {
            background: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
            border: 1px solid #e3e6ea;
        }
        
        .metric-value {
            font-size: 32px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 5px;
        }
        
        .metric-label {
            font-size: 14px;
            color: #7f8c8d;
            text-transform: uppercase;
        }
        
        .tasks-list {
            background: #fff;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            overflow: hidden;
            margin: 20px 0;
        }
        
        .task-item {
            padding: 15px;
            border-bottom: 1px solid #e9ecef;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .task-item:last-child {
            border-bottom: none;
        }
        
        .task-priority {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .priority-high { background: #ffebee; color: #c62828; }
        .priority-medium { background: #fff8e1; color: #f57c00; }
        .priority-low { background: #e8f5e8; color: #2e7d32; }
        
        .footer {
            margin-top: 40px;
            padding: 20px;
            background: #f8f9fa;
            border-top: 1px solid #dee2e6;
            text-align: center;
            font-size: 12px;
            color: #7f8c8d;
        }
        
        .compliance-analysis {
            margin: 20px 0;
        }
        
        .analysis-area {
            margin-bottom: 20px;
            background: #fff;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .analysis-header {
            background: #f8f9fa;
            padding: 15px;
            border-bottom: 1px solid #dee2e6;
            font-weight: bold;
            color: #2c3e50;
        }
        
        .analysis-content {
            padding: 15px;
        }
        
        .good-practices {
            color: #27ae60;
            margin-bottom: 10px;
        }
        
        .improvements {
            color: #e74c3c;
        }
        
        .good-practices strong, .improvements strong {
            display: block;
            margin-bottom: 5px;
        }
        
        .good-practices ul, .improvements ul {
            margin-left: 20px;
        }
        
        .good-practices li, .improvements li {
            margin-bottom: 3px;
        }
    </style>
</head>
<body>
    <div class="document-header">
        <h1>Política de Segurança da Informação e Conformidade LGPD</h1>
        <h2>${companyName}</h2>
        <div class="info">
            <p>Responsável: ${userName}</p>
            <p>Data de Emissão: ${reportDate}</p>
            <p>Versão: 1.0</p>
        </div>
    </div>

    <div class="section">
        <h3>1. OBJETIVOS E FINALIDADES</h3>
        <p class="policy-text">
            Esta Política de Segurança da Informação e Conformidade LGPD tem como objetivo estabelecer diretrizes, 
            normas e procedimentos para a proteção das informações da ${companyName}, garantindo a confidencialidade, 
            integridade e disponibilidade dos dados, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
        </p>
        <p class="policy-text">
            A presente política se aplica a todos os colaboradores, terceiros, parceiros e prestadores de serviços 
            que tenham acesso às informações da organização, seja de forma direta ou indireta.
        </p>
    </div>

    <div class="section">
        <h3>2. AVALIAÇÃO ATUAL DE CONFORMIDADE LGPD</h3>
        <div class="compliance-metrics">
            <div class="metric-card">
                <div class="metric-value">${compliance.overallScore}%</div>
                <div class="metric-label">Conformidade Geral</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${compliance.compliantAnswers}</div>
                <div class="metric-label">Itens Conformes</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${compliance.partiallyCompliantAnswers}</div>
                <div class="metric-label">Conformidade Parcial</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${compliance.nonCompliantAnswers}</div>
                <div class="metric-label">Não Conformes</div>
            </div>
        </div>
        
        <p class="policy-text">
            Baseado na avaliação realizada em ${reportDate}, a empresa apresenta um índice de conformidade 
            de ${compliance.overallScore}% com os requisitos da LGPD. Esta avaliação considera aspectos como 
            governança de dados, consentimento, segurança da informação, direitos dos titulares e gestão de incidentes.
        </p>
    </div>

    ${planType !== 'free' ? `
    <div class="section">
        <h3>3. ANÁLISE DETALHADA POR ÁREAS DE CONFORMIDADE</h3>
        <div class="compliance-analysis">
            ${Object.entries(complianceAnalysis).map(([area, data]: [string, any]) => {
                const areaNames: Record<string, string> = {
                    dataGovernance: 'Governança de Dados',
                    dataCollection: 'Coleta de Dados',
                    consent: 'Consentimento',
                    dataStorage: 'Armazenamento de Dados',
                    dataSharing: 'Compartilhamento de Dados',
                    rights: 'Direitos dos Titulares',
                    security: 'Segurança da Informação',
                    breach: 'Gestão de Incidentes',
                    training: 'Treinamento e Capacitação',
                    documentation: 'Documentação'
                };
                
                return `
                <div class="analysis-area">
                    <div class="analysis-header">${areaNames[area] || area}</div>
                    <div class="analysis-content">
                        ${data.good.length > 0 ? `
                        <div class="good-practices">
                            <strong>✓ Pontos Positivos:</strong>
                            <ul>
                                ${data.good.slice(0, 3).map((item: string) => `<li>${item}</li>`).join('')}
                            </ul>
                        </div>
                        ` : ''}
                        
                        ${data.improve.length > 0 ? `
                        <div class="improvements">
                            <strong>⚠ Áreas para Melhoria:</strong>
                            <ul>
                                ${data.improve.slice(0, 3).map((item: string) => `<li>${item}</li>`).join('')}
                            </ul>
                        </div>
                        ` : ''}
                        
                        ${data.good.length === 0 && data.improve.length === 0 ? `
                        <p>Nenhuma avaliação específica disponível para esta área.</p>
                        ` : ''}
                    </div>
                </div>
                `;
            }).join('')}
        </div>
    </div>
    ` : ''}

    <div class="section">
        <h3>4. RESPONSABILIDADES E GOVERNANÇA</h3>
        <p class="policy-text">
            A ${companyName} designa formalmente o responsável pela proteção de dados pessoais, 
            conforme estabelecido no Art. 41 da LGPD. O Encarregado de Proteção de Dados (DPO) 
            é responsável por servir como canal de comunicação entre a empresa, os titulares dos 
            dados e a Autoridade Nacional de Proteção de Dados (ANPD).
        </p>
        <p class="policy-text">
            Todos os colaboradores devem receber treinamento adequado sobre proteção de dados 
            e privacidade, sendo responsáveis por aplicar as diretrizes estabelecidas nesta política 
            em suas atividades diárias.
        </p>
    </div>

    <div class="section">
        <h3>5. MEDIDAS DE SEGURANÇA TÉCNICAS E ORGANIZACIONAIS</h3>
        <p class="policy-text">
            A empresa implementa medidas de segurança técnicas e organizacionais apropriadas para 
            proteger os dados pessoais contra acesso não autorizado, destruição, perda, alteração, 
            comunicação ou difusão acidental ou ilícita.
        </p>
        <p class="policy-text">
            As medidas incluem, mas não se limitam a: controles de acesso, criptografia, 
            backup regular de dados, monitoramento de segurança, políticas de senha segura 
            e treinamento contínuo da equipe.
        </p>
    </div>

    ${priorityTasks.length > 0 ? `
    <div class="section">
        <h3>6. AÇÕES CORRETIVAS PRIORITÁRIAS</h3>
        <p class="policy-text">
            Com base na avaliação realizada, foram identificadas as seguintes ações prioritárias 
            para melhoria da conformidade com a LGPD:
        </p>
        <div class="tasks-list">
            ${priorityTasks.map(task => `
            <div class="task-item">
                <div>
                    <strong>${task.title}</strong>
                    <p style="font-size: 12px; color: #7f8c8d; margin-top: 5px;">${task.description}</p>
                </div>
                <span class="task-priority priority-${task.priority}">
                    ${task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                </span>
            </div>
            `).join('')}
        </div>
    </div>
    ` : ''}

    <div class="section">
        <h3>7. GESTÃO DE INCIDENTES DE SEGURANÇA</h3>
        <p class="policy-text">
            A empresa estabelece procedimentos para identificação, contenção, avaliação e resposta 
            a incidentes de segurança da informação. Em caso de vazamento de dados pessoais, 
            a ANPD será notificada em até 72 horas, conforme estabelecido na LGPD.
        </p>
        <p class="policy-text">
            Todos os incidentes são documentados e analisados para melhoria contínua dos 
            controles de segurança implementados.
        </p>
    </div>

    <div class="section">
        <h3>8. DIREITOS DOS TITULARES DE DADOS</h3>
        <p class="policy-text">
            A empresa garante o exercício dos direitos dos titulares de dados pessoais, 
            incluindo: confirmação da existência de tratamento, acesso aos dados, correção, 
            anonimização, bloqueio, eliminação, portabilidade, informação sobre compartilhamento, 
            informação sobre possibilidade de não fornecimento do consentimento e revogação do consentimento.
        </p>
        <p class="policy-text">
            Todas as solicitações são processadas no prazo estabelecido pela legislação, 
            mantendo canal de comunicação sempre disponível para os titulares.
        </p>
    </div>

    ${planType !== 'free' ? `
    <div class="section">
        <h3>9. AVALIAÇÃO E RECOMENDAÇÕES ESPECÍFICAS</h3>
        <p class="policy-text">
            ${
                compliance.overallScore >= 80 ?
                'A empresa demonstra excelente adequação às exigências legais.' :
                compliance.overallScore >= 60 ?
                'A empresa está no caminho certo, mas requer melhorias em áreas específicas.' :
                'São necessárias ações imediatas para adequação às exigências da LGPD.'
            }
        </p>
        <p class="policy-text">
            Recomendamos revisão periódica desta política e implementação das melhorias sugeridas para garantir 
            conformidade contínua com a Lei Geral de Proteção de Dados.
        </p>
        ${planType === 'pro' || planType === 'personalite' ? `
        <div style="background: #e8f5e8; border: 1px solid #27ae60; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h3 style="color: #27ae60; margin-bottom: 15px;">💼 Consultoria Especializada Inclusa</h3>
            <p>Como cliente ${planType === 'pro' ? 'Pro' : 'Personalité'}, você tem acesso à consultoria especializada da nossa equipe de especialistas em LGPD. Entre em contato para agendar uma sessão de consultoria personalizada.</p>
        </div>
        ` : ''}
    </div>
    ` : ''}
    
    <div class="footer">
        <p><strong>DPO Fast</strong> - Plataforma de Conformidade LGPD</p>
        <p>Este relatório foi gerado automaticamente com base nas respostas fornecidas no questionário de avaliação.</p>
        <p>Para informações adicionais ou consultoria especializada, entre em contato conosco.</p>
        <p style="margin-top: 20px; font-size: 12px; color: #999;">
            Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
        </p>
    </div>
</body>
</html>`;
}