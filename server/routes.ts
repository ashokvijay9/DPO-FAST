import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertQuestionnaireResponseSchema, insertDocumentSchema, updateUserProfileSchema, insertComplianceReportSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import Stripe from "stripe";
import { attachUserPlan, checkDocumentLimits, checkReportLimits, requireAdvancedFeatures, getPlanLimits, type AuthenticatedRequest } from "./middleware/planLimits";
import { generateComplianceReportPDF, type ReportData } from "./reportGenerator";
import fs from "fs";

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

// LGPD Questionnaire questions
const lgpdQuestions = [
  {
    id: 1,
    question: "Área da empresa:",
    type: "text",
    requiresDocument: false,
    description: "dissertativa; não requer documento anexado obrigatório"
  },
  {
    id: 2,
    question: "Processo de tratamento de dados a ser mapeado:",
    type: "text",
    requiresDocument: false,
    description: "dissertativa; não requer documento anexado obrigatório"
  },
  {
    id: 3,
    question: "Qual a finalidade desse processo de tratamento de dados:",
    type: "text",
    requiresDocument: false,
    description: "dissertativa; não requer documento anexado obrigatório"
  },
  {
    id: 4,
    question: "Qual cargo é responsável pela realização desse processo de tratamento de dados:",
    type: "text",
    requiresDocument: false,
    description: "dissertativa; não requer documento anexado obrigatório"
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
    requiresDocument: true,
    documentCondition: "sim",
    options: ["sim", "não", "Esse processo não está baseado no consentimento"],
    description: "alternativa - seleção de opções listadas; requer documento anexado obrigatório se resposta for 'sim', como prova de consentimento, para prosseguir"
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
    requiresDocument: true,
    documentCondition: "sim",
    options: ["sim", "não"],
    description: "alternativa - sim/não; requer documento anexado obrigatório se resposta for 'sim', como contrato ou notificação, para prosseguir"
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
    requiresDocument: true,
    options: [],
    description: "dissertativa; requer documento anexado obrigatório, como contrato ou comprovante do provedor, para prosseguir"
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
    requiresDocument: true,
    options: [],
    description: "dissertativa; requer documento anexado obrigatório, como contrato ou especificação do sistema, para prosseguir"
  },
  {
    id: 23,
    question: "Os dados são compartilhados ou arquivados com empresas ou provedores localizados em território estrangeiro?",
    type: "single",
    requiresDocument: true,
    documentCondition: "sim",
    options: ["sim", "não"],
    description: "alternativa - sim/não; requer documento anexado obrigatório se resposta for 'sim', como cláusula contratual, para prosseguir"
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
  app.get('/api/questionnaire/questions', (req, res) => {
    res.json({ questions: lgpdQuestions });
  });

  app.get('/api/questionnaire/response', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const response = await storage.getQuestionnaireResponse(userId);
      res.json(response);
    } catch (error) {
      console.error("Error fetching questionnaire response:", error);
      res.status(500).json({ message: "Failed to fetch questionnaire response" });
    }
  });

  app.post('/api/questionnaire/save', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertQuestionnaireResponseSchema.parse({
        ...req.body,
        userId,
      });

      // Calculate compliance score based on answers
      const answers = JSON.parse(validatedData.answer);
      let score = 0;
      answers.forEach((answer: string) => {
        if (answer === 'sim') score += 10;
        else if (answer === 'parcial') score += 5;
      });
      validatedData.complianceScore = Math.min(score, 100);

      const response = await storage.saveQuestionnaireResponse(validatedData);
      
      // Create compliance tasks based on answers
      await createComplianceTasksBasedOnAnswers(userId, answers);

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
  app.get('/api/compliance-tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tasks = await storage.getComplianceTasks(userId);
      res.json(tasks);
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
        questions: lgpdQuestions,
      };

      // Generate PDF
      const { buffer, filename } = await generateComplianceReportPDF(reportData);
      
      // Create reports directory if it doesn't exist
      const reportsDir = 'uploads/reports';
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      // Save PDF file
      const filePath = path.join(reportsDir, filename);
      fs.writeFileSync(filePath, buffer);

      // Save report record to database
      const reportRecord = await storage.createComplianceReport({
        userId,
        questionnaireResponseId: questionnaireResponse.id,
        title: `Relatório de Conformidade LGPD - ${user.company || 'Empresa'}`,
        reportType: 'compliance_summary',
        complianceScore: questionnaireResponse.complianceScore || 0,
        fileName: filename,
        fileSize: buffer.length,
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

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to create compliance tasks based on questionnaire answers
async function createComplianceTasksBasedOnAnswers(userId: string, answers: string[]) {
  const taskTemplates = [
    {
      title: "Designar DPO (Data Protection Officer)",
      description: "Nomear um responsável pela proteção de dados na empresa",
      priority: "high" as const,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
    {
      title: "Atualizar Política de Privacidade",
      description: "Revisar e adequar a política às exigências da LGPD",
      priority: "medium" as const,
      dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
    },
    {
      title: "Implementar Processo de Consentimento",
      description: "Estabelecer procedimentos para coleta e gestão de consentimentos",
      priority: "high" as const,
      dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days
    },
    {
      title: "Criar Procedimentos para Solicitações de Titulares",
      description: "Definir fluxos para atender direitos dos titulares de dados",
      priority: "medium" as const,
      dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
    },
    {
      title: "Realizar Mapeamento de Dados",
      description: "Mapear todos os dados pessoais tratados pela empresa",
      priority: "high" as const,
      dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    },
  ];

  // Create tasks based on negative answers
  for (let i = 0; i < Math.min(answers.length, taskTemplates.length); i++) {
    if (answers[i] === 'nao' || answers[i] === 'nao-sei') {
      await storage.createComplianceTask({
        userId,
        ...taskTemplates[i],
      });
    }
  }
}
