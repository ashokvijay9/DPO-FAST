import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Users, Phone, MapPin, Check, ChevronRight } from "lucide-react";
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

const departments = [
  "Recursos Humanos",
  "Tecnologia da Informação", 
  "Marketing",
  "Vendas",
  "Financeiro",
  "Jurídico",
  "Operações",
  "Atendimento ao Cliente",
  "Compras",
  "Produção",
  "Qualidade",
  "Logística",
  "Outros"
];

const industries = [
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
  "Outros"
];

export default function CompanyOnboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const form = useForm<CompanyOnboarding>({
    resolver: zodResolver(companyOnboardingSchema),
    defaultValues: {
      companyName: "",
      departments: [],
      companySize: "small",
      employeeCount: 1,
      industry: "",
      primaryContact: "",
      phone: "",
      address: "",
    },
  });

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
                   currentStep === 2 ? ['departments'] :
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
              {currentStep === 2 && "Departamentos"}
              {currentStep === 3 && "Contato Principal"}
              {currentStep === 4 && "Informações Adicionais"}
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
                      name="employeeCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número de Funcionários</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Ex: 50"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              data-testid="input-employee-count"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Step 2: Departments */}
                {currentStep === 2 && (
                  <FormField
                    control={form.control}
                    name="departments"
                    render={() => (
                      <FormItem>
                        <FormLabel>Departamentos da Empresa *</FormLabel>
                        <p className="text-sm text-muted-foreground mb-4">
                          Selecione os departamentos que existem na sua empresa:
                        </p>
                        <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">
                          {departments.map((department) => (
                            <FormField
                              key={department}
                              control={form.control}
                              name="departments"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={department}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(department)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, department])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== department
                                                )
                                              )
                                        }}
                                        data-testid={`checkbox-department-${department.toLowerCase().replace(/ /g, '-')}`}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-sm font-normal">
                                      {department}
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
                )}

                {/* Step 3: Primary Contact */}
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

                {/* Step 4: Additional Info */}
                {currentStep === 4 && (
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="industry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Setor de Atuação</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-industry">
                                <SelectValue placeholder="Selecione o setor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {industries.map((industry) => (
                                <SelectItem key={industry} value={industry}>
                                  {industry}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Endereço</FormLabel>
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