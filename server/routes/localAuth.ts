import { Request, Response, Router } from 'express'
import { hashPassword, comparePasswords, generateJWT, AuthenticatedRequest, isAuthenticated } from '../middleware/localAuth'
import { storage } from '../storage'
import { z } from 'zod'

const authRouter = Router()

// Schemas de validação
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().optional(),
  lastName: z.string().optional()
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
})

// Registro de usuário local
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName } = registerSchema.parse(req.body)
    
    // Verificar se usuário já existe
    const existingUsers = await storage.getAllUsers()
    const existingUser = existingUsers.find((u: any) => u.email === email)
    
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' })
    }
    
    // Hash da senha
    const hashedPassword = await hashPassword(password)
    
    // Criar usuário
    const user = await storage.upsertUser({
      email,
      firstName: firstName || '',
      lastName: lastName || '',
      password: hashedPassword,
      authUserId: null // Para compatibilidade, não usado em auth local
    })
    
    // Gerar JWT
    const token = generateJWT(user.id, user.email || '')
    
    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      },
      token
    })
  } catch (error) {
    console.error('Registration error:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.errors })
    }
    res.status(500).json({ message: 'Registration failed' })
  }
})

// Login local
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body)
    
    // Buscar usuário por email
    const users = await storage.getAllUsers()
    const user = users.find((u: any) => u.email === email)
    
    if (!user || !user.password) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }
    
    // Verificar senha
    const isValidPassword = await comparePasswords(password, user.password)
    
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }
    
    // Gerar JWT
    const token = generateJWT(user.id, user.email || '')
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      },
      token
    })
  } catch (error) {
    console.error('Login error:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.errors })
    }
    res.status(500).json({ message: 'Login failed' })
  }
})

// Obter usuário atual
authRouter.get('/user', isAuthenticated as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' })
    }
    
    const user = await storage.getUser(req.user.id)
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    
    res.json(user)
  } catch (error) {
    console.error('Error getting user:', error)
    res.status(500).json({ message: 'Failed to get user' })
  }
})

// Logout (apenas resposta de sucesso, JWT é stateless)
authRouter.post('/logout', async (req: Request, res: Response) => {
  res.json({ message: 'Logout successful' })
})

export { authRouter }