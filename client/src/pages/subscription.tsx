import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Crown, Shield, Star, CreditCard } from "lucide-react";
import { useLocation } from "wouter";

interface SubscriptionStatus {
  subscriptionStatus: string;
  subscriptionPlan: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export default function Subscription() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location] = useLocation();
  const [isCreatingCheckout, setIsCreatingCheckout] = useState<string | null>(null);

  // Check for success/cancel query params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      toast({
        title: "Assinatura Ativada!",
        description: "Sua assinatura foi processada com sucesso. Bem-vindo ao DPO Fast!",
      });
      // Clean URL
      window.history.replaceState({}, '', '/subscription');
    } else if (urlParams.get('canceled') === 'true') {
      toast({
        title: "Pagamento Cancelado",
        description: "O processo de pagamento foi cancelado. Você pode tentar novamente a qualquer momento.",
        variant: "destructive",
      });
      // Clean URL
      window.history.replaceState({}, '', '/subscription');
    }
  }, [toast]);

  const { data: subscriptionStatus, isLoading: statusLoading } = useQuery<SubscriptionStatus>({
    queryKey: ['/api/subscription/status'],
    enabled: !!user,
  });

  const createCheckoutMutation = useMutation({
    mutationFn: async ({ priceId, plan }: { priceId: string; plan: string }) => {
      const response = await apiRequest('POST', '/api/subscription/create-checkout', {
        priceId,
        plan,
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Redirect to Stripe Checkout
      window.location.href = data.sessionUrl;
    },
    onError: (error) => {
      toast({
        title: "Erro ao Processar Pagamento",
        description: "Não foi possível iniciar o processo de pagamento. Tente novamente.",
        variant: "destructive",
      });
      setIsCreatingCheckout(null);
    },
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/subscription/cancel', {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Assinatura Cancelada",
        description: "Sua assinatura será cancelada no final do período de cobrança atual.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
    },
    onError: () => {
      toast({
        title: "Erro ao Cancelar",
        description: "Não foi possível cancelar a assinatura. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleSubscribe = async (priceId: string, plan: string) => {
    setIsCreatingCheckout(plan);
    createCheckoutMutation.mutate({ priceId, plan });
  };

  const plans = [
    {
      id: "basic",
      name: "Básico",
      price: "R$ 50",
      period: "/mês",
      priceId: "basic_monthly", // You'll need to replace this with actual Stripe Price ID
      description: "Ideal para pequenas empresas iniciando na conformidade LGPD",
      features: [
        "Questionário LGPD com 10 perguntas",
        "1 relatório PDF por mês",
        "Gerenciamento de até 5 documentos",
        "Lista de tarefas básica",
        "Suporte por e-mail"
      ],
      notIncluded: [
        "Relatórios ilimitados",
        "Documentos ilimitados",
        "Suporte prioritário"
      ],
      popular: false,
      color: "border-gray-200"
    },
    {
      id: "pro",
      name: "Pro",
      price: "R$ 100",
      period: "/mês",
      priceId: "pro_monthly", // You'll need to replace this with actual Stripe Price ID
      description: "Para empresas que precisam de conformidade aprofundada",
      features: [
        "Questionário LGPD completo e ilimitado",
        "Relatórios PDF ilimitados",
        "Gerenciamento de documentos ilimitado",
        "Lista de tarefas avançada",
        "Auditoria de segurança",
        "Suporte prioritário via chat",
        "Integração completa",
        "Atualizações prioritárias"
      ],
      notIncluded: [],
      popular: true,
      color: "border-primary"
    }
  ];

  if (authLoading || statusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Você precisa estar logado para ver os planos de assinatura.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentPlan = subscriptionStatus?.subscriptionPlan || 'free';
  const isActive = subscriptionStatus?.subscriptionStatus === 'active';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Planos de Assinatura</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Escolha o plano ideal para sua empresa e garanta a conformidade com a LGPD
        </p>
      </div>

      {/* Current Status */}
      {isActive && (
        <div className="mb-8">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <div>
                    <h3 className="font-semibold text-green-800">Assinatura Ativa</h3>
                    <p className="text-green-600">
                      Plano {currentPlan === 'basic' ? 'Básico' : 'Pro'} • Status: Ativo
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => cancelSubscriptionMutation.mutate()}
                  disabled={cancelSubscriptionMutation.isPending}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                  data-testid="button-cancel-subscription"
                >
                  {cancelSubscriptionMutation.isPending ? "Cancelando..." : "Cancelar Assinatura"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {plans.map((plan) => {
          const isCurrent = isActive && currentPlan === plan.id;
          const isDowngrade = isActive && currentPlan === 'pro' && plan.id === 'basic';
          
          return (
            <Card 
              key={plan.id} 
              className={`relative ${plan.color} ${plan.popular ? 'ring-2 ring-primary' : ''}`}
              data-testid={`plan-card-${plan.id}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-white px-4 py-1 text-sm">
                    <Star className="h-3 w-3 mr-1" />
                    Mais Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  {plan.id === 'basic' ? (
                    <Shield className="h-6 w-6 text-blue-600" />
                  ) : (
                    <Crown className="h-6 w-6 text-yellow-600" />
                  )}
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                </div>
                <div className="text-4xl font-bold text-primary mb-2">
                  {plan.price}
                  <span className="text-lg font-normal text-muted-foreground">{plan.period}</span>
                </div>
                <CardDescription className="text-base">{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                  {plan.notIncluded.map((feature, index) => (
                    <div key={index} className="flex items-start space-x-3 opacity-60">
                      <XCircle className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>

              <CardFooter>
                {isCurrent ? (
                  <Button disabled className="w-full" data-testid={`button-current-${plan.id}`}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Plano Atual
                  </Button>
                ) : isDowngrade ? (
                  <Button disabled variant="outline" className="w-full" data-testid={`button-downgrade-${plan.id}`}>
                    Downgrade Não Disponível
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handleSubscribe(plan.priceId, plan.id)}
                    disabled={isCreatingCheckout === plan.id}
                    data-testid={`button-subscribe-${plan.id}`}
                  >
                    {isCreatingCheckout === plan.id ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        <span>Processando...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <CreditCard className="h-4 w-4" />
                        <span>{isActive ? 'Fazer Upgrade' : 'Assinar Agora'}</span>
                      </div>
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Additional Information */}
      <div className="max-w-2xl mx-auto mt-12 text-center">
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3">Informações Importantes</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• Pagamentos processados de forma segura via Stripe</p>
              <p>• Cancele a qualquer momento, sem taxas extras</p>
              <p>• Suporte dedicado para todos os planos</p>
              <p>• Dados protegidos conforme LGPD</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}