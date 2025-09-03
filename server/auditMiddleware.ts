import { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { auditLog } from "../shared/schema";

interface AuditLogData {
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: any;
  success?: boolean;
  errorMessage?: string;
  accessLevel?: 'owner' | 'admin' | 'shared';
  previousState?: any;
  newState?: any;
}

export async function logAuditEvent(
  req: Request,
  data: AuditLogData
): Promise<void> {
  try {
    const userId = (req.user as any)?.claims?.sub;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';

    await db.insert(auditLog).values({
      userId,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      details: data.details,
      ipAddress,
      userAgent,
      success: data.success ?? true,
      errorMessage: data.errorMessage,
      accessLevel: data.accessLevel,
      previousState: data.previousState,
      newState: data.newState,
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw - audit logging failure shouldn't break the main operation
  }
}

// Middleware to automatically log certain actions
export function auditMiddleware(
  action: string,
  resourceType: string,
  options: {
    extractResourceId?: (req: Request) => string | undefined;
    extractDetails?: (req: Request, res: Response) => any;
  } = {}
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    const originalJson = res.json;
    
    // Capture response data
    let responseData: any;
    
    res.send = function(data) {
      responseData = data;
      return originalSend.call(this, data);
    };
    
    res.json = function(data) {
      responseData = data;
      return originalJson.call(this, data);
    };

    // Continue to the route handler
    next();

    // Log after response is sent
    res.on('finish', async () => {
      const resourceId = options.extractResourceId?.(req);
      const details = options.extractDetails?.(req, res) || {
        method: req.method,
        path: req.path,
        query: req.query,
        body: req.method !== 'GET' ? req.body : undefined,
      };

      await logAuditEvent(req, {
        action,
        resourceType,
        resourceId,
        details,
        success: res.statusCode < 400,
        errorMessage: res.statusCode >= 400 ? 'Request failed' : undefined,
      });
    });
  };
}

// Access control helper
export function hasAccess(
  requestUserId: string,
  resourceUserId: string,
  userRole: string = 'user'
): { hasAccess: boolean; accessLevel: 'owner' | 'admin' | 'denied' } {
  // Admins have access to everything
  if (userRole === 'admin') {
    return { 
      hasAccess: true, 
      accessLevel: requestUserId === resourceUserId ? 'owner' : 'admin' 
    };
  }
  
  // Users can only access their own resources
  const isOwner = requestUserId === resourceUserId;
  return { 
    hasAccess: isOwner, 
    accessLevel: isOwner ? 'owner' : 'denied' 
  };
}

// Document integrity verification
export function verifyDocumentIntegrity(
  document: {
    fileName: string;
    fileSize: number;
    fileType: string;
    fileUrl?: string;
  }
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // File name validation
  if (!document.fileName || document.fileName.trim().length === 0) {
    errors.push('Nome do arquivo é obrigatório');
  }

  // File size validation (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (document.fileSize > maxSize) {
    errors.push('Arquivo muito grande. Tamanho máximo: 10MB');
  }

  if (document.fileSize <= 0) {
    errors.push('Tamanho do arquivo inválido');
  }

  // File type validation
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'image/jpeg',
    'image/png',
    'image/gif'
  ];

  if (!allowedTypes.includes(document.fileType)) {
    errors.push('Tipo de arquivo não permitido. Tipos aceitos: PDF, DOCX, DOC, JPEG, PNG, GIF');
  }

  // File extension vs MIME type consistency
  const extension = document.fileName.split('.').pop()?.toLowerCase();
  const expectedExtensions: Record<string, string[]> = {
    'application/pdf': ['pdf'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
    'application/msword': ['doc'],
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/gif': ['gif']
  };

  const expectedExts = expectedExtensions[document.fileType];
  if (expectedExts && extension && !expectedExts.includes(extension)) {
    errors.push('Extensão do arquivo não corresponde ao tipo do arquivo');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Rate limiting for sensitive operations
const operationCounts = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  userId: string,
  operation: string,
  maxOperations: number = 50,
  windowMinutes: number = 60
): { allowed: boolean; remaining: number; resetTime: number } {
  const key = `${userId}:${operation}`;
  const now = Date.now();
  const windowMs = windowMinutes * 60 * 1000;
  
  const current = operationCounts.get(key);
  
  if (!current || now > current.resetTime) {
    // Reset window
    const resetTime = now + windowMs;
    operationCounts.set(key, { count: 1, resetTime });
    return { allowed: true, remaining: maxOperations - 1, resetTime };
  }
  
  if (current.count >= maxOperations) {
    return { allowed: false, remaining: 0, resetTime: current.resetTime };
  }
  
  current.count++;
  operationCounts.set(key, current);
  
  return { 
    allowed: true, 
    remaining: maxOperations - current.count, 
    resetTime: current.resetTime 
  };
}