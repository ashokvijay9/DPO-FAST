import {
  users,
  questionnaireResponses,
  documents,
  auditLog,
  complianceTasks,
  complianceReports,
  companyProfiles,
  notifications,
  taskStatusHistory,
  companySectors,
  type User,
  type UpsertUser,
  type QuestionnaireResponse,
  type InsertQuestionnaireResponse,
  type Document,
  type InsertDocument,
  type AuditLog,
  type InsertAuditLog,
  type ComplianceTask,
  type InsertComplianceTask,
  type ComplianceReport,
  type InsertComplianceReport,
  type CompanyProfile,
  type InsertCompanyProfile,
  type UpdateUserProfile,
  type CompanySector,
  type InsertCompanySector,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lt, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// Interface for storage operations
export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByAuthId(authUserId: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>; // For local auth
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserSubscription(userId: string, customerId: string, subscriptionId: string, plan: string): Promise<User>;
  updateUserSubscription(userId: string, updates: { subscriptionPlan?: string; subscriptionStatus?: string }): Promise<User>;
  updateUserProfile(userId: string, updates: UpdateUserProfile): Promise<User>;
  
  // Company profile operations
  createCompanyProfile(profile: InsertCompanyProfile): Promise<CompanyProfile>;
  getCompanyProfile(userId: string): Promise<CompanyProfile | undefined>;
  updateCompanyProfile(userId: string, updates: Partial<InsertCompanyProfile>): Promise<CompanyProfile>;
  
  // Company sectors operations
  createCompanySector(sector: InsertCompanySector): Promise<CompanySector>;
  getCompanySectors(userId: string): Promise<CompanySector[]>;
  getCompanySector(id: string, userId: string): Promise<CompanySector | undefined>;
  updateCompanySector(id: string, userId: string, updates: Partial<InsertCompanySector>): Promise<CompanySector>;
  deleteCompanySector(id: string, userId: string): Promise<boolean>;
  
  // Questionnaire operations
  saveQuestionnaireResponse(response: InsertQuestionnaireResponse): Promise<QuestionnaireResponse>;
  getQuestionnaireResponse(userId: string): Promise<QuestionnaireResponse | undefined>;
  updateQuestionnaireResponse(id: string, updates: Partial<InsertQuestionnaireResponse>): Promise<QuestionnaireResponse>;
  
  // Document operations
  createDocument(document: InsertDocument): Promise<Document>;
  getDocuments(userId: string): Promise<Document[]>;
  getDocument(id: string, userId: string): Promise<Document | undefined>;
  deleteDocument(id: string, userId: string): Promise<boolean>;
  
  // Audit log operations
  logAction(log: InsertAuditLog): Promise<AuditLog>;
  
  // Compliance task operations
  createComplianceTask(task: InsertComplianceTask): Promise<ComplianceTask>;
  getComplianceTasks(userId: string): Promise<ComplianceTask[]>;
  getComplianceTask(id: string): Promise<ComplianceTask | undefined>;
  updateComplianceTask(id: string, updates: Partial<InsertComplianceTask>): Promise<ComplianceTask>;
  getTasksForReview(): Promise<any[]>;
  getTaskForReview(taskId: string): Promise<any>;
  
  // Compliance report operations
  createComplianceReport(report: InsertComplianceReport): Promise<ComplianceReport>;
  getComplianceReports(userId: string): Promise<ComplianceReport[]>;
  getComplianceReport(id: string, userId: string): Promise<ComplianceReport | undefined>;
  deleteComplianceReport(id: string, userId: string): Promise<boolean>;
  
  // Dashboard data
  getDashboardData(userId: string): Promise<{
    complianceScore: number;
    pendingTasks: number;
    documentsCount: number;
    validDocuments: number;
    pendingDocuments: number;
    lastReportDate?: Date;
    companyProfile?: CompanyProfile;
    user?: User;
    suggestedPlan?: string;
    currentPlanLimits?: {
      maxDocuments: number;
      maxReports: number;
      maxTasks: number;
      hasAdvancedFeatures: boolean;
    };
  }>;
  
  // Admin operations
  getAdminStats(): Promise<{
    totalSubscribers: number;
    pendingDocuments: number;
    approvedDocuments: number;
    reportsGenerated: number;
  }>;
  getAllSubscribers(): Promise<any[]>;
  getAllDocumentsForAdmin(): Promise<any[]>;
  getRecentDocumentsForAdmin(): Promise<any[]>;
  getPendingDocumentsForAdmin(): Promise<any[]>;
  approveDocument(documentId: string, adminId: string): Promise<void>;
  rejectDocument(documentId: string, adminId: string, reason: string): Promise<void>;
  getAllReportsForAdmin(): Promise<any[]>;
  getReportStatsForAdmin(): Promise<{
    totalReports: number;
    highScoreReports: number;
    mediumScoreReports: number;
    lowScoreReports: number;
  }>;
  getSubscriberDetails(subscriberId: string): Promise<any>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  
  // Admin management operations
  getAllAdministrators(currentUserId: string): Promise<any[]>;
  createAdministrator(adminData: { email: string; firstName: string; lastName: string }): Promise<any>;
  promoteUserToAdmin(userId: string): Promise<void>;
  demoteAdminToUser(userId: string): Promise<void>;
  deleteUser(userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByAuthId(authUserId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.authUserId, authUserId));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    const usersList = await db.select().from(users);
    return usersList;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserSubscription(userId: string, customerId: string, subscriptionId: string, plan: string): Promise<User>;
  async updateUserSubscription(userId: string, updates: { subscriptionPlan?: string; subscriptionStatus?: string }): Promise<User>;
  async updateUserSubscription(
    userId: string, 
    customerId?: string | { subscriptionPlan?: string; subscriptionStatus?: string }, 
    subscriptionId?: string, 
    plan?: string
  ): Promise<User> {
    // Handle both overloads
    if (typeof customerId === 'object') {
      // New overload: updateUserSubscription(userId, { subscriptionPlan, subscriptionStatus })
      const updates = customerId;
      const [user] = await db
        .update(users)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();
      return user;
    } else {
      // Original overload: updateUserSubscription(userId, customerId, subscriptionId, plan)
      const [user] = await db
        .update(users)
        .set({
          subscriptionStatus: "active",
          subscriptionPlan: plan,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();
      return user;
    }
  }

  async updateUserProfile(userId: string, updates: UpdateUserProfile): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Questionnaire operations
  async saveQuestionnaireResponse(response: InsertQuestionnaireResponse): Promise<QuestionnaireResponse> {
    const [savedResponse] = await db
      .insert(questionnaireResponses)
      .values(response)
      .returning();
    return savedResponse;
  }

  async getQuestionnaireResponse(userId: string): Promise<QuestionnaireResponse | undefined> {
    const [response] = await db
      .select()
      .from(questionnaireResponses)
      .where(eq(questionnaireResponses.userId, userId))
      .orderBy(desc(questionnaireResponses.createdAt))
      .limit(1);
    return response;
  }

  // Get questionnaire response by sector
  async getQuestionnaireResponseBySector(userId: string, sectorId: string): Promise<QuestionnaireResponse | undefined> {
    const [response] = await db
      .select()
      .from(questionnaireResponses)
      .where(
        and(
          eq(questionnaireResponses.userId, userId),
          eq(questionnaireResponses.sectorId, sectorId)
        )
      )
      .orderBy(desc(questionnaireResponses.createdAt))
      .limit(1);
    return response;
  }

  async updateQuestionnaireResponse(id: string, updates: Partial<InsertQuestionnaireResponse>): Promise<QuestionnaireResponse> {
    const [updated] = await db
      .update(questionnaireResponses)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(questionnaireResponses.id, id))
      .returning();
    return updated;
  }

  // Document operations
  async createDocument(document: InsertDocument): Promise<Document> {
    const [created] = await db
      .insert(documents)
      .values(document)
      .returning();
    return created;
  }

  async getDocuments(userId: string): Promise<Document[]> {
    return db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId))
      .orderBy(desc(documents.createdAt));
  }

  async getDocument(id: string, userId: string): Promise<Document | undefined> {
    const [document] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.userId, userId)));
    return document;
  }

  async deleteDocument(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(documents)
      .where(and(eq(documents.id, id), eq(documents.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Audit log operations
  async logAction(log: InsertAuditLog): Promise<AuditLog> {
    const [logged] = await db
      .insert(auditLog)
      .values(log)
      .returning();
    return logged;
  }

  // Compliance task operations
  async createComplianceTask(task: InsertComplianceTask): Promise<ComplianceTask> {
    const [created] = await db
      .insert(complianceTasks)
      .values(task)
      .returning();
    return created;
  }

  async getComplianceTasks(userId: string): Promise<ComplianceTask[]> {
    return db
      .select()
      .from(complianceTasks)
      .where(eq(complianceTasks.userId, userId))
      .orderBy(desc(complianceTasks.createdAt));
  }

  async getComplianceTask(id: string): Promise<ComplianceTask | undefined> {
    const [task] = await db
      .select()
      .from(complianceTasks)
      .where(eq(complianceTasks.id, id))
      .limit(1);
    return task;
  }

  async updateComplianceTask(id: string, updates: Partial<InsertComplianceTask>): Promise<ComplianceTask> {
    const [updated] = await db
      .update(complianceTasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(complianceTasks.id, id))
      .returning();
    return updated;
  }

  async getTasksForReview(): Promise<any[]> {
    const tasks = await db
      .select({
        id: complianceTasks.id,
        title: complianceTasks.title,
        description: complianceTasks.description,
        priority: complianceTasks.priority,
        category: complianceTasks.category,
        submittedAt: complianceTasks.submittedAt,
        userComments: complianceTasks.userComments,
        userId: complianceTasks.userId,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        companyName: companyProfiles.companyName
      })
      .from(complianceTasks)
      .leftJoin(users, eq(complianceTasks.userId, users.id))
      .leftJoin(companyProfiles, eq(users.id, companyProfiles.userId))
      .where(eq(complianceTasks.status, 'in_review'))
      .orderBy(desc(complianceTasks.submittedAt));
    
    return tasks;
  }

  async getTaskForReview(taskId: string): Promise<any> {
    try {
      // Use raw SQL to avoid Drizzle ORM issues
      const result = await db.execute(sql`
        SELECT 
          ct.id,
          ct.title,
          ct.description,
          ct.steps,
          ct.priority,
          ct.status,
          ct.category,
          ct.due_date as "dueDate",
          ct.submitted_at as "submittedAt",
          ct.user_comments as "userComments", 
          ct.attached_documents as "attachedDocuments",
          ct.user_id as "userId",
          u.email as "userEmail",
          u.first_name as "userFirstName",
          u.last_name as "userLastName",
          cp.company_name as "companyName",
          cp.email as "companyEmail",
          cp.phone as "companyPhone"
        FROM compliance_tasks ct
        LEFT JOIN users u ON ct.user_id = u.id
        LEFT JOIN company_profiles cp ON ct.user_id = cp.user_id
        WHERE ct.id = ${taskId}
        LIMIT 1
      `);

      if (!result.rows.length) {
        return null;
      }

      const row = result.rows[0] as any;

      return {
        id: row.id || '',
        title: row.title || '',
        description: row.description || '',
        steps: row.steps || [],
        priority: row.priority || 'medium',
        status: row.status || '',
        category: row.category || '',
        dueDate: row.dueDate || null,
        submittedAt: row.submittedAt || null,
        userComments: row.userComments || '',
        attachments: row.attachedDocuments || [],
        userId: row.userId || '',
        userEmail: row.userEmail || '',
        userFirstName: row.userFirstName || '',
        userLastName: row.userLastName || '',
        companyName: row.companyName || '',
        companyEmail: row.companyEmail || '',
        companyPhone: row.companyPhone || ''
      };
    } catch (error) {
      console.error('Error in getTaskForReview:', error);
      return null;
    }
  }

  async deleteAllUserComplianceTasks(userId: string): Promise<void> {
    await db
      .delete(complianceTasks)
      .where(eq(complianceTasks.userId, userId));
  }

  // Compliance report operations
  async createComplianceReport(report: InsertComplianceReport): Promise<ComplianceReport> {
    const [created] = await db
      .insert(complianceReports)
      .values(report)
      .returning();
    return created;
  }

  async getComplianceReports(userId: string): Promise<ComplianceReport[]> {
    return db
      .select()
      .from(complianceReports)
      .where(eq(complianceReports.userId, userId))
      .orderBy(desc(complianceReports.createdAt));
  }

  async getComplianceReport(id: string, userId: string): Promise<ComplianceReport | undefined> {
    const [report] = await db
      .select()
      .from(complianceReports)
      .where(and(eq(complianceReports.id, id), eq(complianceReports.userId, userId)));
    return report;
  }

  async deleteComplianceReport(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(complianceReports)
      .where(and(eq(complianceReports.id, id), eq(complianceReports.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Company profile operations
  async createCompanyProfile(profile: InsertCompanyProfile): Promise<CompanyProfile> {
    const [created] = await db
      .insert(companyProfiles)
      .values(profile)
      .returning();
    return created;
  }

  async getCompanyProfile(userId: string): Promise<CompanyProfile | undefined> {
    const [profile] = await db
      .select()
      .from(companyProfiles)
      .where(eq(companyProfiles.userId, userId));
    return profile;
  }

  async updateCompanyProfile(userId: string, updates: Partial<InsertCompanyProfile>): Promise<CompanyProfile> {
    const [updated] = await db
      .update(companyProfiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(companyProfiles.userId, userId))
      .returning();
    return updated;
  }

  // Company sectors operations
  async createCompanySector(sector: InsertCompanySector): Promise<CompanySector> {
    const [created] = await db
      .insert(companySectors)
      .values(sector)
      .returning();
    return created;
  }

  async getCompanySectors(userId: string): Promise<CompanySector[]> {
    return db
      .select()
      .from(companySectors)
      .where(and(eq(companySectors.userId, userId), eq(companySectors.isActive, true)))
      .orderBy(desc(companySectors.createdAt));
  }

  async getCompanySector(id: string, userId: string): Promise<CompanySector | undefined> {
    const [sector] = await db
      .select()
      .from(companySectors)
      .where(and(eq(companySectors.id, id), eq(companySectors.userId, userId)));
    return sector;
  }

  async updateCompanySector(id: string, userId: string, updates: Partial<InsertCompanySector>): Promise<CompanySector> {
    const [updated] = await db
      .update(companySectors)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(companySectors.id, id), eq(companySectors.userId, userId)))
      .returning();
    return updated;
  }

  async deleteCompanySector(id: string, userId: string): Promise<boolean> {
    const result = await db
      .update(companySectors)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(companySectors.id, id), eq(companySectors.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Plan suggestion logic based on company sectors
  private getSuggestedPlan(companyProfile: CompanyProfile | undefined, currentPlan: string): string {
    if (!companyProfile) return "basic";
    
    const sectors = (companyProfile.sectors as string[]) || [];
    const customSectors = (companyProfile.customSectors as string[]) || [];
    const totalSectors = sectors.length + customSectors.length;
    const companySize = companyProfile.companySize;
    
    // If already on pro, keep pro
    if (currentPlan === "pro") return "pro";
    
    // Suggest pro for large companies or many sectors
    if (companySize === "large" || totalSectors >= 5) {
      return "pro";
    }
    
    // Suggest basic for medium companies or moderate sectors
    if (companySize === "medium" || totalSectors >= 3) {
      return "basic";
    }
    
    return "basic";
  }
  
  private getPlanLimits(plan: string) {
    const limits = {
      free: {
        maxDocuments: 5,
        maxReports: 1,
        maxTasks: 10,
        hasAdvancedFeatures: false
      },
      basic: {
        maxDocuments: 25,
        maxReports: 5,
        maxTasks: 50,
        hasAdvancedFeatures: false
      },
      pro: {
        maxDocuments: -1, // unlimited
        maxReports: -1, // unlimited
        maxTasks: -1, // unlimited
        hasAdvancedFeatures: true
      }
    };
    
    return limits[plan as keyof typeof limits] || limits.free;
  }

  // Dashboard data
  async getDashboardData(userId: string): Promise<{
    complianceScore: number;
    pendingTasks: number;
    documentsCount: number;
    validDocuments: number;
    pendingDocuments: number;
    lastReportDate?: Date;
    companyProfile?: CompanyProfile;
    user?: User;
    suggestedPlan?: string;
    currentPlanLimits?: {
      maxDocuments: number;
      maxReports: number;
      maxTasks: number;
      hasAdvancedFeatures: boolean;
    };
  }> {
    const [questionnaireResponse] = await db
      .select()
      .from(questionnaireResponses)
      .where(eq(questionnaireResponses.userId, userId))
      .orderBy(desc(questionnaireResponses.createdAt))
      .limit(1);

    const userDocuments = await db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId));

    const userTasks = await db
      .select()
      .from(complianceTasks)
      .where(and(eq(complianceTasks.userId, userId), eq(complianceTasks.status, "pending")));

    const [lastReport] = await db
      .select()
      .from(complianceReports)
      .where(eq(complianceReports.userId, userId))
      .orderBy(desc(complianceReports.createdAt))
      .limit(1);

    // Get user and company profile data
    const user = await this.getUser(userId);
    const companyProfile = await this.getCompanyProfile(userId);
    
    // Calculate suggested plan and current limits
    const currentPlan = user?.subscriptionPlan || "free";
    const suggestedPlan = this.getSuggestedPlan(companyProfile, currentPlan);
    const currentPlanLimits = this.getPlanLimits(currentPlan);

    return {
      complianceScore: questionnaireResponse?.complianceScore || 0,
      pendingTasks: userTasks.length,
      documentsCount: userDocuments.length,
      validDocuments: userDocuments.filter(d => d.status === "valid").length,
      pendingDocuments: userDocuments.filter(d => d.status === "pending").length,
      lastReportDate: lastReport?.createdAt || undefined,
      companyProfile,
      user,
      suggestedPlan,
      currentPlanLimits,
    };
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    return this.logAction(log);
  }

  // Admin operations implementation
  async getAdminStats(): Promise<{
    totalSubscribers: number;
    pendingDocuments: number;
    approvedDocuments: number;
    reportsGenerated: number;
    pendingValidationTasks: number;
  }> {
    const [subscribersCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    const [pendingDocsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(documents)
      .where(eq(documents.status, 'pending'));

    const [approvedDocsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(documents)
      .where(eq(documents.status, 'valid'));

    const [reportsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(complianceReports);

    const [pendingValidationTasksCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(complianceTasks)
      .where(eq(complianceTasks.status, 'in_review'));

    return {
      totalSubscribers: subscribersCount.count,
      pendingDocuments: pendingDocsCount.count,
      approvedDocuments: approvedDocsCount.count,
      reportsGenerated: reportsCount.count,
      pendingValidationTasks: pendingValidationTasksCount.count,
    };
  }

  async getAllSubscribers(): Promise<any[]> {
    const subscribersData = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        company: users.company,
        subscriptionPlan: users.subscriptionPlan,
        subscriptionStatus: users.subscriptionStatus,
        createdAt: users.createdAt,
        companyProfile: {
          companyName: companyProfiles.companyName,
          companySize: companyProfiles.companySize,
          employeeCount: companyProfiles.employeeCount,
        },
      })
      .from(users)
      .leftJoin(companyProfiles, eq(users.id, companyProfiles.userId))
      .orderBy(desc(users.createdAt));

    // Get document count for each subscriber
    const subscribersWithDocCount = await Promise.all(
      subscribersData.map(async (subscriber) => {
        const [docCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(documents)
          .where(eq(documents.userId, subscriber.id));

        return {
          ...subscriber,
          documentCount: docCount.count,
        };
      })
    );

    return subscribersWithDocCount;
  }

  async getAllDocumentsForAdmin(): Promise<any[]> {
    return db
      .select({
        id: documents.id,
        name: documents.name,
        category: documents.category,
        fileName: documents.fileName,
        fileSize: documents.fileSize,
        fileType: documents.fileType,
        fileUrl: documents.fileUrl,
        status: documents.status,
        description: documents.description,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          company: users.company,
        },
        companyProfile: {
          companyName: companyProfiles.companyName,
        },
      })
      .from(documents)
      .leftJoin(users, eq(documents.userId, users.id))
      .leftJoin(companyProfiles, eq(users.id, companyProfiles.userId))
      .orderBy(desc(documents.createdAt));
  }

  async getRecentDocumentsForAdmin(): Promise<any[]> {
    return db
      .select({
        id: documents.id,
        name: documents.name,
        category: documents.category,
        status: documents.status,
        createdAt: documents.createdAt,
        userName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
      })
      .from(documents)
      .leftJoin(users, eq(documents.userId, users.id))
      .orderBy(desc(documents.createdAt))
      .limit(10);
  }

  async getPendingDocumentsForAdmin(): Promise<any[]> {
    return db
      .select({
        id: documents.id,
        name: documents.name,
        category: documents.category,
        status: documents.status,
        createdAt: documents.createdAt,
        userName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
      })
      .from(documents)
      .leftJoin(users, eq(documents.userId, users.id))
      .where(eq(documents.status, 'pending'))
      .orderBy(desc(documents.createdAt));
  }

  async approveDocument(documentId: string, adminId: string): Promise<void> {
    await db
      .update(documents)
      .set({
        status: 'valid',
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));
  }

  async rejectDocument(documentId: string, adminId: string, reason: string): Promise<void> {
    await db
      .update(documents)
      .set({
        status: 'rejected',
        description: reason,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));
  }

  async getAllReportsForAdmin(): Promise<any[]> {
    return db
      .select({
        id: complianceReports.id,
        title: complianceReports.title,
        reportType: complianceReports.reportType,
        complianceScore: complianceReports.complianceScore,
        fileName: complianceReports.fileName,
        fileSize: complianceReports.fileSize,
        fileUrl: complianceReports.fileUrl,
        status: complianceReports.status,
        generatedAt: complianceReports.generatedAt,
        createdAt: complianceReports.createdAt,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          company: users.company,
        },
        companyProfile: {
          companyName: companyProfiles.companyName,
          companySize: companyProfiles.companySize,
        },
      })
      .from(complianceReports)
      .leftJoin(users, eq(complianceReports.userId, users.id))
      .leftJoin(companyProfiles, eq(users.id, companyProfiles.userId))
      .orderBy(desc(complianceReports.generatedAt));
  }

  async getReportStatsForAdmin(): Promise<{
    totalReports: number;
    highScoreReports: number;
    mediumScoreReports: number;
    lowScoreReports: number;
  }> {
    const [totalCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(complianceReports);

    const [highScoreCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(complianceReports)
      .where(gte(complianceReports.complianceScore, 70));

    const [mediumScoreCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(complianceReports)
      .where(and(
        gte(complianceReports.complianceScore, 40),
        lt(complianceReports.complianceScore, 70)
      ));

    const [lowScoreCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(complianceReports)
      .where(lt(complianceReports.complianceScore, 40));

    return {
      totalReports: totalCount.count,
      highScoreReports: highScoreCount.count,
      mediumScoreReports: mediumScoreCount.count,
      lowScoreReports: lowScoreCount.count,
    };
  }

  async getSubscriberDetails(subscriberId: string): Promise<any> {
    const [subscriber] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        company: users.company,
        subscriptionPlan: users.subscriptionPlan,
        subscriptionStatus: users.subscriptionStatus,
        createdAt: users.createdAt,
        companyProfile: {
          companyName: companyProfiles.companyName,
          companySize: companyProfiles.companySize,
          employeeCount: companyProfiles.employeeCount,
          sectors: companyProfiles.sectors,
          departments: companyProfiles.departments,
        },
      })
      .from(users)
      .leftJoin(companyProfiles, eq(users.id, companyProfiles.userId))
      .where(eq(users.id, subscriberId));

    if (!subscriber) {
      return null;
    }

    // Get documents count
    const [docCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(documents)
      .where(eq(documents.userId, subscriberId));

    // Get reports count
    const [reportCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(complianceReports)
      .where(eq(complianceReports.userId, subscriberId));

    // Get tasks count
    const [taskCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(complianceTasks)
      .where(eq(complianceTasks.userId, subscriberId));

    return {
      ...subscriber,
      documentCount: docCount.count,
      reportCount: reportCount.count,
      taskCount: taskCount.count,
    };
  }

  // Admin management operations implementation
  async getAllAdministrators(currentUserId: string): Promise<any[]> {
    const administrators = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.role, 'admin'))
      .orderBy(desc(users.createdAt));

    return administrators.map(admin => ({
      ...admin,
      lastLogin: admin.updatedAt,
      isCurrentUser: admin.id === currentUserId,
    }));
  }

  async createAdministrator(adminData: { email: string; firstName: string; lastName: string }): Promise<any> {
    // Check if user with this email already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, adminData.email))
      .limit(1);

    if (existingUser.length > 0) {
      throw new Error('Usuário com este email já existe');
    }

    // Create new admin user
    const [newAdmin] = await db
      .insert(users)
      .values({
        id: uuidv4(),
        email: adminData.email,
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        role: 'admin',
        subscriptionStatus: 'active',
        subscriptionPlan: 'pro', // Give admins pro access
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return newAdmin;
  }

  async promoteUserToAdmin(userId: string): Promise<void> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    if (user.role === 'admin') {
      throw new Error('Usuário já é administrador');
    }

    await db
      .update(users)
      .set({
        role: 'admin',
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async demoteAdminToUser(userId: string): Promise<void> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    if (user.role !== 'admin') {
      throw new Error('Usuário não é administrador');
    }

    await db
      .update(users)
      .set({
        role: 'user',
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async deleteUser(userId: string): Promise<void> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Delete related data first (cascade delete)
    await db.delete(auditLog).where(eq(auditLog.userId, userId));
    await db.delete(complianceReports).where(eq(complianceReports.userId, userId));
    await db.delete(complianceTasks).where(eq(complianceTasks.userId, userId));
    await db.delete(documents).where(eq(documents.userId, userId));
    await db.delete(questionnaireResponses).where(eq(questionnaireResponses.userId, userId));
    await db.delete(companyProfiles).where(eq(companyProfiles.userId, userId));
    await db.delete(notifications).where(eq(notifications.userId, userId));
    
    // Finally delete the user
    await db.delete(users).where(eq(users.id, userId));
  }

  // Notification operations
  async createNotification(data: {
    userId: string;
    title: string;
    message: string;
    type: string;
    relatedTaskId?: string;
  }): Promise<void> {
    await db.insert(notifications).values({
      userId: data.userId,
      title: data.title,
      message: data.message,
      type: data.type,
      relatedTaskId: data.relatedTaskId,
    });
  }

  async getUserNotifications(userId: string, limit: number = 50): Promise<any[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, notificationId));
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    
    return result[0]?.count || 0;
  }

  // Task status history operations
  async createStatusHistoryEntry(data: {
    taskId: string;
    fromStatus?: string;
    toStatus: string;
    comments?: string;
    changedBy: string;
  }): Promise<void> {
    await db.insert(taskStatusHistory).values({
      taskId: data.taskId,
      fromStatus: data.fromStatus,
      toStatus: data.toStatus,
      comments: data.comments,
      changedBy: data.changedBy,
    });
  }

  async getTaskStatusHistory(taskId: string): Promise<any[]> {
    return await db
      .select({
        id: taskStatusHistory.id,
        fromStatus: taskStatusHistory.fromStatus,
        toStatus: taskStatusHistory.toStatus,
        comments: taskStatusHistory.comments,
        createdAt: taskStatusHistory.createdAt,
        changedBy: users.email,
        changedByName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
      })
      .from(taskStatusHistory)
      .leftJoin(users, eq(taskStatusHistory.changedBy, users.id))
      .where(eq(taskStatusHistory.taskId, taskId))
      .orderBy(desc(taskStatusHistory.createdAt));
  }

  // Enhanced task update with status tracking and notifications
  async updateComplianceTaskWithNotification(
    taskId: string, 
    updates: Partial<ComplianceTask>,
    changedBy: string
  ): Promise<ComplianceTask> {
    // Get current task
    const [currentTask] = await db
      .select()
      .from(complianceTasks)
      .where(eq(complianceTasks.id, taskId))
      .limit(1);

    if (!currentTask) {
      throw new Error('Task not found');
    }

    // Update the task
    const [updatedTask] = await db
      .update(complianceTasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(complianceTasks.id, taskId))
      .returning();

    // Create status history entry if status changed
    if (updates.status && updates.status !== currentTask.status) {
      await this.createStatusHistoryEntry({
        taskId,
        fromStatus: currentTask.status || undefined,
        toStatus: updates.status,
        comments: updates.adminComments || '',
        changedBy,
      });

      // Create notification based on status change
      let notificationTitle = '';
      let notificationMessage = '';
      let notificationType = '';

      switch (updates.status) {
        case 'approved':
          notificationTitle = 'Tarefa Aprovada!';
          notificationMessage = `Sua tarefa "${currentTask.title}" foi aprovada pelo DPO. Parabéns! Você pode prosseguir para a próxima etapa.`;
          notificationType = 'task_approved';
          break;
        case 'rejected':
          notificationTitle = 'Tarefa Rejeitada';
          notificationMessage = `Sua tarefa "${currentTask.title}" foi rejeitada. Motivo: ${updates.adminComments || 'Não especificado'}. Por favor, corrija e reenvie.`;
          notificationType = 'task_rejected';
          break;
        case 'in_review':
          notificationTitle = 'Tarefa em Revisão';
          notificationMessage = `Sua tarefa "${currentTask.title}" foi enviada para revisão do DPO. Aguarde a análise.`;
          notificationType = 'task_submitted';
          break;
      }

      if (notificationTitle) {
        await this.createNotification({
          userId: currentTask.userId,
          title: notificationTitle,
          message: notificationMessage,
          type: notificationType,
          relatedTaskId: taskId,
        });
      }
    }

    return updatedTask;
  }
}

export const storage = new DatabaseStorage();
