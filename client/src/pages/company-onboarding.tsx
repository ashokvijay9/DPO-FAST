import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Users, Phone, MapPin, Check, ChevronRight, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { companyOnboardingSchema, type CompanyOnboarding } from "@shared/schema";
import { useLocation } from "wouter";

const businessSectors = [
  "Tecnologia",
  "Saúde",
  "Educação",
  "Financeiro/Bancário",
  "Varejo/E-commerce",
  "Manufatura",
  "Consultoria",
  "Telecomunicações",
  "Imobiliário",
  "Alimentício",
  "Automotivo",
  "Energia",
  "Agricultura",
  "Construção Civil",
  "Transporte e Logística",
  "Turismo e Hospitalidade",
  "Mídia e Entretenimento",
  "Serviços Profissionais",
  "ONGs e Terceiro Setor"
];

const employeeRanges = [
  "1-10 funcionários",
  "11-50 funcionários", 
  "51-100 funcionários",
  "101-500 funcionários",
  "501-1000 funcionários",
  "1001+ funcionários"
];

export default function CompanyOnboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [customSector, setCustomSector] = useState("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const form = useForm<CompanyOnboarding>({
    resolver: zodResolver(companyOnboardingSchema),
    defaultValues: {
      companyName: "",
      sectors: [],
      customSectors: [],
      companySize: "small",
      employeeCount: "11-50 funcionários",
      employeeCountType: "range",
      primaryContact: "",
      phone: "",
      address: "",
    },
  });

  const addCustomSector = () => {
    if (customSector.trim() && !form.getValues("customSectors").includes(customSector.trim())) {
      const currentCustomSectors = form.getValues("customSectors");
      form.setValue("customSectors", [...currentCustomSectors, customSector.trim()]);
      
      // Also add to main sectors list
      const currentSectors = form.getValues("sectors");
      if (!currentSectors.includes(customSector.trim())) {
        form.setValue("sectors", [...currentSectors, customSector.trim()]);
      }
      
      setCustomSector("");
    }
  };

  const removeCustomSector = (sectorToRemove: string) => {
    const updatedCustomSectors = form.getValues("customSectors").filter(s => s !== sectorToRemove);
    form.setValue("customSectors", updatedCustomSectors);
    
    // Also remove from main sectors list
    const updatedSectors = form.getValues("sectors").filter(s => s !== sectorToRemove);
    form.setValue("sectors", updatedSectors);
  };

  const createCompanyProfileMutation = useMutation({
    mutationFn: (data: CompanyOnboarding) => apiRequest("POST", "/api/company-profile", data),
    onSuccess: () => {
      toast({
        title: "Perfil da empresa criado com sucesso!",
        description: "Agora você pode acessar o sistema completo.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/company-profile"] });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar perfil",
        description: error.message || "Ocorreu um erro ao criar o perfil da empresa.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CompanyOnboarding) => {
    createCompanyProfileMutation.mutate(data);
  };

  const nextStep = async () => {
    const fields = currentStep === 1 ? ['companyName', 'companySize'] : 
                   currentStep === 2 ? ['sectors'] :
                   ['primaryContact'];
    
    const isValid = await form.trigger(fields as any);
    if (isValid) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  return (
    <div className="min-h-screen hero-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Configurar Perfil da Empresa
          </h1>
          <p className="text-blue-100">
            Para começar a usar o DPO Fast, precisamos conhecer melhor sua empresa
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3, 4].map((step) => (
              <React.Fragment key={step}>
                <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
                  step <= currentStep
                    ? 'bg-white text-blue-600 shadow-lg'
                    : 'bg-blue-800/50 text-blue-200'
                }`}>
                  {step < currentStep ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-medium">{step}</span>
                  )}
                </div>
                {step < 4 && (
                  <ChevronRight className={`w-5 h-5 transition-colors ${
                    step < currentStep ? 'text-white' : 'text-blue-400'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <Card className="glass-card backdrop-blur-lg shadow-xl border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-foreground">
              {currentStep === 1 && "Informações Básicas"}
              {currentStep === 2 && "Setores de Atuação"}
              {currentStep === 3 && "Funcionários"}
              {currentStep === 4 && "Contato Principal"}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                {/* Step 1: Basic Info */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome da Empresa *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Digite o nome da sua empresa"
                              {...field}
                              data-testid="input-company-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="companySize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Porte da Empresa *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-company-size">
                                <SelectValue placeholder="Selecione o porte da empresa" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="small">Pequena (até 99 funcionários)</SelectItem>
                              <SelectItem value="medium">Média (100-999 funcionários)</SelectItem>
                              <SelectItem value="large">Grande (1000+ funcionários)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="employeeCountType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Contagem de Funcionários</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-employee-count-type">
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="range">Faixa de funcionários</SelectItem>
                              <SelectItem value="exact">Número exato</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="employeeCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {form.watch("employeeCountType") === "exact" 
                              ? "Número Exato de Funcionários"
                              : "Faixa de Funcionários"
                            }
                          </FormLabel>
                          <FormControl>
                            {form.watch("employeeCountType") === "exact" ? (
                              <Input
                                type="number"
                                placeholder="Ex: 50"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                data-testid="input-employee-count-exact"
                              />
                            ) : (
                              <Select onValueChange={field.onChange} value={field.value as string}>
                                <SelectTrigger data-testid="select-employee-count-range">
                                  <SelectValue placeholder="Selecione a faixa" />
                                </SelectTrigger>
                                <SelectContent>
                                  {employeeRanges.map((range) => (
                                    <SelectItem key={range} value={range}>
                                      {range}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Step 2: Business Sectors */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="sectors"
                      render={() => (
                        <FormItem>
                          <FormLabel>Setores de Atuação da Empresa *</FormLabel>
                          <p className="text-sm text-muted-foreground mb-4">
                            Selecione os setores em que sua empresa atua:
                          </p>
                          <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto border rounded-lg p-4">
                            {businessSectors.map((sector) => (
                              <FormField
                                key={sector}
                                control={form.control}
                                name="sectors"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={sector}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(sector)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...field.value, sector])
                                              : field.onChange(
                                                  field.value?.filter(
                                                    (value) => value !== sector
                                                  )
                                                )
                                          }}
                                          data-testid={`checkbox-sector-${sector.toLowerCase().replace(/ /g, '-')}`}
                                        />
                                      </FormControl>
                                      <FormLabel className="text-sm font-normal">
                                        {sector}
                                      </FormLabel>
                                    </FormItem>
                                  )
                                }}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Custom Sectors */}
                    <div className="space-y-3">
                      <FormLabel>Adicionar Setor Personalizado</FormLabel>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Digite um setor não listado acima"
                          value={customSector}
                          onChange={(e) => setCustomSector(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addCustomSector();
                            }
                          }}
                          data-testid="input-custom-sector"
                        />
                        <Button 
                          type="button" 
                          onClick={addCustomSector}
                          variant="outline"
                          size="sm"
                          disabled={!customSector.trim()}
                          data-testid="button-add-custom-sector"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Display Custom Sectors */}
                      {form.watch("customSectors").length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Setores Personalizados:</p>
                          <div className="flex flex-wrap gap-2">
                            {form.watch("customSectors").map((sector) => (
                              <div
                                key={sector}
                                className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm"
                              >
                                <span>{sector}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeCustomSector(sector)}
                                  className="h-4 w-4 p-0 hover:bg-blue-200"
                                  data-testid={`button-remove-custom-sector-${sector.toLowerCase().replace(/ /g, '-')}`}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 3: Employee Count */}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="primaryContact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Contato Principal *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Digite o nome do responsável"
                              {...field}
                              data-testid="input-primary-contact"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="(11) 99999-9999"
                              {...field}
                              data-testid="input-phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Step 4: Contact and Additional Info */}
                {currentStep === 4 && (
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="primaryContact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Contato Principal *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Digite o nome do responsável"
                              {...field}
                              data-testid="input-primary-contact"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="(11) 99999-9999"
                              {...field}
                              data-testid="input-phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Endereço da Empresa</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Endereço completo da empresa"
                              rows={3}
                              {...field}
                              data-testid="textarea-address"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-6">
                  {currentStep > 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={prevStep}
                      data-testid="button-previous"
                    >
                      Anterior
                    </Button>
                  ) : (
                    <div></div>
                  )}

                  {currentStep < 4 ? (
                    <Button
                      type="button"
                      onClick={nextStep}
                      data-testid="button-next"
                    >
                      Próximo
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={createCompanyProfileMutation.isPending}
                      data-testid="button-submit"
                    >
                      {createCompanyProfileMutation.isPending ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Criando...
                        </div>
                      ) : (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Finalizar Configuração
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}