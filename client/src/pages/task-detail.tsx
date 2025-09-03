import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { DocumentViewer } from "@/components/DocumentViewer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ArrowLeft, 
  Upload, 
  File, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Eye,
  Send,
  FileText,
  X
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface TaskDocument {
  id: string;
  name: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "completed" | "in_review" | "approved" | "rejected";
  dueDate?: string;
  steps?: string[];
  attachedDocuments?: TaskDocument[];
  userComments?: string;
  adminComments?: string;
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  progress: number;
  lgpdRequirement?: string;
  suggestedDurationDays?: number;
}

export default function TaskDetailPage() {
  const [, params] = useRoute("/tasks/:id");
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [userComments, setUserComments] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const taskId = params?.id;

  const { data: task, isLoading } = useQuery<Task>({
    queryKey: ['/api/compliance-tasks', taskId],
    enabled: !!taskId,
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('documents', file);
      });

      const response = await fetch(`/api/compliance-tasks/${taskId}/documents`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to upload documents");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/compliance-tasks', taskId] });
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      toast({
        title: "Sucesso!",
        description: "Documentos anexados com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/compliance-tasks/${taskId}/submit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userComments }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to submit task");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/compliance-tasks', taskId] });
      setUserComments("");
      setIsSubmitting(false);
      toast({
        title: "Sucesso!",
        description: "Tarefa enviada para validação com sucesso.",
      });
    },
    onError: (error: Error) => {
      setIsSubmitting(false);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prevFiles => [...prevFiles, ...files]);
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    if (selectedFiles.length > 0) {
      uploadMutation.mutate(selectedFiles);
    }
  };

  const handleSubmitForValidation = () => {
    setIsSubmitting(true);
    submitMutation.mutate();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'in_review':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'rejected':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'in_progress': return 'Em Progresso';
      case 'in_review': return 'Em Revisão';
      case 'approved': return 'Aprovada';
      case 'rejected': return 'Rejeitada';
      case 'completed': return 'Concluída';
      default: return 'Desconhecido';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const canEditTask = task && !['in_review', 'approved', 'completed'].includes(task.status);
  const canSubmitTask = task && task.attachedDocuments && task.attachedDocuments.length > 0 && canEditTask;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium text-foreground mb-2">Tarefa não encontrada</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              A tarefa solicitada não foi encontrada ou você não tem permissão para visualizá-la.
            </p>
            <Button onClick={() => navigate("/tasks")}>
              Voltar para Tarefas
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl" data-testid="task-detail-page">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate("/tasks")}
          data-testid="back-to-tasks"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Tarefas
        </Button>
      </div>

      {/* Task Overview */}
      <Card className="mb-6" data-testid="task-overview">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon(task.status)}
              <div>
                <CardTitle className="text-2xl">{task.title}</CardTitle>
                <CardDescription className="mt-2">{task.description}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`${getPriorityColor(task.priority)} text-white`}>
                {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
              </Badge>
              <Badge variant="outline">
                {getStatusText(task.status)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label className="text-sm font-medium">Categoria</Label>
              <p className="text-sm text-muted-foreground">{task.category}</p>
            </div>
            {task.lgpdRequirement && (
              <div>
                <Label className="text-sm font-medium">Requisito LGPD</Label>
                <p className="text-sm text-muted-foreground">{task.lgpdRequirement}</p>
              </div>
            )}
            {task.dueDate && (
              <div>
                <Label className="text-sm font-medium">Data Limite</Label>
                <p className="text-sm text-muted-foreground">
                  {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}
            {task.suggestedDurationDays && (
              <div>
                <Label className="text-sm font-medium">Duração Sugerida</Label>
                <p className="text-sm text-muted-foreground">{task.suggestedDurationDays} dias</p>
              </div>
            )}
          </div>
          
          <div className="mb-4">
            <Label className="text-sm font-medium">Progresso</Label>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={task.progress} className="flex-1" />
              <span className="text-sm font-medium">{task.progress}%</span>
            </div>
          </div>

          {task.steps && task.steps.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-2 block">Passos para Conclusão</Label>
              <div className="space-y-2">
                {task.steps.map((step, index) => (
                  <div key={index} className="flex items-start gap-2 p-2 bg-muted/50 rounded text-sm">
                    <span className="flex-shrink-0 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Messages */}
      {task.status === 'rejected' && task.rejectionReason && (
        <Alert className="mb-6 border-red-200 bg-red-50" data-testid="rejection-alert">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Tarefa rejeitada:</strong> {task.rejectionReason}
          </AlertDescription>
        </Alert>
      )}

      {task.status === 'in_review' && (
        <Alert className="mb-6 border-blue-200 bg-blue-50" data-testid="review-alert">
          <Clock className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Esta tarefa está em revisão pelo administrador. Aguarde a aprovação.
          </AlertDescription>
        </Alert>
      )}

      {task.status === 'approved' && (
        <Alert className="mb-6 border-green-200 bg-green-50" data-testid="approved-alert">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Tarefa aprovada! Parabéns por completar esta etapa de compliance.
          </AlertDescription>
        </Alert>
      )}

      {/* Document Management */}
      <Card className="mb-6" data-testid="document-management">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documentos Anexados
          </CardTitle>
          <CardDescription>
            Anexe documentos que comprovem a implementação desta tarefa de compliance.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Current Documents */}
          {task.attachedDocuments && task.attachedDocuments.length > 0 && (
            <div className="mb-4">
              <Label className="text-sm font-medium mb-2 block">Documentos Atuais</Label>
              <div className="space-y-2">
                {task.attachedDocuments.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <File className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(doc.fileSize)} • {new Date(doc.uploadedAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <DocumentViewer
                      documentId={doc.id}
                      fileName={doc.fileName}
                      fileType={doc.fileType}
                      trigger={
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      }
                    />
                  </div>
                ))}
              </div>
              <Separator className="my-4" />
            </div>
          )}

          {/* Upload New Documents */}
          {canEditTask && (
            <div>
              <Label className="text-sm font-medium mb-2 block">Anexar Novos Documentos</Label>
              
              <div className="space-y-4">
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.docx,.jpg,.jpeg,.png"
                    onChange={handleFileSelect}
                    className="hidden"
                    data-testid="file-input"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                    data-testid="select-files-button"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Selecionar Arquivos
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    Formatos aceitos: PDF, DOCX, JPG, PNG (máx. 10MB por arquivo)
                  </p>
                </div>

                {/* Selected Files */}
                {selectedFiles.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Arquivos Selecionados</Label>
                    <div className="space-y-2">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center gap-2">
                            <File className="h-4 w-4" />
                            <span className="text-sm">{file.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({formatFileSize(file.size)})
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSelectedFile(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button
                      onClick={handleUpload}
                      disabled={uploadMutation.isPending}
                      className="mt-2"
                      data-testid="upload-files-button"
                    >
                      {uploadMutation.isPending ? "Enviando..." : "Anexar Documentos"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comments and Submission */}
      {canEditTask && (
        <Card data-testid="submission-section">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Enviar para Validação
            </CardTitle>
            <CardDescription>
              Adicione comentários e envie esta tarefa para revisão do administrador.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="comments" className="text-sm font-medium">
                  Comentários (opcional)
                </Label>
                <Textarea
                  id="comments"
                  placeholder="Descreva as ações realizadas, dificuldades encontradas ou outras informações relevantes..."
                  value={userComments}
                  onChange={(e) => setUserComments(e.target.value)}
                  className="mt-1"
                  data-testid="comments-textarea"
                />
              </div>
              
              <Button
                onClick={handleSubmitForValidation}
                disabled={!canSubmitTask || isSubmitting}
                className="w-full"
                data-testid="submit-for-validation-button"
              >
                {isSubmitting ? "Enviando..." : "Enviar para Validação"}
              </Button>
              
              {!canSubmitTask && task.attachedDocuments?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center">
                  É necessário anexar pelo menos um documento antes de enviar para validação.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comments History */}
      {(task.userComments || task.adminComments) && (
        <Card className="mt-6" data-testid="comments-history">
          <CardHeader>
            <CardTitle>Histórico de Comentários</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {task.userComments && (
              <div>
                <Label className="text-sm font-medium">Comentários do Usuário</Label>
                <p className="text-sm text-muted-foreground mt-1 p-3 bg-muted/50 rounded">
                  {task.userComments}
                </p>
              </div>
            )}
            {task.adminComments && (
              <div>
                <Label className="text-sm font-medium">Comentários do Administrador</Label>
                <p className="text-sm text-muted-foreground mt-1 p-3 bg-muted/50 rounded">
                  {task.adminComments}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}