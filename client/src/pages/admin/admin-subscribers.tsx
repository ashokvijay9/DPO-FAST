import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  Search, 
  Users, 
  Eye, 
  FileText, 
  Calendar,
  Building,
  Mail,
  Filter,
  MoreHorizontal,
  Trash2,
  Shield,
  CreditCard
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface Subscriber {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  createdAt: string;
  documentCount: number;
  lastActivity: string;
  role?: string;
  companyProfile?: {
    companyName: string;
    companySize: string;
    employeeCount: string;
  };
}

export default function AdminSubscribers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedUser, setSelectedUser] = useState<Subscriber | null>(null);
  const [newPlan, setNewPlan] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [isSubscriptionDialogOpen, setIsSubscriptionDialogOpen] = useState(false);
  
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

  const { data: subscribers, isLoading: isSubscribersLoading } = useQuery({
    queryKey: ["/api/admin/subscribers"],
    enabled: isAuthenticated,
  });

  // Promote user to admin mutation
  const promoteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/admin/users/${userId}/promote`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao promover usuário");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscribers"] });
      toast({ title: "Usuário promovido a administrador!" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Erro ao promover usuário", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao deletar usuário");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscribers"] });
      toast({ title: "Usuário deletado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Erro ao deletar usuário", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Change subscription mutation
  const changeSubscriptionMutation = useMutation({
    mutationFn: async ({ userId, subscriptionPlan, subscriptionStatus }: { 
      userId: string; 
      subscriptionPlan?: string; 
      subscriptionStatus?: string; 
    }) => {
      const response = await fetch(`/api/admin/users/${userId}/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionPlan, subscriptionStatus }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao alterar assinatura");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscribers"] });
      setIsSubscriptionDialogOpen(false);
      setSelectedUser(null);
      setNewPlan("");
      setNewStatus("");
      toast({ title: "Assinatura alterada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Erro ao alterar assinatura", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleChangeSubscription = () => {
    if (!selectedUser) return;
    
    const updates: { subscriptionPlan?: string; subscriptionStatus?: string } = {};
    if (newPlan && newPlan !== selectedUser.subscriptionPlan) {
      updates.subscriptionPlan = newPlan;
    }
    if (newStatus && newStatus !== selectedUser.subscriptionStatus) {
      updates.subscriptionStatus = newStatus;
    }
    
    if (Object.keys(updates).length === 0) {
      toast({ 
        title: "Nenhuma alteração", 
        description: "Selecione um plano ou status diferente do atual",
        variant: "destructive" 
      });
      return;
    }

    changeSubscriptionMutation.mutate({ 
      userId: selectedUser.id, 
      ...updates 
    });
  };

  const openSubscriptionDialog = (user: Subscriber) => {
    setSelectedUser(user);
    setNewPlan(user.subscriptionPlan);
    setNewStatus(user.subscriptionStatus);
    setIsSubscriptionDialogOpen(true);
  };

  const filteredSubscribers = subscribers?.filter((subscriber: Subscriber) => {
    const matchesSearch = 
      subscriber.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subscriber.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subscriber.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subscriber.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subscriber.companyProfile?.companyName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPlan = filterPlan === "all" || subscriber.subscriptionPlan === filterPlan;
    const matchesStatus = filterStatus === "all" || subscriber.subscriptionStatus === filterStatus;
    
    return matchesSearch && matchesPlan && matchesStatus;
  }) || [];

  const getPlanBadge = (plan: string) => {
    const planMap = {
      'free': { label: 'Gratuito', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
      'basic': { label: 'Básico', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
      'pro': { label: 'Pro', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
    };
    
    const planInfo = planMap[plan as keyof typeof planMap] || planMap.free;
    return (
      <Badge className={planInfo.color}>
        {planInfo.label}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'active': { label: 'Ativo', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
      'inactive': { label: 'Inativo', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
      'canceled': { label: 'Cancelado', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.inactive;
    return (
      <Badge className={statusInfo.color}>
        {statusInfo.label}
      </Badge>
    );
  };

  if (isLoading || isSubscribersLoading) {
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
            Assinantes DPO Fast
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gerencie todos os assinantes da plataforma
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
                  placeholder="Buscar por nome, email ou empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-subscribers"
                />
              </div>
              
              {/* Plan Filter */}
              <select
                value={filterPlan}
                onChange={(e) => setFilterPlan(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                data-testid="select-filter-plan"
              >
                <option value="all">Todos os Planos</option>
                <option value="free">Gratuito</option>
                <option value="basic">Básico</option>
                <option value="pro">Pro</option>
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                data-testid="select-filter-status"
              >
                <option value="all">Todos os Status</option>
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
                <option value="canceled">Cancelado</option>
              </select>
            </div>

            <div className="mt-4 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>{filteredSubscribers.length} assinantes encontrados</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscribers Table */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-lg">
              <Users className="h-5 w-5 mr-3 text-gray-600 dark:text-gray-400" />
              Lista de Assinantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredSubscribers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Assinante</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Empresa</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Plano</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Documentos</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Criado em</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubscribers.map((subscriber: Subscriber) => (
                      <tr 
                        key={subscriber.id} 
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        data-testid={`subscriber-row-${subscriber.id}`}
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {subscriber.firstName} {subscriber.lastName}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {subscriber.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {subscriber.companyProfile?.companyName || subscriber.company || 'N/A'}
                              </p>
                              {subscriber.companyProfile?.companySize && (
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  {subscriber.companyProfile.companySize === 'small' ? 'Pequena' :
                                   subscriber.companyProfile.companySize === 'medium' ? 'Média' : 'Grande'}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          {getPlanBadge(subscriber.subscriptionPlan)}
                        </td>
                        <td className="py-4 px-4">
                          {getStatusBadge(subscriber.subscriptionStatus)}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-gray-900 dark:text-white">
                              {subscriber.documentCount || 0}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Calendar className="h-4 w-4" />
                            {new Date(subscriber.createdAt).toLocaleDateString('pt-BR')}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-2"
                              onClick={() => window.location.href = `/admin/subscriber/${subscriber.id}`}
                              data-testid={`button-view-subscriber-${subscriber.id}`}
                            >
                              <Eye className="h-4 w-4" />
                              Ver Detalhes
                            </Button>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" data-testid={`subscriber-actions-${subscriber.id}`}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onSelect={() => openSubscriptionDialog(subscriber)}
                                  className="text-green-600 cursor-pointer"
                                >
                                  <CreditCard className="h-4 w-4 mr-2" />
                                  Alterar Assinatura
                                </DropdownMenuItem>

                                {subscriber.role !== 'admin' && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem 
                                        onSelect={(e) => e.preventDefault()}
                                        className="text-blue-600 cursor-pointer"
                                      >
                                        <Shield className="h-4 w-4 mr-2" />
                                        Promover a Admin
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Promover a Administrador</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Tem certeza que deseja promover {subscriber.firstName} {subscriber.lastName} a administrador? 
                                          Esta ação dará todos os privilégios administrativos para este usuário.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => promoteUserMutation.mutate(subscriber.id)}
                                          className="bg-blue-600 hover:bg-blue-700"
                                          data-testid={`confirm-promote-${subscriber.id}`}
                                        >
                                          Promover
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                                
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem 
                                      onSelect={(e) => e.preventDefault()}
                                      className="text-red-600 cursor-pointer"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Deletar Usuário
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Deletar Usuário</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        ⚠️ <strong>ATENÇÃO:</strong> Tem certeza que deseja deletar permanentemente {subscriber.firstName} {subscriber.lastName}? 
                                        <br /><br />
                                        Esta ação é <strong>irreversível</strong> e removerá:
                                        <br />• Conta do usuário
                                        <br />• Todos os documentos
                                        <br />• Relatórios e dados de compliance
                                        <br />• Histórico de auditoria
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteUserMutation.mutate(subscriber.id)}
                                        className="bg-red-600 hover:bg-red-700"
                                        data-testid={`confirm-delete-subscriber-${subscriber.id}`}
                                      >
                                        Deletar Permanentemente
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Nenhum assinante encontrado
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {searchTerm || filterPlan !== "all" || filterStatus !== "all"
                    ? "Tente ajustar os filtros de busca"
                    : "Não há assinantes cadastrados ainda"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Change Subscription Dialog */}
        <Dialog open={isSubscriptionDialogOpen} onOpenChange={setIsSubscriptionDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Alterar Assinatura</DialogTitle>
              <DialogDescription>
                Altere o plano e status de assinatura de {selectedUser?.firstName} {selectedUser?.lastName}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="plan" className="text-right">
                  Plano
                </Label>
                <div className="col-span-3">
                  <Select value={newPlan} onValueChange={setNewPlan}>
                    <SelectTrigger data-testid="select-new-plan">
                      <SelectValue placeholder="Selecione um plano" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Gratuito</SelectItem>
                      <SelectItem value="basic">Básico</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">
                  Status
                </Label>
                <div className="col-span-3">
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger data-testid="select-new-status">
                      <SelectValue placeholder="Selecione um status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                      <SelectItem value="canceled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedUser && (
                <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  <p><strong>Plano atual:</strong> {selectedUser.subscriptionPlan === 'free' ? 'Gratuito' : selectedUser.subscriptionPlan === 'basic' ? 'Básico' : 'Pro'}</p>
                  <p><strong>Status atual:</strong> {selectedUser.subscriptionStatus === 'active' ? 'Ativo' : selectedUser.subscriptionStatus === 'inactive' ? 'Inativo' : 'Cancelado'}</p>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsSubscriptionDialogOpen(false)}
                disabled={changeSubscriptionMutation.isPending}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleChangeSubscription}
                disabled={changeSubscriptionMutation.isPending}
                data-testid="confirm-change-subscription"
              >
                {changeSubscriptionMutation.isPending ? "Alterando..." : "Alterar Assinatura"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}