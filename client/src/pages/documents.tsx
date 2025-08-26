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
  Plus,
  FileBarChart,
  Filter
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
  const [activeTab, setActiveTab] = useState<'documents' | 'reports'>('documents');

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

  const { data: reports, isLoading: isReportsLoading } = useQuery({
    queryKey: ["/api/reports"],
    enabled: isAuthenticated,
  });

  const deleteReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      await apiRequest("DELETE", `/api/reports/${reportId}`);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Relatório excluído com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
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
        description: "Falha ao excluir relatório",
        variant: "destructive",
      });
    },
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

  const handleDeleteReport = (reportId: string) => {
    if (confirm("Tem certeza que deseja excluir este relatório?")) {
      deleteReportMutation.mutate(reportId);
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

  const filteredReports = (reports as any)?.filter((report: any) =>
    report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.reportType.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Calculate stats
  const totalDocuments = (documents as any)?.length || 0;
  const validDocuments = (documents as any)?.filter((d: any) => d.status === 'valid').length || 0;
  const pendingDocuments = (documents as any)?.filter((d: any) => d.status === 'pending').length || 0;
  const expiredDocuments = (documents as any)?.filter((d: any) => d.status === 'expired').length || 0;
  
  const totalReports = (reports as any)?.length || 0;

  return (
    <div className="min-h-screen hero-gradient">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Documentos & Relatórios</h1>
            <p className="text-muted-foreground">
              Organize documentos e acesse relatórios de conformidade LGPD
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

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('documents')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'documents'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-primary hover:border-gray-300'
              }`}
              data-testid="tab-documents"
            >
              <FileText className="inline-block h-4 w-4 mr-2" />
              Documentos ({totalDocuments})
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'reports'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-primary hover:border-gray-300'
              }`}
              data-testid="tab-reports"
            >
              <FileBarChart className="inline-block h-4 w-4 mr-2" />
              Relatórios ({totalReports})
            </button>
          </nav>
        </div>

        {/* Stats Cards */}
        {activeTab === 'documents' && (
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
        )}

        {/* Documents Section */}
        {activeTab === 'documents' && (
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
        )}

        {/* Reports Section */}
        {activeTab === 'reports' && (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle>Relatórios de Conformidade</CardTitle>
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar relatórios..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-reports"
                  />
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              {isReportsLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-muted-foreground">Carregando relatórios...</p>
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <FileBarChart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>
                    {(reports as any)?.length === 0 
                      ? "Nenhum relatório gerado ainda. Gere seu primeiro relatório no dashboard!" 
                      : "Nenhum relatório corresponde à sua busca."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-4 font-medium">Título</th>
                        <th className="text-left p-4 font-medium">Tipo</th>
                        <th className="text-left p-4 font-medium">Score</th>
                        <th className="text-left p-4 font-medium">Data</th>
                        <th className="text-left p-4 font-medium">Tamanho</th>
                        <th className="text-left p-4 font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReports.map((report: any) => (
                        <tr key={report.id} className="border-t hover:bg-muted/50">
                          <td className="p-4">
                            <div className="flex items-center">
                              <FileBarChart className="h-5 w-5 text-blue-500 mr-3" />
                              <span className="font-medium">{report.title}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge className="bg-blue-100 text-blue-800">
                              {report.reportType === 'compliance_summary' ? 'Conformidade' : report.reportType}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center">
                              <div className={`w-3 h-3 rounded-full mr-2 ${
                                report.complianceScore >= 80 ? 'bg-green-500' :
                                report.complianceScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                              }`} />
                              {report.complianceScore}%
                            </div>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {new Date(report.createdAt).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="p-4 text-sm">
                            {formatFileSize(report.fileSize)}
                          </td>
                          <td className="p-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0" data-testid={`button-actions-${report.id}`}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => window.open(`/api/reports/${report.id}/download`, '_blank')}
                                  data-testid={`action-download-${report.id}`}
                                >
                                  <Download className="mr-2 h-4 w-4" />
                                  Download
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteReport(report.id)}
                                  data-testid={`action-delete-${report.id}`}
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
        )}

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
