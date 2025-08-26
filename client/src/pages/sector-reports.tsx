import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { 
  FileBarChart, 
  Download, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  TrendingUp,
  Building2,
  Users,
  CreditCard,
  Megaphone,
  ShoppingBag,
  Monitor,
  Headphones
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SectorAnalysis {
  name: string;
  score: number;
  questions: number;
  totalQuestions: number;
  issues: string[];
  recommendations: string[];
}

interface SectorAnalysisData {
  sectorAnalysis: Record<string, SectorAnalysis>;
  totalSectors: number;
  companyName: string;
}

const sectorIcons: Record<string, any> = {
  'base': Building2,
  'rh': Users,
  'financas': CreditCard,
  'marketing': Megaphone,
  'vendas': ShoppingBag,
  'ti': Monitor,
  'atendimento': Headphones
};

export default function SectorReports() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
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

  const { data: sectorAnalysisData, isLoading: analysisLoading } = useQuery<SectorAnalysisData>({
    queryKey: ["/api/reports/sector-analysis"],
    enabled: isAuthenticated,
  });

  const generateReportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/reports/generate-sector", {});
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sucesso!",
        description: "Relatório por setores gerado com sucesso!",
      });
      // Trigger download
      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
      }
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
        description: "Falha ao gerar relatório por setores",
        variant: "destructive",
      });
    },
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return CheckCircle;
    if (score >= 60) return AlertTriangle;
    return XCircle;
  };

  if (isLoading || analysisLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!sectorAnalysisData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-lg mx-auto">
          <CardContent className="pt-6 text-center">
            <FileBarChart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma análise disponível</h3>
            <p className="text-muted-foreground mb-4">
              Complete o questionário para gerar a análise por setores.
            </p>
            <Button onClick={() => window.location.href = '/questionnaire'}>
              Ir para Questionário
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { sectorAnalysis, companyName, totalSectors } = sectorAnalysisData;
  const sectors = Object.entries(sectorAnalysis);

  // Calculate overall score
  const totalScore = sectors.reduce((sum, [, analysis]) => sum + analysis.score, 0);
  const averageScore = sectors.length > 0 ? Math.round(totalScore / sectors.length) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                Relatórios por Setor
              </h1>
              <p className="text-slate-600 dark:text-slate-300">
                {companyName} • {totalSectors} setores analisados
              </p>
            </div>
            <Button
              onClick={() => generateReportMutation.mutate()}
              disabled={generateReportMutation.isPending}
              className="gap-2"
              data-testid="button-generate-sector-report"
            >
              <Download className="h-4 w-4" />
              {generateReportMutation.isPending ? "Gerando..." : "Baixar Relatório PDF"}
            </Button>
          </div>

          {/* Overall Score Card */}
          <Card className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <TrendingUp className="h-6 w-6" />
                Conformidade Geral
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-4xl font-bold mb-2">{averageScore}%</div>
                  <p className="text-blue-100">
                    Média de conformidade em todos os setores
                  </p>
                </div>
                <div className="text-6xl opacity-20">
                  <FileBarChart />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sectors Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sectors.map(([sectorKey, analysis]) => {
            const IconComponent = sectorIcons[sectorKey] || Building2;
            const ScoreIcon = getScoreIcon(analysis.score);
            
            return (
              <Card key={sectorKey} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <IconComponent className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{analysis.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {analysis.questions}/{analysis.totalQuestions} perguntas
                        </p>
                      </div>
                    </div>
                    <ScoreIcon className={`h-6 w-6 ${getScoreColor(analysis.score)}`} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Score Progress */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Conformidade</span>
                      <span className={`text-sm font-bold ${getScoreColor(analysis.score)}`}>
                        {analysis.score}%
                      </span>
                    </div>
                    <Progress value={analysis.score} className="h-2" />
                  </div>

                  {/* Issues */}
                  {analysis.issues.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">
                        Problemas Identificados ({analysis.issues.length})
                      </h4>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {analysis.issues.slice(0, 3).map((issue, index) => (
                          <div key={index} className="text-xs text-muted-foreground bg-red-50 dark:bg-red-900/20 p-2 rounded">
                            {issue}
                          </div>
                        ))}
                        {analysis.issues.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{analysis.issues.length - 3} mais problemas
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {analysis.recommendations.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-2">
                        Recomendações ({analysis.recommendations.length})
                      </h4>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {analysis.recommendations.slice(0, 2).map((rec, index) => (
                          <div key={index} className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                            {rec}
                          </div>
                        ))}
                        {analysis.recommendations.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{analysis.recommendations.length - 2} mais recomendações
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Actions */}
        <div className="mt-8 text-center">
          <p className="text-muted-foreground mb-4">
            💡 O relatório detalhado em PDF contém análise completa, tarefas personalizadas por setor e recomendações específicas.
          </p>
          <div className="flex justify-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/questionnaire'}
              data-testid="button-update-questionnaire"
            >
              Atualizar Questionário
            </Button>
            <Button 
              onClick={() => window.location.href = '/'}
              data-testid="button-back-dashboard"
            >
              Voltar ao Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}