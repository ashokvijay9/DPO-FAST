import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Upload, 
  FileCheck, 
  Crown,
  Calendar,
  Target
} from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();

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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard de Conformidade</h1>
          <p className="text-muted-foreground">
            Acompanhe o status de adequação LGPD da sua empresa
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="relative overflow-hidden">
            <CardContent className="p-6 text-center">
              <div className="compliance-meter mx-auto mb-4 relative w-32 h-32 rounded-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-400 flex items-center justify-center">
                <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary" data-testid="text-compliance-score">
                    {complianceScore}%
                  </span>
                </div>
              </div>
              <h3 className="font-semibold text-lg">Nível de Conformidade</h3>
              <p className="text-sm text-muted-foreground">
                {complianceScore >= 80 
                  ? "Sua empresa está em ótimo caminho!" 
                  : complianceScore >= 60 
                  ? "Sua empresa está em bom caminho!"
                  : "Há oportunidades de melhoria"
                }
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <AlertTriangle className="h-8 w-8 text-yellow-500 mr-3" />
                <div>
                  <h3 className="text-2xl font-bold" data-testid="text-pending-tasks">{pendingTasks}</h3>
                  <p className="text-sm text-muted-foreground">Tarefas Pendentes</p>
                </div>
              </div>
              <Progress value={pendingTasks > 0 ? 60 : 100} className="mb-2" />
              <p className="text-xs text-muted-foreground">
                {pendingTasks === 0 ? "Todas as tarefas concluídas!" : `${pendingTasks} tarefas precisam de atenção`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <FileText className="h-8 w-8 text-green-500 mr-3" />
                <div>
                  <h3 className="text-2xl font-bold" data-testid="text-documents-count">{documentsCount}</h3>
                  <p className="text-sm text-muted-foreground">Documentos</p>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-green-600 flex items-center">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  {validDocuments} Válidos
                </span>
                <span className="text-yellow-600 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  {pendingDocuments} Revisão
                </span>
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

          {/* Quick Actions */}
          <div>
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
                  data-testid="button-generate-report"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Gerar Relatório
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
