import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  BarChart3, 
  Search, 
  Download, 
  Calendar,
  User,
  Building,
  FileBarChart,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface Report {
  id: string;
  title: string;
  reportType: string;
  complianceScore: number;
  fileName: string;
  fileSize: number;
  fileUrl: string;
  status: string;
  generatedAt: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    company: string;
  };
  companyProfile?: {
    companyName: string;
    companySize: string;
  };
}

export default function AdminReports() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterScore, setFilterScore] = useState("all");
  
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

  const { data: reports, isLoading: isReportsLoading } = useQuery({
    queryKey: ["/api/admin/reports"],
    enabled: isAuthenticated,
  });

  const { data: reportStats } = useQuery({
    queryKey: ["/api/admin/report-stats"],
    enabled: isAuthenticated,
  });

  const filteredReports = reports?.filter((report: Report) => {
    const matchesSearch = 
      report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.companyProfile?.companyName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === "all" || report.reportType === filterType;
    
    let matchesScore = true;
    if (filterScore !== "all") {
      if (filterScore === "low" && report.complianceScore >= 40) matchesScore = false;
      if (filterScore === "medium" && (report.complianceScore < 40 || report.complianceScore >= 70)) matchesScore = false;
      if (filterScore === "high" && report.complianceScore < 70) matchesScore = false;
    }
    
    return matchesSearch && matchesType && matchesScore;
  }) || [];

  const getScoreBadge = (score: number) => {
    if (score >= 70) {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          <TrendingUp className="h-3 w-3 mr-1" />
          Alto ({score}%)
        </Badge>
      );
    } else if (score >= 40) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
          <Minus className="h-3 w-3 mr-1" />
          Médio ({score}%)
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          <TrendingDown className="h-3 w-3 mr-1" />
          Baixo ({score}%)
        </Badge>
      );
    }
  };

  const getTypeBadge = (type: string) => {
    const typeMap = {
      'compliance_summary': { label: 'Resumo', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
      'full_report': { label: 'Completo', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
      'sector_analysis': { label: 'Setorial', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400' },
    };
    
    const typeInfo = typeMap[type as keyof typeof typeMap] || { label: type, color: 'bg-gray-100 text-gray-800' };
    return (
      <Badge className={typeInfo.color}>
        {typeInfo.label}
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

  if (isLoading || isReportsLoading) {
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
            Relatórios DPO Fast
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Visualize e analise relatórios de conformidade gerados pelos assinantes
          </p>
        </div>

        {/* Report Stats */}
        {reportStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <FileBarChart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <Badge variant="secondary" className="text-xs">Total</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {reportStats.totalReports || 0}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Relatórios Gerados
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                    <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    Alto
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {reportStats.highScoreReports || 0}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Score Alto (≥70%)
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
                    <Minus className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                    Médio
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {reportStats.mediumScoreReports || 0}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Score Médio (40-69%)
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                    <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                    Baixo
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {reportStats.lowScoreReports || 0}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Score Baixo (&lt;40%)
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters and Search */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por título, usuário ou empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-reports"
                />
              </div>
              
              {/* Type Filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                data-testid="select-filter-type"
              >
                <option value="all">Todos os Tipos</option>
                <option value="compliance_summary">Resumo</option>
                <option value="full_report">Completo</option>
                <option value="sector_analysis">Setorial</option>
              </select>

              {/* Score Filter */}
              <select
                value={filterScore}
                onChange={(e) => setFilterScore(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                data-testid="select-filter-score"
              >
                <option value="all">Todos os Scores</option>
                <option value="high">Alto (≥70%)</option>
                <option value="medium">Médio (40-69%)</option>
                <option value="low">Baixo (&lt;40%)</option>
              </select>
            </div>

            <div className="mt-4 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span>{filteredReports.length} relatórios encontrados</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports Table */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-lg">
              <BarChart3 className="h-5 w-5 mr-3 text-gray-600 dark:text-gray-400" />
              Lista de Relatórios
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredReports.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Relatório</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Assinante</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Tipo</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Score</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Gerado em</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.map((report: Report) => (
                      <tr 
                        key={report.id} 
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        data-testid={`report-row-${report.id}`}
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                              <FileBarChart className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {report.title}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {report.fileName} • {formatFileSize(report.fileSize)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {report.user.firstName} {report.user.lastName}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                <Building className="h-3 w-3" />
                                {report.companyProfile?.companyName || report.user.company || 'N/A'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          {getTypeBadge(report.reportType)}
                        </td>
                        <td className="py-4 px-4">
                          {getScoreBadge(report.complianceScore)}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Calendar className="h-4 w-4" />
                            {new Date(report.generatedAt).toLocaleDateString('pt-BR')}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                            onClick={() => window.open(report.fileUrl, '_blank')}
                            data-testid={`button-download-report-${report.id}`}
                          >
                            <Download className="h-4 w-4" />
                            Baixar PDF
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Nenhum relatório encontrado
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {searchTerm || filterType !== "all" || filterScore !== "all"
                    ? "Tente ajustar os filtros de busca"
                    : "Não há relatórios gerados ainda"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}