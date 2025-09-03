import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle2, Clock, AlertCircle, Lock, Unlock, ArrowLeft, Eye } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "@/hooks/use-toast";

interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "completed" | "in_review" | "approved" | "rejected";
  dueDate: string;
  steps: string[];
  attachedDocuments?: any[];
  progress?: number;
}

interface User {
  id: string;
  email?: string;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
}

interface UserPlan {
  plan: string;
  hasAdvancedFeatures: boolean;
}

export default function TasksPage() {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  
  const { data: user } = useQuery<User>({
    queryKey: ['/api/auth/user'],
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ['/api/compliance-tasks'],
  });

  const completeMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await fetch(`/api/compliance-tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to complete task");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/compliance-tasks'] });
      toast({
        title: "Tarefa concluída!",
        description: "A tarefa foi marcada como concluída com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível concluir a tarefa.",
        variant: "destructive",
      });
    },
  });

  // Determine user plan and feature access
  const userPlan = user?.subscriptionStatus === 'active' 
    ? user?.subscriptionPlan || 'free' 
    : 'free';
    
  const hasDetailAccess = userPlan === 'basic' || userPlan === 'pro' || userPlan === 'personalite';

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'in_review':
        return <Clock className="h-4 w-4 text-purple-500" />;
      case 'rejected':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const filteredTasks = {
    pending: tasks.filter(task => task.status === 'pending'),
    inProgress: tasks.filter(task => ['in_progress', 'in_review'].includes(task.status)),
    completed: tasks.filter(task => ['completed', 'approved'].includes(task.status)),
  };

  const completionRate = tasks.length > 0 
    ? Math.round((filteredTasks.completed.length / tasks.length) * 100) 
    : 0;

  if (tasksLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const TaskCard = ({ task }: { task: Task }) => (
    <Card 
      key={task.id} 
      className="border hover:shadow-md transition-all duration-300"
      data-testid={`task-item-${task.id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(task.status)}
            <CardTitle className="text-lg">{task.title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
              {getPriorityText(task.priority)}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {task.category}
            </Badge>
          </div>
        </div>
        <CardDescription>{task.description}</CardDescription>
      </CardHeader>
      
      <CardContent>
        {hasDetailAccess ? (
          <>
            {task.steps && task.steps.length > 0 && (
              <Accordion type="single" collapsible className="mb-4">
                <AccordionItem value="steps" className="border-none">
                  <AccordionTrigger className="text-sm hover:no-underline py-2">
                    <div className="flex items-center gap-2">
                      <Unlock className="h-4 w-4" />
                      Passos detalhados ({task.steps.length})
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 mt-2">
                      {task.steps.map((step, stepIndex) => (
                        <div 
                          key={stepIndex} 
                          className="flex items-start gap-2 p-2 bg-muted/50 rounded text-sm"
                        >
                          <span className="flex-shrink-0 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs">
                            {stepIndex + 1}
                          </span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate(`/tasks/${task.id}`)}
                className="flex-1"
                data-testid={`view-task-${task.id}`}
              >
                <Eye className="h-4 w-4 mr-2" />
                Ver Detalhes
              </Button>
              
              {task.status === 'pending' && (
                <Button
                  onClick={() => completeMutation.mutate(task.id)}
                  disabled={completeMutation.isPending}
                  className="flex-1"
                  data-testid={`complete-task-${task.id}`}
                >
                  {completeMutation.isPending ? "Concluindo..." : "Marcar como concluída"}
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <Lock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-2">
              Detalhes disponíveis apenas para assinantes
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate("/pricing")}>
              Fazer upgrade
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/")}
              className="pl-0"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Tarefas de Compliance</h1>
          <p className="text-muted-foreground">
            Gerencie suas ações de adequação à LGPD
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary mb-1">
            {completionRate}%
          </div>
          <p className="text-sm text-muted-foreground">Concluído</p>
          <Progress value={completionRate} className="w-24 mt-2" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="flex items-center justify-center p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {filteredTasks.pending.length}
              </div>
              <p className="text-sm text-muted-foreground">Pendentes</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center justify-center p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {filteredTasks.inProgress.length}
              </div>
              <p className="text-sm text-muted-foreground">Em Progresso</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center justify-center p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {filteredTasks.completed.length}
              </div>
              <p className="text-sm text-muted-foreground">Concluídas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan Notice for Free Users */}
      {!hasDetailAccess && (
        <Card className="mb-6 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Plano Gratuito
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Você pode ver todas as tarefas, mas os detalhes estão disponíveis apenas para assinantes.
                </p>
              </div>
            </div>
            <Button onClick={() => navigate("/pricing")} size="sm">
              Fazer Upgrade
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tasks Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">Todas ({tasks.length})</TabsTrigger>
          <TabsTrigger value="pending">Pendentes ({filteredTasks.pending.length})</TabsTrigger>
          <TabsTrigger value="in_progress">Em Progresso ({filteredTasks.inProgress.length})</TabsTrigger>
          <TabsTrigger value="completed">Concluídas ({filteredTasks.completed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <div className="space-y-4">
            {tasks.length > 0 ? (
              tasks.map((task) => <TaskCard key={task.id} task={task} />)
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-medium text-foreground mb-2">Nenhuma tarefa encontrada</h3>
                  <p className="text-sm text-muted-foreground text-center">
                    Complete o questionário para gerar suas tarefas de compliance personalizadas.
                  </p>
                  <Button className="mt-4" onClick={() => navigate("/questionnaire")}>
                    Fazer Questionário
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          <div className="space-y-4">
            {filteredTasks.pending.length > 0 ? (
              filteredTasks.pending.map((task) => <TaskCard key={task.id} task={task} />)
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">Não há tarefas pendentes.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="in_progress" className="mt-6">
          <div className="space-y-4">
            {filteredTasks.inProgress.length > 0 ? (
              filteredTasks.inProgress.map((task) => <TaskCard key={task.id} task={task} />)
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">Não há tarefas em progresso.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <div className="space-y-4">
            {filteredTasks.completed.length > 0 ? (
              filteredTasks.completed.map((task) => <TaskCard key={task.id} task={task} />)
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">Não há tarefas concluídas ainda.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}