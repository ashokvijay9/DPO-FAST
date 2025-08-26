import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Upload, 
  FileCheck, 
  Crown,
  Calendar,
  Target,
  Download,
  FileBarChart,
  BookOpen,
  TrendingUp,
  ChevronRight,
  ArrowRight,
  Activity,
  Shield,
  Clock,
  Zap,
  Star
} from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();
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

  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ["/api/dashboard"],
    enabled: isAuthenticated,
  });

  const { data: tasks } = useQuery({
    queryKey: ["/api/compliance-tasks"],
    enabled: isAuthenticated,
  });

  const { data: documents } = useQuery({
    queryKey: ["/api/documents"],
    enabled: isAuthenticated,
  });

  const { data: reports } = useQuery({
    queryKey: ["/api/reports"],
    enabled: isAuthenticated,
  });

  const generateReportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/reports/generate", {});
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sucesso!",
        description: "Relatório de conformidade gerado com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      
      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
      }
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
        description: "Falha ao gerar relatório de conformidade",
        variant: "destructive",
      });
    },
  });

  if (isLoading || isDashboardLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center hero-gradient">
        <div className="text-center space-y-4 animate-fade-in">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  const complianceScore = (dashboardData as any)?.complianceScore || 0;
  const pendingTasks = (dashboardData as any)?.pendingTasks || 0;
  const documentsCount = (dashboardData as any)?.documentsCount || 0;
  const validDocuments = (dashboardData as any)?.validDocuments || 0;
  const pendingDocuments = (dashboardData as any)?.pendingDocuments || 0;
  const lastReportDate = (dashboardData as any)?.lastReportDate;

  const canGenerateReport = complianceScore > 0;
  const userName = (user as any)?.firstName ? `${(user as any)?.firstName}` : "Usuário";

  return (
    <div className="min-h-screen hero-gradient">
      
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="text-center space-y-6 mb-12 animate-fade-in">
          <div className="flex items-center justify-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Olá, {userName}! 👋
              </h1>
              <p className="text-muted-foreground">
                Bem-vindo ao seu dashboard de conformidade LGPD
              </p>
            </div>
          </div>
          
          {complianceScore === 0 && (
            <div className="glass-card max-w-2xl mx-auto p-6 border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <BookOpen className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <h3 className="font-semibold text-foreground">Comece sua jornada LGPD</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Complete o questionário LGPD para receber uma avaliação personalizada e recomendações específicas para sua empresa.
              </p>
              <Button 
                className="btn-gradient w-full sm:w-auto" 
                onClick={() => navigate("/questionnaire")}
                data-testid="button-start-questionnaire"
              >
                <FileCheck className="h-4 w-4 mr-2" />
                Iniciar Questionário
              </Button>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12 animate-slide-in">
          <Card className="glass-card border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 rounded-xl group-hover:scale-110 transition-transform">
                  <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <Badge className="status-success text-xs">
                  {complianceScore >= 80 ? "Excelente" : complianceScore >= 60 ? "Bom" : "Melhorar"}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Score de Conformidade</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-compliance-score">
                  {complianceScore}%
                </p>
                <Progress value={complianceScore} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 rounded-xl group-hover:scale-110 transition-transform">
                  <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <Badge className={pendingTasks === 0 ? "status-success" : pendingTasks > 5 ? "status-error" : "status-warning"}>
                  {pendingTasks === 0 ? "Em dia" : pendingTasks > 5 ? "Urgente" : "Atenção"}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Tarefas Pendentes</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-pending-tasks">
                  {pendingTasks}
                </p>
                <p className="text-xs text-muted-foreground">
                  {pendingTasks === 0 ? "Parabéns! Tudo em dia" : "ações necessárias"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl group-hover:scale-110 transition-transform">
                  <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <Badge className="status-info">
                  {validDocuments}/{documentsCount}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Documentos</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-documents-count">
                  {documentsCount}
                </p>
                <p className="text-xs text-muted-foreground">
                  {validDocuments} válidos, {pendingDocuments} em revisão
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-xl group-hover:scale-110 transition-transform">
                  <FileBarChart className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <Badge className="status-info">
                  {(reports as any)?.length || 0}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Relatórios</p>
                <p className="text-2xl font-bold text-foreground">
                  {(reports as any)?.length || 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  {lastReportDate ? `Último: ${new Date(lastReportDate).toLocaleDateString('pt-BR')}` : "Nenhum gerado"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
          
          {/* Priority Tasks */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="glass-card border-0 shadow-xl animate-scale-in">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center text-xl">
                    <Activity className="h-5 w-5 mr-3 text-primary" />
                    Próximas Ações Recomendadas
                  </CardTitle>
                  {(tasks as any)?.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {(tasks as any)?.filter((t: any) => t.status === 'pending').length} pendentes
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {(tasks as any)?.length > 0 ? (
                  <div className="space-y-4 p-6">
                    {(tasks as any)?.slice(0, 4).map((task: any, index: number) => (
                      <Card 
                        key={task.id} 
                        className="border hover:shadow-md transition-all duration-300 animate-fade-in" 
                        style={{ animationDelay: `${index * 100}ms` }}
                        data-testid={`task-item-${task.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-medium ${
                                task.priority === 'high' ? 'bg-red-500' : 
                                task.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                              }`}>
                                {index + 1}
                              </div>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge 
                                  className={`text-xs ${
                                    task.priority === 'high' ? 'status-error' : 
                                    task.priority === 'medium' ? 'status-warning' : 'status-info'
                                  }`}
                                >
                                  {task.priority === 'high' ? 'Alta' : 
                                   task.priority === 'medium' ? 'Média' : 'Baixa'} Prioridade
                                </Badge>
                                {task.category && (
                                  <Badge variant="outline" className="text-xs">
                                    {task.category === 'governance' ? 'Governança' :
                                     task.category === 'documentation' ? 'Documentação' :
                                     task.category === 'consent_management' ? 'Consentimento' :
                                     task.category === 'data_protection' ? 'Proteção de Dados' :
                                     task.category === 'security' ? 'Segurança' :
                                     task.category === 'training' ? 'Treinamento' :
                                     task.category}
                                  </Badge>
                                )}
                              </div>
                              
                              <h4 className="font-medium text-foreground mb-1 line-clamp-1">
                                {task.title}
                              </h4>
                              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                {task.description}
                              </p>
                              
                              {task.steps && task.steps.length > 0 && (
                                <details className="group">
                                  <summary className="cursor-pointer text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1 mb-2">
                                    <span>Ver detalhes ({task.steps.length} etapas)</span>
                                    <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                                  </summary>
                                  <div className="mt-2 pl-4 border-l-2 border-border space-y-1">
                                    {task.steps.slice(0, 3).map((step: string, stepIndex: number) => (
                                      <div key={stepIndex} className="text-xs text-muted-foreground flex items-start gap-2">
                                        <span className="w-4 h-4 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium text-primary mt-0.5 flex-shrink-0">
                                          {stepIndex + 1}
                                        </span>
                                        <span className="flex-1">{step.replace(/^\d+\.\s*/, '')}</span>
                                      </div>
                                    ))}
                                    {task.steps.length > 3 && (
                                      <p className="text-xs text-muted-foreground pl-6">
                                        ... e mais {task.steps.length - 3} passos
                                      </p>
                                    )}
                                  </div>
                                </details>
                              )}
                              
                              <div className="flex items-center justify-between mt-3">
                                {task.dueDate && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    <span>Prazo: {new Date(task.dueDate).toLocaleDateString('pt-BR')}</span>
                                  </div>
                                )}
                                
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="gap-1 ml-auto"
                                  data-testid={`button-complete-task-${task.id}`}
                                >
                                  <CheckCircle className="h-3 w-3" />
                                  Concluir
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {(tasks as any)?.length > 4 && (
                      <div className="text-center">
                        <Button 
                          variant="ghost" 
                          className="gap-2"
                          onClick={() => navigate("/questionnaire")}
                        >
                          Ver todas as tarefas
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="font-medium text-foreground mb-2">Tudo em dia!</h3>
                    <p className="text-sm text-muted-foreground">
                      Parabéns! Não há tarefas pendentes no momento.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions & Reports */}
          <div className="space-y-6">
            
            {/* Quick Actions */}
            <Card className="glass-card border-0 shadow-xl animate-scale-in">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg">
                  <Zap className="h-5 w-5 mr-2 text-yellow-500" />
                  Ações Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start gap-3 h-12 group" 
                  variant={complianceScore === 0 ? "default" : "outline"}
                  onClick={() => navigate("/questionnaire")}
                  data-testid="button-questionnaire"
                >
                  <div className="p-1 rounded-md bg-blue-100 dark:bg-blue-900/30">
                    <FileCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="flex-1 text-left">
                    {complianceScore === 0 ? "Iniciar Questionário" : "Atualizar Respostas"}
                  </span>
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-3 h-12 group"
                  onClick={() => navigate("/documents")}
                  data-testid="button-upload-document"
                >
                  <div className="p-1 rounded-md bg-green-100 dark:bg-green-900/30">
                    <Upload className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="flex-1 text-left">Gerenciar Documentos</span>
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>

                {canGenerateReport && (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-3 h-12 group"
                    onClick={() => generateReportMutation.mutate()}
                    disabled={generateReportMutation.isPending}
                    data-testid="button-generate-report"
                  >
                    <div className="p-1 rounded-md bg-purple-100 dark:bg-purple-900/30">
                      <FileBarChart className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="flex-1 text-left">
                      {generateReportMutation.isPending ? "Gerando..." : "Gerar Relatório"}
                    </span>
                    {!generateReportMutation.isPending && (
                      <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    )}
                  </Button>
                )}

                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-3 h-12 group"
                  onClick={() => navigate("/subscription")}
                  data-testid="button-view-plans"
                >
                  <div className="p-1 rounded-md bg-amber-100 dark:bg-amber-900/30">
                    <Star className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="flex-1 text-left">Planos Premium</span>
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>

            {/* Recent Reports */}
            {reports && (reports as any).length > 0 && (
              <Card className="glass-card border-0 shadow-xl animate-scale-in">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-lg">
                    <FileBarChart className="h-5 w-5 mr-2 text-primary" />
                    Relatórios Recentes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(reports as any).slice(0, 3).map((report: any) => (
                    <div key={report.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <FileBarChart className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{report.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className="status-info text-xs">
                            {report.complianceScore}%
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(report.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="p-2"
                        onClick={() => window.open(`/api/reports/${report.id}/download`, '_blank')}
                        data-testid={`button-download-report-${report.id}`}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => navigate("/reports")}
                  >
                    Ver todos os relatórios
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}