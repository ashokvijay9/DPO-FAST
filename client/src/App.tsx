import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useAuth, AuthProvider } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import Landing from "@/pages/landing";
import AuthPage from "@/pages/auth-page";
import Home from "@/pages/home";
import Questionnaire from "@/pages/questionnaire";
import Tasks from "@/pages/tasks";
import SectorReports from "@/pages/sector-reports";
import Documents from "@/pages/documents";
import Reports from "@/pages/reports";
import Subscription from "@/pages/subscription";
import Profile from "@/pages/profile";
import CompanyOnboarding from "@/pages/company-onboarding";
import Navbar from "@/components/Navbar";
import NotFound from "@/pages/not-found";

function LoadingScreen() {
  return (
    <div className="min-h-screen hero-gradient flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-white text-lg">Carregando...</p>
      </div>
    </div>
  );
}

function Router() {
  const { user, isLoading } = useAuth();
  
  // Check if user has company profile
  const { data: companyProfile, isLoading: companyLoading } = useQuery({
    queryKey: ["/api/company-profile"],
    enabled: !!user,
  });
  
  const hasCompanyProfile = !!companyProfile;
  const isAppLoading = isLoading || (user && companyLoading);

  // Loading state
  if (isAppLoading) {
    return <LoadingScreen />;
  }

  // Not authenticated
  if (!user) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/auth" component={AuthPage} />
        <Route path="*" component={AuthPage} />
      </Switch>
    );
  }

  // Authenticated but no company profile
  if (!hasCompanyProfile) {
    return (
      <Switch>
        <Route path="/company-onboarding" component={CompanyOnboarding} />
        <Route path="*" component={CompanyOnboarding} />
      </Switch>
    );
  }

  // Fully authenticated with company profile
  return (
    <>
      <Navbar />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/questionnaire" component={Questionnaire} />
        <Route path="/tasks" component={Tasks} />
        <Route path="/documents" component={Documents} />
        <Route path="/reports" component={Reports} />
        <Route path="/sector-reports" component={SectorReports} />
        <Route path="/subscription" component={Subscription} />
        <Route path="/profile" component={Profile} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Router />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
