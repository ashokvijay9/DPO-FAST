import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  company: varchar("company"),
  role: varchar("role").default("user"), // user, admin
  subscriptionStatus: varchar("subscription_status").default("inactive"), // inactive, active, canceled
  subscriptionPlan: varchar("subscription_plan").default("free"), // free, basic, pro
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Questionnaire responses
export const questionnaireResponses = pgTable("questionnaire_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  questionId: integer("question_id").notNull(),
  answer: text("answer").notNull(),
  observations: text("observations"),
  isComplete: boolean("is_complete").default(false),
  complianceScore: integer("compliance_score"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Documents storage
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name").notNull(),
  category: varchar("category").notNull(),
  fileName: varchar("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  fileType: varchar("file_type").notNull(),
  fileUrl: text("file_url").notNull(),
  status: varchar("status").default("valid"), // valid, pending, expired
  questionnaireResponseId: varchar("questionnaire_response_id").references(() => questionnaireResponses.id),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Audit log
export const auditLog = pgTable("audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action").notNull(),
  resourceType: varchar("resource_type").notNull(),
  resourceId: varchar("resource_id"),
  details: jsonb("details"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Compliance tasks/recommendations
export const complianceTasks = pgTable("compliance_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  steps: jsonb("steps"), // Array of step-by-step instructions
  priority: varchar("priority").notNull(), // high, medium, low
  status: varchar("status").default("pending"), // pending, completed, in_review, approved, rejected
  category: varchar("category"), // data_protection, consent, documentation, etc.
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // New fields for to-do list functionality
  questionnaireResponseId: varchar("questionnaire_response_id").references(() => questionnaireResponses.id),
  lgpdRequirement: varchar("lgpd_requirement"), // Which LGPD requirement this addresses
  suggestedDurationDays: integer("suggested_duration_days").default(30), // Suggested completion time in days
  attachedDocuments: jsonb("attached_documents").default([]), // Array of attached document IDs
  submittedAt: timestamp("submitted_at"), // When submitted for admin review
  reviewedAt: timestamp("reviewed_at"), // When admin reviewed
  reviewedBy: varchar("reviewed_by"), // Admin who reviewed
  rejectionReason: text("rejection_reason"), // Reason if rejected
  userComments: text("user_comments"), // Comments from user when submitting
  adminComments: text("admin_comments"), // Comments from admin during review
  progress: integer("progress").default(0), // Progress percentage 0-100
});

// Compliance reports
export const complianceReports = pgTable("compliance_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  questionnaireResponseId: varchar("questionnaire_response_id").references(() => questionnaireResponses.id),
  title: varchar("title").notNull(),
  reportType: varchar("report_type").notNull(), // compliance_summary, full_report
  complianceScore: integer("compliance_score").notNull(),
  fileName: varchar("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  fileUrl: text("file_url").notNull(),
  status: varchar("status").default("generated"), // generated, sent, archived
  generatedAt: timestamp("generated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notifications system
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  type: varchar("type").notNull(), // task_submitted, task_approved, task_rejected, system
  relatedTaskId: varchar("related_task_id").references(() => complianceTasks.id),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Task status history
export const taskStatusHistory = pgTable("task_status_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => complianceTasks.id),
  fromStatus: varchar("from_status"),
  toStatus: varchar("to_status").notNull(),
  comments: text("comments"),
  changedBy: varchar("changed_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Company profiles (collected after signup)
export const companyProfiles = pgTable("company_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  companyName: varchar("company_name").notNull(),
  departments: jsonb("departments").notNull(), // Array of departments - required field
  sectors: jsonb("sectors"), // Array of selected business sectors
  customSectors: jsonb("custom_sectors").default('[]'), // Array of custom sectors added by user
  companySize: varchar("company_size").notNull(), // small, medium, large
  employeeCount: varchar("employee_count"), // Can be exact number or range
  employeeCountType: varchar("employee_count_type").default("range"), // exact, range
  industry: varchar("industry"), // Industry field from database
  primaryContact: varchar("primary_contact"),
  phone: varchar("phone"),
  address: text("address"),
  isCompleted: boolean("is_completed").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Type exports
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertQuestionnaireResponse = typeof questionnaireResponses.$inferInsert;
export type QuestionnaireResponse = typeof questionnaireResponses.$inferSelect;

export type InsertDocument = typeof documents.$inferInsert;
export type Document = typeof documents.$inferSelect;

export type InsertAuditLog = typeof auditLog.$inferInsert;
export type AuditLog = typeof auditLog.$inferSelect;

export type InsertComplianceTask = typeof complianceTasks.$inferInsert;
export type ComplianceTask = typeof complianceTasks.$inferSelect;

export type InsertComplianceReport = typeof complianceReports.$inferInsert;
export type ComplianceReport = typeof complianceReports.$inferSelect;

export type InsertCompanyProfile = typeof companyProfiles.$inferInsert;
export type CompanyProfile = typeof companyProfiles.$inferSelect;

// Zod schemas
export const insertQuestionnaireResponseSchema = createInsertSchema(questionnaireResponses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertComplianceTaskSchema = createInsertSchema(complianceTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertComplianceReportSchema = createInsertSchema(complianceReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  generatedAt: true,
});

export const insertCompanyProfileSchema = createInsertSchema(companyProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateUserProfileSchema = z.object({
  firstName: z.string().min(1, "Nome é obrigatório").optional(),
  lastName: z.string().min(1, "Sobrenome é obrigatório").optional(),
  email: z.string().email("Email inválido").optional(),
  company: z.string().optional(),
});

export const companyOnboardingSchema = z.object({
  companyName: z.string().min(1, "Nome da empresa é obrigatório"),
  departments: z.array(z.string()).min(1, "Selecione pelo menos um departamento"),
  sectors: z.array(z.string()).min(1, "Selecione pelo menos um setor"),
  customSectors: z.array(z.string()).default([]),
  companySize: z.enum(["small", "medium", "large"], {
    required_error: "Selecione o porte da empresa",
  }),
  employeeCount: z.union([
    z.number().min(1, "Número de funcionários deve ser maior que 0"),
    z.string().min(1, "Selecione uma faixa de funcionários")
  ]).optional(),
  employeeCountType: z.enum(["exact", "range"]).default("range"),
  industry: z.string().optional(),
  primaryContact: z.string().min(1, "Nome do contato principal é obrigatório"),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;
export type CompanyOnboarding = z.infer<typeof companyOnboardingSchema>;
