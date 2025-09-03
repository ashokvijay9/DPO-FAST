import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  FileText, 
  Search, 
  Eye, 
  Check, 
  X, 
  Download,
  Calendar,
  User,
  Building,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Document {
  id: string;
  name: string;
  category: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  status: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    company: string;
  };
  companyProfile?: {
    companyName: string;
  };
}

export default function AdminDocuments() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("pending");
  const [filterCategory, setFilterCategory] = useState("all");
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Acesso Negado",
        description: "Você precisa estar logado para acessar o painel admin.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: documents, isLoading: isDocumentsLoading } = useQuery({
    queryKey: ["/api/admin/documents"],
    enabled: isAuthenticated,
  });

  const approveDocumentMutation = useMutation({
    mutationFn: async (documentId: string) => {
      return await apiRequest(`/api/admin/documents/${documentId}/approve`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Documento Aprovado",
        description: "O documento foi aprovado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível aprovar o documento.",
        variant: "destructive",
      });
    },
  });

  const rejectDocumentMutation = useMutation({
    mutationFn: async ({ documentId, reason }: { documentId: string; reason: string }) => {
      return await apiRequest(`/api/admin/documents/${documentId}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Documento Rejeitado",
        description: "O documento foi rejeitado e o usuário será notificado.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setShowRejectDialog(false);
      setRejectReason("");
      setSelectedDocument(null);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível rejeitar o documento.",
        variant: "destructive",
      });
    },
  });

  const filteredDocuments = documents?.filter((doc: Document) => {
    const matchesSearch = 
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.companyProfile?.companyName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || doc.status === filterStatus;
    const matchesCategory = filterCategory === "all" || doc.category === filterCategory;
    
    return matchesSearch && matchesStatus && matchesCategory;
  }) || [];

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'pending': { label: 'Pendente', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', icon: AlertCircle },
      'valid': { label: 'Aprovado', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
      'rejected': { label: 'Rejeitado', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: X },
      'expired': { label: 'Expirado', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300', icon: AlertCircle },
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.pending;
    const Icon = statusInfo.icon;
    
    return (
      <Badge className={statusInfo.color}>
        <Icon className="h-3 w-3 mr-1" />
        {statusInfo.label}
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

  const handleApprove = (documentId: string) => {
    approveDocumentMutation.mutate(documentId);
  };

  const handleReject = (document: Document) => {
    setSelectedDocument(document);
    setShowRejectDialog(true);
  };

  const handleRejectConfirm = () => {
    if (selectedDocument && rejectReason.trim()) {
      rejectDocumentMutation.mutate({
        documentId: selectedDocument.id,
        reason: rejectReason.trim()
      });
    }
  };

  if (isLoading || isDocumentsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Documentos DPO Fast
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Revise e aprove documentos enviados pelos assinantes
          </p>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nome do documento, usuário ou empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-documents"
                />
              </div>
              
              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                data-testid="select-filter-status"
              >
                <option value="all">Todos os Status</option>
                <option value="pending">Pendentes</option>
                <option value="valid">Aprovados</option>
                <option value="rejected">Rejeitados</option>
                <option value="expired">Expirados</option>
              </select>

              {/* Category Filter */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                data-testid="select-filter-category"
              >
                <option value="all">Todas as Categorias</option>
                <option value="privacy_policy">Política de Privacidade</option>
                <option value="data_processing">Registro de Atividades</option>
                <option value="consent_form">Termo de Consentimento</option>
                <option value="incident_plan">Plano de Resposta</option>
                <option value="security_policy">Política de Segurança</option>
                <option value="other">Outros</option>
              </select>
            </div>

            <div className="mt-4 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>{filteredDocuments.length} documentos encontrados</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents Table */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-lg">
              <FileText className="h-5 w-5 mr-3 text-gray-600 dark:text-gray-400" />
              Lista de Documentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredDocuments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Documento</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Assinante</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Categoria</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Enviado em</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocuments.map((document: Document) => (
                      <tr 
                        key={document.id} 
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        data-testid={`document-row-${document.id}`}
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                              <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {document.name}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {document.fileName} • {formatFileSize(document.fileSize)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {document.user.firstName} {document.user.lastName}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                <Building className="h-3 w-3" />
                                {document.companyProfile?.companyName || document.user.company || 'N/A'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <Badge variant="outline">
                            {document.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          {getStatusBadge(document.status)}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Calendar className="h-4 w-4" />
                            {new Date(document.createdAt).toLocaleDateString('pt-BR')}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-1"
                              onClick={() => window.open(document.fileUrl, '_blank')}
                              data-testid={`button-view-document-${document.id}`}
                            >
                              <Eye className="h-3 w-3" />
                              Ver
                            </Button>
                            
                            {document.status === 'pending' && (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="flex items-center gap-1 bg-green-600 hover:bg-green-700"
                                  onClick={() => handleApprove(document.id)}
                                  disabled={approveDocumentMutation.isPending}
                                  data-testid={`button-approve-document-${document.id}`}
                                >
                                  <Check className="h-3 w-3" />
                                  Aprovar
                                </Button>
                                
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="flex items-center gap-1"
                                  onClick={() => handleReject(document)}
                                  disabled={rejectDocumentMutation.isPending}
                                  data-testid={`button-reject-document-${document.id}`}
                                >
                                  <X className="h-3 w-3" />
                                  Rejeitar
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Nenhum documento encontrado
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {searchTerm || filterStatus !== "all" || filterCategory !== "all"
                    ? "Tente ajustar os filtros de busca"
                    : "Não há documentos para revisar"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Rejeitar Documento</DialogTitle>
              <DialogDescription>
                Informe o motivo da rejeição. O usuário será notificado por email.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedDocument && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="font-medium text-sm">{selectedDocument.name}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {selectedDocument.user.firstName} {selectedDocument.user.lastName}
                  </p>
                </div>
              )}
              <Textarea
                placeholder="Descreva o motivo da rejeição (ex: documento incompleto, formato incorreto, etc.)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                data-testid="textarea-reject-reason"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectReason("");
                  setSelectedDocument(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectConfirm}
                disabled={!rejectReason.trim() || rejectDocumentMutation.isPending}
                data-testid="button-confirm-reject"
              >
                {rejectDocumentMutation.isPending ? "Rejeitando..." : "Rejeitar Documento"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}