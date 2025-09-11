import { useContext } from 'react'
import { useQuery } from "@tanstack/react-query";
import { AuthContext } from './useSupabaseAuth'

export function useAuth() {
  const supabaseAuth = useContext(AuthContext)
  
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    enabled: !!supabaseAuth.session,
  });

  const { data: companyProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["/api/company-profile"],
    retry: false,
    enabled: !!user,
  });

  return {
    user,
    companyProfile,
    isLoading: supabaseAuth.isLoading || userLoading || profileLoading,
    isAuthenticated: !!supabaseAuth.session && !!user,
    hasCompanyProfile: !!companyProfile,
    isAdmin: Boolean((user as any)?.role === 'admin'),
    supabaseUser: supabaseAuth.user,
    session: supabaseAuth.session,
    signIn: supabaseAuth.signIn,
    signUp: supabaseAuth.signUp,
    signInWithGoogle: supabaseAuth.signInWithGoogle,
    signOut: supabaseAuth.signOut,
    logout: async () => {
      await supabaseAuth.signOut()
    },
  };
}
