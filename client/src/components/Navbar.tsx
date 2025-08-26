import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Shield, 
  Menu, 
  X, 
  Home, 
  FileCheck, 
  FileText, 
  FileBarChart, 
  CreditCard, 
  User, 
  LogOut, 
  Sun, 
  Moon,
  Settings
} from "lucide-react";
import { useLocation } from "wouter";

export default function Navbar() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [, navigate] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const navigationItems = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/questionnaire", label: "Questionário", icon: FileCheck },
    { href: "/documents", label: "Documentos", icon: FileText },
    { href: "/reports", label: "Relatórios", icon: FileBarChart },
    { href: "/subscription", label: "Assinaturas", icon: CreditCard },
  ];

  const getUserInitials = () => {
    if (!user) return "U";
    const firstName = (user as any)?.firstName || (user as any)?.email?.charAt(0) || "";
    const lastName = (user as any)?.lastName || "";
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || "U";
  };

  const getCurrentPath = () => window.location.pathname;

  return (
    <nav className="glass-card sticky top-0 z-50 border-b backdrop-blur-xl">
      <div className="container mx-auto px-4 lg:px-6">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate("/")}
              className="flex items-center space-x-3 group"
              data-testid="logo-button"
            >
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                  <Shield className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  DPO Fast
                </h1>
                <p className="text-xs text-muted-foreground -mt-1">Conformidade LGPD</p>
              </div>
            </button>
          </div>

          {/* Desktop Navigation */}
          {isAuthenticated && (
            <div className="hidden lg:flex items-center space-x-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = getCurrentPath() === item.href;
                return (
                  <Button
                    key={item.href}
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    onClick={() => navigate(item.href)}
                    className={`
                      flex items-center space-x-2 transition-all duration-200
                      ${isActive 
                        ? "btn-gradient shadow-md" 
                        : "hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                      }
                    `}
                    data-testid={`nav-${item.href.replace("/", "") || "home"}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden xl:inline">{item.label}</span>
                  </Button>
                );
              })}
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center space-x-3">
            
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="p-2 hover:bg-muted/80 rounded-lg transition-colors"
              data-testid="theme-toggle"
              title={`Alternar para tema ${theme === 'light' ? 'escuro' : 'claro'}`}
            >
              {theme === 'light' ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </Button>

            {isLoading ? (
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            ) : isAuthenticated ? (
              <>
                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="relative h-9 w-9 rounded-full ring-2 ring-transparent hover:ring-primary/20 transition-all duration-200"
                      data-testid="user-menu-trigger"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage 
                          src={(user as any)?.profileImageUrl} 
                          alt={(user as any)?.firstName || "User"} 
                        />
                        <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 glass-card" align="end">
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium text-foreground">
                        {(user as any)?.firstName && (user as any)?.lastName 
                          ? `${(user as any)?.firstName} ${(user as any)?.lastName}` 
                          : (user as any)?.email || "Usuário"
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(user as any)?.email || "email@exemplo.com"}
                      </p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => navigate("/profile")}
                      className="cursor-pointer"
                      data-testid="menu-profile"
                    >
                      <User className="mr-2 h-4 w-4" />
                      Perfil
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => navigate("/subscription")}
                      className="cursor-pointer"
                      data-testid="menu-subscription"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Configurações
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleLogout}
                      className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
                      data-testid="menu-logout"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Mobile Menu Toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden p-2"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  data-testid="mobile-menu-toggle"
                >
                  {isMobileMenuOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </Button>
              </>
            ) : (
              <Button 
                onClick={handleLogin} 
                className="btn-gradient"
                data-testid="login-button"
              >
                Entrar
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {isAuthenticated && isMobileMenuOpen && (
          <div className="lg:hidden border-t py-4 animate-fade-in">
            <div className="space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = getCurrentPath() === item.href;
                return (
                  <Button
                    key={item.href}
                    variant={isActive ? "default" : "ghost"}
                    className={`
                      w-full justify-start space-x-3
                      ${isActive ? "btn-gradient" : "hover:bg-muted/80"}
                    `}
                    onClick={() => {
                      navigate(item.href);
                      setIsMobileMenuOpen(false);
                    }}
                    data-testid={`mobile-nav-${item.href.replace("/", "") || "home"}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}