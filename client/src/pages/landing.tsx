import { useState, useEffect, useRef } from 'react';
import { Shield, FileText, CheckCircle, Rocket, Users, BarChart3, BadgeCheck, Star, ArrowRight, Building, Lock, Zap, Target, ChevronRight, Menu, X } from 'lucide-react';

const DPOFastLanding = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  const sections = useRef<Record<string, HTMLElement | null>>({});
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Configurar Intersection Observer para detectar a seção ativa
    observer.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.5 }
    );

    // Observar todas as seções
    Object.values(sections.current).forEach((section) => {
      if (section) {
        observer.current.observe(section);
      }
    });

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, []);

  const scrollToSection = (sectionId: string) => {
    const section = sections.current[sectionId];
    if (section) {
      window.scrollTo({
        top: section.offsetTop - 80,
        behavior: 'smooth'
      });
      setIsMenuOpen(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Email cadastrado:', email);
    setIsSubmitted(true);
    setEmail('');

    // Reset do estado após 3 segundos
    setTimeout(() => {
      setIsSubmitted(false);
    }, 3000);
  };

  const features = [
    {
      icon: <Target className="h-8 w-8" />,
      title: "Avaliação Inteligente",
      description: "Questionário dinâmico adaptado aos setores da sua empresa para identificar gaps de conformidade."
    },
    {
      icon: <BarChart3 className="h-8 w-8" />,
      title: "Relatórios Detalhados",
      description: "Gere relatórios completos com plano de ação personalizado para cada setor da sua empresa."
    },
    {
      icon: <Lock className="h-8 w-8" />,
      title: "Gestão Segura",
      description: "Armazene e gerencie documentos com segurança e controle de acesso por setor."
    },
    {
      icon: <Zap className="h-8 w-8" />,
      title: "Implementação Rápida",
      description: "Processo simplificado para colocar sua empresa em conformidade em tempo recorde."
    }
  ];

  const steps = [
    { number: "01", title: "Cadastro", description: "Configure os setores da sua empresa" },
    { number: "02", title: "Questionário", description: "Responda perguntas específicas por setor" },
    { number: "03", title: "Relatório", description: "Receba análise detalhada com plano de ação" },
    { number: "04", title: "Implementação", description: "Execute as recomendações com nosso suporte" }
  ];

  const testimonials = [
    {
      text: "O DPO Fast simplificou enormemente nosso processo de adequação à LGPD. Os relatórios setoriais nos deram clareza sobre onde focar nossos esforços.",
      author: "Carlos Silva",
      role: "DPO - Empresa VarejoPlus",
      stars: 5
    },
    {
      text: "A plataforma é intuitiva e os questionários são muito relevantes para nosso setor. Economizamos semanas de trabalho com a avaliação automatizada.",
      author: "Marina Oliveira",
      role: "Compliance - SaúdeTotal",
      stars: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="fixed w-full bg-white/90 backdrop-blur-sm z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center mr-3 shadow-md">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">DPO Fast</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            <a 
              href="#home" 
              className={`font-medium transition-colors ${activeSection === 'home' ? 'text-indigo-600' : 'text-gray-600 hover:text-indigo-600'}`}
              onClick={(e) => { e.preventDefault(); scrollToSection('home'); }}
            >
              Início
            </a>
            <a 
              href="#features" 
              className={`font-medium transition-colors ${activeSection === 'features' ? 'text-indigo-600' : 'text-gray-600 hover:text-indigo-600'}`}
              onClick={(e) => { e.preventDefault(); scrollToSection('features'); }}
            >
              Recursos
            </a>
            <a 
              href="#how-it-works" 
              className={`font-medium transition-colors ${activeSection === 'how-it-works' ? 'text-indigo-600' : 'text-gray-600 hover:text-indigo-600'}`}
              onClick={(e) => { e.preventDefault(); scrollToSection('how-it-works'); }}
            >
              Como Funciona
            </a>
            <a 
              href="#testimonials" 
              className={`font-medium transition-colors ${activeSection === 'testimonials' ? 'text-indigo-600' : 'text-gray-600 hover:text-indigo-600'}`}
              onClick={(e) => { e.preventDefault(); scrollToSection('testimonials'); }}
            >
              Avaliações
            </a>
          </nav>

          <button 
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl hover:shadow-lg transition-all font-medium hidden md:block"
            onClick={() => window.location.href = '/api/login'}
          >
            Entrar / Cadastrar
          </button>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden text-gray-600"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 py-4 px-4">
            <div className="flex flex-col space-y-4">
              <a 
                href="#home" 
                className={`font-medium py-2 ${activeSection === 'home' ? 'text-indigo-600' : 'text-gray-600'}`}
                onClick={(e) => { e.preventDefault(); scrollToSection('home'); }}
              >
                Início
              </a>
              <a 
                href="#features" 
                className={`font-medium py-2 ${activeSection === 'features' ? 'text-indigo-600' : 'text-gray-600'}`}
                onClick={(e) => { e.preventDefault(); scrollToSection('features'); }}
              >
                Recursos
              </a>
              <a 
                href="#how-it-works" 
                className={`font-medium py-2 ${activeSection === 'how-it-works' ? 'text-indigo-600' : 'text-gray-600'}`}
                onClick={(e) => { e.preventDefault(); scrollToSection('how-it-works'); }}
              >
                Como Funciona
              </a>
              <a 
                href="#testimonials" 
                className={`font-medium py-2 ${activeSection === 'testimonials' ? 'text-indigo-600' : 'text-gray-600'}`}
                onClick={(e) => { e.preventDefault(); scrollToSection('testimonials'); }}
              >
                Avaliações
              </a>
              <button 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium mt-4"
                onClick={() => window.location.href = '/api/login'}
              >
                Entrar / Cadastrar
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section 
        id="home" 
        ref={el => sections.current['home'] = el}
        className="pt-32 pb-16 container mx-auto px-4 flex flex-col md:flex-row items-center"
      >
        <div className="md:w-1/2 mb-10 md:mb-0">
          <div 
            className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm mb-6 animate-fade-in"
            style={{ animationDelay: '0.1s' }}
          >
            <BadgeCheck className="h-5 w-5 text-indigo-600" />
            <span className="text-sm font-medium">Solução completa em conformidade LGPD</span>
          </div>

          <h1 
            className="text-4xl md:text-5xl font-bold text-gray-800 leading-tight mb-6 animate-fade-in"
            style={{ animationDelay: '0.2s' }}
          >
            Adequação à LGPD de forma <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">rápida e descomplicada</span>
          </h1>

          <p 
            className="text-gray-600 text-lg mb-8 animate-fade-in"
            style={{ animationDelay: '0.3s' }}
          >
            Automatize o processo de conformidade com a Lei Geral de Proteção de Dados. 
            Questionários dinâmicos, relatórios personalizados e gestão de documentos por setor.
          </p>

          <div 
            className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 animate-fade-in"
            style={{ animationDelay: '0.4s' }}
          >
            <button 
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3.5 rounded-xl hover:shadow-lg transition-all font-medium flex items-center transform hover:-translate-y-1"
              onClick={() => window.location.href = '/api/login'}
            >
              <Rocket className="mr-2 h-5 w-5" />
              Acessar Sistema
            </button>
            <button 
              className="border border-indigo-600 text-indigo-600 px-6 py-3.5 rounded-xl hover:bg-indigo-50 transition-all font-medium flex items-center transform hover:-translate-y-1"
              onClick={() => scrollToSection('features')}
            >
              Ver Recursos
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
          </div>

          <div 
            className="mt-8 flex flex-col sm:flex-row items-center gap-4 text-sm text-gray-500 animate-fade-in"
            style={{ animationDelay: '0.5s' }}
          >
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ))}
              <span className="ml-2">4.9/5 de 300+ avaliações</span>
            </div>
            <div className="hidden sm:block h-4 w-px bg-gray-300"></div>
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-1" />
              <span>+1.200 empresas utilizando</span>
            </div>
          </div>
        </div>

        <div 
          className="md:w-1/2 flex justify-center animate-float"
          style={{ animationDelay: '0.6s' }}
        >
          <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md transform hover:-translate-y-1 transition-transform duration-300">
            <div className="bg-gradient-to-br from-blue-100 to-indigo-100 h-48 rounded-xl mb-6 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-white rounded-xl shadow-md flex items-center justify-center mx-auto mb-3">
                  <Shield className="h-8 w-8 text-indigo-600" />
                </div>
                <p className="text-indigo-600 font-medium">Dashboard DPO Fast</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-xl transform hover:scale-105 transition-transform duration-300">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-sm text-blue-600 font-medium">Questionários</p>
              </div>
              <div className="bg-green-50 p-4 rounded-xl transform hover:scale-105 transition-transform duration-300">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-sm text-green-600 font-medium">Relatórios</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 text-gray-500">
            {[
              { value: "1.200+", label: "Empresas atendidas" },
              { value: "98%", label: "Satisfação dos clientes" },
              { value: "15", label: "Setores de atuação" },
              { value: "24/7", label: "Suporte especializado" }
            ].map((item, index) => (
              <div 
                key={index} 
                className="text-center animate-count-up"
                style={{ animationDelay: `${0.1 * index}s` }}
              >
                <div className="text-3xl font-bold text-indigo-600">{item.value}</div>
                <div className="text-sm">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section 
        id="features" 
        ref={el => sections.current['features'] = el}
        className="py-20 bg-gradient-to-b from-white to-blue-50"
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4 animate-fade-in">
              Tudo que você precisa para conformidade LGPD
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Nossa plataforma oferece um fluxo completo de adequação, desde a avaliação inicial até a gestão contínua de documentos
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 transform hover:-translate-y-2 animate-fade-in"
                style={{ animationDelay: `${0.2 + index * 0.1}s` }}
              >
                <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-bold text-lg mb-2 text-gray-800">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section 
        id="how-it-works" 
        ref={el => sections.current['how-it-works'] = el}
        className="py-20 bg-white"
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4 animate-fade-in">
              Como funciona o DPO Fast
            </h2>
            <p className="text-xl text-gray-600 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Um processo simplificado em 4 passos para sua conformidade LGPD
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div 
                key={index} 
                className="text-center group animate-fade-in"
                style={{ animationDelay: `${0.2 + index * 0.1}s` }}
              >
                <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  {step.number}
                </div>
                <h3 className="font-semibold text-lg mb-2 text-gray-800">{step.title}</h3>
                <p className="text-gray-600 text-sm">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section 
        id="testimonials" 
        ref={el => sections.current['testimonials'] = el}
        className="py-20 bg-gradient-to-b from-blue-50 to-white"
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4 animate-fade-in">
              O que nossos clientes dizem
            </h2>
            <p className="text-xl text-gray-600 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Empresas que já utilizam o DPO Fast para sua conformidade LGPD
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index} 
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transform hover:-translate-y-1 transition-transform duration-300 animate-fade-in"
                style={{ animationDelay: `${0.2 + index * 0.1}s` }}
              >
                <div className="flex mb-4">
                  {[...Array(testimonial.stars)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600 mb-6 italic">"{testimonial.text}"</p>
                <div>
                  <div className="font-semibold text-gray-800">{testimonial.author}</div>
                  <div className="text-sm text-gray-500">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section 
        id="cta" 
        ref={el => sections.current['cta'] = el}
        className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
      >
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 animate-fade-in">
            Pronto para simplificar sua conformidade LGPD?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Junte-se a mais de 1.200 empresas que já utilizam o DPO Fast para garantir conformidade com a lei de proteção de dados.
          </p>

          {!isSubmitted ? (
            <form 
              onSubmit={handleSubmit} 
              className="max-w-md mx-auto flex flex-col sm:flex-row gap-4 animate-fade-in"
              style={{ animationDelay: '0.2s' }}
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Seu e-mail corporativo"
                className="flex-grow px-4 py-3 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                required
              />
              <button 
                type="button"
                className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-medium hover:bg-gray-100 transition flex items-center justify-center transform hover:scale-105"
                onClick={() => window.location.href = '/api/login'}
              >
                Acessar Sistema
                <ChevronRight className="ml-2 h-5 w-5" />
              </button>
            </form>
          ) : (
            <div className="bg-green-500 inline-block px-6 py-3 rounded-xl animate-fade-in">
              Obrigado! Em breve entraremos em contato.
            </div>
          )}

          <p className="text-sm mt-6 text-blue-100 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            Não é necessário cartão de crédito • Teste gratuito de 14 dias
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-2">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">DPO Fast</span>
              </div>
              <p className="text-gray-400 text-sm">
                A solução completa para adequação à LGPD
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-4">Produto</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition">Recursos</a></li>
                <li><a href="#" className="hover:text-white transition">Planos</a></li>
                <li><a href="#" className="hover:text-white transition">FAQ</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition">Sobre nós</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Contato</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition">Termos de uso</a></li>
                <li><a href="#" className="hover:text-white transition">Privacidade</a></li>
                <li><a href="#" className="hover:text-white transition">Cookies</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400 text-sm">
            <p>
              © {new Date().getFullYear()} DPO Fast. Todos os direitos reservados | Desenvolvido por{' '}
              <a 
                href="https://felipe-84bca.web.app/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Felipe Sadrak
              </a>
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default DPOFastLanding;