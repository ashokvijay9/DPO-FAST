import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, User, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StatusHistoryEntry {
  id: string;
  fromStatus?: string;
  toStatus: string;
  comments?: string;
  createdAt: string;
  changedBy: string;
  changedByName: string;
}

interface TaskStatusHistoryProps {
  taskId: string;
}

export function TaskStatusHistory({ taskId }: TaskStatusHistoryProps) {
  const { data: history = [], isLoading } = useQuery<StatusHistoryEntry[]>({
    queryKey: ['/api/tasks', taskId, 'history'],
    enabled: !!taskId,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'in_review':
        return <Clock className="w-4 h-4 text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'in_progress':
        return 'Em Progresso';
      case 'completed':
        return 'Concluída';
      case 'in_review':
        return 'Em Revisão';
      case 'approved':
        return 'Aprovada';
      case 'rejected':
        return 'Rejeitada';
      default:
        return status;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      case 'in_review':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Nenhum histórico de status disponível
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="task-status-history">
      <CardHeader>
        <CardTitle className="text-lg">Histórico de Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map((entry, index) => (
            <div key={entry.id} className="flex gap-4">
              {/* Timeline line */}
              <div className="flex flex-col items-center">
                {getStatusIcon(entry.toStatus)}
                {index < history.length - 1 && (
                  <div className="w-px h-12 bg-gray-200 mt-2"></div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={getStatusBadgeVariant(entry.toStatus)}>
                    {getStatusText(entry.toStatus)}
                  </Badge>
                  {entry.fromStatus && (
                    <span className="text-sm text-muted-foreground">
                      de {getStatusText(entry.fromStatus)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <User className="w-3 h-3" />
                  <span>{entry.changedByName || entry.changedBy}</span>
                  <span>•</span>
                  <span>
                    {format(new Date(entry.createdAt), "dd 'de' MMMM 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </span>
                </div>

                {entry.comments && (
                  <div className="bg-gray-50 rounded-lg p-3 mt-2">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-700">{entry.comments}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}