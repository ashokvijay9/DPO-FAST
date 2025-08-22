import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { 
  Upload, 
  Search, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Eye,
  Download,
  Trash2,
  MoreHorizontal,
  Plus
} from "lucide-react";
import DocumentUploadModal from "@/components/DocumentUploadModal";
import PlanLimitModal from "@/components/PlanLimitModal";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Documents() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitError, setLimitError] = useState<any>(null);

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

  const { data: documents, isLoading: isDocumentsLoading } = useQuery({
    queryKey: ["/api/documents"],
    enabled: isAuthenticated,
  });

  const { data: planLimits } = useQuery({
    queryKey: ["/api/plan/limits"],
    enabled: isAuthenticated,
  });

  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      await apiRequest("DELETE", `/api/documents/${documentId}`);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Documento excluído com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
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
        description: "Falha ao excluir documento",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const handleDeleteDocument = (documentId: string) => {
    if (confirm("Tem certeza que deseja excluir este documento?")) {
      deleteMutation.mutate(documentId);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    if (fileType.includes('word') || fileType.includes('docx')) return <FileText className="h-5 w-5 text-blue-500" />;
    if (fileType.includes('image')) return <FileText className="h-5 w-5 text-green-500" />;
    return <FileText className="h-5 w-5 text-gray-500" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'valid':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Válido</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Revisão</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expirado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getCategoryBadge = (category: string) => {
    const categoryMap = {
      'politicas': 'Políticas',
      'termos': 'Termos',
      'relatorios': 'Relatórios',
      'contratos': 'Contratos',
      'outros': 'Outros',
    };
    
    const colorMap = {
      'politicas': 'bg-blue-100 text-blue-800',
      'termos': 'bg-purple-100 text-purple-800',
      'relatorios': 'bg-green-100 text-green-800',
      'contratos': 'bg-orange-100 text-orange-800',
      'outros': 'bg-gray-100 text-gray-800',
    };

    return (
      <Badge className={colorMap[category as keyof typeof colorMap] || 'bg-gray-100 text-gray-800'}>
        {categoryMap[category as keyof typeof categoryMap] || category}
      </Badge>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredDocuments = (documents as any)?.filter((doc: any) =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.category.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Calculate stats
  const totalDocuments = (documents as any)?.length || 0;
  const validDocuments = (documents as any)?.filter((d: any) => d.status === 'valid').length || 0;
  const pendingDocuments = (documents as any)?.filter((d: any) => d.status === 'pending').length || 0;
  const expiredDocuments = (documents as any)?.filter((d: any) => d.status === 'expired').length || 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Gerenciamento de Documentos</h1>
            <p className="text-muted-foreground">
              Organize e monitore todos os documentos relacionados à conformidade LGPD
            </p>
          </div>
          <Button onClick={() => {
            // Check document limits before opening upload modal
            const currentCount = (documents as any)?.length || 0;
            const maxAllowed = (planLimits as any)?.limits?.maxDocuments;
            
            if (maxAllowed !== -1 && currentCount >= maxAllowed) {
              setLimitError({
                currentCount,
                maxAllowed,
                plan: (planLimits as any)?.plan || 'free'
              });
              setShowLimitModal(true);
            } else {
              setIsUploadModalOpen(true);
            }
          }} data-testid="button-upload-document">
            <Plus className="mr-2 h-4 w-4" />
            Upload Documento
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <FileText className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="text-2xl font-bold" data-testid="text-total-documents">{totalDocuments}</h3>
              <p className="text-sm text-muted-foreground">Total de Documentos</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <h3 className="text-2xl font-bold" data-testid="text-valid-documents">{validDocuments}</h3>
              <p className="text-sm text-muted-foreground">Documentos Válidos</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <h3 className="text-2xl font-bold" data-testid="text-pending-documents">{pendingDocuments}</h3>
              <p className="text-sm text-muted-foreground">Pendentes de Revisão</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <h3 className="text-2xl font-bold" data-testid="text-expired-documents">{expiredDocuments}</h3>
              <p className="text-sm text-muted-foreground">Documentos Expirados</p>
            </CardContent>
          </Card>
        </div>

        {/* Documents Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle>Meus Documentos</CardTitle>
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar documentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-documents"
                />
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {isDocumentsLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-muted-foreground">Carregando documentos...</p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>
                  {(documents as any)?.length === 0 
                    ? "Nenhum documento encontrado. Faça o upload do seu primeiro documento!" 
                    : "Nenhum documento corresponde à sua busca."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-medium">Nome do Documento</th>
                      <th className="text-left p-4 font-medium">Categoria</th>
                      <th className="text-left p-4 font-medium">Data de Upload</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Tamanho</th>
                      <th className="text-left p-4 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredDocuments.map((document: any) => (
                      <tr key={document.id} className="hover:bg-muted/25" data-testid={`document-row-${document.id}`}>
                        <td className="p-4">
                          <div className="flex items-center">
                            {getFileIcon(document.fileType)}
                            <div className="ml-3">
                              <div className="font-medium">{document.name}</div>
                              <div className="text-sm text-muted-foreground">{document.fileName}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          {getCategoryBadge(document.category)}
                        </td>
                        <td className="p-4 text-sm">
                          {new Date(document.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-4">
                          {getStatusBadge(document.status)}
                        </td>
                        <td className="p-4 text-sm">
                          {formatFileSize(document.fileSize)}
                        </td>
                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0" data-testid={`button-actions-${document.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem data-testid={`action-view-${document.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                Visualizar
                              </DropdownMenuItem>
                              <DropdownMenuItem data-testid={`action-download-${document.id}`}>
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDeleteDocument(document.id)}
                                data-testid={`action-delete-${document.id}`}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <DocumentUploadModal 
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
        />

        <PlanLimitModal
          isOpen={showLimitModal}
          onClose={() => setShowLimitModal(false)}
          limitType="documents"
          currentPlan={limitError?.plan || 'free'}
          currentCount={limitError?.currentCount}
          maxAllowed={limitError?.maxAllowed}
        />
      </div>
    </div>
  );
}
