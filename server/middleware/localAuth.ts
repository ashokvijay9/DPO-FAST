import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { storage } from '../storage'

// JWT secret - em produção usar variável de ambiente
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'

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

// Middleware de autenticação usando sessões locais
export const isAuthenticated = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    
    // Verificar JWT token local
    const decoded = jwt.verify(token, JWT_SECRET) as any
    
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    // Buscar usuário no banco local
    const user = await storage.getUser(decoded.userId)
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' })
    }

    // Definir informações do usuário na requisição
    req.user = {
      id: user.id,
      email: user.email || '',
      claims: {
        sub: user.id,
        email: user.email || undefined,
        firstName: user.firstName,
        lastName: user.lastName
      }
    }

    next()
  } catch (error) {
    console.error('Auth verification error:', error)
    res.status(401).json({ message: 'Unauthorized' })
  }
}

// Funções auxiliares para autenticação
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10)
}

export const comparePasswords = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword)
}

export const generateJWT = (userId: string, email: string): string => {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

export const verifyJWT = (token: string): any => {
  return jwt.verify(token, JWT_SECRET)
}