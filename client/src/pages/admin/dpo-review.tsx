import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Search, 
  FileText, 
  Calendar, 
  User,
  Building,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Download,
  Eye
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PendingTask {
  id: string;
  title: string;
  description: string;
  priority: string;
  category: string;
  submittedAt: string;
  userComments: string;
  userId: string;
  userEmail: string;
  userFirstName: string;
  userLastName: string;
  companyName: string;
}

interface TaskDetails extends PendingTask {
  steps: any[];
  status: string;
  dueDate: string | null;
  attachments: any[];
  companyEmail: string;
  companyPhone: string;
}

export default function DPOReview() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTask, setSelectedTask] = useState<TaskDetails | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [reviewComments, setReviewComments] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/login";
    }
  }, [isAuthenticated, isLoading]);

  // Fetch pending tasks for review
  const { data: pendingTasks = [], isLoading: tasksLoading } = useQuery<PendingTask[]>({
    queryKey: ["/api/admin/pending-tasks"],
    enabled: !isLoading && isAuthenticated,
  });

  // Fetch task details when selected
  const { data: taskDetails, isLoading: detailsLoading } = useQuery<TaskDetails>({
    queryKey: ["/api/admin/tasks", selectedTask?.id, "review"],
    enabled: !!selectedTask?.id,
  });

  // Approve task mutation
  const approveMutation = useMutation({
    mutationFn: async ({ taskId, comments }: { taskId: string; comments?: string }) => {
      const response = await fetch(`/api/admin/tasks/${taskId}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewComments: comments }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao aprovar tarefa");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-tasks"] });
      setIsDetailsOpen(false);
      setSelectedTask(null);
      setReviewComments("");
      setIsApproving(false);
      toast({ title: "Tarefa aprovada com sucesso!" });
    },
    onError: (error: Error) => {
      setIsApproving(false);
      toast({ 
        title: "Erro ao aprovar tarefa", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Reject task mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ taskId, comments }: { taskId: string; comments: string }) => {
      const response = await fetch(`/api/admin/tasks/${taskId}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewComments: comments }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao rejeitar tarefa");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-tasks"] });
      setIsDetailsOpen(false);
      setSelectedTask(null);
      setReviewComments("");
      setIsRejecting(false);
      toast({ title: "Tarefa rejeitada com sucesso!" });
    },
    onError: (error: Error) => {
      setIsRejecting(false);
      toast({ 
        title: "Erro ao rejeitar tarefa", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleViewDetails = async (task: PendingTask) => {
    setSelectedTask(task as TaskDetails);
    setIsDetailsOpen(true);
  };

  const handleApprove = () => {
    if (selectedTask) {
      setIsApproving(true);
      approveMutation.mutate({ 
        taskId: selectedTask.id, 
        comments: reviewComments 
      });
    }
  };

  const handleReject = () => {
    if (!selectedTask) return;
    
    if (!reviewComments.trim()) {
      toast({ 
        title: "Comentários obrigatórios", 
        description: "É necessário informar o motivo da rejeição",
        variant: "destructive" 
      });
      return;
    }
    
    setIsRejecting(true);
    rejectMutation.mutate({ 
      taskId: selectedTask.id, 
      comments: reviewComments 
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'status-error';
      case 'medium':
        return 'status-warning';
      case 'low':
        return 'status-info';
      default:
        return 'bg-gray-500';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'Alta';
      case 'medium':
        return 'Média';
      case 'low':
        return 'Baixa';
      default:
        return 'Normal';
    }
  };

  const filteredTasks = pendingTasks.filter((task: PendingTask) => {
    const matchesSearch = 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.companyName && task.companyName.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Revisão DPO</h1>
          <p className="text-muted-foreground mt-2">
            Revisar e validar tarefas de compliance submetidas pelos assinantes
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes de Revisão</CardTitle>
            <Clock className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTasks.length}</div>
            <p className="text-xs text-muted-foreground">
              {pendingTasks.length === 1 ? 'tarefa aguardando' : 'tarefas aguardando'} validação
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prioridade Alta</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingTasks.filter(t => t.priority === 'high').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {pendingTasks.filter(t => t.priority === 'high').length === 1 ? 'tarefa crítica' : 'tarefas críticas'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empresas Ativas</CardTitle>
            <Building className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(pendingTasks.map(t => t.userId)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              {new Set(pendingTasks.map(t => t.userId)).size === 1 ? 'empresa com' : 'empresas com'} tarefas pendentes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por título, email ou empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="search-tasks"
              />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {tasksLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredTasks.length > 0 ? (
            <div className="space-y-4">
              {filteredTasks.map((task: PendingTask) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-semibold">{task.title}</h3>
                      <Badge className={getPriorityColor(task.priority)}>
                        {getPriorityText(task.priority)}
                      </Badge>
                      {task.category && (
                        <Badge variant="outline">
                          {task.category}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <User className="h-4 w-4" />
                        <span>{task.userFirstName} {task.userLastName}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span>{task.userEmail}</span>
                      </div>
                      {task.companyName && (
                        <div className="flex items-center space-x-1">
                          <Building className="h-4 w-4" />
                          <span>{task.companyName}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(new Date(task.submittedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    </div>

                    {task.userComments && (
                      <div className="flex items-start space-x-2 mt-2">
                        <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground italic">
                          "{task.userComments.substring(0, 100)}..."
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <Button
                    onClick={() => handleViewDetails(task)}
                    variant="outline"
                    size="sm"
                    data-testid={`view-task-${task.id}`}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Detalhes
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-xl font-semibold text-muted-foreground mb-2">
                {searchTerm ? "Nenhuma tarefa encontrada" : "Nenhuma tarefa pendente"}
              </p>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? "Tente ajustar os termos de busca"
                  : "Não há tarefas aguardando revisão no momento"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Revisão de Tarefa de Compliance</DialogTitle>
            <DialogDescription>
              Revise todos os detalhes antes de aprovar ou rejeitar a tarefa
            </DialogDescription>
          </DialogHeader>
          
          {detailsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : taskDetails ? (
            <div className="space-y-6">
              {/* Task Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Título da Tarefa</Label>
                  <p className="mt-1 font-semibold">{taskDetails.title}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Categoria</Label>
                  <p className="mt-1">{taskDetails.category}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Prioridade</Label>
                  <Badge className={getPriorityColor(taskDetails.priority)}>
                    {getPriorityText(taskDetails.priority)}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Data de Submissão</Label>
                  <p className="mt-1">
                    {format(new Date(taskDetails.submittedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>

              {/* User Info */}
              <div>
                <Label className="text-sm font-medium">Informações do Usuário</Label>
                <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-2">
                  <p><strong>Nome:</strong> {taskDetails.userFirstName} {taskDetails.userLastName}</p>
                  <p><strong>Email:</strong> {taskDetails.userEmail}</p>
                  {taskDetails.companyName && (
                    <p><strong>Empresa:</strong> {taskDetails.companyName}</p>
                  )}
                  {taskDetails.companyEmail && (
                    <p><strong>Email da Empresa:</strong> {taskDetails.companyEmail}</p>
                  )}
                  {taskDetails.companyPhone && (
                    <p><strong>Telefone:</strong> {taskDetails.companyPhone}</p>
                  )}
                </div>
              </div>

              {/* Task Description */}
              <div>
                <Label className="text-sm font-medium">Descrição da Tarefa</Label>
                <p className="mt-2 p-3 bg-muted/50 rounded-lg">{taskDetails.description}</p>
              </div>

              {/* Steps */}
              {taskDetails.steps && taskDetails.steps.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Passos da Tarefa</Label>
                  <div className="mt-2 space-y-2">
                    {taskDetails.steps.map((step: any, index: number) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
                        <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <p className="flex-1">{typeof step === 'string' ? step : step.description || step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* User Comments */}
              {taskDetails.userComments && (
                <div>
                  <Label className="text-sm font-medium">Comentários do Usuário</Label>
                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="italic">"{taskDetails.userComments}"</p>
                  </div>
                </div>
              )}

              {/* Attachments */}
              {taskDetails.attachments && taskDetails.attachments.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Documentos Anexados</Label>
                  <div className="mt-2 space-y-2">
                    {taskDetails.attachments.map((attachment: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{attachment.filename || `Documento ${index + 1}`}</p>
                            <p className="text-sm text-muted-foreground">
                              {attachment.size ? `${(attachment.size / 1024).toFixed(1)} KB` : 'Tamanho desconhecido'}
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Baixar
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Review Comments */}
              <div>
                <Label htmlFor="review-comments" className="text-sm font-medium">
                  Comentários da Revisão
                </Label>
                <Textarea
                  id="review-comments"
                  placeholder="Adicione comentários sobre a revisão (opcional para aprovação, obrigatório para rejeição)..."
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  className="mt-2"
                  rows={4}
                  data-testid="review-comments"
                />
              </div>
            </div>
          ) : (
            <p>Erro ao carregar detalhes da tarefa</p>
          )}
          
          <DialogFooter className="space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setIsDetailsOpen(false)}
              disabled={isApproving || isRejecting}
            >
              Cancelar
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive"
                  disabled={isApproving || isRejecting}
                  data-testid="reject-task-button"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {isRejecting ? "Rejeitando..." : "Rejeitar"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Rejeitar Tarefa</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza de que deseja rejeitar esta tarefa? Esta ação não pode ser desfeita e o usuário será notificado.
                    {!reviewComments.trim() && (
                      <span className="block mt-2 text-red-600 font-medium">
                        Atenção: Comentários são obrigatórios para rejeição.
                      </span>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleReject}
                    className="bg-red-600 hover:bg-red-700"
                    data-testid="confirm-reject-task"
                  >
                    Confirmar Rejeição
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button 
              onClick={handleApprove}
              disabled={isApproving || isRejecting}
              data-testid="approve-task-button"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {isApproving ? "Aprovando..." : "Aprovar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}