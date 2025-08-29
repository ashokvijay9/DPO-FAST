import {
  users,
  questionnaireResponses,
  documents,
  auditLog,
  complianceTasks,
  complianceReports,
  companyProfiles,
  type User,
  type UpsertUser,
  type InsertUser,
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
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, and, desc, or } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

// Interface for storage operations
export interface IStorage {
  // Session store for authentication
  sessionStore: connectPg.PGStore;
  
  // User operations (authentication)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserSubscription(userId: string, customerId: string, subscriptionId: string, plan: string): Promise<User>;
  updateUserProfile(userId: string, updates: UpdateUserProfile): Promise<User>;
  
  // Company profile operations
  createCompanyProfile(profile: InsertCompanyProfile): Promise<CompanyProfile>;
  getCompanyProfile(userId: string): Promise<CompanyProfile | undefined>;
  updateCompanyProfile(userId: string, updates: Partial<InsertCompanyProfile>): Promise<CompanyProfile>;
  
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
  updateComplianceTask(id: string, updates: Partial<InsertComplianceTask>): Promise<ComplianceTask>;
  
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
}

export class DatabaseStorage implements IStorage {
  // Session store for authentication
  sessionStore: connectPg.PGStore;
  
  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // User operations (authentication)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
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

  async updateUserSubscription(userId: string, customerId: string, subscriptionId: string, plan: string): Promise<User> {
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

  async updateComplianceTask(id: string, updates: Partial<InsertComplianceTask>): Promise<ComplianceTask> {
    const [updated] = await db
      .update(complianceTasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(complianceTasks.id, id))
      .returning();
    return updated;
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
}

export const storage = new DatabaseStorage();
