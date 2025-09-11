import { Request, Response, Router } from 'express'
import { isAuthenticated, AuthenticatedRequest } from '../middleware/supabaseAuth'
import { storage } from '../storage'
// import { supabaseAdmin } from '../../lib/supabase' // Not needed for this endpoint

const authRouter = Router()

// Get current user - creates app user if doesn't exist, with migration support
authRouter.get('/user', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' })
    }
    
    const supabaseUserId = req.user.id
    const email = req.user.email

    // Try to find existing app user by auth_user_id
    let appUser = await storage.getUserByAuthId(supabaseUserId)
    
    // If no app user found, try migration fallback by email (for existing users)
    if (!appUser && email) {
      console.log(`Attempting user migration for email: ${email}`)
      // Try to find user by email (from previous Replit Auth)
      try {
        // For now, create a new user - migration logic can be added later if needed
        console.log('User migration feature planned for future implementation')
      } catch (migrationError) {
        console.log('User migration attempt failed, will create new user:', migrationError)
      }
    }
    
    // If still no app user found, create one
    if (!appUser) {
      console.log(`Creating new user for Supabase ID: ${supabaseUserId}`)
      appUser = await storage.upsertUser({
        authUserId: supabaseUserId,
        email,
        firstName: req.user?.claims?.firstName || req.user?.claims?.first_name || '',
        lastName: req.user?.claims?.lastName || req.user?.claims?.last_name || '',
        profileImageUrl: req.user?.claims?.profileImageUrl || req.user?.claims?.avatar_url || null,
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