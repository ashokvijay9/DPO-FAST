import { storage } from "./storage";
import { db } from "./db";
import { auditLog, complianceTasks } from "../shared/schema";
import { eq, and, gte, desc } from "drizzle-orm";

export interface SecurityAuditReport {
  period: string;
  totalActions: number;
  failedActions: number;
  suspiciousActivities: any[];
  userActivitySummary: any[];
  resourceAccessPatterns: any[];
  rateViolations: number;
  topUsers: any[];
  recommendations: string[];
}

export async function generateSecurityAuditReport(
  startDate: Date,
  endDate: Date = new Date()
): Promise<SecurityAuditReport> {
  try {
    // Get all audit log entries for the period
    const auditEntries = await db
      .select()
      .from(auditLog)
      .where(
        and(
          gte(auditLog.createdAt, startDate),
          gte(endDate, auditLog.createdAt)
        )
      )
      .orderBy(desc(auditLog.createdAt));

    const totalActions = auditEntries.length;
    const failedActions = auditEntries.filter(entry => !entry.success).length;

    // Detect suspicious activities
    const suspiciousActivities = detectSuspiciousActivities(auditEntries);

    // User activity summary
    const userActivitySummary = generateUserActivitySummary(auditEntries);

    // Resource access patterns
    const resourceAccessPatterns = analyzeResourceAccessPatterns(auditEntries);

    // Count rate violations
    const rateViolations = auditEntries.filter(entry => 
      entry.errorMessage?.includes('Rate limit exceeded')
    ).length;

    // Top active users
    const topUsers = getTopActiveUsers(auditEntries);

    // Generate security recommendations
    const recommendations = generateSecurityRecommendations({
      totalActions,
      failedActions,
      suspiciousActivities,
      rateViolations
    });

    return {
      period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
      totalActions,
      failedActions,
      suspiciousActivities,
      userActivitySummary,
      resourceAccessPatterns,
      rateViolations,
      topUsers,
      recommendations
    };
  } catch (error) {
    console.error('Error generating security audit report:', error);
    throw new Error('Failed to generate security audit report');
  }
}

function detectSuspiciousActivities(auditEntries: any[]): any[] {
  const suspicious = [];
  
  // Group by user and time
  const userActivityByHour = auditEntries.reduce((acc, entry) => {
    if (!entry.userId) return acc;
    
    const hour = new Date(entry.createdAt).toISOString().slice(0, 13);
    const key = `${entry.userId}-${hour}`;
    
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(entry);
    return acc;
  }, {} as any);

  // Detect high activity periods (more than 50 actions per hour)
  Object.entries(userActivityByHour).forEach(([key, activities]: [string, any]) => {
    if (activities.length > 50) {
      const [userId, hour] = key.split('-');
      suspicious.push({
        type: 'high_activity',
        userId,
        hour,
        actionCount: activities.length,
        description: `Usuário ${userId} executou ${activities.length} ações em uma hora`
      });
    }
  });

  // Detect multiple failed access attempts
  const failedAccessByUser = auditEntries
    .filter(entry => !entry.success && entry.errorMessage?.includes('Access denied'))
    .reduce((acc, entry) => {
      if (!acc[entry.userId]) acc[entry.userId] = 0;
      acc[entry.userId]++;
      return acc;
    }, {} as any);

  Object.entries(failedAccessByUser).forEach(([userId, count]: [string, any]) => {
    if (count > 10) {
      suspicious.push({
        type: 'multiple_access_failures',
        userId,
        failureCount: count,
        description: `Usuário ${userId} teve ${count} tentativas de acesso negadas`
      });
    }
  });

  // Detect unusual IP addresses for users
  const userIPs = auditEntries.reduce((acc, entry) => {
    if (!entry.userId || !entry.ipAddress) return acc;
    
    if (!acc[entry.userId]) {
      acc[entry.userId] = new Set();
    }
    acc[entry.userId].add(entry.ipAddress);
    return acc;
  }, {} as any);

  Object.entries(userIPs).forEach(([userId, ips]: [string, any]) => {
    if (ips.size > 5) {
      suspicious.push({
        type: 'multiple_ip_addresses',
        userId,
        ipCount: ips.size,
        description: `Usuário ${userId} acessou de ${ips.size} endereços IP diferentes`
      });
    }
  });

  return suspicious;
}

function generateUserActivitySummary(auditEntries: any[]): any[] {
  const userStats = auditEntries.reduce((acc, entry) => {
    if (!entry.userId) return acc;
    
    if (!acc[entry.userId]) {
      acc[entry.userId] = {
        userId: entry.userId,
        totalActions: 0,
        successfulActions: 0,
        failedActions: 0,
        resourceTypes: new Set(),
        lastActivity: entry.createdAt
      };
    }
    
    acc[entry.userId].totalActions++;
    if (entry.success) {
      acc[entry.userId].successfulActions++;
    } else {
      acc[entry.userId].failedActions++;
    }
    acc[entry.userId].resourceTypes.add(entry.resourceType);
    
    // Update last activity if this entry is more recent
    if (new Date(entry.createdAt) > new Date(acc[entry.userId].lastActivity)) {
      acc[entry.userId].lastActivity = entry.createdAt;
    }
    
    return acc;
  }, {} as any);

  return Object.values(userStats).map((stats: any) => ({
    ...stats,
    resourceTypes: Array.from(stats.resourceTypes),
    successRate: stats.totalActions > 0 ? 
      Math.round((stats.successfulActions / stats.totalActions) * 100) : 0
  }));
}

function analyzeResourceAccessPatterns(auditEntries: any[]): any[] {
  const resourceStats = auditEntries.reduce((acc, entry) => {
    const key = `${entry.resourceType}-${entry.action}`;
    
    if (!acc[key]) {
      acc[key] = {
        resourceType: entry.resourceType,
        action: entry.action,
        totalAccess: 0,
        successfulAccess: 0,
        failedAccess: 0,
        uniqueUsers: new Set()
      };
    }
    
    acc[key].totalAccess++;
    if (entry.success) {
      acc[key].successfulAccess++;
    } else {
      acc[key].failedAccess++;
    }
    
    if (entry.userId) {
      acc[key].uniqueUsers.add(entry.userId);
    }
    
    return acc;
  }, {} as any);

  return Object.values(resourceStats).map((stats: any) => ({
    ...stats,
    uniqueUsers: stats.uniqueUsers.size,
    successRate: stats.totalAccess > 0 ? 
      Math.round((stats.successfulAccess / stats.totalAccess) * 100) : 0
  }));
}

function getTopActiveUsers(auditEntries: any[]): any[] {
  const userActionCounts = auditEntries.reduce((acc, entry) => {
    if (!entry.userId) return acc;
    if (!acc[entry.userId]) acc[entry.userId] = 0;
    acc[entry.userId]++;
    return acc;
  }, {} as any);

  return Object.entries(userActionCounts)
    .sort(([, a]: any, [, b]: any) => b - a)
    .slice(0, 10)
    .map(([userId, actionCount]: any) => ({ userId, actionCount }));
}

function generateSecurityRecommendations(metrics: {
  totalActions: number;
  failedActions: number;
  suspiciousActivities: any[];
  rateViolations: number;
}): string[] {
  const recommendations = [];

  if (metrics.failedActions > metrics.totalActions * 0.1) {
    recommendations.push('Alto número de ações falhadas detectado. Revisar logs de erro e implementar melhor validação de entrada.');
  }

  if (metrics.suspiciousActivities.length > 0) {
    recommendations.push('Atividades suspeitas detectadas. Revisar padrões de acesso e considerar implementar alertas automáticos.');
  }

  if (metrics.rateViolations > 100) {
    recommendations.push('Muitas violações de rate limiting. Considerar ajustar limites ou implementar medidas mais restritivas.');
  }

  if (metrics.totalActions < 100) {
    recommendations.push('Baixo volume de atividade auditada. Verificar se todos os endpoints importantes estão sendo monitorados.');
  }

  if (recommendations.length === 0) {
    recommendations.push('Sistema apresenta padrões de segurança normais. Continuar monitoramento regular.');
  }

  return recommendations;
}

export async function getTaskSecurityMetrics(userId: string): Promise<any> {
  try {
    // Get user's compliance tasks
    const tasks = await storage.getComplianceTasks(userId);
    
    // Get audit entries related to these tasks
    const taskIds = tasks.map(t => t.id);
    const taskAuditEntries = await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.userId, userId),
          eq(auditLog.resourceType, 'task')
        )
      );

    return {
      totalTasks: tasks.length,
      tasksWithDocuments: tasks.filter(t => t.attachedDocuments && Array.isArray(t.attachedDocuments) && t.attachedDocuments.length > 0).length,
      auditedActions: taskAuditEntries.length,
      documentUploads: taskAuditEntries.filter(e => e.action === 'create' && e.resourceType === 'document').length,
      taskSubmissions: taskAuditEntries.filter(e => e.action === 'submit').length,
      accessViolations: taskAuditEntries.filter(e => !e.success && e.errorMessage?.includes('Access denied')).length
    };
  } catch (error) {
    console.error('Error getting task security metrics:', error);
    return {
      totalTasks: 0,
      tasksWithDocuments: 0,
      auditedActions: 0,
      documentUploads: 0,
      taskSubmissions: 0,
      accessViolations: 0
    };
  }
}