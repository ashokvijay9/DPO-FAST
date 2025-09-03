import { Switch, Route, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
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

// Admin components
import AdminNavbar from "@/components/AdminNavbar";
import AdminDashboard from "@/pages/admin/admin-dashboard";
import AdminSubscribers from "@/pages/admin/admin-subscribers";
import AdminDocuments from "@/pages/admin/admin-documents";
import AdminReports from "@/pages/admin/admin-reports";
import AdminProfile from "@/pages/admin/admin-profile";

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
  const { isAuthenticated, isLoading, hasCompanyProfile, isAdmin } = useAuth();
  const [location] = useLocation();

  // Loading state
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="*" component={Landing} />
      </Switch>
    );
  }

  // Check if accessing admin routes
  const isAdminRoute = location.startsWith('/admin');

  // Admin routes - only for users with admin role
  if (isAdminRoute) {
    if (!isAdmin) {
      // Redirect non-admin users trying to access admin routes
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Acesso Negado
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Você não tem permissão para acessar o painel administrativo.
            </p>
            <Button 
              onClick={() => window.location.href = '/'}
              className="btn-gradient"
            >
              Voltar ao Início
            </Button>
          </div>
        </div>
      );
    }

    return (
      <>
        <AdminNavbar />
        <Switch>
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/subscribers" component={AdminSubscribers} />
          <Route path="/admin/documents" component={AdminDocuments} />
          <Route path="/admin/reports" component={AdminReports} />
          <Route path="/admin/profile" component={AdminProfile} />
          <Route path="/profile" component={Profile} />
          <Route component={NotFound} />
        </Switch>
      </>
    );
  }

  // Authenticated but no company profile (skip for admin users)
  if (!hasCompanyProfile && !isAdmin) {
    return (
      <Switch>
        <Route path="/company-onboarding" component={CompanyOnboarding} />
        <Route path="*" component={CompanyOnboarding} />
      </Switch>
    );
  }

  // Regular user routes
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
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
