import { useState } from "react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Shield, FileText, Upload, AlertTriangle } from "lucide-react";

interface PlanLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  limitType: 'documents' | 'reports' | 'features';
  currentPlan: string;
  currentCount?: number;
  maxAllowed?: number;
}

export default function PlanLimitModal({
  isOpen,
  onClose,
  limitType,
  currentPlan,
  currentCount,
  maxAllowed
}: PlanLimitModalProps) {
  const [, navigate] = useLocation();

  const handleUpgrade = () => {
    window.location.href = '/subscription';
    onClose();
  };

  const getTitle = () => {
    switch (limitType) {
      case 'documents':
        return 'Limite de Documentos Atingido';
      case 'reports':
        return 'Limite de Relatórios Atingido';
      case 'features':
        return 'Funcionalidade Premium';
      default:
        return 'Limite do Plano Atingido';
    }
  };

  const getDescription = () => {
    switch (limitType) {
      case 'documents':
        return `Você atingiu o limite de ${maxAllowed} documentos do plano ${currentPlan === 'free' ? 'Gratuito' : 'Básico'}. Para fazer upload de mais documentos, faça upgrade para um plano superior.`;
      case 'reports':
        return `Você atingiu o limite de relatórios mensais do plano ${currentPlan === 'free' ? 'Gratuito' : 'Básico'}. Para gerar mais relatórios, faça upgrade para o plano Pro.`;
      case 'features':
        return `Esta funcionalidade está disponível apenas no plano Pro. Faça upgrade para ter acesso a recursos avançados e ilimitados.`;
      default:
        return 'Você atingiu o limite do seu plano atual. Faça upgrade para continuar usando todas as funcionalidades.';
    }
  };

  const getIcon = () => {
    switch (limitType) {
      case 'documents':
        return <Upload className="h-8 w-8 text-blue-600" />;
      case 'reports':
        return <FileText className="h-8 w-8 text-green-600" />;
      case 'features':
        return <Crown className="h-8 w-8 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-8 w-8 text-orange-600" />;
    }
  };

  const planComparison = [
    {
      plan: 'Básico',
      price: 'R$ 50/mês',
      icon: Shield,
      features: [
        'Até 5 documentos',
        '1 relatório por mês',
        'Suporte por e-mail'
      ]
    },
    {
      plan: 'Pro',
      price: 'R$ 100/mês',
      icon: Crown,
      popular: true,
      features: [
        'Documentos ilimitados',
        'Relatórios ilimitados',
        'Funcionalidades avançadas',
        'Suporte prioritário'
      ]
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            {getIcon()}
          </div>
          <DialogTitle className="text-center">{getTitle()}</DialogTitle>
          <DialogDescription className="text-center">
            {getDescription()}
          </DialogDescription>
        </DialogHeader>

        {limitType === 'documents' && currentCount && maxAllowed && (
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">{currentCount}/{maxAllowed}</span> documentos utilizados
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${(currentCount / maxAllowed) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="space-y-3">
          {planComparison.map((planOption, index) => {
            const Icon = planOption.icon;
            const isRecommended = planOption.popular;
            
            return (
              <div 
                key={index}
                className={`border rounded-lg p-3 ${isRecommended ? 'border-primary bg-primary/5' : 'border-gray-200'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Icon className={`h-5 w-5 ${isRecommended ? 'text-primary' : 'text-gray-600'}`} />
                    <span className="font-semibold">{planOption.plan}</span>
                    {isRecommended && (
                      <Badge variant="default" className="text-xs">
                        Recomendado
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm font-medium">{planOption.price}</span>
                </div>
                <ul className="text-xs space-y-1">
                  {planOption.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center space-x-2">
                      <div className="w-1 h-1 bg-gray-400 rounded-full" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Continuar com Plano Atual
          </Button>
          <Button onClick={handleUpgrade} className="w-full sm:w-auto">
            <Crown className="h-4 w-4 mr-2" />
            Fazer Upgrade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}