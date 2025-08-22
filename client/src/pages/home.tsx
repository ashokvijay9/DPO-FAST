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
  User,
  TrendingUp,
  BarChart3,
  Settings
} from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
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
      
      // Auto-download the report
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const complianceScore = (dashboardData as any)?.complianceScore || 0;
  const pendingTasks = (dashboardData as any)?.pendingTasks || 0;
  const documentsCount = (dashboardData as any)?.documentsCount || 0;
  const validDocuments = (dashboardData as any)?.validDocuments || 0;
  const pendingDocuments = (dashboardData as any)?.pendingDocuments || 0;
  const lastReportDate = (dashboardData as any)?.lastReportDate;

  const canGenerateReport = complianceScore > 0; // User must have completed questionnaire

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      {/* Modern Header */}
      <div className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg shadow-lg">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  DPO Fast
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Dashboard de Conformidade LGPD
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/questionnaire')}
                className="gap-2"
              >
                <BookOpen className="h-4 w-4" />
                Questionário
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/documents')}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Documentos
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/api/logout'}
                className="gap-2"
              >
                <User className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-2">
            <CheckCircle className="h-4 w-4" />
            Última atualização há poucos minutos
          </div>
          <p className="text-muted-foreground">
            Acompanhe o status de adequação LGPD da sua empresa
          </p>
        </div>

        {/* Modern Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-lg bg-white/70 dark:bg-slate-900/70 backdrop-blur-lg overflow-hidden">
            <div className="bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 p-4 border-b">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold text-slate-700 dark:text-slate-300">Score de Conformidade</h3>
              </div>
            </div>
            <CardContent className="p-6 text-center">
              <div className="relative w-24 h-24 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-400 to-emerald-600 opacity-20"></div>
                <div className="absolute inset-2 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-compliance-score">
                    {complianceScore}%
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {complianceScore >= 80 
                  ? "Excelente conformidade!" 
                  : complianceScore >= 60 
                  ? "Bom nível de adequação"
                  : "Precisa de melhorias"
                }
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/70 dark:bg-slate-900/70 backdrop-blur-lg overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-red-500/10 p-4 border-b">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <h3 className="font-semibold text-slate-700 dark:text-slate-300">Tarefas Pendentes</h3>
              </div>
            </div>
            <CardContent className="p-6">
              <div className="text-center mb-4">
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white" data-testid="text-pending-tasks">{pendingTasks}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">ações necessárias</p>
              </div>
              <div className="space-y-2">
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      pendingTasks === 0 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                        : 'bg-gradient-to-r from-yellow-500 to-orange-600'
                    }`}
                    style={{ width: `${pendingTasks === 0 ? 100 : Math.max(20, 100 - (pendingTasks * 10))}%` }}
                  />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 text-center">
                  {pendingTasks === 0 ? "Tudo em dia!" : "Requer atenção"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/70 dark:bg-slate-900/70 backdrop-blur-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 p-4 border-b">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold text-slate-700 dark:text-slate-300">Documentos</h3>
              </div>
            </div>
            <CardContent className="p-6">
              <div className="text-center mb-4">
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white" data-testid="text-documents-count">{documentsCount}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">arquivos gerenciados</p>
              </div>
              <div className="flex justify-between text-sm space-x-2">
                <div className="text-center flex-1">
                  <div className="text-green-600 dark:text-green-400 font-semibold">{validDocuments}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">Válidos</div>
                </div>
                <div className="text-center flex-1">
                  <div className="text-yellow-600 dark:text-yellow-400 font-semibold">{pendingDocuments}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">Revisão</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Tasks List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Próximas Ações Recomendadas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {(tasks as any)?.length > 0 ? (
                  <div className="divide-y">
                    {(tasks as any)?.slice(0, 5).map((task: any) => (
                      <div key={task.id} className="p-4 flex items-center justify-between" data-testid={`task-item-${task.id}`}>
                        <div className="flex-1">
                          <div className="flex items-center mb-1">
                            <Badge 
                              variant={
                                task.priority === 'high' ? 'destructive' : 
                                task.priority === 'medium' ? 'default' : 
                                'secondary'
                              }
                              className="mr-2"
                            >
                              {task.priority === 'high' ? 'Alta' : 
                               task.priority === 'medium' ? 'Média' : 'Baixa'}
                            </Badge>
                          </div>
                          <h4 className="font-medium">{task.title}</h4>
                          <p className="text-sm text-muted-foreground mb-1">{task.description}</p>
                          {task.dueDate && (
                            <p className="text-xs text-muted-foreground flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              Prazo: {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          data-testid={`button-complete-task-${task.id}`}
                        >
                          Marcar como Feito
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>Parabéns! Não há tarefas pendentes.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Reports and Quick Actions */}
          <div className="space-y-6">
            {/* Reports Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileBarChart className="h-5 w-5 mr-2" />
                  Relatórios de Conformidade
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">Gerar Novo Relatório</h4>
                    <p className="text-sm text-muted-foreground">
                      {canGenerateReport ? 
                        "Crie um relatório completo com seu status de conformidade" : 
                        "Complete o questionário para gerar relatórios"
                      }
                    </p>
                  </div>
                  <Button
                    onClick={() => generateReportMutation.mutate()}
                    disabled={!canGenerateReport || generateReportMutation.isPending}
                    data-testid="button-generate-report"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {generateReportMutation.isPending ? "Gerando..." : "Gerar PDF"}
                  </Button>
                </div>

                {reports && (reports as any).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Relatórios Anteriores</h4>
                    {(reports as any).slice(0, 3).map((report: any) => (
                      <div key={report.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="text-sm font-medium">{report.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(report.createdAt).toLocaleDateString('pt-BR')} • {report.complianceScore}% conformidade
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(`/api/reports/${report.id}/download`, '_blank')}
                          data-testid={`button-download-report-${report.id}`}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    {(reports as any).length > 3 && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => navigate("/documents")}
                        className="p-0 text-xs"
                        data-testid="button-view-all-reports"
                      >
                        Ver todos os relatórios →
                      </Button>
                    )}
                  </div>
                )}

                {lastReportDate && (
                  <div className="text-xs text-muted-foreground">
                    Último relatório: {new Date(lastReportDate).toLocaleDateString('pt-BR')}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start" 
                  onClick={() => navigate("/questionnaire")}
                  data-testid="button-questionnaire"
                >
                  <FileCheck className="mr-2 h-4 w-4" />
                  Fazer Questionário
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate("/documents")}
                  data-testid="button-upload-document"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Documento
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate("/subscription")}
                  data-testid="button-view-plans"
                >
                  <Crown className="mr-2 h-4 w-4" />
                  Ver Planos
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
