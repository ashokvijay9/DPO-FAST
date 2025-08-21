import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, FileCheck, FileText, CheckCircle, Rocket, Crown } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-primary to-primary-dark text-primary-foreground">
        <div className="container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Conformidade LGPD Simplificada
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-primary-foreground/90">
              Avalie e monitore a adequação da sua empresa à Lei Geral de Proteção de Dados 
              com nossa plataforma inteligente e relatórios personalizados.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                variant="secondary"
                className="bg-white text-primary hover:bg-gray-100"
                onClick={handleLogin}
                data-testid="button-start-assessment"
              >
                <Rocket className="mr-2 h-5 w-5" />
                Começar Avaliação
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-primary"
                onClick={handleLogin}
                data-testid="button-login"
              >
                Já tenho conta
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Por que escolher o DPO Fast?
            </h2>
            <p className="text-xl text-muted-foreground">
              Simplifique sua jornada de conformidade com LGPD
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="h-full feature-card hover:shadow-lg transition-all duration-300">
              <CardContent className="p-8 text-center">
                <div className="mb-6">
                  <CheckCircle className="h-16 w-16 text-primary mx-auto" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Avaliação Inteligente</h3>
                <p className="text-muted-foreground">
                  Questionário estruturado baseado nos pilares da LGPD para identificar gaps de conformidade.
                </p>
              </CardContent>
            </Card>
            
            <Card className="h-full feature-card hover:shadow-lg transition-all duration-300">
              <CardContent className="p-8 text-center">
                <div className="mb-6">
                  <FileText className="h-16 w-16 text-green-600 mx-auto" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Relatórios Profissionais</h3>
                <p className="text-muted-foreground">
                  Gere relatórios detalhados com plano de ação personalizado para sua empresa.
                </p>
              </CardContent>
            </Card>
            
            <Card className="h-full feature-card hover:shadow-lg transition-all duration-300">
              <CardContent className="p-8 text-center">
                <div className="mb-6">
                  <Shield className="h-16 w-16 text-yellow-600 mx-auto" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Gestão Segura</h3>
                <p className="text-muted-foreground">
                  Armazene e gerencie documentos de conformidade com segurança e auditoria completa.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-secondary/10">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Pronto para começar sua jornada LGPD?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Faça login e comece sua avaliação de conformidade hoje mesmo.
          </p>
          <Button 
            size="lg"
            onClick={handleLogin}
            data-testid="button-get-started"
          >
            <Shield className="mr-2 h-5 w-5" />
            Começar Agora
          </Button>
        </div>
      </section>
    </div>
  );
}
