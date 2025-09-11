import { Request, Response, NextFunction } from 'express'

// Temporary compatibility layer for gradual migration
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    claims: {
      sub: string
      email?: string
      [key: string]: any
    }
  }
}

// Simple pass-through auth for now (temporary)
export const isAuthenticated = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Temporary: Allow all requests during migration
  req.user = {
    id: 'temp-user-id',
    email: 'temp@example.com',
    claims: {
      sub: 'temp-user-id',
      email: 'temp@example.com'
    }
  }
  next()
}