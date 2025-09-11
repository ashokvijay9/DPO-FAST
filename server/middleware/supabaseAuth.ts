import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Admin client for server-side verification
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

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

export const verifySupabaseToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    
    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    
    if (error || !user) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    // Set user info on request object
    req.user = {
      id: user.id,
      email: user.email || '',
      claims: {
        sub: user.id,
        email: user.email,
        ...user.user_metadata
      }
    }

    next()
  } catch (error) {
    console.error('Auth verification error:', error)
    res.status(401).json({ message: 'Unauthorized' })
  }
}

// Middleware to check if user is authenticated (for routes that require auth)
export const isAuthenticated = verifySupabaseToken