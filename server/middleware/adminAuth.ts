import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

export interface AdminRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const requireAdmin = async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    // Check if user is authenticated
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get user from database to check role
    const user = await storage.getUser(req.user.id);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Check if user has admin role
    if (user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Access forbidden: Admin role required',
        userRole: user.role 
      });
    }

    // Add user info to request for further use
    req.user = {
      id: user.id,
      email: user.email || '',
      role: user.role || 'user'
    };

    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const checkAdminRole = async (userId: string): Promise<boolean> => {
  try {
    const user = await storage.getUser(userId);
    return user?.role === 'admin';
  } catch (error) {
    console.error('Error checking admin role:', error);
    return false;
  }
};