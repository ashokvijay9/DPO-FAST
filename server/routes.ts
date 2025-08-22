import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertQuestionnaireResponseSchema, insertDocumentSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import Stripe from "stripe";
import { attachUserPlan, checkDocumentLimits, checkReportLimits, requireAdvancedFeatures, getPlanLimits, type AuthenticatedRequest } from "./middleware/planLimits";

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
  "Sua empresa possui um Data Protection Officer (DPO) designado?",
  "Existe uma política de privacidade atualizada conforme a LGPD?",
  "A empresa possui processos para obtenção de consentimento dos titulares?",
  "Há procedimentos estabelecidos para atender solicitações de titulares?",
  "A empresa realiza mapeamento regular dos dados pessoais tratados?",
  "Existem medidas técnicas de segurança implementadas?",
  "Há contratos adequados com fornecedores que tratam dados?",
  "A empresa possui plano de resposta a incidentes de segurança?",
  "São realizados treinamentos sobre LGPD para os colaboradores?",
  "Existe documentação dos relatórios de impacto à proteção de dados?"
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
