import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus, Edit2, Trash2, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Validation schemas
const sectorSchema = z.object({
  name: z.string().min(1, "Nome do setor é obrigatório").max(100, "Nome muito longo"),
  description: z.string().optional(),
});

type SectorFormData = z.infer<typeof sectorSchema>;

interface Sector {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function SectorsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSector, setEditingSector] = useState<Sector | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form for create/edit
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SectorFormData>({
    resolver: zodResolver(sectorSchema),
  });

  // Fetch sectors
  const { data: sectors, isLoading } = useQuery({
    queryKey: ["/api/company-sectors"],
    queryFn: () => fetch("/api/company-sectors").then((res) => res.json()),
  });

  // Create sector mutation
  const createSectorMutation = useMutation({
    mutationFn: (data: SectorFormData) =>
      apiRequest("POST", "/api/company-sectors", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-sectors"] });
      setIsCreateDialogOpen(false);
      reset();
      toast({
        title: "✅ Setor criado!",
        description: "O setor foi adicionado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erro ao criar setor",
        description: error.message || "Erro interno do servidor",
        variant: "destructive",
      });
    },
  });

  // Update sector mutation
  const updateSectorMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SectorFormData }) =>
      apiRequest("PUT", `/api/company-sectors/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-sectors"] });
      setEditingSector(null);
      reset();
      toast({
        title: "✅ Setor atualizado!",
        description: "As alterações foram salvas com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erro ao atualizar setor",
        description: error.message || "Erro interno do servidor",
        variant: "destructive",
      });
    },
  });

  // Delete sector mutation
  const deleteSectorMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/company-sectors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-sectors"] });
      toast({
        title: "✅ Setor removido!",
        description: "O setor foi removido com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erro ao remover setor",
        description: error.message || "Erro interno do servidor",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SectorFormData) => {
    if (editingSector) {
      updateSectorMutation.mutate({ id: editingSector.id, data });
    } else {
      createSectorMutation.mutate(data);
    }
  };

  const handleEdit = (sector: Sector) => {
    setEditingSector(sector);
    setValue("name", sector.name);
    setValue("description", sector.description || "");
  };

  const handleDelete = (id: string) => {
    deleteSectorMutation.mutate(id);
  };

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingSector(null);
    reset();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            Setores da Empresa - DPO Fast
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie os setores da sua empresa para questionários e relatórios por setor
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="btn-transparent flex items-center gap-2"
              data-testid="button-create-sector"
            >
              <Plus className="h-4 w-4" />
              Adicionar Setor
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Setor</DialogTitle>
              <DialogDescription>
                Crie um novo setor para sua empresa. Este setor poderá ter questionários específicos e relatórios personalizados.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do Setor *</Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="Ex: Recursos Humanos, TI, Vendas"
                  className="input-field"
                  data-testid="input-sector-name"
                />
                {errors.name && (
                  <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  placeholder="Descrição detalhada do setor e suas responsabilidades"
                  className="input-field min-h-[100px]"
                  data-testid="input-sector-description"
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  className="btn-transparent"
                  data-testid="button-cancel-create"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || createSectorMutation.isPending}
                  className="btn-transparent"
                  data-testid="button-save-sector"
                >
                  {createSectorMutation.isPending ? "Criando..." : "Criar Setor"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editingSector !== null} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>Editar Setor</DialogTitle>
            <DialogDescription>
              Modifique as informações do setor selecionado.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nome do Setor *</Label>
              <Input
                id="edit-name"
                {...register("name")}
                className="input-field"
                data-testid="input-edit-sector-name"
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="edit-description">Descrição (opcional)</Label>
              <Textarea
                id="edit-description"
                {...register("description")}
                className="input-field min-h-[100px]"
                data-testid="input-edit-sector-description"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                className="btn-transparent"
                data-testid="button-cancel-edit"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || updateSectorMutation.isPending}
                className="btn-transparent"
                data-testid="button-update-sector"
              >
                {updateSectorMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sectors List */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {sectors && sectors.length > 0 ? (
          sectors.map((sector: Sector) => (
            <Card key={sector.id} className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="truncate" data-testid={`text-sector-name-${sector.id}`}>
                      {sector.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(sector)}
                      className="h-8 w-8 p-0 hover:bg-muted"
                      data-testid={`button-edit-${sector.id}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
                          data-testid={`button-delete-${sector.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="glass-card">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover setor?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação removerá o setor "{sector.name}" do sistema. 
                            Os questionários e relatórios associados serão mantidos, mas não poderão ser vinculados a este setor.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="btn-transparent">Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(sector.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            data-testid={`button-confirm-delete-${sector.id}`}
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sector.description && (
                  <p className="text-sm text-muted-foreground mb-4" data-testid={`text-sector-description-${sector.id}`}>
                    {sector.description}
                  </p>
                )}
                <div className="text-xs text-muted-foreground">
                  Criado em: {new Date(sector.createdAt).toLocaleDateString('pt-BR')}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full">
            <Card className="glass-card">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Nenhum setor cadastrado
                </h3>
                <p className="text-muted-foreground text-center mb-6">
                  Comece adicionando setores da sua empresa para organizar questionários e relatórios por departamentos.
                </p>
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="btn-transparent"
                  data-testid="button-create-first-sector"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Primeiro Setor
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Info Card */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Como funciona o sistema de setores no DPO Fast
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div>
            <strong className="text-foreground">1. Questionários por Setor:</strong> Cada setor pode ter questionários específicos baseados em suas atividades e responsabilidades.
          </div>
          <div>
            <strong className="text-foreground">2. Relatórios Personalizados:</strong> Os relatórios serão gerados com IA Qwen específicamente para cada setor, destacando conformidades e não conformidades.
          </div>
          <div>
            <strong className="text-foreground">3. Gestão Centralizada:</strong> Acompanhe o progresso de adequação à LGPD de todos os setores em um painel unificado.
          </div>
          <div>
            <strong className="text-foreground">4. Validação por Setor:</strong> Cada setor pode ter suas próprias tarefas de compliance e documentação específica.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}