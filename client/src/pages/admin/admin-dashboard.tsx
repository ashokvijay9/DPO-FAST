import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  FileText, 
  ClipboardCheck, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function AdminDashboard() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

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

  const { data: adminStats, isLoading: isStatsLoading } = useQuery({
    queryKey: ["/api/admin/stats"],
    enabled: isAuthenticated,
  });

  const { data: recentDocuments } = useQuery({
    queryKey: ["/api/admin/recent-documents"],
    enabled: isAuthenticated,
  });

  const { data: pendingDocuments } = useQuery({
    queryKey: ["/api/admin/pending-documents"],
    enabled: isAuthenticated,
  });

  if (isLoading || isStatsLoading) {
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
            DPO Fast - Painel Administrativo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gerencie assinantes, documentos e relatórios de conformidade LGPD
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <Badge variant="secondary" className="text-xs">
                  Total
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {adminStats?.totalSubscribers || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Assinantes Ativos
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                  <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <Badge variant="outline" className="text-orange-600 border-orange-600">
                  Pendente
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {adminStats?.pendingDocuments || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Documentos Pendentes
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  Aprovados
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {adminStats?.approvedDocuments || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Documentos Aprovados
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                  <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <Badge variant="secondary" className="text-xs">
                  Este mês
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {adminStats?.reportsGenerated || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Relatórios Gerados
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Recent Documents */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-lg">
                <FileText className="h-5 w-5 mr-3 text-gray-600 dark:text-gray-400" />
                Documentos Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentDocuments && recentDocuments.length > 0 ? (
                <div className="space-y-4">
                  {recentDocuments.slice(0, 5).map((doc: any) => (
                    <div 
                      key={doc.id} 
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900 dark:text-white">
                          {doc.name}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {doc.userName} • {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <Badge 
                        variant={doc.status === 'pending' ? 'outline' : 'secondary'}
                        className={doc.status === 'pending' ? 'text-orange-600 border-orange-600' : ''}
                      >
                        {doc.status === 'pending' ? 'Pendente' : 'Válido'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Nenhum documento encontrado
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Actions */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-lg">
                <AlertCircle className="h-5 w-5 mr-3 text-orange-600" />
                Ações Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingDocuments && pendingDocuments.length > 0 ? (
                <div className="space-y-4">
                  {pendingDocuments.slice(0, 5).map((doc: any) => (
                    <div 
                      key={doc.id} 
                      className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900 dark:text-white">
                          {doc.name}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {doc.userName} • Enviado em {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-orange-600 border-orange-600">
                          Revisar
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Todas as ações foram concluídas!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}