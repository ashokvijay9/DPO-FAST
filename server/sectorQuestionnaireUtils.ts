// Utility functions for sector-specific questionnaires

import { baseLgpdQuestions } from './routes';

// Function to generate sector-specific questions
export async function generateSectorSpecificQuestions(sector: any) {
  try {
    const questions = [...baseLgpdQuestions];
    
    // Add sector-specific questions based on the sector type
    const sectorSpecificQuestions = getSectorSpecificQuestions(sector.name);
    questions.push(...sectorSpecificQuestions);
    
    return questions;
  } catch (error) {
    console.error("Error generating sector-specific questions:", error);
    // Fallback to base questions if there's an error
    return baseLgpdQuestions;
  }
}

// Function to get sector-specific questions based on sector name
function getSectorSpecificQuestions(sectorName: string) {
  const sectorQuestions = [];
  let questionIdStart = baseLgpdQuestions.length + 1;
  
  const normalizedSectorName = sectorName.toLowerCase();
  
  // RH/Recursos Humanos
  if (normalizedSectorName.includes('recursos humanos') || normalizedSectorName.includes('rh')) {
    sectorQuestions.push({
      id: questionIdStart++,
      question: "A empresa possui procedimentos específicos para proteção de dados pessoais de funcionários?",
      type: "single",
      sector: "recursos_humanos",
      requiresDocument: false,
      options: ["sim", "não", "parcial"],
      description: "Procedimentos de RH para proteção de dados dos funcionários"
    });
    sectorQuestions.push({
      id: questionIdStart++,
      question: "Como são tratados os dados pessoais durante processos seletivos?",
      type: "single",
      sector: "recursos_humanos",
      requiresDocument: false,
      options: ["processo formal", "processo informal", "não há processo"],
      description: "Tratamento de dados em recrutamento e seleção"
    });
  }
  
  // TI/Tecnologia
  if (normalizedSectorName.includes('tecnologia') || normalizedSectorName.includes('ti') || normalizedSectorName.includes('informática')) {
    sectorQuestions.push({
      id: questionIdStart++,
      question: "Existem controles técnicos de segurança implementados para proteção dos dados?",
      type: "multiple",
      sector: "tecnologia",
      requiresDocument: false,
      options: ["criptografia", "controle de acesso", "backup seguro", "logs de auditoria", "firewall", "antivírus", "nenhum"],
      description: "Controles técnicos de segurança da informação"
    });
    sectorQuestions.push({
      id: questionIdStart++,
      question: "A empresa possui política de segurança da informação específica para dados pessoais?",
      type: "single",
      sector: "tecnologia", 
      requiresDocument: false,
      options: ["sim", "não", "em desenvolvimento"],
      description: "Política de segurança para dados pessoais"
    });
  }
  
  // Vendas/Comercial
  if (normalizedSectorName.includes('vendas') || normalizedSectorName.includes('comercial') || normalizedSectorName.includes('marketing')) {
    sectorQuestions.push({
      id: questionIdStart++,
      question: "Como são coletados e tratados os dados de clientes e prospects?",
      type: "single",
      sector: "vendas",
      requiresDocument: false,
      options: ["com consentimento explícito", "baseado em interesse legítimo", "sem base legal clara"],
      description: "Base legal para coleta de dados de clientes"
    });
    sectorQuestions.push({
      id: questionIdStart++,
      question: "A empresa possui processo para gerenciar solicitações de opt-out/descadastro?",
      type: "single",
      sector: "vendas",
      requiresDocument: false,
      options: ["sim", "não", "parcial"],
      description: "Processo de opt-out para comunicações comerciais"
    });
  }
  
  // Financeiro
  if (normalizedSectorName.includes('financeiro') || normalizedSectorName.includes('contabilidade') || normalizedSectorName.includes('fiscal')) {
    sectorQuestions.push({
      id: questionIdStart++,
      question: "Como são protegidos os dados financeiros e fiscais dos clientes?",
      type: "single",
      sector: "financeiro",
      requiresDocument: false,
      options: ["controles rigorosos", "controles básicos", "sem controles específicos"],
      description: "Proteção de dados financeiros sensíveis"
    });
  }
  
  // Generic questions for custom sectors
  if (sectorQuestions.length === 0) {
    sectorQuestions.push({
      id: questionIdStart++,
      question: `Como o setor ${sectorName} coleta e processa dados pessoais?`,
      type: "text",
      sector: "custom",
      requiresDocument: false,
      description: "Descrição do tratamento de dados pessoais específico do setor"
    });
    sectorQuestions.push({
      id: questionIdStart++,
      question: `Quais medidas de segurança são aplicadas pelo setor ${sectorName}?`,
      type: "multiple",
      sector: "custom",
      requiresDocument: false,
      options: ["controle de acesso físico", "controle de acesso lógico", "treinamento", "documentação", "auditoria", "outras", "nenhuma"],
      description: "Medidas de segurança específicas do setor"
    });
  }
  
  return sectorQuestions;
}

// Function to create sector-specific compliance tasks
export async function createSectorSpecificComplianceTasks(storage: any, userId: string, sectorId: string, answers: string[], questions: any[], resetTasks: boolean = false) {
  try {
    // If resetTasks is true, mark existing tasks as cancelled
    if (resetTasks) {
      await storage.cancelUserComplianceTasks(userId);
    }
    
    const tasks = [];
    
    // Generate tasks based on answers
    for (let i = 0; i < answers.length && i < questions.length; i++) {
      const question = questions[i];
      const answer = answers[i];
      
      // Generate tasks for specific answers that indicate non-compliance
      if (answer === 'não' || answer === 'parcial') {
        const taskTitle = generateTaskTitleForQuestion(question, answer);
        const taskDescription = generateTaskDescriptionForQuestion(question, answer);
        
        if (taskTitle && taskDescription) {
          const taskData = {
            userId,
            title: `[${sectorId}] ${taskTitle}`,
            description: taskDescription,
            priority: (answer === 'não') ? 'high' as const : 'medium' as const,
            category: mapQuestionToCategory(question),
            lgpdRequirement: mapQuestionToLGPDRequirement(question),
            suggestedDurationDays: (answer === 'não') ? 15 : 30,
          };
          
          const task = await storage.createComplianceTask(taskData);
          tasks.push(task);
        }
      }
    }
    
    return tasks;
  } catch (error) {
    console.error("Error creating sector-specific compliance tasks:", error);
    return [];
  }
}

// Helper functions
function generateTaskTitleForQuestion(question: any, answer: string): string | null {
  if (answer === 'não') {
    switch (question.id) {
      case 1:
        return "Implementar Política de Privacidade";
      case 2:
        return "Designar Responsável por Proteção de Dados";
      case 3:
        return "Realizar Mapeamento de Dados Pessoais";
      case 4:
        return "Criar Procedimentos para Solicitações de Titulares";
      default:
        return `Adequação: ${question.question.substring(0, 50)}...`;
    }
  } else if (answer === 'parcial') {
    switch (question.id) {
      case 1:
        return "Revisar e Atualizar Política de Privacidade";
      case 3:
        return "Completar Mapeamento de Dados Pessoais";
      case 4:
        return "Aprimorar Procedimentos para Solicitações";
      default:
        return `Melhorar: ${question.question.substring(0, 50)}...`;
    }
  }
  return null;
}

function generateTaskDescriptionForQuestion(question: any, answer: string): string {
  const baseDescription = question.description || question.question;
  const urgency = answer === 'não' ? 'URGENTE - ' : 'MELHORIA - ';
  return `${urgency}${baseDescription}. Setor específico: ${question.sector || 'geral'}`;
}

function mapQuestionToCategory(question: any): string {
  if (question.sector) {
    switch (question.sector) {
      case 'recursos_humanos':
        return 'data_protection';
      case 'tecnologia':
        return 'security';
      case 'vendas':
        return 'consent';
      case 'financeiro':
        return 'data_protection';
      default:
        return 'documentation';
    }
  }
  return 'documentation';
}

function mapQuestionToLGPDRequirement(question: any): string {
  switch (question.id) {
    case 1:
      return "Art. 9º - Política de Privacidade";
    case 2:
      return "Art. 41 - Encarregado de Dados";
    case 3:
      return "Art. 37 - Registro de Operações";
    case 4:
      return "Art. 18 - Direitos do Titular";
    default:
      return question.sector ? `Adequação setorial - ${question.sector}` : "Adequação geral";
  }
}