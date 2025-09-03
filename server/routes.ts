import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertQuestionnaireResponseSchema, insertDocumentSchema, updateUserProfileSchema, insertComplianceReportSchema, insertCompanyProfileSchema, companyOnboardingSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import Stripe from "stripe";
import { attachUserPlan, checkDocumentLimits, checkReportLimits, requireAdvancedFeatures, getPlanLimits, type AuthenticatedRequest } from "./middleware/planLimits";
import { generateComplianceReportHTML, type ReportData } from "./reportGenerator";
import fs from "fs";
import { requireAdmin, type AdminRequest } from "./middleware/adminAuth";

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-07-30.basil",
});

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.docx', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, JPG, and PNG files are allowed.'));
    }
  },
});

// Base questions for all companies
const baseLgpdQuestions = [
  {
    id: 1,
    question: "A empresa possui uma política de privacidade documentada e atualizada?",
    type: "single",
    sector: "base",
    requiresDocument: false,
    options: ["sim", "não", "parcial"],
    description: "Política de privacidade - documento será solicitado via tarefa"
  },
  {
    id: 2,
    question: "Existe um responsável designado para questões de proteção de dados (DPO ou equivalente)?",
    type: "single", 
    sector: "base",
    requiresDocument: false,
    options: ["sim", "não"],
    description: "alternativa - sim/não; não requer documento anexado obrigatório"
  },
  {
    id: 3,
    question: "A empresa realiza mapeamento dos dados pessoais que coleta e processa?",
    type: "single",
    sector: "base", 
    requiresDocument: false,
    options: ["sim", "não", "parcial"],
    description: "Mapeamento de dados - documento será solicitado via tarefa"
  },
  {
    id: 4,
    question: "A empresa possui procedimento para atender solicitações dos titulares (acesso, correção, exclusão)?",
    type: "single",
    sector: "base",
    requiresDocument: false,
    options: ["sim", "não", "parcial"],
    description: "Procedimento de solicitações - documento será solicitado via tarefa"
  },
  {
    id: 5,
    question: "Quais dos dados abaixo são utilizados nesse tratamento de dados?",
    type: "multiple",
    requiresDocument: false,
    options: [
      "Nome", "Sobrenome", "Assinatura", "Apenas iniciais", "Idade", "Data e Local de nascimento", "Gênero", "Certidão de Nascimento",
      "Altura", "Peso", "Nacionalidade", "Naturalidade", "Estado Civil", "Lazer e interesses", "Fotografias", "Gravação de voz",
      "Número de filhos", "Raça ou Origem Étnica", "Histórico/ vida sexual", "Dado biométrico (identificar)", "Nome da Mãe", "Nome do Pai",
      "CPF", "RG", "CNH", "CTPS", "Dados de crianças e adolescentes", "Carteira SUS", "Bolsa família", "Número de passaporte",
      "Visto de entrada em outros países", "PIS/PASEP", "Endereço residencial", "Telefone residencial", "Número de fax residencial",
      "E-mail pessoal", "Número de celular pessoal", "Mídias sociais", "Diplomas e escolaridade", "Licenças e associação profissional",
      "Histórico acadêmico", "Ocupação/Cargo", "Endereço comercial", "Telefone comercial", "Fax comercial", "E-mail comercial",
      "Celular comercial", "Número de Identificação do Empregador", "Exame médico admissional", "Exame médico periódico",
      "Exame médico demissional", "Carta de referência", "Número de Identificação do de pagamento de imposto de renda",
      "Reivindicações/reclamações do funcionário dentro da instituição", "Histórico empregatício declarado pelo funcionário",
      "Histórico empregatício obtido através de análise/troca de informações com empresas fora da empresa", "Dados bancários",
      "Dados de PIX", "Histórico de transações financeiras", "Score de crédito", "Histórico do uso de seguro",
      "Salário e outros rendimentos", "Dados de renda familiar mensal e patrimônio", "Antecedentes criminais",
      "Processos em andamento/concluídos envolvendo o titular", "Crenças religiosas ou filosóficas", "Posicionamento político",
      "Filiação sindical", "Filiação política", "Orientação sexual", "Preferência de compra", "Preferências de navegação na internet",
      "Perfil comportamental", "Informações sobre dispositivos móveis", "Geolocalização", "Áudio/Vídeo", "Informações no calendário",
      "Registro de ligações", "Contatos/Agenda", "Mensagens de texto (conteúdo)", "E-mail (conteúdo)", "Identificador único de dispositivo (IMEI)",
      "Endereço de IP", "Clickstream/rastreamento de website", "Modelo do aparelho/versão do sistema operacional do dispositivo",
      "Senha de acesso ao dispositivo", "MAC address /ou número de série", "Número do cartão", "Nome do titular do cartão",
      "Data de validade", "Número, CVV, CVC2, CID", "Senha", "Número de registro médico", "Número de beneficiário no plano de saúde",
      "Tratamento médico", "Diagnóstico médico", "Reembolsos médicos", "Histórico médico", "Dados de reclamações médicas",
      "Número de prescrição médica", "Histórico de saúde familiar ou morbidade", "Informações genéticas", "Dados de veículo",
      "origem racial ou étnica", "convicção religiosa", "opinião política", "filiação a sindicato",
      "organização de caráter religioso, filosófico ou político", "dado referente à saúde", "Dado referente à vida sexual",
      "dado genético ou biométrico", "Outros"
    ],
    description: "alternativa - seleção múltipla de opções listadas; não requer documento anexado obrigatório"
  },
  {
    id: 6,
    question: "Por qual motivo os dados são coletados?",
    type: "text",
    requiresDocument: false,
    description: "dissertativa; não requer documento anexado obrigatório"
  },
  {
    id: 7,
    question: "Em qual hipótese prevista na LGPD os dados são coletados?",
    type: "single",
    requiresDocument: false,
    options: [
      "Mediante consentimento do titular",
      "Cumprimento de obrigação legal pelo controlador;",
      "Cumprimento de obrigação regulatória pelo controlador;",
      "Pela administração pública, para o tratamento e uso compartilhado de dados necessários à execução de políticas públicas previstas em leis e regulamentos ou respaldadas em contratos, convênios ou instrumentos congêneres, observadas as disposições do Capítulo IV desta Lei;",
      "Para a realização de estudos por órgão de pesquisa",
      "Execução de contrato",
      "Execução de procedimentos preliminares relacionados a contrato",
      "Para o exercício regular de direitos em processo judicial, administrativo ou arbitral",
      "Para a proteção da vida ou da incolumidade física do titular ou de terceiro;",
      "Para a tutela da saúde",
      "Interesses legítimos do controlador ou de terceiro",
      "Para a proteção do crédito",
      "Garantia da prevenção à fraude e à segurança do titular, nos processos de identificação e autenticação de cadastro em sistemas eletrônicos"
    ],
    description: "alternativa - seleção de opções listadas; não requer documento anexado obrigatório"
  },
  {
    id: 8,
    question: "Quem é o titular dos dados coletados?",
    type: "multiple",
    requiresDocument: false,
    options: ["Sócio", "Colaborador", "Fornecedor", "Cliente", "Visitante", "Outros"],
    description: "alternativa - seleção múltipla de opções listadas; não requer documento anexado obrigatório"
  },
  {
    id: 9,
    question: "Durante o mês quantas vezes os dados são coletados para essa finalidade?",
    type: "single",
    requiresDocument: false,
    options: ["Até 25", "De 25 a 50", "De 51 a 100", "de 101 a 200", "Mais de 200"],
    description: "alternativa - seleção de opções listadas; não requer documento anexado obrigatório"
  },
  {
    id: 10,
    question: "Se o dado é utilizado com base no consentimento, a empresa solicita formalmente o consentimento do titular?",
    type: "single",
    requiresDocument: false,
    options: ["sim", "não", "Esse processo não está baseado no consentimento"],
    description: "Processo de consentimento - documento será solicitado via tarefa"
  },
  {
    id: 11,
    question: "Como os dados são coletados?",
    type: "multiple",
    requiresDocument: false,
    options: ["Formulário no site", "Formulário em aplicativo", "Formulário físico", "whatsapp ou similares", "e-mail", "telefone", "Enviado por outra empresa cliente", "Enviado por outra empresa não cliente", "Comprado de outra empresa", "Enviado por outra área da empresa", "Dados armazenados previamente em sistema"],
    description: "alternativa - seleção múltipla de opções listadas; não requer documento anexado obrigatório"
  },
  {
    id: 12,
    question: "Outras áreas da empresa possuem acesso aos mesmos dados?",
    type: "single",
    requiresDocument: false,
    options: ["sim", "não"],
    description: "alternativa - sim/não; não requer documento anexado obrigatório"
  },
  {
    id: 13,
    question: "A área compartilha os dados com empresas externas?",
    type: "single",
    requiresDocument: false,
    options: ["sim", "não"],
    description: "alternativa - sim/não; não requer documento anexado obrigatório"
  },
  {
    id: 14,
    question: "No caso de resposta positiva ao item 13, o compartilhamento é informado ao titular?",
    type: "single",
    requiresDocument: false,
    options: ["sim", "não"],
    description: "Notificação de compartilhamento - documento será solicitado via tarefa"
  },
  {
    id: 15,
    question: "Como os dados são armazenados?",
    type: "single",
    requiresDocument: false,
    options: ["Formato Digital", "Formato físico"],
    description: "alternativa - seleção de opções listadas; não requer documento anexado obrigatório"
  },
  {
    id: 16,
    question: "Se for em formato físico, os dados ficam armazenados em arquivos?",
    type: "single",
    requiresDocument: false,
    options: ["sim", "não"],
    description: "alternativa - sim/não; não requer documento anexado obrigatório"
  },
  {
    id: 17,
    question: "Em caso positivo o arquivo físico fica localizado em sala com controle de acesso?",
    type: "single",
    requiresDocument: false,
    options: ["sim", "não"],
    description: "alternativa - sim/não; não requer documento anexado obrigatório"
  },
  {
    id: 18,
    question: "O arquivo físico é chaveado?",
    type: "single",
    requiresDocument: false,
    options: ["sim", "não"],
    description: "alternativa - sim/não; não requer documento anexado obrigatório"
  },
  {
    id: 19,
    question: "Se for em formato digital, os arquivos ficam armazenados em nuvem?",
    type: "single",
    requiresDocument: false,
    options: ["sim", "não"],
    description: "alternativa - sim/não; não requer documento anexado obrigatório"
  },
  {
    id: 20,
    question: "Em caso positivo qual o provedor de nuvem utilizado:",
    type: "text",
    requiresDocument: false,
    options: [],
    description: "Provedor de nuvem - documento será solicitado via tarefa"
  },
  {
    id: 21,
    question: "Se for em formato digital, os arquivos ficam armazenados em sistemas?",
    type: "single",
    requiresDocument: false,
    options: ["sim", "não"],
    description: "alternativa - sim/não; não requer documento anexado obrigatório"
  },
  {
    id: 22,
    question: "Em caso positivo de armazenamento de sistema, qual o nome do sistema e a empresa que o fornece? (incluir o site da empresa)",
    type: "text",
    requiresDocument: false,
    options: [],
    description: "Sistema de armazenamento - documento será solicitado via tarefa"
  },
  {
    id: 23,
    question: "Os dados são compartilhados ou arquivados com empresas ou provedores localizados em território estrangeiro?",
    type: "single",
    requiresDocument: false,
    options: ["sim", "não"],
    description: "Transferência internacional - documento será solicitado via tarefa"
  },
  {
    id: 24,
    question: "A área utiliza dispositivo móvel de armazenamento de dados?",
    type: "single",
    requiresDocument: false,
    options: ["sim", "não"],
    description: "alternativa - sim/não; não requer documento anexado obrigatório"
  },
  {
    id: 25,
    question: "A área realiza backups dos dados que utiliza?",
    type: "single",
    requiresDocument: false,
    options: ["sim", "não"],
    description: "alternativa - sim/não; não requer documento anexado obrigatório"
  },
  {
    id: 26,
    question: "Por quanto tempo os dados são armazenados?",
    type: "single",
    requiresDocument: false,
    options: ["Tempo indefinido", "Até 1 ano", "Até 5 anos", "Até 10 anos", "Até 20 anos"],
    description: "alternativa - seleção de opções listadas; não requer documento anexado obrigatório"
  },
  {
    id: 27,
    question: "O dado pessoal é submetido a decisão automatizada durante o processo?",
    type: "single",
    requiresDocument: false,
    options: ["sim", "não"],
    description: "alternativa - sim/não; não requer documento anexado obrigatório"
  },
  {
    id: 28,
    question: "O dado pessoal é utilizado em campanhas de marketing ou para finalidades diferente da informada?",
    type: "single",
    requiresDocument: false,
    options: ["sim", "não"],
    description: "alternativa - sim/não; não requer documento anexado obrigatório"
  },
  {
    id: 29,
    question: "O dado pessoal é revisado periodicamente?",
    type: "single",
    requiresDocument: false,
    options: ["sim", "não"],
    description: "alternativa - sim/não; não requer documento anexado obrigatório"
  }
];

// Sector-specific questions
const sectorQuestions = {
  "Recursos Humanos": [
    {
      id: 101,
      question: "Como a empresa coleta e armazena dados dos funcionários durante o processo de contratação?",
      type: "text",
      sector: "rh",
      requiresDocument: false,
      description: "Descreva os procedimentos de coleta de dados no processo seletivo. Documento será solicitado via tarefa."
    },
    {
      id: 102,
      question: "Quais dados biométricos são coletados dos funcionários, se houver?",
      type: "multiple",
      sector: "rh",
      requiresDocument: false,
      options: ["Impressão digital", "Reconhecimento facial", "Íris", "Voz", "Nenhum", "Outros"],
      description: "Selecione todas as opções aplicáveis"
    },
    {
      id: 103,
      question: "A empresa possui consentimento explícito para processamento de dados sensíveis dos funcionários (saúde, origem racial, etc.)?",
      type: "single",
      sector: "rh",
      requiresDocument: false,
      options: ["sim", "não", "parcial"],
      description: "Consentimento para dados sensíveis - documento será solicitado via tarefa"
    },
    {
      id: 104,
      question: "Como é realizado o controle de acesso aos dados dos funcionários?",
      type: "text",
      sector: "rh",
      requiresDocument: false,
      description: "Descreva os mecanismos de controle de acesso"
    }
  ],
  "Finanças": [
    {
      id: 201,
      question: "Como são protegidos os dados financeiros dos clientes (contas bancárias, cartões, etc.)?",
      type: "text",
      sector: "financas",
      requiresDocument: false,
      description: "Descreva as medidas de proteção. Documento será solicitado via tarefa."
    },
    {
      id: 202,
      question: "A empresa possui certificação de segurança para processamento de pagamentos?",
      type: "single",
      sector: "financas",
      requiresDocument: false,
      options: ["sim", "não"],
      description: "Certificação de segurança - documento será solicitado via tarefa"
    },
    {
      id: 203,
      question: "Quais dados financeiros são compartilhados com terceiros?",
      type: "multiple",
      sector: "financas",
      requiresDocument: false,
      options: ["CPF", "Dados bancários", "Histórico de transações", "Score de crédito", "Nenhum", "Outros"],
      description: "Selecione todas as opções aplicáveis"
    },
    {
      id: 204,
      question: "Por quanto tempo os dados financeiros são armazenados?",
      type: "single",
      sector: "financas",
      requiresDocument: false,
      options: ["Até 5 anos", "5-10 anos", "Mais de 10 anos", "Indefinidamente"],
      description: "Selecione o período de retenção"
    }
  ],
  "Marketing": [
    {
      id: 301,
      question: "Como é obtido o consentimento para envio de comunicações de marketing?",
      type: "text",
      sector: "marketing",
      requiresDocument: false,
      description: "Descreva o processo de obtenção de consentimento. Documento será solicitado via tarefa."
    },
    {
      id: 302,
      question: "A empresa possui mecanismo para opt-out de comunicações de marketing?",
      type: "single",
      sector: "marketing",
      requiresDocument: false,
      options: ["sim", "não"],
      description: "alternativa - sim/não; não requer documento anexado obrigatório"
    },
    {
      id: 303,
      question: "Quais dados são utilizados para segmentação de campanhas de marketing?",
      type: "multiple",
      sector: "marketing",
      requiresDocument: false,
      options: ["Dados demográficos", "Comportamento de compra", "Localização", "Preferências", "Dados de redes sociais", "Outros"],
      description: "Selecione todas as opções aplicáveis"
    },
    {
      id: 304,
      question: "São utilizados cookies ou tecnologias de rastreamento no site/app da empresa?",
      type: "single",
      sector: "marketing",
      requiresDocument: false,
      options: ["sim", "não", "parcial"],
      description: "Política de cookies - documento será solicitado via tarefa"
    }
  ],
  "Vendas": [
    {
      id: 401,
      question: "Como são coletados e armazenados os dados dos leads/prospects?",
      type: "text",
      sector: "vendas",
      requiresDocument: false,
      description: "Descreva o processo de coleta e armazenamento"
    },
    {
      id: 402,
      question: "A empresa possui CRM? Como os dados dos clientes são protegidos nele?",
      type: "text",
      sector: "vendas",
      requiresDocument: false,
      description: "Descreva as medidas de proteção no CRM. Documento será solicitado via tarefa."
    },
    {
      id: 403,
      question: "Os vendedores têm acesso a dados pessoais sensíveis dos clientes?",
      type: "single",
      sector: "vendas",
      requiresDocument: false,
      options: ["sim", "não", "parcial"],
      description: "alternativa - sim/não/parcial; não requer documento anexado obrigatório"
    }
  ],
  "Tecnologia da Informação": [
    {
      id: 501,
      question: "Existe política de segurança da informação documentada e implementada?",
      type: "single",
      sector: "ti",
      requiresDocument: false,
      options: ["sim", "não", "parcial"],
      description: "Política de segurança - documento será solicitado via tarefa"
    },
    {
      id: 502,
      question: "Como são realizados os backups dos dados pessoais?",
      type: "text",
      sector: "ti",
      requiresDocument: false,
      description: "Descreva a política e procedimentos de backup"
    },
    {
      id: 503,
      question: "A empresa possui plano de resposta a incidentes de segurança?",
      type: "single",
      sector: "ti",
      requiresDocument: false,
      options: ["sim", "não", "parcial"],
      description: "Plano de resposta - documento será solicitado via tarefa"
    },
    {
      id: 504,
      question: "São realizadas auditorias de segurança regularmente?",
      type: "single",
      sector: "ti",
      requiresDocument: false,
      options: ["sim", "não", "parcial"],
      description: "alternativa - sim/não/parcial; não requer documento anexado obrigatório"
    }
  ],
  "Atendimento ao Cliente": [
    {
      id: 601,
      question: "Como são tratadas as solicitações dos titulares sobre seus dados pessoais (acesso, correção, exclusão)?",
      type: "text",
      sector: "atendimento",
      requiresDocument: false,
      description: "Descreva o processo de atendimento às solicitações. Documento será solicitado via tarefa."
    },
    {
      id: 602,
      question: "Existe canal específico para solicitações relacionadas à LGPD?",
      type: "single",
      sector: "atendimento",
      requiresDocument: false,
      options: ["sim", "não"],
      description: "alternativa - sim/não; não requer documento anexado obrigatório"
    },
    {
      id: 603,
      question: "Os atendentes são treinados sobre proteção de dados pessoais?",
      type: "single",
      sector: "atendimento",
      requiresDocument: false,
      options: ["sim", "não", "parcial"],
      description: "Certificados de treinamento - documento será solicitado via tarefa"
    }
  ]
};

// Function to generate dynamic questions based on company sectors
async function generateDynamicQuestions(userId: string) {
  try {
    const companyProfile = await storage.getCompanyProfile(userId);
    const sectors = (companyProfile?.sectors as string[]) || [];
    const customSectors = (companyProfile?.customSectors as string[]) || [];
    
    // Start with base questions
    let dynamicQuestions = [...baseLgpdQuestions];
    
    // Add sector-specific questions
    sectors.forEach(sector => {
      if (sectorQuestions[sector as keyof typeof sectorQuestions]) {
        dynamicQuestions = [...dynamicQuestions, ...sectorQuestions[sector as keyof typeof sectorQuestions]];
      }
    });
    
    // For custom sectors, add generic questions
    customSectors.forEach((customSector, index) => {
      dynamicQuestions.push({
        id: 700 + index,
        question: `Como o setor "${customSector}" coleta e processa dados pessoais?`,
        type: "text",
        sector: "custom",
        requiresDocument: false,
        description: "Descreva os processos de tratamento de dados específicos deste setor"
      });
    });
    
    return dynamicQuestions;
  } catch (error) {
    console.error("Error generating dynamic questions:", error);
    // Fallback to base questions if there's an error
    return baseLgpdQuestions;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, attachUserPlan, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Include plan information in the response
      const userWithPlan = {
        ...user,
        planLimits: req.planLimits
      };
      
      res.json(userWithPlan);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Company profile routes
  app.post('/api/company-profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const companyData = companyOnboardingSchema.parse(req.body);
      
      const profile = await storage.createCompanyProfile({
        userId,
        ...companyData,
        departments: companyData.departments as any, // Cast to jsonb
        sectors: companyData.sectors as any, // Cast to jsonb
        customSectors: companyData.customSectors as any, // Cast to jsonb
      });
      
      res.json(profile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating company profile:", error);
      res.status(500).json({ message: "Failed to create company profile" });
    }
  });

  app.get('/api/company-profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getCompanyProfile(userId);
      res.json(profile);
    } catch (error) {
      console.error("Error fetching company profile:", error);
      res.status(500).json({ message: "Failed to fetch company profile" });
    }
  });

  app.put('/api/company-profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updates = companyOnboardingSchema.partial().parse(req.body);
      
      const profile = await storage.updateCompanyProfile(userId, {
        ...updates,
        departments: updates.departments as any, // Cast to jsonb
        sectors: updates.sectors as any, // Cast to jsonb
        customSectors: updates.customSectors as any, // Cast to jsonb
      });
      
      res.json(profile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating company profile:", error);
      res.status(500).json({ message: "Failed to update company profile" });
    }
  });

  // Profile routes
  app.put('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = updateUserProfileSchema.parse(req.body);

      const updatedUser = await storage.updateUserProfile(userId, validatedData);

      // Log the action
      await storage.logAction({
        userId,
        action: 'profile_updated',
        resourceType: 'user',
        resourceId: userId,
        details: { updatedFields: Object.keys(validatedData) },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Password reset request (simulated for Replit Auth)
  app.post('/api/profile/reset-password', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      // Log the action
      await storage.logAction({
        userId,
        action: 'password_reset_requested',
        resourceType: 'user',
        resourceId: userId,
        details: { email: user?.email },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      // Since we use Replit Auth, we can't actually reset passwords
      // This is just for logging/audit purposes
      res.json({ 
        message: "Solicitação de redefinição de senha registrada. Como você está usando login do Replit, a alteração de senha deve ser feita diretamente na sua conta Replit.",
        success: true 
      });
    } catch (error) {
      console.error("Error processing password reset request:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  // Dashboard route
  app.get('/api/dashboard', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const dashboardData = await storage.getDashboardData(userId);
      res.json(dashboardData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // Questionnaire routes
  app.get('/api/questionnaire/questions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const dynamicQuestions = await generateDynamicQuestions(userId);
      res.json({ questions: dynamicQuestions });
    } catch (error) {
      console.error("Error generating dynamic questions:", error);
      // Fallback to base questions
      res.json({ questions: baseLgpdQuestions });
    }
  });

  app.get('/api/questionnaire/response', async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || 'dev-user-123';
      const response = await storage.getQuestionnaireResponse(userId);
      res.json(response);
    } catch (error) {
      console.error("Error fetching questionnaire response:", error);
      res.status(500).json({ message: "Failed to fetch questionnaire response" });
    }
  });

  // Development route without authentication for testing
  app.post('/api/questionnaire/save', async (req: any, res) => {
    try {
      // For development/testing, use a default user ID if not authenticated
      const userId = req.user?.claims?.sub || 'dev-user-123';
      const { resetTasks = false, ...bodyData } = req.body;
      const validatedData = insertQuestionnaireResponseSchema.parse({
        ...bodyData,
        userId,
      });

      // Calculate compliance score based on answers
      const answers = JSON.parse(validatedData.answer);
      const dynamicQuestions = await generateDynamicQuestions(userId);
      let score = 0;
      answers.forEach((answer: string, index: number) => {
        if (answer === 'sim') score += 10;
        else if (answer === 'parcial') score += 5;
      });
      validatedData.complianceScore = Math.min(score, Math.max(100, dynamicQuestions.length * 10));

      const response = await storage.saveQuestionnaireResponse(validatedData);
      
      // Create compliance tasks based on answers - only reset if explicitly requested
      if (validatedData.isComplete) {
        await createComplianceTasksBasedOnAnswers(userId, answers, resetTasks);
      }

      // Log the action
      await storage.logAction({
        userId,
        action: 'questionnaire_completed',
        resourceType: 'questionnaire',
        resourceId: response.id,
        details: { complianceScore: score },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json(response);
    } catch (error) {
      console.error("Error saving questionnaire:", error);
      res.status(500).json({ message: "Failed to save questionnaire" });
    }
  });

  // Document routes
  app.get('/api/documents', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const documents = await storage.getDocuments(userId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.post('/api/documents/upload', isAuthenticated, attachUserPlan, checkDocumentLimits, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const userId = req.user.claims.sub;
      const { name, category, description } = req.body;

      // In a real implementation, you would upload to cloud storage (AWS S3, etc.)
      // For now, we'll simulate a file URL
      const fileUrl = `/uploads/${req.file.filename}`;

      const documentData = {
        userId,
        name: name || req.file.originalname,
        category: category || 'outros',
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        fileUrl,
        description,
        status: 'valid' as const,
      };

      const document = await storage.createDocument(documentData);

      // Log the action
      await storage.logAction({
        userId,
        action: 'document_uploaded',
        resourceType: 'document',
        resourceId: document.id,
        details: { fileName: req.file.originalname, fileSize: req.file.size },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json(document);
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  app.delete('/api/documents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const documentId = req.params.id;

      const deleted = await storage.deleteDocument(documentId, userId);
      
      if (deleted) {
        // Log the action
        await storage.logAction({
          userId,
          action: 'document_deleted',
          resourceType: 'document',
          resourceId: documentId,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        });

        res.json({ message: "Document deleted successfully" });
      } else {
        res.status(404).json({ message: "Document not found" });
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Compliance task routes
  app.get('/api/compliance-tasks', isAuthenticated, attachUserPlan, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tasks = await storage.getComplianceTasks(userId);
      
      // Check if user has access to detailed task information
      const hasDetailAccess = req.userPlan === 'basic' || req.userPlan === 'pro' || req.userPlan === 'personalite';
      
      // Filter task data based on user plan
      const filteredTasks = tasks.map(task => {
        if (hasDetailAccess) {
          // Return full task data for paid plans
          return task;
        } else {
          // Return basic task info for free plan
          return {
            id: task.id,
            title: task.title,
            description: task.description,
            category: task.category || 'general',
            priority: task.priority || 'medium',
            status: task.status || 'pending',
            dueDate: task.dueDate,
            steps: [] // Empty steps array for free users
          };
        }
      });
      
      res.json(filteredTasks);
    } catch (error) {
      console.error("Error fetching compliance tasks:", error);
      res.status(500).json({ message: "Failed to fetch compliance tasks" });
    }
  });

  app.patch('/api/compliance-tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const taskId = req.params.id;
      const { status } = req.body;
      
      const updates: any = { status };
      if (status === 'completed') {
        updates.completedAt = new Date();
      }

      const task = await storage.updateComplianceTask(taskId, updates);
      res.json(task);
    } catch (error) {
      console.error("Error updating compliance task:", error);
      res.status(500).json({ message: "Failed to update compliance task" });
    }
  });

  // Plan limits endpoint
  app.get('/api/plan/limits', isAuthenticated, attachUserPlan, async (req: any, res) => {
    try {
      res.json({
        plan: req.userPlan,
        limits: req.planLimits
      });
    } catch (error) {
      console.error("Error fetching plan limits:", error);
      res.status(500).json({ message: "Failed to fetch plan limits" });
    }
  });

  // Compliance report routes
  app.post('/api/reports/generate', isAuthenticated, attachUserPlan, checkReportLimits, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get user information
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get questionnaire response
      const questionnaireResponse = await storage.getQuestionnaireResponse(userId);
      if (!questionnaireResponse) {
        return res.status(400).json({ message: "Questionário deve ser preenchido antes de gerar relatório" });
      }

      // Get compliance tasks
      const complianceTasks = await storage.getComplianceTasks(userId);

      // Get dynamic questions
      const dynamicQuestions = await generateDynamicQuestions(userId);

      // Prepare report data
      const reportData: ReportData = {
        user: {
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          email: user.email || undefined,
          company: user.company || undefined,
        },
        questionnaireResponse,
        complianceTasks,
        questions: dynamicQuestions,
      };

      // Get user plan
      const userPlan = user.subscriptionPlan || 'free';

      // Generate HTML Report
      const { html, filename } = await generateComplianceReportHTML(reportData, userPlan);
      
      // Create reports directory if it doesn't exist
      const reportsDir = 'uploads/reports';
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      // Save HTML file
      const filePath = path.join(reportsDir, filename);
      fs.writeFileSync(filePath, html, 'utf8');

      // Save report record to database
      const reportRecord = await storage.createComplianceReport({
        userId,
        questionnaireResponseId: questionnaireResponse.id,
        title: `Relatório de Conformidade LGPD - ${user.company || 'Empresa'}`,
        reportType: 'compliance_summary',
        complianceScore: questionnaireResponse.complianceScore || 0,
        fileName: filename,
        fileSize: Buffer.from(html).length,
        fileUrl: `/uploads/reports/${filename}`,
        status: 'generated',
      });

      // Log the action
      await storage.logAction({
        userId,
        action: 'compliance_report_generated',
        resourceType: 'report',
        resourceId: reportRecord.id,
        details: { 
          filename,
          complianceScore: questionnaireResponse.complianceScore,
          reportType: 'compliance_summary'
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json({
        message: "Relatório gerado com sucesso",
        report: reportRecord,
        downloadUrl: `/api/reports/${reportRecord.id}/download`
      });
    } catch (error) {
      console.error("Error generating compliance report:", error);
      res.status(500).json({ message: "Failed to generate compliance report" });
    }
  });

  app.get('/api/reports', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reports = await storage.getComplianceReports(userId);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching compliance reports:", error);
      res.status(500).json({ message: "Failed to fetch compliance reports" });
    }
  });

  app.get('/api/reports/:id/download', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reportId = req.params.id;
      
      const report = await storage.getComplianceReport(reportId, userId);
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }

      const filePath = path.join(process.cwd(), report.fileUrl);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Report file not found" });
      }

      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${report.fileName}"`);
      
      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

      // Log the action
      await storage.logAction({
        userId,
        action: 'compliance_report_downloaded',
        resourceType: 'report',
        resourceId: reportId,
        details: { fileName: report.fileName },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });
    } catch (error) {
      console.error("Error downloading compliance report:", error);
      res.status(500).json({ message: "Failed to download compliance report" });
    }
  });

  app.delete('/api/reports/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reportId = req.params.id;
      
      const report = await storage.getComplianceReport(reportId, userId);
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }

      // Delete file from filesystem
      const filePath = path.join(process.cwd(), report.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Delete record from database
      const deleted = await storage.deleteComplianceReport(reportId, userId);
      
      if (deleted) {
        // Log the action
        await storage.logAction({
          userId,
          action: 'compliance_report_deleted',
          resourceType: 'report',
          resourceId: reportId,
          details: { fileName: report.fileName },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        });

        res.json({ message: "Report deleted successfully" });
      } else {
        res.status(404).json({ message: "Report not found" });
      }
    } catch (error) {
      console.error("Error deleting compliance report:", error);
      res.status(500).json({ message: "Failed to delete compliance report" });
    }
  });

  // Sector Analysis and Report endpoints
  app.get('/api/reports/sector-analysis', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get questionnaire response
      const questionnaireResponse = await storage.getQuestionnaireResponse(userId);
      if (!questionnaireResponse) {
        return res.status(400).json({ message: "Questionário deve ser preenchido antes de gerar análise por setor" });
      }

      // Get company profile to get sectors
      const companyProfile = await storage.getCompanyProfile(userId);
      if (!companyProfile) {
        return res.status(400).json({ message: "Perfil da empresa deve ser configurado" });
      }

      const sectors = (companyProfile.sectors as string[]) || [];
      const answers = JSON.parse(questionnaireResponse.answer);
      
      // Analyze compliance by sector
      const sectorAnalysis = await analyzeSectorCompliance(userId, answers, sectors);
      
      res.json({
        sectorAnalysis,
        totalSectors: sectors.length,
        companyName: companyProfile.companyName
      });
    } catch (error) {
      console.error("Error generating sector analysis:", error);
      res.status(500).json({ message: "Failed to generate sector analysis" });
    }
  });

  app.post('/api/reports/generate-sector', isAuthenticated, attachUserPlan, checkReportLimits, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get user information
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get questionnaire response
      const questionnaireResponse = await storage.getQuestionnaireResponse(userId);
      if (!questionnaireResponse) {
        return res.status(400).json({ message: "Questionário deve ser preenchido antes de gerar relatório" });
      }

      // Get company profile
      const companyProfile = await storage.getCompanyProfile(userId);
      if (!companyProfile) {
        return res.status(400).json({ message: "Perfil da empresa deve ser configurado" });
      }

      const sectors = (companyProfile.sectors as string[]) || [];
      const answers = JSON.parse(questionnaireResponse.answer);
      
      // Get sector analysis
      const sectorAnalysis = await analyzeSectorCompliance(userId, answers, sectors);
      
      // Get compliance tasks
      const complianceTasks = await storage.getComplianceTasks(userId);
      
      // Get dynamic questions
      const dynamicQuestions = await generateDynamicQuestions(userId);

      // Prepare sector report data
      const reportData = {
        user: {
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          email: user.email || undefined,
          company: companyProfile.companyName || undefined,
        },
        companyProfile,
        questionnaireResponse,
        complianceTasks,
        questions: dynamicQuestions,
        sectorAnalysis,
        sectors
      };

      // Get user plan
      const userPlan = user.subscriptionPlan || 'free';

      // Generate sector HTML report
      const { html, filename } = await generateComplianceReportHTML({
        user: reportData.user,
        questionnaireResponse: reportData.questionnaireResponse,
        complianceTasks: reportData.complianceTasks,
        questions: reportData.questions
      }, userPlan);
      
      // Create reports directory if it doesn't exist
      const reportsDir = 'uploads/reports';
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      // Save HTML file
      const filePath = path.join(reportsDir, filename);
      fs.writeFileSync(filePath, html, 'utf8');

      // Save report record to database
      const reportRecord = await storage.createComplianceReport({
        userId,
        questionnaireResponseId: questionnaireResponse.id,
        title: `Relatório por Setores LGPD - ${companyProfile.companyName}`,
        reportType: 'sector_analysis',
        complianceScore: questionnaireResponse.complianceScore || 0,
        fileName: filename,
        fileSize: Buffer.from(html).length,
        fileUrl: `/uploads/reports/${filename}`,
        status: 'generated',
      });

      // Log the action
      await storage.logAction({
        userId,
        action: 'sector_report_generated',
        resourceType: 'report',
        resourceId: reportRecord.id,
        details: { 
          filename,
          complianceScore: questionnaireResponse.complianceScore,
          reportType: 'sector_analysis',
          sectors: sectors.length
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json({
        message: "Relatório por setores gerado com sucesso",
        report: reportRecord,
        sectorAnalysis,
        downloadUrl: `/api/reports/${reportRecord.id}/download`
      });
    } catch (error) {
      console.error("Error generating sector compliance report:", error);
      res.status(500).json({ message: "Failed to generate sector compliance report" });
    }
  });

  // Subscription routes
  app.get('/api/subscription/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      res.json({
        subscriptionStatus: user?.subscriptionStatus || 'inactive',
        subscriptionPlan: user?.subscriptionPlan || 'free',
        stripeCustomerId: user?.stripeCustomerId,
        stripeSubscriptionId: user?.stripeSubscriptionId,
      });
    } catch (error) {
      console.error("Error fetching subscription status:", error);
      res.status(500).json({ message: "Failed to fetch subscription status" });
    }
  });

  app.post('/api/subscription/create-checkout', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { priceId, plan } = req.body;
      
      if (!priceId || !plan) {
        return res.status(400).json({ message: "Price ID and plan are required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let customerId = user.stripeCustomerId;

      // Create Stripe customer if doesn't exist
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email || '',
          name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email || '',
          metadata: {
            userId: userId,
          },
        });
        customerId = customer.id;
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${req.protocol}://${req.get('host')}/subscription?success=true`,
        cancel_url: `${req.protocol}://${req.get('host')}/subscription?canceled=true`,
        metadata: {
          userId: userId,
          plan: plan,
        },
      });

      res.json({ sessionUrl: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  app.post('/api/subscription/cancel', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.stripeSubscriptionId) {
        return res.status(404).json({ message: "No active subscription found" });
      }

      // Cancel subscription at period end
      await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      res.json({ message: "Subscription will be canceled at the end of the billing period" });
    } catch (error) {
      console.error("Error canceling subscription:", error);
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });

  // Stripe webhook endpoint
  app.post('/api/webhooks/stripe', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig as string, process.env.STRIPE_WEBHOOK_SECRET || '');
    } catch (err: any) {
      console.log(`Webhook signature verification failed.`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.userId && session.metadata?.plan && session.customer) {
          // Update user subscription status
          await storage.updateUserSubscription(
            session.metadata.userId,
            session.customer as string,
            session.subscription as string,
            session.metadata.plan
          );
        }
        break;
      case 'customer.subscription.deleted':
        const subscription = event.data.object as Stripe.Subscription;
        // Handle subscription cancellation
        // You might want to update user status to inactive
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  });

  // Setup admin routes
  setupAdminRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}

// Function to analyze compliance by sector
async function analyzeSectorCompliance(userId: string, answers: string[], sectors: string[]) {
  const dynamicQuestions = await generateDynamicQuestions(userId);
  const sectorAnalysis: Record<string, any> = {};

  // Base compliance analysis
  const baseQuestions = dynamicQuestions.filter(q => q.sector === 'base');
  let baseScore = 0;
  let baseAnswered = 0;
  
  baseQuestions.forEach((question) => {
    const globalIndex = dynamicQuestions.findIndex(q => q.id === question.id);
    if (globalIndex !== -1 && answers[globalIndex]) {
      baseAnswered++;
      if (answers[globalIndex] === 'sim') baseScore += 10;
      else if (answers[globalIndex] === 'parcial') baseScore += 5;
    }
  });

  sectorAnalysis['base'] = {
    name: 'Conformidade Geral',
    score: baseAnswered > 0 ? Math.round(baseScore / (baseAnswered * 10) * 100) : 0,
    questions: baseAnswered,
    totalQuestions: baseQuestions.length,
    issues: [],
    recommendations: []
  };

  // Analyze each sector
  sectors.forEach(sector => {
    const sectorKey = getSectorKey(sector);
    const sectorQs = dynamicQuestions.filter(q => q.sector === sectorKey);
    
    if (sectorQs.length === 0) return;

    let sectorScore = 0;
    let sectorAnswered = 0;
    const issues: string[] = [];

    sectorQs.forEach((question) => {
      const globalIndex = dynamicQuestions.findIndex(q => q.id === question.id);
      if (globalIndex !== -1 && answers[globalIndex]) {
        sectorAnswered++;
        const answer = answers[globalIndex];
        
        if (answer === 'sim') {
          sectorScore += 10;
        } else if (answer === 'parcial') {
          sectorScore += 5;
          issues.push(`Implementação parcial: ${question.question}`);
        } else if (answer === 'não') {
          issues.push(`Não implementado: ${question.question}`);
        }
      }
    });

    // Generate sector-specific recommendations
    const sectorRecommendations = generateSectorRecommendations(sector, issues);
    
    sectorAnalysis[sectorKey] = {
      name: sector,
      score: sectorAnswered > 0 ? Math.round(sectorScore / (sectorAnswered * 10) * 100) : 0,
      questions: sectorAnswered,
      totalQuestions: sectorQs.length,
      issues,
      recommendations: sectorRecommendations
    };
  });

  return sectorAnalysis;
}

// Function to generate sector-specific recommendations
function generateSectorRecommendations(sector: string, issues: string[]): string[] {
  const recommendations: string[] = [];
  
  switch (sector) {
    case 'Recursos Humanos':
      recommendations.push('Implementar política de acesso restrito aos dados de funcionários');
      recommendations.push('Criar procedimento para coleta de consentimento de dados sensíveis');
      recommendations.push('Documentar processo de seleção e armazenamento de dados');
      break;
    case 'Finanças':
      recommendations.push('Implementar criptografia para dados financeiros sensíveis');
      recommendations.push('Estabelecer política de retenção de dados financeiros');
      recommendations.push('Certificar-se em padrões de segurança para pagamentos (PCI DSS)');
      break;
    case 'Marketing':
      recommendations.push('Implementar mecanismo de opt-in/opt-out para comunicações');
      recommendations.push('Criar política de cookies e rastreamento');
      recommendations.push('Documentar processo de consentimento para marketing');
      break;
    case 'Vendas':
      recommendations.push('Implementar controle de acesso no CRM');
      recommendations.push('Criar política para coleta de dados de prospects');
      recommendations.push('Documentar processo de proteção de dados de clientes');
      break;
    case 'Tecnologia da Informação':
      recommendations.push('Implementar política de segurança da informação');
      recommendations.push('Criar plano de resposta a incidentes');
      recommendations.push('Estabelecer rotina de auditorias de segurança');
      break;
    case 'Atendimento ao Cliente':
      recommendations.push('Criar canal específico para solicitações LGPD');
      recommendations.push('Treinar equipe sobre direitos dos titulares');
      recommendations.push('Documentar processo de atendimento às solicitações');
      break;
  }
  
  return recommendations;
}

// Helper function to get sector key
function getSectorKey(sector: string): string {
  const sectorMap: Record<string, string> = {
    'Recursos Humanos': 'rh',
    'Finanças': 'financas',
    'Marketing': 'marketing',
    'Vendas': 'vendas',
    'Tecnologia da Informação': 'ti',
    'Atendimento ao Cliente': 'atendimento'
  };
  return sectorMap[sector] || 'custom';
}

// Helper function to create compliance tasks based on questionnaire answers
async function createComplianceTasksBasedOnAnswers(userId: string, answers: string[], resetTasks: boolean = true) {
  // Only delete existing tasks if explicitly requested (for new questionnaires)
  if (resetTasks) {
    await storage.deleteAllUserComplianceTasks(userId);
  }

  // Define comprehensive task templates with detailed steps
  const taskTemplates = {
    dpo: {
      title: "Designar DPO (Data Protection Officer)",
      description: "Nomear um responsável oficial pela proteção de dados na empresa conforme LGPD",
      category: "governance",
      priority: "high" as const,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      steps: [
        "1. Defina se sua empresa precisa de DPO (mais de 50 funcionários ou dados sensíveis)",
        "2. Identifique um profissional qualificado interno ou contrate externo", 
        "3. Elabore descrição de cargo com responsabilidades específicas da LGPD",
        "4. Formalize a nomeação através de documento oficial",
        "5. Registre o DPO junto à ANPD (quando aplicável)",
        "6. Divulgue o contato do DPO para colaboradores e clientes",
        "7. Garanta que o DPO tenha acesso direto à alta direção"
      ]
    },
    privacyPolicy: {
      title: "Criar/Atualizar Política de Privacidade",
      description: "Desenvolver política de privacidade completa e adequada à LGPD",
      category: "documentation",
      priority: "high" as const,
      dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days
      steps: [
        "1. Identifique todos os dados pessoais coletados pela empresa",
        "2. Defina as finalidades específicas para cada tratamento de dados",
        "3. Determine as bases legais para cada finalidade (consentimento, interesse legítimo, etc.)",
        "4. Inclua informações sobre compartilhamento de dados com terceiros",
        "5. Detalhe os direitos dos titulares e como exercê-los",
        "6. Especifique tempo de retenção para cada categoria de dados",
        "7. Adicione informações de contato do DPO ou responsável",
        "8. Publique a política em local de fácil acesso no site/app",
        "9. Implemente processo de versionamento e comunicação de mudanças"
      ]
    },
    consent: {
      title: "Implementar Sistema de Consentimento",
      description: "Estabelecer processos claros para coleta e gestão de consentimentos",
      category: "consent_management",
      priority: "high" as const,
      dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      steps: [
        "1. Identifique todos os pontos de coleta de dados que requerem consentimento",
        "2. Desenvolva formulários de consentimento claros e específicos",
        "3. Implemente checkbox separado para cada finalidade de tratamento",
        "4. Garanta que o consentimento seja livre, informado e inequívoco",
        "5. Crie sistema para registrar e armazenar consentimentos",
        "6. Desenvolva processo para renovação de consentimentos",
        "7. Implemente funcionalidade para revogação fácil do consentimento",
        "8. Treine equipe sobre procedimentos de consentimento",
        "9. Documente todo o processo para auditoria"
      ]
    },
    dataMapping: {
      title: "Realizar Mapeamento Completo de Dados",
      description: "Mapear todos os dados pessoais tratados e seus fluxos na empresa",
      category: "data_protection",
      priority: "high" as const,
      dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      steps: [
        "1. Identifique todas as fontes de coleta de dados pessoais",
        "2. Liste todos os sistemas que armazenam dados pessoais",
        "3. Mapeie o fluxo de dados entre sistemas internos",
        "4. Identifique compartilhamento de dados com terceiros",
        "5. Categorize os dados (pessoais, sensíveis, de crianças/adolescentes)",
        "6. Determine as finalidades específicas para cada tratamento",
        "7. Identifique as bases legais aplicáveis a cada tratamento",
        "8. Documente os tempos de retenção para cada categoria",
        "9. Crie registro de atividades de tratamento",
        "10. Implemente controles de acesso baseados no mapeamento"
      ]
    },
    dataSubjectRights: {
      title: "Implementar Atendimento aos Direitos dos Titulares",
      description: "Criar procedimentos para atender solicitações de direitos dos titulares",
      category: "data_subject_rights",
      priority: "medium" as const,
      dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      steps: [
        "1. Crie canal específico para solicitações (email, formulário, telefone)",
        "2. Desenvolva processo de autenticação do solicitante",
        "3. Defina fluxo para confirmação de acesso aos dados",
        "4. Implemente processo para correção de dados pessoais",
        "5. Crie procedimento para exclusão de dados (direito ao esquecimento)",
        "6. Desenvolva sistema para portabilidade de dados",
        "7. Implemente processo para oposição ao tratamento",
        "8. Defina prazos de resposta (máximo 15 dias)",
        "9. Treine equipe para atendimento das solicitações",
        "10. Crie registro de todas as solicitações e respostas"
      ]
    },
    security: {
      title: "Implementar Medidas de Segurança",
      description: "Estabelecer medidas técnicas e administrativas de segurança",
      category: "security",
      priority: "high" as const,
      dueDate: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000), // 75 days
      steps: [
        "1. Realize análise de risco para todos os dados pessoais",
        "2. Implemente criptografia para dados sensíveis",
        "3. Configure controles de acesso baseados em função",
        "4. Implemente autenticação forte (MFA) para sistemas críticos",
        "5. Configure logs de auditoria para acessos a dados pessoais",
        "6. Implemente backup seguro e teste de recuperação",
        "7. Configure firewall e proteção contra malware",
        "8. Desenvolva política de senhas forte",
        "9. Implemente monitoramento de segurança",
        "10. Treine colaboradores sobre segurança da informação"
      ]
    },
    incidentResponse: {
      title: "Criar Plano de Resposta a Incidentes",
      description: "Desenvolver procedimentos para resposta a vazamentos de dados",
      category: "incident_management",
      priority: "medium" as const,
      dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days
      steps: [
        "1. Defina o que constitui um incidente de dados pessoais",
        "2. Crie equipe de resposta a incidentes com papéis claros",
        "3. Desenvolva processo de detecção e notificação interna",
        "4. Implemente procedimento de contenção do incidente",
        "5. Defina processo de investigação e documentação",
        "6. Estabeleça critérios para notificação à ANPD (72 horas)",
        "7. Crie processo para comunicação aos titulares afetados",
        "8. Desenvolva plano de comunicação pública se necessário",
        "9. Implemente processo de revisão pós-incidente",
        "10. Teste o plano regularmente com simulações"
      ]
    },
    training: {
      title: "Implementar Programa de Treinamento LGPD",
      description: "Capacitar colaboradores sobre proteção de dados pessoais",
      category: "training",
      priority: "medium" as const,
      dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      steps: [
        "1. Desenvolva conteúdo de treinamento específico para cada função",
        "2. Crie módulo básico sobre princípios da LGPD",
        "3. Desenvolva treinamento específico para áreas críticas",
        "4. Implemente treinamento sobre direitos dos titulares",
        "5. Treine equipe sobre procedimentos de consentimento",
        "6. Capacite equipe técnica sobre segurança de dados",
        "7. Treine gestores sobre responsabilidades da LGPD",
        "8. Implemente avaliação de conhecimento pós-treinamento",
        "9. Crie programa de reciclagem periódica",
        "10. Documente participação e resultados dos treinamentos"
      ]
    },
    vendorManagement: {
      title: "Implementar Gestão de Fornecedores",
      description: "Adequar contratos e processos com fornecedores que tratam dados",
      category: "vendor_management",
      priority: "medium" as const,
      dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      steps: [
        "1. Identifique todos os fornecedores que tratam dados pessoais",
        "2. Classifique fornecedores por nível de risco",
        "3. Desenvolva cláusulas contratuais específicas para LGPD",
        "4. Exija comprovação de adequação à LGPD dos fornecedores",
        "5. Implemente processo de due diligence para novos fornecedores",
        "6. Revise e adeque contratos existentes",
        "7. Defina responsabilidades claras para cada fornecedor",
        "8. Implemente monitoramento de compliance dos fornecedores",
        "9. Crie processo de auditoria de fornecedores críticos",
        "10. Desenvolva plano de contingência para substituição de fornecedores"
      ]
    },
    
    // Document-specific tasks
    attachPrivacyPolicyDoc: {
      title: "Anexar Documento da Política de Privacidade",
      description: "Anexar cópia da política de privacidade documentada e atualizada",
      category: "documentation",
      priority: "high" as const,
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
      steps: [
        "1. Localize a versão mais atual da política de privacidade da empresa",
        "2. Anexe o documento no sistema através da seção 'Documentos'",
        "3. Certifique-se de que o documento está atualizado e completo",
        "4. Verifique se a política contém todos os elementos exigidos pela LGPD"
      ]
    },
    
    attachDataMappingDoc: {
      title: "Anexar Documento de Mapeamento de Dados",
      description: "Anexar documentação do mapeamento dos dados pessoais coletados e processados",
      category: "data_protection",
      priority: "high" as const,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      steps: [
        "1. Compile toda a documentação do mapeamento de dados da empresa",
        "2. Anexe o documento no sistema através da seção 'Documentos'",
        "3. Certifique-se de que inclui todos os fluxos de dados",
        "4. Verifique se contém categorias de dados, finalidades e bases legais"
      ]
    },
    
    attachDataSubjectProceduresDoc: {
      title: "Anexar Documento de Procedimentos para Solicitações de Titulares",
      description: "Anexar documentação dos procedimentos para atender solicitações dos titulares",
      category: "data_subject_rights",
      priority: "high" as const,
      dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days
      steps: [
        "1. Localize a documentação dos procedimentos para atendimento de solicitações",
        "2. Anexe o documento no sistema através da seção 'Documentos'",
        "3. Verifique se inclui processos para acesso, correção e exclusão de dados",
        "4. Confirme que os prazos e responsabilidades estão claramente definidos"
      ]
    },
    
    attachConsentDoc: {
      title: "Anexar Comprovante de Consentimento",
      description: "Anexar documentação que comprove como o consentimento é solicitado formalmente",
      category: "consent_management",
      priority: "high" as const,
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
      steps: [
        "1. Reúna exemplos de formulários ou processos de consentimento",
        "2. Anexe o documento no sistema através da seção 'Documentos'",
        "3. Certifique-se de que demonstra como o consentimento é coletado",
        "4. Verifique se o processo está claro e inequívoco"
      ]
    },
    
    attachSharingNotificationDoc: {
      title: "Anexar Documento de Notificação de Compartilhamento",
      description: "Anexar documentação que comprove como o compartilhamento de dados é informado aos titulares",
      category: "data_sharing",
      priority: "medium" as const,
      dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days
      steps: [
        "1. Localize contratos ou notificações sobre compartilhamento de dados",
        "2. Anexe o documento no sistema através da seção 'Documentos'",
        "3. Verifique se inclui informações sobre terceiros que recebem dados",
        "4. Confirme que os titulares são adequadamente informados"
      ]
    },
    
    attachCloudProviderDoc: {
      title: "Anexar Contrato com Provedor de Nuvem",
      description: "Anexar contrato ou comprovante do provedor de nuvem utilizado",
      category: "vendor_management",
      priority: "medium" as const,
      dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // 25 days
      steps: [
        "1. Localize o contrato com o provedor de nuvem",
        "2. Anexe o documento no sistema através da seção 'Documentos'",
        "3. Verifique se o contrato inclui cláusulas de proteção de dados",
        "4. Confirme que o provedor atende aos requisitos da LGPD"
      ]
    },
    
    attachSystemContractDoc: {
      title: "Anexar Contrato do Sistema de Armazenamento",
      description: "Anexar contrato ou especificação do sistema de armazenamento",
      category: "vendor_management",
      priority: "medium" as const,
      dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // 25 days
      steps: [
        "1. Localize o contrato ou especificação do sistema",
        "2. Anexe o documento no sistema através da seção 'Documentos'",
        "3. Verifique se inclui informações sobre segurança de dados",
        "4. Confirme que o fornecedor está adequado à LGPD"
      ]
    },
    
    attachInternationalTransferDoc: {
      title: "Anexar Documentação de Transferência Internacional",
      description: "Anexar cláusula contratual para transferência internacional de dados",
      category: "international_transfer",
      priority: "high" as const,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      steps: [
        "1. Localize contratos com empresas no exterior",
        "2. Anexe o documento no sistema através da seção 'Documentos'",
        "3. Verifique se inclui cláusulas de adequação internacional",
        "4. Confirme que atende aos requisitos da LGPD para transferência"
      ]
    },
    
    attachHrDataCollectionDoc: {
      title: "Anexar Procedimentos de Coleta de Dados de RH",
      description: "Anexar documentação dos procedimentos de coleta de dados no processo de contratação",
      category: "hr_compliance",
      priority: "medium" as const,
      dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days
      steps: [
        "1. Compile a documentação dos processos de RH",
        "2. Anexe o documento no sistema através da seção 'Documentos'",
        "3. Verifique se inclui todos os procedimentos de coleta",
        "4. Confirme que está adequado às exigências da LGPD"
      ]
    },
    
    attachSensitiveDataConsentDoc: {
      title: "Anexar Consentimento para Dados Sensíveis de Funcionários",
      description: "Anexar documentação do consentimento para processamento de dados sensíveis",
      category: "hr_compliance",
      priority: "high" as const,
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
      steps: [
        "1. Localize formulários de consentimento para dados sensíveis",
        "2. Anexe o documento no sistema através da seção 'Documentos'",
        "3. Verifique se o consentimento é explícito e específico",
        "4. Confirme que atende aos requisitos para dados sensíveis"
      ]
    },
    
    attachFinancialSecurityDoc: {
      title: "Anexar Documentação de Segurança de Dados Financeiros",
      description: "Anexar documentação das medidas de proteção de dados financeiros",
      category: "financial_security",
      priority: "high" as const,
      dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // 25 days
      steps: [
        "1. Compile documentação sobre proteção de dados financeiros",
        "2. Anexe o documento no sistema através da seção 'Documentos'",
        "3. Verifique se inclui medidas técnicas e organizacionais",
        "4. Confirme que atende aos padrões de segurança financeira"
      ]
    },
    
    attachPaymentCertificationDoc: {
      title: "Anexar Certificação de Segurança para Pagamentos",
      description: "Anexar certificação de segurança para processamento de pagamentos",
      category: "financial_security",
      priority: "high" as const,
      dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days
      steps: [
        "1. Localize certificações de segurança (PCI DSS, etc.)",
        "2. Anexe o documento no sistema através da seção 'Documentos'",
        "3. Verifique se a certificação está válida",
        "4. Confirme que cobre o escopo necessário"
      ]
    },
    
    attachMarketingConsentDoc: {
      title: "Anexar Processo de Consentimento para Marketing",
      description: "Anexar documentação do processo de obtenção de consentimento para marketing",
      category: "marketing_compliance",
      priority: "medium" as const,
      dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days
      steps: [
        "1. Compile documentação dos processos de consentimento de marketing",
        "2. Anexe o documento no sistema através da seção 'Documentos'",
        "3. Verifique se inclui opt-in e opt-out claros",
        "4. Confirme que está adequado às regras de marketing direto"
      ]
    },
    
    attachCookiePolicyDoc: {
      title: "Anexar Política de Cookies",
      description: "Anexar política de cookies e tecnologias de rastreamento",
      category: "marketing_compliance",
      priority: "medium" as const,
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
      steps: [
        "1. Localize a política de cookies da empresa",
        "2. Anexe o documento no sistema através da seção 'Documentos'",
        "3. Verifique se inclui todos os tipos de cookies utilizados",
        "4. Confirme que permite controle pelo usuário"
      ]
    },
    
    attachCrmSecurityDoc: {
      title: "Anexar Documentação de Proteção do CRM",
      description: "Anexar documentação das medidas de proteção de dados no CRM",
      category: "sales_compliance",
      priority: "medium" as const,
      dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days
      steps: [
        "1. Compile documentação sobre segurança do CRM",
        "2. Anexe o documento no sistema através da seção 'Documentos'",
        "3. Verifique se inclui controles de acesso e auditoria",
        "4. Confirme que atende aos requisitos de proteção"
      ]
    },
    
    attachItSecurityPolicyDoc: {
      title: "Anexar Política de Segurança da Informação",
      description: "Anexar política de segurança da informação documentada",
      category: "it_security",
      priority: "high" as const,
      dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days
      steps: [
        "1. Localize a política de segurança da informação",
        "2. Anexe o documento no sistema através da seção 'Documentos'",
        "3. Verifique se está atualizada e implementada",
        "4. Confirme que cobre proteção de dados pessoais"
      ]
    },
    
    attachIncidentResponsePlanDoc: {
      title: "Anexar Plano de Resposta a Incidentes",
      description: "Anexar plano de resposta a incidentes de segurança",
      category: "incident_management",
      priority: "high" as const,
      dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // 25 days
      steps: [
        "1. Localize o plano de resposta a incidentes",
        "2. Anexe o documento no sistema através da seção 'Documentos'",
        "3. Verifique se inclui procedimentos para vazamento de dados",
        "4. Confirme que atende aos requisitos da LGPD"
      ]
    },
    
    attachDataRequestProcessDoc: {
      title: "Anexar Processo de Atendimento às Solicitações LGPD",
      description: "Anexar documentação do processo de atendimento às solicitações dos titulares",
      category: "customer_service",
      priority: "high" as const,
      dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days
      steps: [
        "1. Compile documentação dos processos de atendimento LGPD",
        "2. Anexe o documento no sistema através da seção 'Documentos'",
        "3. Verifique se inclui todos os direitos dos titulares",
        "4. Confirme que os prazos estão adequados"
      ]
    },
    
    attachTrainingCertificatesDoc: {
      title: "Anexar Certificados de Treinamento LGPD",
      description: "Anexar certificados de treinamento sobre proteção de dados",
      category: "training",
      priority: "medium" as const,
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
      steps: [
        "1. Reúna certificados de treinamento dos atendentes",
        "2. Anexe o documento no sistema através da seção 'Documentos'",
        "3. Verifique se os treinamentos cobrem proteção de dados",
        "4. Confirme que estão atualizados"
      ]
    }
  };

  // Analyze answers and create appropriate tasks based on questionnaire responses
  const questionnaireAnalysis = analyzeQuestionnaireAnswers(answers);

  // Create tasks based on the analysis
  for (const taskKey of questionnaireAnalysis.requiredTasks) {
    const template = taskTemplates[taskKey as keyof typeof taskTemplates];
    if (template) {
      await storage.createComplianceTask({
        userId,
        title: template.title,
        description: template.description,
        steps: template.steps,
        category: template.category,
        priority: template.priority,
        dueDate: template.dueDate,
      });
    }
  }
}

// Function to analyze questionnaire answers and determine required tasks
function analyzeQuestionnaireAnswers(answers: string[]): { requiredTasks: string[] } {
  const requiredTasks: string[] = [];

  // Always include basic requirements
  requiredTasks.push('privacyPolicy', 'consent', 'dataMapping', 'dataSubjectRights');

  // Analyze specific answers to determine additional tasks
  answers.forEach((answer, index) => {
    const normalizedAnswer = Array.isArray(answer) ? answer : [answer];
    const hasNegativeResponse = normalizedAnswer.some(a => 
      typeof a === 'string' && (a.includes('Não') || a.includes('não') || a === 'nao' || a === 'nao-sei')
    );

    switch (index) {
      case 0: // DPO designation
        if (hasNegativeResponse) {
          requiredTasks.push('dpo');
        }
        break;
      case 5: // Security measures
        if (hasNegativeResponse) {
          requiredTasks.push('security');
        }
        break;
      case 10: // Incident response
        if (hasNegativeResponse) {
          requiredTasks.push('incidentResponse');
        }
        break;
      case 15: // Staff training
        if (hasNegativeResponse) {
          requiredTasks.push('training');
        }
        break;
      case 20: // Vendor management
        if (hasNegativeResponse) {
          requiredTasks.push('vendorManagement');
        }
        break;
    }
  });

  // Add document attachment tasks based on answers to questions that previously required documents
  analyzeDocumentRequirements(answers, requiredTasks);

  // Remove duplicates
  return { requiredTasks: Array.from(new Set(requiredTasks)) };
}

// Helper function to analyze document requirements based on questionnaire answers
function analyzeDocumentRequirements(answers: string[], requiredTasks: string[]): void {
  answers.forEach((answer, index) => {
    const normalizedAnswer = Array.isArray(answer) ? answer : [answer];
    const hasPositiveResponse = normalizedAnswer.some(a => 
      typeof a === 'string' && (a.includes('sim') || a.includes('Sim'))
    );
    const hasAnswer = answer && answer.toString().trim() !== '';

    // Base questionnaire document requirements (indices 0-28)
    switch (index) {
      case 0: // Question 1: Privacy policy
        if (hasPositiveResponse) {
          requiredTasks.push('attachPrivacyPolicyDoc');
        }
        break;
      case 2: // Question 3: Data mapping
        if (hasPositiveResponse) {
          requiredTasks.push('attachDataMappingDoc');
        }
        break;
      case 3: // Question 4: Data subject procedures
        if (hasPositiveResponse) {
          requiredTasks.push('attachDataSubjectProceduresDoc');
        }
        break;
      case 9: // Question 10: Consent
        if (hasPositiveResponse) {
          requiredTasks.push('attachConsentDoc');
        }
        break;
      case 13: // Question 14: Sharing notification
        if (hasPositiveResponse) {
          requiredTasks.push('attachSharingNotificationDoc');
        }
        break;
      case 19: // Question 20: Cloud provider
        if (hasAnswer) {
          requiredTasks.push('attachCloudProviderDoc');
        }
        break;
      case 21: // Question 22: Storage system
        if (hasAnswer) {
          requiredTasks.push('attachSystemContractDoc');
        }
        break;
      case 22: // Question 23: International transfer
        if (hasPositiveResponse) {
          requiredTasks.push('attachInternationalTransferDoc');
        }
        break;
    }
  });

  // Check for sector-specific document requirements
  // This would require analyzing the dynamic questions based on the company profile
  // For now, we'll add logic to handle common sector questions that appear after base questions
  
  if (answers.length > 29) { // If there are sector-specific answers
    const sectorAnswers = answers.slice(29); // Answers after base questions
    
    sectorAnswers.forEach((answer, sectorIndex) => {
      const normalizedAnswer = Array.isArray(answer) ? answer : [answer];
      const hasPositiveResponse = normalizedAnswer.some(a => 
        typeof a === 'string' && (a.includes('sim') || a.includes('Sim'))
      );
      const hasAnswer = answer && answer.toString().trim() !== '';
      
      // Map sector question indices to document tasks
      // This is a simplified approach - in a real scenario, you'd need to map
      // the actual question IDs from the dynamic questions
      
      // HR sector (questions 101-104)
      if (sectorIndex === 0 && hasAnswer) { // HR data collection (101)
        requiredTasks.push('attachHrDataCollectionDoc');
      }
      if (sectorIndex === 2 && hasPositiveResponse) { // HR sensitive data consent (103)
        requiredTasks.push('attachSensitiveDataConsentDoc');
      }
      
      // Finance sector (questions 201-204)
      if (sectorIndex === 4 && hasAnswer) { // Financial security (201)
        requiredTasks.push('attachFinancialSecurityDoc');
      }
      if (sectorIndex === 5 && hasPositiveResponse) { // Payment certification (202)
        requiredTasks.push('attachPaymentCertificationDoc');
      }
      
      // Marketing sector (questions 301-304)
      if (sectorIndex === 8 && hasAnswer) { // Marketing consent (301)
        requiredTasks.push('attachMarketingConsentDoc');
      }
      if (sectorIndex === 11 && hasPositiveResponse) { // Cookie policy (304)
        requiredTasks.push('attachCookiePolicyDoc');
      }
      
      // Sales sector (questions 401-403)
      if (sectorIndex === 13 && hasAnswer) { // CRM security (402)
        requiredTasks.push('attachCrmSecurityDoc');
      }
      
      // IT sector (questions 501-504)
      if (sectorIndex === 16 && hasPositiveResponse) { // IT security policy (501)
        requiredTasks.push('attachItSecurityPolicyDoc');
      }
      if (sectorIndex === 18 && hasPositiveResponse) { // Incident response plan (503)
        requiredTasks.push('attachIncidentResponsePlanDoc');
      }
      
      // Customer service sector (questions 601-603)
      if (sectorIndex === 20 && hasAnswer) { // Data request process (601)
        requiredTasks.push('attachDataRequestProcessDoc');
      }
      if (sectorIndex === 22 && hasPositiveResponse) { // Training certificates (603)
        requiredTasks.push('attachTrainingCertificatesDoc');
      }
    });
  }
}

export function setupAdminRoutes(app: Express) {
  // Admin Dashboard Stats
  app.get("/api/admin/stats", isAuthenticated, requireAdmin, async (req: AdminRequest, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin statistics" });
    }
  });

  // Admin - Get All Subscribers
  app.get("/api/admin/subscribers", isAuthenticated, requireAdmin, async (req: AdminRequest, res) => {
    try {
      const subscribers = await storage.getAllSubscribers();
      res.json(subscribers);
    } catch (error) {
      console.error("Error fetching subscribers:", error);
      res.status(500).json({ message: "Failed to fetch subscribers" });
    }
  });

  // Admin - Get All Documents
  app.get("/api/admin/documents", isAuthenticated, requireAdmin, async (req: AdminRequest, res) => {
    try {
      const documents = await storage.getAllDocumentsForAdmin();
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // Admin - Get Recent Documents
  app.get("/api/admin/recent-documents", isAuthenticated, requireAdmin, async (req: AdminRequest, res) => {
    try {
      const documents = await storage.getRecentDocumentsForAdmin();
      res.json(documents);
    } catch (error) {
      console.error("Error fetching recent documents:", error);
      res.status(500).json({ message: "Failed to fetch recent documents" });
    }
  });

  // Admin - Get Pending Documents
  app.get("/api/admin/pending-documents", isAuthenticated, requireAdmin, async (req: AdminRequest, res) => {
    try {
      const documents = await storage.getPendingDocumentsForAdmin();
      res.json(documents);
    } catch (error) {
      console.error("Error fetching pending documents:", error);
      res.status(500).json({ message: "Failed to fetch pending documents" });
    }
  });

  // Admin - Approve Document
  app.post("/api/admin/documents/:id/approve", isAuthenticated, requireAdmin, async (req: AdminRequest, res) => {
    try {
      const documentId = req.params.id;
      const adminId = req.adminUser!.id;
      
      await storage.approveDocument(documentId, adminId);
      
      // Log the action
      await storage.createAuditLog({
        userId: adminId,
        action: "approve_document",
        resourceType: "document",
        resourceId: documentId,
        details: { approvedBy: adminId },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || null,
      });

      res.json({ message: "Document approved successfully" });
    } catch (error) {
      console.error("Error approving document:", error);
      res.status(500).json({ message: "Failed to approve document" });
    }
  });

  // Admin - Reject Document
  app.post("/api/admin/documents/:id/reject", isAuthenticated, requireAdmin, async (req: AdminRequest, res) => {
    try {
      const documentId = req.params.id;
      const adminId = req.adminUser!.id;
      const { reason } = req.body;
      
      if (!reason || typeof reason !== 'string' || reason.trim() === '') {
        return res.status(400).json({ message: "Rejection reason is required" });
      }
      
      await storage.rejectDocument(documentId, adminId, reason.trim());
      
      // Log the action
      await storage.createAuditLog({
        userId: adminId,
        action: "reject_document",
        resourceType: "document",
        resourceId: documentId,
        details: { rejectedBy: adminId, reason: reason.trim() },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || null,
      });

      res.json({ message: "Document rejected successfully" });
    } catch (error) {
      console.error("Error rejecting document:", error);
      res.status(500).json({ message: "Failed to reject document" });
    }
  });

  // Admin - Get All Reports
  app.get("/api/admin/reports", isAuthenticated, requireAdmin, async (req: AdminRequest, res) => {
    try {
      const reports = await storage.getAllReportsForAdmin();
      res.json(reports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  // Admin - Get Report Stats
  app.get("/api/admin/report-stats", isAuthenticated, requireAdmin, async (req: AdminRequest, res) => {
    try {
      const stats = await storage.getReportStatsForAdmin();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching report stats:", error);
      res.status(500).json({ message: "Failed to fetch report statistics" });
    }
  });

  // Admin - Get Subscriber Details
  app.get("/api/admin/subscriber/:id", isAuthenticated, requireAdmin, async (req: AdminRequest, res) => {
    try {
      const subscriberId = req.params.id;
      const subscriber = await storage.getSubscriberDetails(subscriberId);
      
      if (!subscriber) {
        return res.status(404).json({ message: "Subscriber not found" });
      }
      
      res.json(subscriber);
    } catch (error) {
      console.error("Error fetching subscriber details:", error);
      res.status(500).json({ message: "Failed to fetch subscriber details" });
    }
  });

  // Admin Profile Routes
  app.get("/api/admin/profile", isAuthenticated, requireAdmin, async (req: AdminRequest, res) => {
    try {
      const adminId = req.adminUser!.id;
      const adminProfile = await storage.getUser(adminId);
      
      if (!adminProfile) {
        return res.status(404).json({ message: "Admin profile not found" });
      }
      
      res.json({
        id: adminProfile.id,
        email: adminProfile.email,
        firstName: adminProfile.firstName,
        lastName: adminProfile.lastName,
        role: adminProfile.role,
        createdAt: adminProfile.createdAt,
        lastLogin: adminProfile.updatedAt,
        permissions: ["Gerenciar Usuários", "Aprovar Documentos", "Visualizar Relatórios", "Configurações do Sistema"]
      });
    } catch (error) {
      console.error("Error fetching admin profile:", error);
      res.status(500).json({ message: "Failed to fetch admin profile" });
    }
  });

  app.patch("/api/admin/profile", isAuthenticated, requireAdmin, async (req: AdminRequest, res) => {
    try {
      const adminId = req.adminUser!.id;
      const { firstName, lastName } = req.body;
      
      const updateData: any = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      
      const updatedProfile = await storage.updateUserProfile(adminId, updateData);
      
      res.json(updatedProfile);
    } catch (error) {
      console.error("Error updating admin profile:", error);
      res.status(500).json({ message: "Failed to update admin profile" });
    }
  });

  // Admin Settings Routes
  app.get("/api/admin/settings", isAuthenticated, requireAdmin, async (req: AdminRequest, res) => {
    try {
      // Default admin settings - in a real app, these would be stored in database
      const defaultSettings = {
        emailNotifications: true,
        systemNotifications: true,
        maintenanceMode: false,
        autoApproveDocuments: false,
        maxFileSize: 10,
        sessionTimeout: 30,
        defaultUserPlan: "free",
        requireDocumentApproval: true
      };
      
      res.json(defaultSettings);
    } catch (error) {
      console.error("Error fetching admin settings:", error);
      res.status(500).json({ message: "Failed to fetch admin settings" });
    }
  });

  app.patch("/api/admin/settings", isAuthenticated, requireAdmin, async (req: AdminRequest, res) => {
    try {
      const adminId = req.adminUser!.id;
      const settings = req.body;
      
      // Log the settings change
      await storage.createAuditLog({
        userId: adminId,
        action: "update_admin_settings",
        resourceType: "settings",
        resourceId: "admin_settings",
        details: { changedSettings: settings },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || null,
      });
      
      // In a real app, you'd save these to a settings table
      res.json({ message: "Settings updated successfully", settings });
    } catch (error) {
      console.error("Error updating admin settings:", error);
      res.status(500).json({ message: "Failed to update admin settings" });
    }
  });

  // System Statistics Route
  app.get("/api/admin/system-stats", isAuthenticated, requireAdmin, async (req: AdminRequest, res) => {
    try {
      // Mock system statistics - in a real app, these would come from monitoring
      const systemStats = {
        uptime: "72h 30m",
        activeUsers: Math.floor(Math.random() * 100) + 1,
        storageUsed: "2.4 GB",
        apiCalls: Math.floor(Math.random() * 1000) + 100
      };
      
      res.json(systemStats);
    } catch (error) {
      console.error("Error fetching system stats:", error);
      res.status(500).json({ message: "Failed to fetch system statistics" });
    }
  });

  // Admin Management Routes
  app.get("/api/admin/administrators", isAuthenticated, requireAdmin, async (req: AdminRequest, res) => {
    try {
      const currentUserId = req.adminUser!.id;
      const administrators = await storage.getAllAdministrators(currentUserId);
      res.json(administrators);
    } catch (error) {
      console.error("Error fetching administrators:", error);
      res.status(500).json({ message: "Failed to fetch administrators" });
    }
  });

  app.post("/api/admin/administrators", isAuthenticated, requireAdmin, async (req: AdminRequest, res) => {
    try {
      const adminId = req.adminUser!.id;
      const { email, firstName, lastName } = req.body;

      // Validate input
      if (!email || !firstName || !lastName) {
        return res.status(400).json({ message: "Email, nome e sobrenome são obrigatórios" });
      }

      const newAdmin = await storage.createAdministrator({ email, firstName, lastName });

      // Log the action
      await storage.createAuditLog({
        userId: adminId,
        action: "create_administrator",
        resourceType: "user",
        resourceId: newAdmin.id,
        details: { 
          createdAdmin: { email, firstName, lastName },
          createdBy: adminId 
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || null,
      });

      res.status(201).json(newAdmin);
    } catch (error) {
      console.error("Error creating administrator:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to create administrator" });
      }
    }
  });

  app.patch("/api/admin/users/:id/promote", isAuthenticated, requireAdmin, async (req: AdminRequest, res) => {
    try {
      const adminId = req.adminUser!.id;
      const userId = req.params.id;

      await storage.promoteUserToAdmin(userId);

      // Log the action
      await storage.createAuditLog({
        userId: adminId,
        action: "promote_user_to_admin",
        resourceType: "user",
        resourceId: userId,
        details: { promotedBy: adminId },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || null,
      });

      res.json({ message: "Usuário promovido a administrador com sucesso" });
    } catch (error) {
      console.error("Error promoting user:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to promote user" });
      }
    }
  });

  app.patch("/api/admin/users/:id/demote", isAuthenticated, requireAdmin, async (req: AdminRequest, res) => {
    try {
      const adminId = req.adminUser!.id;
      const userId = req.params.id;

      // Prevent self-demotion
      if (adminId === userId) {
        return res.status(400).json({ message: "Você não pode rebaixar a si mesmo" });
      }

      await storage.demoteAdminToUser(userId);

      // Log the action
      await storage.createAuditLog({
        userId: adminId,
        action: "demote_admin_to_user",
        resourceType: "user",
        resourceId: userId,
        details: { demotedBy: adminId },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || null,
      });

      res.json({ message: "Administrador rebaixado a usuário comum com sucesso" });
    } catch (error) {
      console.error("Error demoting admin:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to demote admin" });
      }
    }
  });
}
