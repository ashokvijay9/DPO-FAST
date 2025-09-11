import { Request, Response, Router } from 'express'
import { isAuthenticated } from '../middleware/supabaseAuth'
import { storage } from '../storage'
// import { supabaseAdmin } from '../../lib/supabase' // Not needed for this endpoint

const authRouter = Router()

// Get current user - creates app user if doesn't exist
authRouter.get('/user', isAuthenticated, async (req: any, res: Response) => {
  try {
    const supabaseUserId = req.user.id
    const email = req.user.email

    // Try to find existing app user by auth_user_id
    let appUser = await storage.getUserByAuthId(supabaseUserId)
    
    // If no app user found, create one
    if (!appUser) {
      appUser = await storage.upsertUser({
        authUserId: supabaseUserId,
        email,
        firstName: req.user.claims?.firstName || '',
        lastName: req.user.claims?.lastName || '',
        profileImageUrl: req.user.claims?.profileImageUrl || null,
      })
    }

    res.json(appUser)
  } catch (error) {
    console.error('Error in /api/auth/user:', error)
    res.status(500).json({ message: 'Failed to get user' })
  }
})

// Login with Supabase (handled by frontend, this is just for reference)
authRouter.post('/login', async (req: Request, res: Response) => {
  res.status(400).json({ 
    message: 'Login should be handled by Supabase client on frontend' 
  })
})

// Logout (handled by frontend, this clears any server-side data if needed)
authRouter.post('/logout', async (req: Request, res: Response) => {
  res.json({ message: 'Logout successful' })
})

export { authRouter }