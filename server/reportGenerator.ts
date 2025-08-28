import puppeteer from 'puppeteer';
import { QuestionnaireResponse, ComplianceTask } from '@shared/schema';
import path from 'path';
import fs from 'fs';

export interface ReportData {
  user: {
    firstName?: string;
    lastName?: string;
    email?: string;
    company?: string;
  };
  questionnaireResponse: QuestionnaireResponse;
  complianceTasks: ComplianceTask[];
  questions: Array<{
    id: number;
    question: string;
    answer?: string;
    type: string;
    requiresDocument: boolean;
  }>;
}

export async function generateComplianceReportPDF(reportData: ReportData): Promise<{ buffer: Buffer; filename: string }> {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ]
  });

  try {
    const page = await browser.newPage();
    
    // Calculate detailed compliance metrics
    const answers = JSON.parse(reportData.questionnaireResponse.answer);
    const compliance = calculateDetailedCompliance(answers, reportData.questions);
    
    const html = generateReportHTML(reportData, compliance);
    
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '1cm',
        right: '1cm',
        bottom: '1cm',
        left: '1cm'
      }
    });

    const timestamp = new Date().toISOString().slice(0, 10);
    const companyName = reportData.user.company ? 
      reportData.user.company.replace(/[^a-zA-Z0-9]/g, '_') : 'empresa';
    const filename = `relatorio_conformidade_${companyName}_${timestamp}.pdf`;

    return {
      buffer: Buffer.from(pdfBuffer),
      filename
    };
  } finally {
    await browser.close();
  }
}

function calculateDetailedCompliance(answers: string[], questions: any[]): any {
  let totalQuestions = answers.length;
  let compliantAnswers = 0;
  let partiallyCompliantAnswers = 0;
  let nonCompliantAnswers = 0;
  
  const categoryBreakdown = {
    dataCollection: { total: 0, compliant: 0, partial: 0 },
    consent: { total: 0, compliant: 0, partial: 0 },
    storage: { total: 0, compliant: 0, partial: 0 },
    sharing: { total: 0, compliant: 0, partial: 0 },
    security: { total: 0, compliant: 0, partial: 0 }
  };

  answers.forEach((answer, index) => {
    const question = questions[index];
    if (!question) return;

    // Categorize questions
    let category = 'dataCollection';
    if (question.question.toLowerCase().includes('consentimento')) category = 'consent';
    else if (question.question.toLowerCase().includes('armazenad') || question.question.toLowerCase().includes('arquivo')) category = 'storage';
    else if (question.question.toLowerCase().includes('compartilh') || question.question.toLowerCase().includes('empresa')) category = 'sharing';
    else if (question.question.toLowerCase().includes('acesso') || question.question.toLowerCase().includes('segur')) category = 'security';

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

function generateReportHTML(reportData: ReportData, compliance: any): string {
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

  // Analyze compliance by areas based on questionnaire answers
  const complianceAnalysis = analyzeComplianceByAreas(answers, reportData.questions);

  return generateLGPDCompliantReport(reportData, compliance, complianceAnalysis, userName, companyName, reportDate, priorityTasks);
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

function generateLGPDCompliantReport(reportData: ReportData, compliance: any, complianceAnalysis: any, userName: string, companyName: string, reportDate: string, priorityTasks: any[]): string {
  return `
<!DOCTYPE html>
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
            margin-bottom: 20px;
        }
        
        .company-info {
            font-size: 14px;
            color: #7f8c8d;
            margin-bottom: 10px;
        }
        
        .compliance-score {
            background: #ecf0f1;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
            text-align: center;
        }
        
        .score-value {
            font-size: 32px;
            font-weight: bold;
            color: #27ae60;
        }
        
        .section {
            margin-bottom: 30px;
            padding: 20px 0;
        }
        
        .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 15px;
            text-transform: uppercase;
            border-bottom: 2px solid #34495e;
            padding-bottom: 5px;
        }
        
        .subsection {
            margin: 20px 0;
        }
        
        .subsection-title {
            font-size: 16px;
            font-weight: bold;
            color: #34495e;
            margin-bottom: 10px;
        }
        
        .good-practices {
            background: #d5f4e6;
            border-left: 4px solid #27ae60;
            padding: 15px;
            margin: 10px 0;
        }
        
        .improvements {
            background: #ffeaa7;
            border-left: 4px solid #fdcb6e;
            padding: 15px;
            margin: 10px 0;
        }
        
        .critical-issues {
            background: #fab1a0;
            border-left: 4px solid #e17055;
            padding: 15px;
            margin: 10px 0;
        }
        
        .policy-text {
            text-align: justify;
            line-height: 1.8;
            margin-bottom: 15px;
        }
        
        .bullet-point {
            margin: 5px 0;
            padding-left: 20px;
            position: relative;
        }
        
        .bullet-point::before {
            content: "•";
            position: absolute;
            left: 0;
            font-weight: bold;
        }
        
        .compliance-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        
        .compliance-table th,
        .compliance-table td {
            border: 1px solid #bdc3c7;
            padding: 10px;
            text-align: left;
        }
        
        .compliance-table th {
            background: #34495e;
            color: white;
            font-weight: bold;
        }
        
        .status-compliant {
            background: #d5f4e6;
            color: #27ae60;
            font-weight: bold;
        }
        
        .status-partial {
            background: #ffeaa7;
            color: #f39c12;
            font-weight: bold;
        }
        
        .status-non-compliant {
            background: #fab1a0;
            color: #e74c3c;
            font-weight: bold;
        }
        
        .objective-section {
            background: #ebf3fd;
            border: 1px solid #3498db;
            padding: 20px;
            margin: 20px 0;
            border-radius: 5px;
        }
        
        .footer {
            margin-top: 40px;
            padding: 20px;
            border-top: 2px solid #2c3e50;
            text-align: center;
            font-size: 12px;
            color: #7f8c8d;
        }
        
        @media print {
            body { padding: 10px; }
            .section { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="document-header">
        <h1>Política de Segurança da Informação e Conformidade LGPD</h1>
        <h2>${companyName}</h2>
        <div class="company-info">
            <div>Responsável: ${userName}</div>
            <div>Data do Relatório: ${reportDate}</div>
        </div>
        <div class="compliance-score">
            <div class="score-value">${compliance.overallScore}%</div>
            <div>Nível de Conformidade LGPD</div>
        </div>
    </div>

    <div class="objective-section">
        <div class="section-title">Objetivo</div>
        <p class="policy-text">
            Este relatório apresenta a análise da adequação da ${companyName} à Lei Geral de Proteção de Dados (LGPD), 
            estabelecendo diretrizes que permitam aos colaboradores, clientes e parceiros seguirem padrões de comportamento 
            relacionados à segurança da informação adequados às necessidades de negócio e de proteção legal da empresa e do indivíduo.
        </p>
        <p class="policy-text">
            O objetivo é preservar as informações quanto à <strong>Integridade</strong>, <strong>Confidencialidade</strong> e <strong>Disponibilidade</strong>, 
            garantindo a conformidade com a legislação de proteção de dados pessoais.
        </p>
    </div>

    <div class="section">
        <div class="section-title">1. Governança de Dados e Responsabilidades</div>
        
        ${complianceAnalysis.dataGovernance.good.length > 0 ? `
        <div class="good-practices">
            <div class="subsection-title">✓ Pontos Fortes Identificados:</div>
            ${complianceAnalysis.dataGovernance.good.map((item: string) => `<div class="bullet-point">${item}</div>`).join('')}
        </div>
        ` : ''}
        
        ${complianceAnalysis.dataGovernance.improve.length > 0 ? `
        <div class="improvements">
            <div class="subsection-title">⚠ Áreas para Melhoria:</div>
            ${complianceAnalysis.dataGovernance.improve.map((item: string) => `<div class="bullet-point">${item}</div>`).join('')}
            <p class="policy-text">
                <strong>Recomendação:</strong> Designar formalmente um Encarregado de Proteção de Dados (DPO) e estabelecer 
                políticas claras de governança de dados pessoais.
            </p>
        </div>
        ` : ''}
    </div>

    <div class="section">
        <div class="section-title">2. Coleta e Tratamento de Dados Pessoais</div>
        
        ${complianceAnalysis.dataCollection.good.length > 0 ? `
        <div class="good-practices">
            <div class="subsection-title">✓ Práticas Adequadas:</div>
            ${complianceAnalysis.dataCollection.good.map((item: string) => `<div class="bullet-point">${item}</div>`).join('')}
        </div>
        ` : ''}
        
        ${complianceAnalysis.dataCollection.improve.length > 0 ? `
        <div class="improvements">
            <div class="subsection-title">⚠ Necessidades de Adequação:</div>
            ${complianceAnalysis.dataCollection.improve.map((item: string) => `<div class="bullet-point">${item}</div>`).join('')}
            <p class="policy-text">
                <strong>Recomendação:</strong> Implementar mapeamento detalhado de todos os dados pessoais coletados, 
                suas finalidades e bases legais para tratamento.
            </p>
        </div>
        ` : ''}
    </div>

    <div class="section">
        <div class="section-title">3. Consentimento e Bases Legais</div>
        
        ${complianceAnalysis.consent.good.length > 0 ? `
        <div class="good-practices">
            <div class="subsection-title">✓ Conformidade Identificada:</div>
            ${complianceAnalysis.consent.good.map((item: string) => `<div class="bullet-point">${item}</div>`).join('')}
        </div>
        ` : ''}
        
        ${complianceAnalysis.consent.improve.length > 0 ? `
        <div class="improvements">
            <div class="subsection-title">⚠ Melhorias Necessárias:</div>
            ${complianceAnalysis.consent.improve.map((item: string) => `<div class="bullet-point">${item}</div>`).join('')}
            <p class="policy-text">
                <strong>Recomendação:</strong> Estabelecer processos claros para obtenção, registro e gestão de consentimentos, 
                garantindo que sejam livres, informados e específicos.
            </p>
        </div>
        ` : ''}
    </div>

    <div class="section">
        <div class="section-title">4. Segurança da Informação e Medidas Técnicas</div>
        
        ${complianceAnalysis.security.good.length > 0 ? `
        <div class="good-practices">
            <div class="subsection-title">✓ Medidas de Segurança Implementadas:</div>
            ${complianceAnalysis.security.good.map((item: string) => `<div class="bullet-point">${item}</div>`).join('')}
        </div>
        ` : ''}
        
        ${complianceAnalysis.security.improve.length > 0 ? `
        <div class="critical-issues">
            <div class="subsection-title">🔴 Vulnerabilidades Críticas:</div>
            ${complianceAnalysis.security.improve.map((item: string) => `<div class="bullet-point">${item}</div>`).join('')}
            <p class="policy-text">
                <strong>Ação Urgente:</strong> Implementar medidas técnicas e organizacionais de segurança apropriadas, 
                incluindo criptografia, controles de acesso e monitoramento de segurança.
            </p>
        </div>
        ` : ''}
    </div>

    <div class="section">
        <div class="section-title">5. Direitos dos Titulares de Dados</div>
        
        ${complianceAnalysis.rights.good.length > 0 ? `
        <div class="good-practices">
            <div class="subsection-title">✓ Direitos Atendidos:</div>
            ${complianceAnalysis.rights.good.map((item: string) => `<div class="bullet-point">${item}</div>`).join('')}
        </div>
        ` : ''}
        
        ${complianceAnalysis.rights.improve.length > 0 ? `
        <div class="improvements">
            <div class="subsection-title">⚠ Procedimentos a Implementar:</div>
            ${complianceAnalysis.rights.improve.map((item: string) => `<div class="bullet-point">${item}</div>`).join('')}
            <p class="policy-text">
                <strong>Recomendação:</strong> Estabelecer canais e procedimentos para atendimento aos direitos dos titulares: 
                acesso, retificação, portabilidade, eliminação e oposição ao tratamento.
            </p>
        </div>
        ` : ''}
    </div>

    <div class="section">
        <div class="section-title">6. Gestão de Incidentes e Vazamentos</div>
        
        ${complianceAnalysis.breach.good.length > 0 ? `
        <div class="good-practices">
            <div class="subsection-title">✓ Preparação para Incidentes:</div>
            ${complianceAnalysis.breach.good.map((item: string) => `<div class="bullet-point">${item}</div>`).join('')}
        </div>
        ` : ''}
        
        ${complianceAnalysis.breach.improve.length > 0 ? `
        <div class="critical-issues">
            <div class="subsection-title">🔴 Riscos de Não Conformidade:</div>
            ${complianceAnalysis.breach.improve.map((item: string) => `<div class="bullet-point">${item}</div>`).join('')}
            <p class="policy-text">
                <strong>Ação Urgente:</strong> Criar plano de resposta a incidentes de segurança e procedimentos para 
                comunicação à ANPD e aos titulares em caso de vazamento de dados.
            </p>
        </div>
        ` : ''}
    </div>

    <div class="section">
        <div class="section-title">7. Treinamento e Conscientização</div>
        
        ${complianceAnalysis.training.good.length > 0 ? `
        <div class="good-practices">
            <div class="subsection-title">✓ Capacitação Existente:</div>
            ${complianceAnalysis.training.good.map((item: string) => `<div class="bullet-point">${item}</div>`).join('')}
        </div>
        ` : ''}
        
        ${complianceAnalysis.training.improve.length > 0 ? `
        <div class="improvements">
            <div class="subsection-title">⚠ Necessidades de Capacitação:</div>
            ${complianceAnalysis.training.improve.map((item: string) => `<div class="bullet-point">${item}</div>`).join('')}
            <p class="policy-text">
                <strong>Recomendação:</strong> Implementar programa de treinamento contínuo sobre LGPD para todos os 
                colaboradores que lidam com dados pessoais.
            </p>
        </div>
        ` : ''}
    </div>

    ${priorityTasks.length > 0 ? `
    <div class="section">
        <div class="section-title">8. Plano de Ação Prioritário</div>
        <table class="compliance-table">
            <tr>
                <th>Tarefa</th>
                <th>Prioridade</th>
                <th>Descrição</th>
            </tr>
            ${priorityTasks.slice(0, 10).map(task => `
                <tr>
                    <td>${task.title}</td>
                    <td class="status-${task.priority === 'high' ? 'non-compliant' : task.priority === 'medium' ? 'partial' : 'compliant'}">
                        ${task.priority === 'high' ? 'ALTA' : task.priority === 'medium' ? 'MÉDIA' : 'BAIXA'}
                    </td>
                    <td>${task.description}</td>
                </tr>
            `).join('')}
        </table>
    </div>
    ` : ''}

    <div class="section">
        <div class="section-title">Considerações Finais</div>
        <p class="policy-text">
            Esta análise demonstra que a ${companyName} possui um nível de conformidade de <strong>${compliance.overallScore}%</strong> 
            com a LGPD. ${compliance.overallScore >= 80 ? 
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
    </div>
    
    <div class="footer">
        <p><strong>DPO Fast</strong> - Plataforma de Conformidade LGPD</p>
        <p>Este relatório foi gerado automaticamente com base nas respostas fornecidas no questionário de avaliação.</p>
        <p>Para informações adicionais ou consultoria especializada, entre em contato conosco.</p>
        <p style="margin-top: 20px; font-size: 12px; color: #999;">
            Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
        </p>
    </div>
</body>
</html>
  `;
}