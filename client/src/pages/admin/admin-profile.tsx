import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import AdminNavbar from "@/components/AdminNavbar";
import { Shield, User, Settings, Bell, Database, Activity } from "lucide-react";

interface AdminProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
  lastLogin?: string;
  permissions: string[];
}

interface AdminSettings {
  emailNotifications: boolean;
  systemNotifications: boolean;
  maintenanceMode: boolean;
  autoApproveDocuments: boolean;
  maxFileSize: number;
  sessionTimeout: number;
  defaultUserPlan: string;
  requireDocumentApproval: boolean;
}

export default function AdminProfile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("profile");

  // Fetch admin profile
  const { data: profile, isLoading: profileLoading } = useQuery<AdminProfile>({
    queryKey: ["/api/admin/profile"],
  });

  // Fetch admin settings
  const { data: settings, isLoading: settingsLoading } = useQuery<AdminSettings>({
    queryKey: ["/api/admin/settings"],
  });

  // Fetch system statistics
  const { data: systemStats } = useQuery({
    queryKey: ["/api/admin/system-stats"],
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<AdminProfile>) => {
      const response = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update profile");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/profile"] });
      toast({ title: "Perfil atualizado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar perfil", variant: "destructive" });
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<AdminSettings>) => {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update settings");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: "Configurações atualizadas com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar configurações", variant: "destructive" });
    },
  });

  const handleProfileUpdate = (data: Partial<AdminProfile>) => {
    updateProfileMutation.mutate(data);
  };

  const handleSettingsUpdate = (data: Partial<AdminSettings>) => {
    updateSettingsMutation.mutate(data);
  };

  if (profileLoading || settingsLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Perfil Administrativo</h1>
          <Badge variant="default" className="bg-blue-600">
            <User className="h-4 w-4 mr-1" />
            Admin
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configurações
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notificações
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Sistema
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informações Pessoais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Primeiro Nome</Label>
                    <Input
                      id="firstName"
                      defaultValue={profile?.firstName}
                      onBlur={(e) => handleProfileUpdate({ firstName: e.target.value })}
                      data-testid="input-admin-first-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Sobrenome</Label>
                    <Input
                      id="lastName"
                      defaultValue={profile?.lastName}
                      onBlur={(e) => handleProfileUpdate({ lastName: e.target.value })}
                      data-testid="input-admin-last-name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile?.email}
                    disabled
                    className="bg-gray-100"
                    data-testid="input-admin-email"
                  />
                  <p className="text-sm text-gray-500">O email não pode ser alterado</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Função</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="bg-blue-600">
                        <Shield className="h-4 w-4 mr-1" />
                        {profile?.role}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Criado em</Label>
                    <Input
                      value={profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('pt-BR') : ''}
                      disabled
                      className="bg-gray-100"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Permissões Administrativas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {profile?.permissions?.map((permission) => (
                    <Badge key={permission} variant="outline">
                      {permission}
                    </Badge>
                  )) || (
                    <>
                      <Badge variant="outline">Gerenciar Usuários</Badge>
                      <Badge variant="outline">Aprovar Documentos</Badge>
                      <Badge variant="outline">Visualizar Relatórios</Badge>
                      <Badge variant="outline">Configurações do Sistema</Badge>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configurações do Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Modo de Manutenção</Label>
                        <p className="text-sm text-gray-500">Desabilita acesso dos usuários</p>
                      </div>
                      <Switch
                        checked={settings?.maintenanceMode}
                        onCheckedChange={(checked) => handleSettingsUpdate({ maintenanceMode: checked })}
                        data-testid="switch-maintenance-mode"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Auto-aprovar Documentos</Label>
                        <p className="text-sm text-gray-500">Aprovação automática de documentos</p>
                      </div>
                      <Switch
                        checked={settings?.autoApproveDocuments}
                        onCheckedChange={(checked) => handleSettingsUpdate({ autoApproveDocuments: checked })}
                        data-testid="switch-auto-approve"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Requer Aprovação Manual</Label>
                        <p className="text-sm text-gray-500">Todos os documentos precisam de aprovação</p>
                      </div>
                      <Switch
                        checked={settings?.requireDocumentApproval}
                        onCheckedChange={(checked) => handleSettingsUpdate({ requireDocumentApproval: checked })}
                        data-testid="switch-require-approval"
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="maxFileSize">Tamanho Máximo de Arquivo (MB)</Label>
                      <Input
                        id="maxFileSize"
                        type="number"
                        defaultValue={settings?.maxFileSize || 10}
                        onBlur={(e) => handleSettingsUpdate({ maxFileSize: parseInt(e.target.value) })}
                        data-testid="input-max-file-size"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sessionTimeout">Timeout de Sessão (minutos)</Label>
                      <Input
                        id="sessionTimeout"
                        type="number"
                        defaultValue={settings?.sessionTimeout || 30}
                        onBlur={(e) => handleSettingsUpdate({ sessionTimeout: parseInt(e.target.value) })}
                        data-testid="input-session-timeout"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="defaultPlan">Plano Padrão para Novos Usuários</Label>
                      <Select
                        value={settings?.defaultUserPlan || "free"}
                        onValueChange={(value) => handleSettingsUpdate({ defaultUserPlan: value })}
                      >
                        <SelectTrigger data-testid="select-default-plan">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Grátis</SelectItem>
                          <SelectItem value="basic">Básico</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Preferências de Notificação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notificações por Email</Label>
                    <p className="text-sm text-gray-500">Receber notificações via email</p>
                  </div>
                  <Switch
                    checked={settings?.emailNotifications}
                    onCheckedChange={(checked) => handleSettingsUpdate({ emailNotifications: checked })}
                    data-testid="switch-email-notifications"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notificações do Sistema</Label>
                    <p className="text-sm text-gray-500">Notificações sobre atividades do sistema</p>
                  </div>
                  <Switch
                    checked={settings?.systemNotifications}
                    onCheckedChange={(checked) => handleSettingsUpdate({ systemNotifications: checked })}
                    data-testid="switch-system-notifications"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Estatísticas do Sistema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{systemStats?.uptime || "24h"}</p>
                    <p className="text-sm text-gray-600">Tempo Online</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{systemStats?.activeUsers || "0"}</p>
                    <p className="text-sm text-gray-600">Usuários Ativos</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">{systemStats?.storageUsed || "0 GB"}</p>
                    <p className="text-sm text-gray-600">Armazenamento</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">{systemStats?.apiCalls || "0"}</p>
                    <p className="text-sm text-gray-600">Chamadas API/h</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}