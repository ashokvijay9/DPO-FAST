import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { 
  User, 
  Mail, 
  Building, 
  Building2,
  Calendar, 
  Shield, 
  Key, 
  Save,
  Crown,
  CheckCircle,
  Users,
  Briefcase,
  Award,
  BarChart3,
  Star
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateUserProfileSchema, type UpdateUserProfile } from "@shared/schema";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";

export default function Profile() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: user, isLoading: isUserLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: isAuthenticated,
  });

  const { data: companyProfile } = useQuery({
    queryKey: ["/api/company-profile"],
    enabled: isAuthenticated,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["/api/documents"],
    enabled: isAuthenticated,
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["/api/reports"],
    enabled: isAuthenticated,
  });

  const { data: planLimits } = useQuery({
    queryKey: ["/api/plan/limits"],
    enabled: isAuthenticated,
  });

  const form = useForm<UpdateUserProfile>({
    resolver: zodResolver(updateUserProfileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      company: "",
    },
  });

  // Load user data into form when available
  useEffect(() => {
    if (user) {
      form.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        company: user.company || "",
      });
    }
  }, [user, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateUserProfile) => {
      const response = await apiRequest("PUT", "/api/profile", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Perfil atualizado com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao atualizar perfil",
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/profile/reset-password", {});
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Solicitação Registrada",
        description: data.message,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao processar solicitação de redefinição de senha",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UpdateUserProfile) => {
    updateProfileMutation.mutate(data);
  };

  const handleResetPassword = () => {
    resetPasswordMutation.mutate();
  };

  const getPlanBadge = (plan: string) => {
    const planMap = {
      'free': { label: 'Gratuito', color: 'bg-gray-100 text-gray-800' },
      'basic': { label: 'Básico', color: 'bg-blue-100 text-blue-800' },
      'pro': { label: 'Pro', color: 'bg-purple-100 text-purple-800' },
    };
    
    const planInfo = planMap[plan as keyof typeof planMap] || planMap.free;
    return (
      <Badge className={planInfo.color}>
        {plan === 'pro' && <Crown className="mr-1 h-3 w-3" />}
        {planInfo.label}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'active': { label: 'Ativo', color: 'bg-green-100 text-green-800' },
      'inactive': { label: 'Inativo', color: 'bg-gray-100 text-gray-800' },
      'canceled': { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.inactive;
    return (
      <Badge className={statusInfo.color}>
        {status === 'active' && <CheckCircle className="mr-1 h-3 w-3" />}
        {statusInfo.label}
      </Badge>
    );
  };

  // Calculate plan limits and suggested plan
  const currentPlan = user?.subscriptionStatus === 'active' ? user?.subscriptionPlan || 'free' : 'free';
  const currentPlanLimits = planLimits?.limits;
  
  // Calculate suggested plan based on company profile
  const getSuggestedPlan = () => {
    if (!companyProfile) return 'basic';
    
    const sectorsCount = ((companyProfile.sectors as string[]) || []).length +
                        ((companyProfile.customSectors as string[]) || []).length;
    const isLargeCompany = companyProfile.companySize === 'large';
    
    if (isLargeCompany || sectorsCount > 3) {
      return 'pro';
    } else if (sectorsCount > 0 || companyProfile.companySize === 'medium') {
      return 'basic';
    }
    return 'free';
  };
  
  const suggestedPlan = getSuggestedPlan();
  const documentsCount = documents?.length || 0;

  if (isLoading || isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen hero-gradient">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Meu Perfil</h1>
            <p className="text-muted-foreground">
              Gerencie suas informações pessoais e configurações da conta
            </p>
          </div>

          {/* Company Information Section */}
          {companyProfile && (
            <div className="mb-8">
              <Card className="glass-card border-0 shadow-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-xl">
                    <Building2 className="h-5 w-5 mr-3 text-primary" />
                    Resumo da Empresa
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Company Basic Info */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Empresa</p>
                          <p className="font-medium" data-testid="text-company-name">
                            {companyProfile.companyName}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                          <BarChart3 className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Porte</p>
                          <Badge className="status-info">
                            {companyProfile.companySize === "small" ? "Pequena" : 
                             companyProfile.companySize === "medium" ? "Média" : "Grande"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Employee Count */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                          <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Funcionários</p>
                          <p className="font-medium" data-testid="text-employee-count">
                            {companyProfile.employeeCount || "Não informado"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                          <Briefcase className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Departamentos</p>
                          <p className="font-medium">
                            {(companyProfile.departments as string[])?.length || 0}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Sectors */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                          <Award className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Setores de Atuação</p>
                          <p className="font-medium" data-testid="text-sectors-count">
                            {((companyProfile.sectors as string[]) || []).length + 
                             ((companyProfile.customSectors as string[]) || []).length} setores
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {((companyProfile.sectors as string[]) || []).slice(0, 3).map((sector, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {sector}
                          </Badge>
                        ))}
                        {((companyProfile.sectors as string[]) || []).length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{((companyProfile.sectors as string[]) || []).length - 3} mais
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Plan Information Section */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Current Plan & Usage */}
            <Card className="glass-card border-0 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg">
                  <Crown className="h-5 w-5 mr-2 text-amber-500" />
                  Plano Atual: {currentPlan === "free" ? "Gratuito" : 
                                currentPlan === "basic" ? "Básico" : "Pro"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentPlanLimits && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Documentos</span>
                      <span className="font-medium">
                        {documentsCount}
                        {currentPlanLimits.maxDocuments > 0 ? `/${currentPlanLimits.maxDocuments}` : " (Ilimitado)"}
                      </span>
                    </div>
                    {currentPlanLimits.maxDocuments > 0 && (
                      <Progress 
                        value={(documentsCount / currentPlanLimits.maxDocuments) * 100} 
                        className="h-2"
                      />
                    )}
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Relatórios</span>
                      <span className="font-medium">
                        {reports?.length || 0}
                        {currentPlanLimits.reportsPerMonth > 0 ? `/${currentPlanLimits.reportsPerMonth}` : " (Ilimitado)"}
                      </span>
                    </div>
                    {currentPlanLimits.reportsPerMonth > 0 && (
                      <Progress 
                        value={((reports?.length || 0) / currentPlanLimits.reportsPerMonth) * 100} 
                        className="h-2"
                      />
                    )}

                    {currentPlanLimits.hasAdvancedFeatures && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Recursos Avançados</span>
                        <Badge className="status-success text-xs">
                          Habilitado
                        </Badge>
                      </div>
                    )}

                    {currentPlanLimits.hasPrioritySupport && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Suporte Prioritário</span>
                        <Badge className="status-success text-xs">
                          Habilitado
                        </Badge>
                      </div>
                    )}
                  </div>
                )}

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => window.location.href = '/subscription'}
                >
                  Gerenciar Plano
                </Button>
              </CardContent>
            </Card>

            {/* Plan Suggestion */}
            {suggestedPlan !== currentPlan && (
              <Card className="glass-card border-0 shadow-xl border-amber-200 dark:border-amber-800">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-lg">
                    <Star className="h-5 w-5 mr-2 text-amber-500" />
                    Sugestão de Plano
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-4">
                    <div className="p-4 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-lg">
                      <h3 className="font-semibold text-lg mb-2">
                        Plano {suggestedPlan === "basic" ? "Básico" : "Pro"}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {companyProfile && (
                          <>
                            Com base no seu perfil empresarial ({
                              ((companyProfile.sectors as string[]) || []).length +
                              ((companyProfile.customSectors as string[]) || []).length
                            } setores, porte {
                              companyProfile.companySize === "small" ? "pequeno" :
                              companyProfile.companySize === "medium" ? "médio" : "grande"
                            }), recomendamos este plano.
                          </>
                        )}
                      </p>
                      <Button 
                        className="btn-gradient w-full"
                        onClick={() => window.location.href = '/subscription'}
                        data-testid="button-upgrade-plan"
                      >
                        <Crown className="h-4 w-4 mr-2" />
                        Fazer Upgrade
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Information */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Informações Pessoais
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Digite seu nome"
                                  {...field}
                                  data-testid="input-first-name"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sobrenome</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Digite seu sobrenome"
                                  {...field}
                                  data-testid="input-last-name"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="Digite seu email"
                                {...field}
                                data-testid="input-email"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="company"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Empresa</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Digite o nome da sua empresa"
                                {...field}
                                data-testid="input-company"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        disabled={updateProfileMutation.isPending}
                        data-testid="button-save-profile"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {updateProfileMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              {/* Security Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Configurações de Segurança
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Key className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <h3 className="font-medium">Redefinir Senha</h3>
                          <p className="text-sm text-muted-foreground">
                            Solicitar redefinição de senha da conta
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={handleResetPassword}
                        disabled={resetPasswordMutation.isPending}
                        data-testid="button-reset-password"
                      >
                        {resetPasswordMutation.isPending ? "Processando..." : "Redefinir"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Account Summary */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Informações da Conta
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID da Conta:</span>
                    <span className="font-mono text-xs">{user?.id?.slice(0, 8)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Criado em:</span>
                    <span>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR') : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Última atualização:</span>
                    <span>{user?.updatedAt ? new Date(user.updatedAt).toLocaleDateString('pt-BR') : 'N/A'}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}