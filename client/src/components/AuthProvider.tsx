import { ReactNode } from 'react'
import { AuthContext, useSupabaseAuth } from '../hooks/useSupabaseAuth'

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const auth = useSupabaseAuth()

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}