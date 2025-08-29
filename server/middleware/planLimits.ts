import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

interface PlanLimits {
  reportsPerMonth: number;
  maxDocuments: number;
  hasAdvancedFeatures: boolean;
  hasPrioritySupport: boolean;
}

const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    reportsPerMonth: 5,
    maxDocuments: 3,
    hasAdvancedFeatures: false,
    hasPrioritySupport: false,
  },
  basic: {
    reportsPerMonth: -1, // unlimited
    maxDocuments: 5,
    hasAdvancedFeatures: false,
    hasPrioritySupport: false,
  },
  pro: {
    reportsPerMonth: -1, // unlimited
    maxDocuments: -1, // unlimited
    hasAdvancedFeatures: true,
    hasPrioritySupport: true,
  },
  personalite: {
    reportsPerMonth: -1, // unlimited
    maxDocuments: -1, // unlimited
    hasAdvancedFeatures: true,
    hasPrioritySupport: true,
  },
};

export interface AuthenticatedRequest extends Request {
  user: {
    claims: {
      sub: string;
      email?: string;
    };
  };
  userPlan?: string;
  planLimits?: PlanLimits;
}

// Middleware to check and attach user plan information
export const attachUserPlan = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const plan = user.subscriptionStatus === 'active' ? user.subscriptionPlan || 'free' : 'free';
    req.userPlan = plan;
    req.planLimits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
    
    next();
  } catch (error) {
    console.error("Error attaching user plan:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Middleware to check document upload limits
export const checkDocumentLimits = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const planLimits = req.planLimits;
    
    if (!planLimits) {
      return res.status(500).json({ message: "Plan limits not found" });
    }

    // Check if unlimited documents are allowed
    if (planLimits.maxDocuments === -1) {
      return next();
    }

    // Count current documents
    const documents = await storage.getDocuments(userId);
    
    if (documents.length >= planLimits.maxDocuments) {
      return res.status(403).json({ 
        message: "Document limit reached",
        currentCount: documents.length,
        maxAllowed: planLimits.maxDocuments,
        plan: req.userPlan,
        upgradeRequired: true
      });
    }

    next();
  } catch (error) {
    console.error("Error checking document limits:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Middleware to check report generation limits
export const checkReportLimits = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const planLimits = req.planLimits;
    
    if (!planLimits) {
      return res.status(500).json({ message: "Plan limits not found" });
    }

    // Check if unlimited reports are allowed
    if (planLimits.reportsPerMonth === -1) {
      return next();
    }

    // For now, we'll allow report generation but this could be enhanced
    // to track monthly report counts in the database
    
    next();
  } catch (error) {
    console.error("Error checking report limits:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Middleware to check advanced features access
export const requireAdvancedFeatures = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const planLimits = req.planLimits;
  
  if (!planLimits || !planLimits.hasAdvancedFeatures) {
    return res.status(403).json({ 
      message: "Advanced features require Pro plan",
      plan: req.userPlan,
      upgradeRequired: true
    });
  }

  next();
};

// Helper function to get plan limits for frontend
export const getPlanLimits = (plan: string): PlanLimits => {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
};