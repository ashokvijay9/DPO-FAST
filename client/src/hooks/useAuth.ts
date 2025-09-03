import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const { data: companyProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["/api/company-profile"],
    retry: false,
    enabled: !!user,
  });

  return {
    user,
    companyProfile,
    isLoading: userLoading || profileLoading,
    isAuthenticated: !!user,
    hasCompanyProfile: !!companyProfile,
    isAdmin: user?.role === 'admin',
    logout: () => {
      // Logout functionality will be handled by the components
    },
  };
}
