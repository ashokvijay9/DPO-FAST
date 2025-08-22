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
    args: ['--no-sandbox', '--disable-setuid-sandbox']
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

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Conformidade LGPD - ${companyName}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #fff;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
            margin-bottom: 30px;
        }
        
        .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
            font-weight: 600;
        }
        
        .header p {
            font-size: 16px;
            opacity: 0.9;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 0 30px;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 40px;
        }
        
        .info-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        
        .info-card h3 {
            color: #667eea;
            margin-bottom: 10px;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .info-card p {
            font-size: 16px;
            font-weight: 500;
        }
        
        .score-section {
            text-align: center;
            background: #fff;
            border: 2px solid #e9ecef;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 40px;
        }
        
        .score-circle {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            font-weight: bold;
            color: white;
            margin-bottom: 20px;
        }
        
        .score-excellent { background: linear-gradient(45deg, #4CAF50, #66BB6A); }
        .score-good { background: linear-gradient(45deg, #FF9800, #FFB74D); }
        .score-poor { background: linear-gradient(45deg, #F44336, #EF5350); }
        
        .breakdown-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        
        .breakdown-card {
            background: #fff;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
        }
        
        .breakdown-card h4 {
            color: #667eea;
            margin-bottom: 15px;
            font-size: 14px;
        }
        
        .breakdown-stats {
            display: flex;
            justify-content: space-around;
            margin-top: 15px;
        }
        
        .stat {
            text-align: center;
        }
        
        .stat-number {
            font-size: 20px;
            font-weight: bold;
            color: #333;
        }
        
        .stat-label {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
        }
        
        .tasks-section {
            margin-bottom: 40px;
        }
        
        .section-title {
            color: #333;
            font-size: 24px;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #667eea;
        }
        
        .task-item {
            background: #fff;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 15px;
            border-left: 4px solid var(--priority-color);
        }
        
        .task-high { --priority-color: #F44336; }
        .task-medium { --priority-color: #FF9800; }
        .task-low { --priority-color: #4CAF50; }
        
        .task-title {
            font-weight: 600;
            margin-bottom: 8px;
            color: #333;
        }
        
        .task-description {
            color: #666;
            font-size: 14px;
            line-height: 1.5;
        }
        
        .priority-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
            text-transform: uppercase;
            margin-top: 10px;
        }
        
        .priority-high { background: #ffebee; color: #c62828; }
        .priority-medium { background: #fff3e0; color: #ef6c00; }
        .priority-low { background: #e8f5e8; color: #2e7d32; }
        
        .footer {
            background: #f8f9fa;
            padding: 30px;
            text-align: center;
            margin-top: 40px;
            border-top: 1px solid #e9ecef;
        }
        
        .footer p {
            color: #666;
            font-size: 14px;
            margin-bottom: 10px;
        }
        
        .recommendations {
            background: #f0f8ff;
            border: 1px solid #b6d7ff;
            border-radius: 8px;
            padding: 25px;
            margin-bottom: 30px;
        }
        
        .recommendations h3 {
            color: #1565c0;
            margin-bottom: 15px;
        }
        
        .recommendations ul {
            list-style: none;
            padding-left: 0;
        }
        
        .recommendations li {
            margin-bottom: 10px;
            padding-left: 20px;
            position: relative;
        }
        
        .recommendations li:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #1565c0;
            font-weight: bold;
        }
        
        @media print {
            .container { max-width: none; padding: 0; }
            .header { margin-bottom: 20px; }
            .task-item { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Relatório de Conformidade LGPD</h1>
        <p>Avaliação detalhada da adequação à Lei Geral de Proteção de Dados</p>
    </div>
    
    <div class="container">
        <div class="info-grid">
            <div class="info-card">
                <h3>Empresa</h3>
                <p>${companyName}</p>
            </div>
            <div class="info-card">
                <h3>Responsável</h3>
                <p>${userName}</p>
            </div>
            <div class="info-card">
                <h3>Data do Relatório</h3>
                <p>${reportDate}</p>
            </div>
            <div class="info-card">
                <h3>Avaliação Realizada</h3>
                <p>${new Date(reportData.questionnaireResponse.createdAt).toLocaleDateString('pt-BR')}</p>
            </div>
        </div>
        
        <div class="score-section">
            <div class="score-circle ${compliance.overallScore >= 80 ? 'score-excellent' : compliance.overallScore >= 60 ? 'score-good' : 'score-poor'}">
                ${compliance.overallScore}%
            </div>
            <h2>Nível de Conformidade Geral</h2>
            <p style="margin-top: 10px; font-size: 16px; color: #666;">
                ${compliance.overallScore >= 80 ? 'Excelente conformidade com a LGPD' : 
                  compliance.overallScore >= 60 ? 'Boa conformidade, algumas melhorias necessárias' : 
                  'Conformidade insuficiente, ações imediatas requeridas'}
            </p>
        </div>
        
        <div class="breakdown-grid">
            <div class="breakdown-card">
                <h4>Questões Analisadas</h4>
                <div class="stat-number">${compliance.totalQuestions}</div>
                <div class="breakdown-stats">
                    <div class="stat">
                        <div class="stat-number" style="color: #4CAF50;">${compliance.compliantAnswers}</div>
                        <div class="stat-label">Conformes</div>
                    </div>
                    <div class="stat">
                        <div class="stat-number" style="color: #FF9800;">${compliance.partiallyCompliantAnswers}</div>
                        <div class="stat-label">Parciais</div>
                    </div>
                    <div class="stat">
                        <div class="stat-number" style="color: #F44336;">${compliance.nonCompliantAnswers}</div>
                        <div class="stat-label">Não Conformes</div>
                    </div>
                </div>
            </div>
        </div>
        
        ${compliance.overallScore < 70 ? `
        <div class="recommendations">
            <h3>Recomendações Prioritárias</h3>
            <ul>
                <li>Designar um Encarregado de Proteção de Dados (DPO)</li>
                <li>Implementar políticas claras de privacidade e proteção de dados</li>
                <li>Estabelecer procedimentos para exercício de direitos dos titulares</li>
                <li>Implementar medidas técnicas e organizacionais de segurança</li>
                <li>Treinar equipe sobre LGPD e proteção de dados</li>
            </ul>
        </div>
        ` : ''}
        
        ${priorityTasks.length > 0 ? `
        <div class="tasks-section">
            <h2 class="section-title">Plano de Ação - Tarefas Prioritárias</h2>
            ${priorityTasks.map(task => `
                <div class="task-item task-${task.priority}">
                    <div class="task-title">${task.title}</div>
                    <div class="task-description">${task.description}</div>
                    <span class="priority-badge priority-${task.priority}">
                        Prioridade ${task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                    </span>
                </div>
            `).join('')}
        </div>
        ` : ''}
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