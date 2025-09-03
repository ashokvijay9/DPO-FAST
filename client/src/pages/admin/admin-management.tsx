import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import AdminNavbar from "@/components/AdminNavbar";
import { 
  Shield, 
  Users, 
  UserPlus, 
  UserMinus, 
  Crown,
  Mail,
  User,
  Calendar,
  MoreHorizontal,
  Search
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const createAdminSchema = z.object({
  email: z.string().email("Email inválido"),
  firstName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  lastName: z.string().min(2, "Sobrenome deve ter pelo menos 2 caracteres"),
});

type CreateAdminData = z.infer<typeof createAdminSchema>;

interface Admin {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
  lastLogin?: string;
  isCurrentUser: boolean;
}

export default function AdminManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const form = useForm<CreateAdminData>({
    resolver: zodResolver(createAdminSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
    },
  });

  // Fetch all administrators
  const { data: admins = [], isLoading } = useQuery<Admin[]>({
    queryKey: ["/api/admin/administrators"],
  });

  // Create new admin mutation
  const createAdminMutation = useMutation({
    mutationFn: async (data: CreateAdminData) => {
      const response = await fetch("/api/admin/administrators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao criar administrador");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/administrators"] });
      toast({ title: "Administrador criado com sucesso!" });
      form.reset();
      setIsCreateDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Erro ao criar administrador", 
        description: error.message,
        variant: "destructive" 
      });
    },
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/administrators"] });
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

  // Demote admin to user mutation
  const demoteAdminMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/admin/users/${userId}/demote`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao rebaixar administrador");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/administrators"] });
      toast({ title: "Administrador rebaixado a usuário comum!" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Erro ao rebaixar administrador", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: CreateAdminData) => {
    createAdminMutation.mutate(data);
  };

  const filteredAdmins = admins.filter(admin =>
    admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${admin.firstName} ${admin.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Crown className="h-8 w-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">Gerenciar Administradores</h1>
            <Badge variant="outline" className="border-purple-200 text-purple-700">
              <Users className="h-4 w-4 mr-1" />
              {admins.length} admins
            </Badge>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700" data-testid="button-create-admin">
                <UserPlus className="h-4 w-4 mr-2" />
                Criar Admin
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Criar Novo Administrador
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="admin@empresa.com"
                            {...field}
                            data-testid="input-admin-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primeiro Nome</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="João"
                            {...field}
                            data-testid="input-admin-first-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sobrenome</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Silva"
                            {...field}
                            data-testid="input-admin-last-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={createAdminMutation.isPending}
                      className="bg-purple-600 hover:bg-purple-700"
                      data-testid="button-confirm-create-admin"
                    >
                      {createAdminMutation.isPending ? "Criando..." : "Criar Admin"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Lista de Administradores
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar administradores..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                  data-testid="input-search-admins"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Administrador</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Último Login</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAdmins.map((admin) => (
                  <TableRow key={admin.id} data-testid={`admin-row-${admin.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {admin.firstName} {admin.lastName}
                          </p>
                          {admin.isCurrentUser && (
                            <Badge variant="outline" className="text-xs">
                              Você
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        {admin.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-purple-100 text-purple-800">
                        <Crown className="h-3 w-3 mr-1" />
                        {admin.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {new Date(admin.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                    </TableCell>
                    <TableCell>
                      {admin.lastLogin ? (
                        <span className="text-sm text-gray-600">
                          {new Date(admin.lastLogin).toLocaleDateString('pt-BR')}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">Nunca</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" data-testid={`admin-actions-${admin.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!admin.isCurrentUser && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem 
                                  onSelect={(e) => e.preventDefault()}
                                  className="text-red-600 cursor-pointer"
                                >
                                  <UserMinus className="h-4 w-4 mr-2" />
                                  Rebaixar a Usuário
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Rebaixar Administrador</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja rebaixar {admin.firstName} {admin.lastName} de administrador para usuário comum? 
                                    Esta ação removerá todos os privilégios administrativos.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => demoteAdminMutation.mutate(admin.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                    data-testid={`confirm-demote-${admin.id}`}
                                  >
                                    Rebaixar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredAdmins.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">
                  {searchTerm ? "Nenhum administrador encontrado" : "Nenhum administrador cadastrado"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Ações Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg bg-blue-50">
                <h3 className="font-medium text-blue-900 mb-2">Promover Usuário Existente</h3>
                <p className="text-sm text-blue-700 mb-3">
                  Promova um usuário comum para administrador através da página de assinantes.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-blue-200 text-blue-700 hover:bg-blue-100"
                  onClick={() => window.location.href = '/admin/subscribers'}
                  data-testid="button-go-to-subscribers"
                >
                  Ir para Assinantes
                </Button>
              </div>
              <div className="p-4 border rounded-lg bg-purple-50">
                <h3 className="font-medium text-purple-900 mb-2">Convidar por Email</h3>
                <p className="text-sm text-purple-700 mb-3">
                  Crie uma nova conta de administrador que receberá convite por email.
                </p>
                <Button 
                  size="sm" 
                  className="bg-purple-600 hover:bg-purple-700"
                  onClick={() => setIsCreateDialogOpen(true)}
                  data-testid="button-create-admin-quick"
                >
                  Criar Admin
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}