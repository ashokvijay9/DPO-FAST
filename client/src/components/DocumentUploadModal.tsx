import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, X } from "lucide-react";

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DocumentUploadModal({ isOpen, onClose }: DocumentUploadModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    description: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: data,
        credentials: "include",
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`${response.status}: ${text}`);
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Documento enviado com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      handleClose();
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast({
        title: "Erro no Upload",
        description: "Falha ao enviar documento. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setFormData({ name: "", category: "", description: "" });
    setSelectedFile(null);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 10MB.",
          variant: "destructive",
        });
        return;
      }

      // Validate file type
      const allowedTypes = ['.pdf', '.docx', '.doc', '.jpg', '.jpeg', '.png'];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      if (!allowedTypes.includes(fileExtension)) {
        toast({
          title: "Tipo de arquivo não suportado",
          description: "Apenas arquivos PDF, DOCX, JPG e PNG são aceitos.",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      // Auto-fill name if not set
      if (!formData.name) {
        setFormData(prev => ({
          ...prev,
          name: file.name.substring(0, file.name.lastIndexOf('.'))
        }));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      toast({
        title: "Arquivo obrigatório",
        description: "Por favor, selecione um arquivo para upload.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, informe o nome do documento.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.category) {
      toast({
        title: "Categoria obrigatória",
        description: "Por favor, selecione uma categoria.",
        variant: "destructive",
      });
      return;
    }

    const uploadData = new FormData();
    uploadData.append("file", selectedFile);
    uploadData.append("name", formData.name.trim());
    uploadData.append("category", formData.category);
    uploadData.append("description", formData.description.trim());

    uploadMutation.mutate(uploadData);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload de Documento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="documentName">Nome do Documento *</Label>
            <Input
              id="documentName"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Digite o nome do documento"
              required
              data-testid="input-document-name"
            />
          </div>

          <div>
            <Label htmlFor="documentCategory">Categoria *</Label>
            <Select 
              value={formData.category} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              required
            >
              <SelectTrigger data-testid="select-category">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="politicas">Políticas</SelectItem>
                <SelectItem value="termos">Termos</SelectItem>
                <SelectItem value="relatorios">Relatórios</SelectItem>
                <SelectItem value="contratos">Contratos</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="documentFile">Arquivo *</Label>
            <div className="mt-1">
              <Input
                id="documentFile"
                type="file"
                accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                required
                data-testid="input-file"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Formatos aceitos: PDF, DOCX, JPG, PNG (máx. 10MB)
              </p>
              {selectedFile && (
                <div className="flex items-center justify-between mt-2 p-2 bg-muted rounded">
                  <span className="text-sm font-medium">{selectedFile.name}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFile(null)}
                      data-testid="button-remove-file"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="documentDescription">Descrição (opcional)</Label>
            <Textarea
              id="documentDescription"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Adicione uma descrição para o documento..."
              rows={3}
              data-testid="textarea-description"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleClose} data-testid="button-cancel">
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={uploadMutation.isPending}
              data-testid="button-upload"
            >
              {uploadMutation.isPending ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Fazer Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
