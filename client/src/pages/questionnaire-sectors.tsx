import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Building2, FileCheck, ArrowRight, CheckCircle2, Clock, AlertCircle } from "lucide-react";

interface Sector {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function QuestionnaireSectors() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();

  // Fetch sectors
  const { data: sectorsData, isLoading: sectorsLoading } = useQuery({
    queryKey: ["/api/questionnaire/questions"],
    enabled: isAuthenticated,
  });

  // Get sector completion status
  const getSectorStatus = async (sectorId: string) => {
    try {
      const response = await fetch(`/api/questionnaire/response/${sectorId}`);
      if (response.ok) {
        const data = await response.json();
        return data?.isComplete ? 'completed' : 'in_progress';
      }
      return 'pending';
    } catch {
      return 'pending';
    }
  };

  const [sectorStatuses, setSectorStatuses] = useState<Record<string, string>>({});

  // Load sector statuses
  useEffect(() => {
    if (sectorsData?.sectors) {
      const loadStatuses = async () => {
        const statuses: Record<string, string> = {};
        for (const sector of sectorsData.sectors) {
          statuses[sector.id] = await getSectorStatus(sector.id);
        }
        setSectorStatuses(statuses);
      };
      loadStatuses();
    }
  }, [sectorsData]);

  const handleStartSectorQuestionnaire = (sectorId: string) => {
    navigate(`/questionnaire/${sectorId}`);
  };

  if (isLoading || sectorsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const sectors = sectorsData?.sectors || [];

  if (sectors.length === 0) {
    return (
      <div className="min-h-screen hero-gradient p-4">
        <div className="max-w-2xl mx-auto pt-20">
          <Card className="glass-card shadow-2xl">
            <CardContent className="pt-6 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4 mx-auto" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhum setor cadastrado
              </h3>
              <p className="text-muted-foreground mb-6">
                Para responder questionários por setor, você precisa primeiro cadastrar os setores da sua empresa.
              </p>
              <Button
                onClick={() => navigate("/sectors")}
                className="btn-transparent"
              >
                <Building2 className="h-4 w-4 mr-2" />
                Gerenciar Setores
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const completedSectors = Object.values(sectorStatuses).filter(status => status === 'completed').length;
  const totalSectors = sectors.length;
  const overallProgress = totalSectors > 0 ? (completedSectors / totalSectors) * 100 : 0;

  return (
    <div className="min-h-screen hero-gradient p-4">
      <div className="max-w-6xl mx-auto pt-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-4 flex items-center justify-center gap-3">
            <FileCheck className="h-8 w-8 text-blue-400" />
            Questionários por Setor - DPO Fast
          </h1>
          <p className="text-blue-100 text-lg max-w-2xl mx-auto">
            Complete o questionário LGPD específico para cada setor da sua empresa. 
            Cada setor terá perguntas personalizadas e gerará tarefas específicas.
          </p>
        </div>

        {/* Overall Progress */}
        <Card className="glass-card mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Progresso Geral</h2>
              <Badge variant="outline" className="text-blue-300 border-blue-400">
                {completedSectors} de {totalSectors} completos
              </Badge>
            </div>
            <Progress value={overallProgress} className="h-3 mb-2" />
            <p className="text-sm text-blue-200">
              {overallProgress.toFixed(0)}% dos setores com questionários completos
            </p>
          </CardContent>
        </Card>

        {/* Sectors Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sectors.map((sector: Sector) => {
            const status = sectorStatuses[sector.id] || 'pending';
            const getStatusConfig = () => {
              switch (status) {
                case 'completed':
                  return {
                    icon: CheckCircle2,
                    color: 'text-green-500',
                    bgColor: 'bg-green-500/10 border-green-500/30',
                    label: 'Completo',
                    badgeVariant: 'default' as const,
                    buttonText: 'Revisar Respostas'
                  };
                case 'in_progress':
                  return {
                    icon: Clock,
                    color: 'text-yellow-500',
                    bgColor: 'bg-yellow-500/10 border-yellow-500/30',
                    label: 'Em andamento',
                    badgeVariant: 'secondary' as const,
                    buttonText: 'Continuar'
                  };
                default:
                  return {
                    icon: AlertCircle,
                    color: 'text-blue-400',
                    bgColor: 'bg-blue-500/10 border-blue-500/30',
                    label: 'Pendente',
                    badgeVariant: 'outline' as const,
                    buttonText: 'Iniciar'
                  };
              }
            };

            const statusConfig = getStatusConfig();
            const StatusIcon = statusConfig.icon;

            return (
              <Card key={sector.id} className={`glass-card border-2 ${statusConfig.bgColor} hover:scale-105 transition-all duration-300`}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-blue-400" />
                      <CardTitle className="text-lg text-white truncate">
                        {sector.name}
                      </CardTitle>
                    </div>
                    <Badge variant={statusConfig.badgeVariant} className="text-xs">
                      {statusConfig.label}
                    </Badge>
                  </div>
                  {sector.description && (
                    <p className="text-sm text-blue-200 line-clamp-2">
                      {sector.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg ${statusConfig.bgColor}`}>
                      <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
                    </div>
                    <span className={`text-sm font-medium ${statusConfig.color}`}>
                      {statusConfig.label}
                    </span>
                  </div>
                  
                  <Button
                    onClick={() => handleStartSectorQuestionnaire(sector.id)}
                    className="w-full btn-transparent flex items-center gap-2"
                    data-testid={`start-questionnaire-${sector.id}`}
                  >
                    <FileCheck className="h-4 w-4" />
                    {statusConfig.buttonText}
                    <ArrowRight className="h-4 w-4 ml-auto" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Info Section */}
        <Card className="glass-card mt-8">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-white">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Como funcionam os questionários por setor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-blue-200">
            <div>
              <strong className="text-white">1. Questionários Personalizados:</strong> Cada setor receberá perguntas específicas baseadas em suas atividades (RH, TI, Vendas, etc.).
            </div>
            <div>
              <strong className="text-white">2. Tarefas Específicas:</strong> As respostas gerarão tarefas de compliance personalizadas para cada setor.
            </div>
            <div>
              <strong className="text-white">3. Relatórios Individualizados:</strong> Cada setor terá seu próprio relatório de conformidade com IA Qwen.
            </div>
            <div>
              <strong className="text-white">4. Progresso Independente:</strong> Você pode completar os questionários de cada setor em momentos diferentes.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}