import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { 
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Shield, Menu, X, Home, FileCheck, FileText, FileBarChart, CreditCard, User, LogOut } from "lucide-react";
import { useLocation } from "wouter";

export default function Navbar() {
  const { user, isAuthenticated, isLoading } = useAuth();
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

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <button 
              onClick={() => navigate("/")} 
              className="flex items-center space-x-2 text-primary font-bold text-xl"
              data-testid="button-logo"
            >
              <Shield className="h-6 w-6" />
              <span>DPO Fast</span>
            </button>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {!isLoading && (
              <>
                {isAuthenticated ? (
                  <>
                    {navigationItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.href}
                          onClick={() => navigate(item.href)}
                          className="flex items-center space-x-1 text-gray-600 hover:text-primary transition-colors"
                          data-testid={`nav-link-${item.href.replace("/", "") || "home"}`}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                    
                    {/* User Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-8 w-8 rounded-full" data-testid="button-user-menu">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={(user as any)?.profileImageUrl || ""} alt="User" />
                            <AvatarFallback>{getUserInitials()}</AvatarFallback>
                          </Avatar>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56" align="end" forceMount>
                        <div className="flex items-center justify-start gap-2 p-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={(user as any)?.profileImageUrl || ""} alt="User" />
                            <AvatarFallback>{getUserInitials()}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col space-y-1 leading-none">
                            <p className="font-medium text-sm">
                              {(user as any)?.firstName && (user as any)?.lastName 
                                ? `${(user as any).firstName} ${(user as any).lastName}` 
                                : (user as any)?.email}
                            </p>
                            {(user as any)?.email && (
                              <p className="text-xs text-muted-foreground">{(user as any).email}</p>
                            )}
                          </div>
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => navigate("/profile")}
                          data-testid="menu-item-profile"
                        >
                          <User className="mr-2 h-4 w-4" />
                          Perfil
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} data-testid="menu-item-logout">
                          <LogOut className="mr-2 h-4 w-4" />
                          Sair
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : (
                  <div className="flex items-center space-x-3">
                    <Button variant="outline" onClick={handleLogin} data-testid="button-login">
                      Entrar
                    </Button>
                    <Button onClick={handleLogin} data-testid="button-signup">
                      Cadastrar
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            {!isLoading && (
              <>
                {isAuthenticated ? (
                  <div className="space-y-2">
                    {navigationItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.href}
                          onClick={() => {
                            navigate(item.href);
                            setIsMobileMenuOpen(false);
                          }}
                          className="flex items-center space-x-2 w-full text-left px-3 py-2 rounded-md text-gray-600 hover:text-primary hover:bg-gray-50 transition-colors"
                          data-testid={`mobile-nav-${item.href.replace("/", "") || "home"}`}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                    
                    <div className="border-t pt-2 mt-2">
                      <div className="flex items-center space-x-2 px-3 py-2 text-sm">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={(user as any)?.profileImageUrl || ""} alt="User" />
                          <AvatarFallback className="text-xs">{getUserInitials()}</AvatarFallback>
                        </Avatar>
                        <span>
                          {(user as any)?.firstName && (user as any)?.lastName 
                            ? `${(user as any).firstName} ${(user as any).lastName}` 
                            : (user as any)?.email}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          navigate("/profile");
                          setIsMobileMenuOpen(false);
                        }}
                        className="flex items-center space-x-2 w-full text-left px-3 py-2 rounded-md text-gray-600 hover:text-primary hover:bg-gray-50 transition-colors"
                        data-testid="mobile-profile"
                      >
                        <User className="h-4 w-4" />
                        <span>Perfil</span>
                      </button>
                      <button
                        onClick={() => {
                          handleLogout();
                          setIsMobileMenuOpen(false);
                        }}
                        className="flex items-center space-x-2 w-full text-left px-3 py-2 rounded-md text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                        data-testid="mobile-logout"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sair</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={() => {
                        handleLogin();
                        setIsMobileMenuOpen(false);
                      }}
                      data-testid="mobile-login"
                    >
                      Entrar
                    </Button>
                    <Button 
                      className="w-full" 
                      onClick={() => {
                        handleLogin();
                        setIsMobileMenuOpen(false);
                      }}
                      data-testid="mobile-signup"
                    >
                      Cadastrar
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
