import React, { useEffect } from 'react'
import { useLocation } from 'wouter'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

export default function AuthCallback() {
  const [, setLocation] = useLocation()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check if we have a hash fragment with auth data
        if (window.location.hash) {
          // Let Supabase handle the OAuth callback automatically
          const { data, error } = await supabase.auth.getSession()
          
          if (error) {
            console.error('Auth callback error:', error)
            setLocation('/login?error=auth_failed')
            return
          }

          if (data.session) {
            console.log('OAuth successful, redirecting to home')
            // User successfully authenticated, redirect to home
            setLocation('/home')
            return
          }
        }
        
        console.log('No session found after OAuth callback')
        // No session found, redirect to login
        setLocation('/login')
      } catch (error) {
        console.error('Unexpected error in auth callback:', error)
        setLocation('/login?error=unexpected')
      }
    }

    handleAuthCallback()
  }, [setLocation])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Autenticando...</h2>
        <p className="text-gray-400">Aguarde enquanto verificamos suas credenciais</p>
      </div>
    </div>
  )
}