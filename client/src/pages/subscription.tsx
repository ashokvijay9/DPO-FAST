import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Rocket, Crown, Shield, Cloud, Smartphone, RotateCcw } from "lucide-react";

export default function Subscription() {
  const handleSubscription = (plan: string) => {
    alert(`Redirecionando para checkout do plano ${plan}...`);
    // TODO: Implement Stripe checkout integration
  };

  const plans = [
    {
      id: 'basic',
      name: 'Básico',
      description: 'Ideal para pequenas empresas',
      monthlyPrice: 197,
      yearlyPrice: 1970,
      icon: Sparkles,
      iconColor: 'text-green-600',
      features: [
        'Questionário completo LGPD',
        'Relatórios básicos em PDF',
        'Upload até 10 documentos',
        'Suporte por e-mail',
        'Dashboard de conformidade',
      ],
      buttonVariant: 'outline' as const,
    },
    {
      id: 'professional',
      name: 'Profissional',
      description: 'Para empresas em crescimento',
      monthlyPrice: 497,
      yearlyPrice: 4970,
      icon: Rocket,
      iconColor: 'text-primary',
      featured: true,
      features: [
        'Tudo do plano Básico',
        'Relatórios avançados personalizados',
        'Upload ilimitado de documentos',
        'Auditoria e histórico completo',
        'Suporte prioritário por chat',
        'Templates de políticas LGPD',
        'Notificações automáticas',
      ],
      buttonVariant: 'default' as const,
    },
    {
      id: 'enterprise',
      name: 'Empresarial',
      description: 'Para grandes organizações',
      monthlyPrice: 997,
      yearlyPrice: 9970,
      icon: Crown,
      iconColor: 'text-yellow-600',
      features: [
        'Tudo do plano Profissional',
        'Múltiplas empresas/filiais',
        'API para integrações',
        'Consultoria especializada',
        'Suporte 24/7 por telefone',
        'Treinamentos personalizados',
        'SLA garantido',
      ],
      buttonVariant: 'outline' as const,
      buttonText: 'Falar com Vendas',
    },
  ];

  const commonFeatures = [
    { icon: Shield, text: 'SSL e segurança avançada' },
    { icon: Cloud, text: 'Backup automático' },
    { icon: Smartphone, text: 'Acesso mobile' },
    { icon: RotateCcw, text: 'Atualizações automáticas' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Escolha o Plano Ideal</h1>
          <p className="text-xl text-muted-foreground">
            Selecione o plano que melhor atende às necessidades da sua empresa
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <Card 
                key={plan.id} 
                className={`relative transition-all duration-300 hover:shadow-xl ${
                  plan.featured ? 'scale-105 border-primary shadow-lg' : 'hover:-translate-y-2'
                }`}
                data-testid={`plan-card-${plan.id}`}
              >
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1">
                      Mais Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-4">
                  <div className="mb-4">
                    <Icon className={`h-12 w-12 mx-auto ${plan.iconColor}`} />
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <p className="text-muted-foreground">{plan.description}</p>
                </CardHeader>
                
                <CardContent className="text-center">
                  <div className="mb-6">
                    <div className="text-4xl font-bold mb-2">
                      R$ {plan.monthlyPrice}
                      <span className="text-lg font-normal text-muted-foreground">/mês</span>
                    </div>
                    <p className="text-green-600 font-medium">
                      ou R$ {plan.yearlyPrice}/ano (2 meses grátis)
                    </p>
                  </div>
                  
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start text-left">
                        <Check className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    variant={plan.buttonVariant}
                    className="w-full"
                    size="lg"
                    onClick={() => handleSubscription(plan.id)}
                    data-testid={`button-subscribe-${plan.id}`}
                  >
                    {plan.buttonText || (plan.featured ? 'Assinar Agora' : 'Começar Agora')}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Common Features */}
        <div className="text-center">
          <p className="text-lg text-muted-foreground mb-6">Todos os planos incluem:</p>
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            {commonFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="flex items-center bg-secondary/50 rounded-full px-4 py-2">
                  <Icon className="h-5 w-5 mr-2 text-primary" />
                  <span className="text-sm font-medium">{feature.text}</span>
                </div>
              );
            })}
          </div>
          
          <div className="bg-muted/50 rounded-lg p-6">
            <p className="text-muted-foreground">
              <strong>Teste grátis por 14 dias</strong> • Cancele a qualquer momento • Sem compromisso
            </p>
          </div>
        </div>

        {/* FAQ or Additional Info */}
        <div className="mt-12 text-center">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8">
              <h3 className="text-xl font-semibold mb-4">Precisa de ajuda para escolher?</h3>
              <p className="text-muted-foreground mb-4">
                Nossa equipe está pronta para ajudar você a encontrar o plano ideal para sua empresa.
              </p>
              <Button variant="outline" data-testid="button-contact-sales">
                Falar com um Especialista
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
