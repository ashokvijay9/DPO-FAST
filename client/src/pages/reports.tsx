import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { 
  FileBarChart, 
  Download, 
  Trash2, 
  Calendar,
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus
} from "lucide-react";
import { useLocation } from "wouter";

export default function Reports() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [generatingReport, setGeneratingReport] = useState(false);

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

  // Fetch existing reports
  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ["/api/reports"],
    enabled: isAuthenticated,
  });

  // Check if user has questionnaire response
  const { data: questionnaireResponse } = useQuery({
    queryKey: ["/api/questionnaire/response"],
    enabled: isAuthenticated,
  });

  // Generate report mutation
  const generateReportMutation = useMutation({
    mutationFn: async () => {
      setGeneratingReport(true);
      const response = await apiRequest("POST", "/api/reports/generate", {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Relatório gerado com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      setGeneratingReport(false);
    },
    onError: (error) => {
      setGeneratingReport(false);
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
        description: error instanceof Error ? error.message : "Falha ao gerar relatório",
        variant: "destructive",
      });
    },
  });

  // Delete report mutation
  const deleteReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      await apiRequest("DELETE", `/api/reports/${reportId}`, {});
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

  const handleDownload = (reportId: string, fileName: string) => {
    const downloadUrl = `/api/reports/${reportId}/download`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
    if (score >= 60) return <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
    return <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const hasQuestionnaireResponse = questionnaireResponse && (questionnaireResponse as any)?.answer;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4 pt-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4">
            <FileBarChart className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Relatórios de Conformidade
          </h1>
          <p className="text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Gere relatórios detalhados sobre sua conformidade com a LGPD baseados nas suas respostas do questionário.
          </p>
        </div>

        {/* Generate Report Section */}
        <Card className="border-0 shadow-2xl bg-white/80 dark:bg-slate-800/90 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Gerar Novo Relatório
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {hasQuestionnaireResponse ? (
                  <div className="space-y-2">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      ✅ Questionário preenchido! Você pode gerar seu relatório de conformidade.
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <TrendingUp className="h-3 w-3" />
                      <span>Score atual: {(questionnaireResponse as any)?.complianceScore || 0}%</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      ⚠️ Para gerar um relatório, você precisa primeiro responder o questionário LGPD.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => navigate("/questionnaire")}
                      data-testid="button-go-to-questionnaire"
                    >
                      Ir para Questionário
                    </Button>
                  </div>
                )}
              </div>
              <Button 
                onClick={() => generateReportMutation.mutate()}
                disabled={!hasQuestionnaireResponse || generatingReport}
                className="gap-2"
                data-testid="button-generate-report"
              >
                {generatingReport ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <FileBarChart className="h-4 w-4" />
                    Gerar Relatório
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Reports List */}
        <Card className="border-0 shadow-2xl bg-white/80 dark:bg-slate-800/90 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Relatórios Anteriores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reportsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (reports as any)?.length > 0 ? (
              <div className="space-y-4">
                {(reports as any).map((report: any) => (
                  <Card key={report.id} className="border border-slate-200 dark:border-slate-700" data-testid={`report-item-${report.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <FileBarChart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            <h3 className="font-medium text-slate-900 dark:text-white">
                              {report.title}
                            </h3>
                            <Badge variant="outline" className="text-xs">
                              {report.reportType === 'compliance_summary' ? 'Resumo' : 'Completo'}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{new Date(report.createdAt).toLocaleDateString('pt-BR')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {getScoreIcon(report.complianceScore)}
                              <span className={getScoreColor(report.complianceScore)}>
                                {report.complianceScore}% de conformidade
                              </span>
                            </div>
                            <span>{formatFileSize(report.fileSize)}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleDownload(report.id, report.fileName)}
                            className="gap-1"
                            data-testid={`button-download-${report.id}`}
                          >
                            <Download className="h-3 w-3" />
                            Download
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => deleteReportMutation.mutate(report.id)}
                            disabled={deleteReportMutation.isPending}
                            className="gap-1 text-red-600 hover:text-red-700"
                            data-testid={`button-delete-${report.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                            Excluir
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <FileBarChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum relatório gerado ainda.</p>
                <p className="text-sm mt-1">Clique em "Gerar Relatório" para criar seu primeiro relatório.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}