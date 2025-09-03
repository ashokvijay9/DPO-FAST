import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { ChevronLeft, ChevronRight, Save, Check, FileIcon, Upload, BookOpen, Target, ArrowRight, ArrowLeft, HelpCircle, FileCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useLocation, useRoute } from "wouter";

export default function Questionnaire() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  
  // Get sectorId from URL parameters if available
  const [match, params] = useRoute("/questionnaire/:sectorId");
  const sectorId = params?.sectorId;

  // Redirect to sector selection if no sectorId is provided
  useEffect(() => {
    if (!sectorId && isAuthenticated) {
      navigate("/questionnaire-sectors");
      return;
    }
  }, [sectorId, isAuthenticated, navigate]);
  
  const [showInitialOptions, setShowInitialOptions] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string | string[]>>({});
  const [observations, setObservations] = useState<Record<number, string>>({});
  const [files, setFiles] = useState<Record<number, FileList | null>>({});

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading]);

  // Fetch questions based on whether we have a sectorId or not
  const { data: questionsData } = useQuery({
    queryKey: sectorId ? [`/api/questionnaire/questions/${sectorId}`] : ["/api/questionnaire/questions"],
    enabled: isAuthenticated,
  });

  const { data: existingResponse } = useQuery({
    queryKey: sectorId ? [`/api/questionnaire/response/${sectorId}`] : ["/api/questionnaire/response"],
    enabled: isAuthenticated,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = sectorId ? `/api/questionnaire/save/${sectorId}` : "/api/questionnaire/save";
      const response = await apiRequest("POST", endpoint, data);
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Sucesso!",
        description: "Questionário salvo com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/compliance-tasks"] });
      
      // Redirect to dashboard if questionnaire is completed
      if (variables.isComplete) {
        setTimeout(() => {
          navigate("/");
        }, 1000); // Wait 1 second to show the success toast
      }
      
      // Refresh the query to update the showInitialOptions state
      queryClient.invalidateQueries({ queryKey: ["/api/questionnaire/response"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao salvar questionário",
        variant: "destructive",
      });
    },
  });

  const questions = (questionsData as any)?.questions || [];
  const totalQuestions = questions.length;

  // Load existing answers if available
  useEffect(() => {
    if ((existingResponse as any)?.answer && questions.length > 0) {
      try {
        const existingAnswers = JSON.parse((existingResponse as any).answer);
        const answersObj: Record<number, string | string[]> = {};
        existingAnswers.forEach((answer: string, index: number) => {
          const questionData = questions[index];
          if (questionData?.type === "multiple" && answer) {
            // For multiple choice questions, split the string back into an array
            answersObj[index] = answer.split(", ").filter(item => item.trim() !== "");
          } else {
            answersObj[index] = answer;
          }
        });
        setAnswers(answersObj);
      } catch (error) {
        console.error("Error parsing existing answers:", error);
      }
    }
  }, [existingResponse]);

  // Check if user has existing responses to show initial options
  useEffect(() => {
    if (existingResponse && (existingResponse as any)?.answer) {
      setShowInitialOptions(true);
    } else {
      setShowInitialOptions(false);
    }
  }, [existingResponse]);

  const handleStartNewQuestionnaire = () => {
    // Reset all answers for new questionnaire
    setAnswers({});
    setObservations({});
    setFiles({});
    setCurrentQuestion(0);
    setShowInitialOptions(false);
    // Store that this is a new questionnaire to reset tasks
    sessionStorage.setItem('isNewQuestionnaire', 'true');
  };

  const handleContinueExisting = () => {
    // Keep existing answers and continue
    setShowInitialOptions(false);
    // Store that this is continuing existing questionnaire
    sessionStorage.setItem('isNewQuestionnaire', 'false');
  };

  const handleAnswerChange = (questionIndex: number, answer: string | string[]) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const handleMultipleAnswerChange = (questionIndex: number, option: string, checked: boolean) => {
    setAnswers(prev => {
      const prevAnswer = prev[questionIndex];
      // Ensure currentAnswers is always an array
      let currentAnswers: string[] = [];
      if (Array.isArray(prevAnswer)) {
        currentAnswers = prevAnswer;
      } else if (typeof prevAnswer === 'string' && prevAnswer) {
        // Convert string to array if needed (for loaded data)
        currentAnswers = prevAnswer.split(", ").filter(item => item.trim() !== "");
      }
      
      if (checked) {
        return {
          ...prev,
          [questionIndex]: [...currentAnswers, option]
        };
      } else {
        return {
          ...prev,
          [questionIndex]: currentAnswers.filter(item => item !== option)
        };
      }
    });
  };

  const handleObservationChange = (questionIndex: number, observation: string) => {
    setObservations(prev => ({
      ...prev,
      [questionIndex]: observation
    }));
  };

  const handleFileChange = (questionIndex: number, fileList: FileList | null) => {
    setFiles(prev => ({
      ...prev,
      [questionIndex]: fileList
    }));
  };

  const handleNext = () => {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSaveDraft = () => {
    const answersArray = Array(totalQuestions).fill("");
    Object.entries(answers).forEach(([index, answer]) => {
      const questionIndex = parseInt(index);
      if (Array.isArray(answer)) {
        answersArray[questionIndex] = answer.join(", ");
      } else {
        answersArray[questionIndex] = answer;
      }
    });

    saveMutation.mutate({
      questionId: 1, // Single response for all questions
      answer: JSON.stringify(answersArray),
      observations: Object.values(observations).join("\n"),
      isComplete: false,
    });
  };

  const handleSubmit = () => {
    const answersArray = Array(totalQuestions).fill("");
    Object.entries(answers).forEach(([index, answer]) => {
      const questionIndex = parseInt(index);
      if (Array.isArray(answer)) {
        answersArray[questionIndex] = answer.join(", ");
      } else {
        answersArray[questionIndex] = answer;
      }
    });

    // Check if all questions are answered
    for (let i = 0; i < totalQuestions; i++) {
      const questionData = questions[i];
      const answer = answers[i];
      
      // Check if question is answered
      if (!answer || (Array.isArray(answer) && answer.length === 0)) {
        toast({
          title: "Questionário Incompleto",
          description: `Por favor, responda a pergunta ${i + 1} antes de finalizar.`,
          variant: "destructive",
        });
        setCurrentQuestion(i);
        return;
      }

      // Check if required document is uploaded
      if (questionData?.requiresDocument) {
        const needsDoc = questionData.documentCondition 
          ? answer === questionData.documentCondition 
          : true;
        
        if (needsDoc && (!files[i] || files[i]?.length === 0)) {
          toast({
            title: "Documento Obrigatório",
            description: `Por favor, anexe o documento obrigatório para a pergunta ${i + 1}.`,
            variant: "destructive",
          });
          setCurrentQuestion(i);
          return;
        }
      }
    }

    const isNewQuestionnaire = sessionStorage.getItem('isNewQuestionnaire') === 'true';
    saveMutation.mutate({
      questionId: 1, // Single response for all questions
      answer: JSON.stringify(answersArray),
      observations: Object.values(observations).join("\n"),
      isComplete: true,
      resetTasks: isNewQuestionnaire,
    });
    // Clean up session storage
    sessionStorage.removeItem('isNewQuestionnaire');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Show loading state only if we have a sectorId but no questions yet
  if (sectorId && !questions.length && isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Carregando questionário...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Don't render anything if we don't have a sectorId (user will be redirected)
  if (!sectorId) {
    return null;
  }

  // Show initial options screen if user has existing responses
  if (showInitialOptions && existingResponse && (existingResponse as any)?.answer) {
    return (
      <div className="min-h-screen hero-gradient p-4">
        <div className="max-w-2xl mx-auto pt-20">
          <Card className="glass-card shadow-2xl animate-scale-in">
            <CardHeader className="text-center pb-8">
              <div className="mx-auto mb-6 p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl w-16 h-16 flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Questionário LGPD
              </h1>
              <p className="text-slate-600 dark:text-slate-300">
                Você já possui respostas salvas. O que deseja fazer?
              </p>
            </CardHeader>
            <CardContent className="space-y-4 pb-8">
              <div className="grid gap-4">
                <Card className="border-2 border-slate-200 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer"
                      onClick={handleContinueExisting}
                      data-testid="button-continue-existing">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <FileCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                          Continuar Questionário Existente
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          Continue de onde parou. Suas respostas anteriores serão mantidas e você pode editá-las.
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-slate-200 dark:border-slate-600 hover:border-orange-400 dark:hover:border-orange-500 transition-colors cursor-pointer"
                      onClick={handleStartNewQuestionnaire}
                      data-testid="button-start-new">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                        <Target className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                          Iniciar Novo Questionário
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          Recomeçar do zero. Suas tarefas pendentes serão atualizadas com base nas novas respostas.
                        </p>
                        <Badge variant="outline" className="mt-2 text-xs">
                          Gera novas tarefas
                        </Badge>
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                  💡 Dica: Se suas informações mudaram recentemente, recomendamos iniciar um novo questionário para gerar tarefas mais precisas.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const progress = ((currentQuestion + 1) / totalQuestions) * 100;
  const currentAnswer = answers[currentQuestion] || "";
  const currentObservation = observations[currentQuestion] || "";
  const currentFiles = files[currentQuestion];
  const currentQuestionData = questions[currentQuestion];

  const needsDocument = () => {
    if (!currentQuestionData?.requiresDocument) return false;
    if (currentQuestionData.documentCondition) {
      return currentAnswer === currentQuestionData.documentCondition;
    }
    return currentQuestionData.requiresDocument;
  };

  const renderQuestion = () => {
    if (!currentQuestionData) return null;

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-medium mb-2" data-testid={`question-${currentQuestion + 1}`}>
            {currentQuestionData.question}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {currentQuestionData.description}
          </p>
        </div>

        {currentQuestionData.type === "text" && (
          <div className="space-y-4">
            <div className="p-6 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700">
              <Label htmlFor={`answer-${currentQuestion}`} className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 block">
                Sua resposta:
              </Label>
              <Textarea
                id={`answer-${currentQuestion}`}
                placeholder="Digite sua resposta detalhada aqui..."
                value={currentAnswer as string}
                onChange={(e) => handleAnswerChange(currentQuestion, e.target.value)}
                rows={5}
                className="w-full resize-none border-0 bg-card shadow-sm rounded-lg focus:ring-2 focus:ring-blue-500 transition-all"
                data-testid={`textarea-answer-${currentQuestion + 1}`}
              />
            </div>
          </div>
        )}

        {currentQuestionData.type === "single" && (
          <div className="space-y-4">
            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Selecione uma opção:
            </Label>
            <RadioGroup 
              value={currentAnswer as string} 
              onValueChange={(value) => handleAnswerChange(currentQuestion, value)}
              data-testid={`radio-group-${currentQuestion + 1}`}
              className="space-y-2"
            >
              {currentQuestionData.options?.map((option: string, index: number) => (
                <div key={index} className="group">
                  <label
                    htmlFor={`option-${currentQuestion}-${index}`}
                    className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                      currentAnswer === option
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-md'
                        : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 hover:bg-slate-50 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    <RadioGroupItem 
                      value={option} 
                      id={`option-${currentQuestion}-${index}`}
                      data-testid={`radio-option-${currentQuestion + 1}-${index + 1}`}
                      className="mt-0.5"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300 flex-1 leading-relaxed">
                      {option}
                    </span>
                  </label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )}

        {currentQuestionData.type === "multiple" && (
          <div className="space-y-4">
            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Selecione todas as opções que se aplicam:
            </Label>
            <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto pr-2">
              {currentQuestionData.options?.map((option: string, index: number) => {
                const isSelected = (() => {
                  const answer = currentAnswer;
                  if (Array.isArray(answer)) {
                    return answer.includes(option);
                  } else if (typeof answer === 'string' && answer) {
                    return answer.split(", ").includes(option);
                  }
                  return false;
                })();
                
                return (
                  <div key={index} className="group">
                    <label
                      htmlFor={`checkbox-${currentQuestion}-${index}`}
                      className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-md'
                          : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 hover:bg-slate-50 dark:hover:bg-slate-800/30'
                      }`}
                    >
                      <Checkbox
                        id={`checkbox-${currentQuestion}-${index}`}
                        checked={isSelected}
                        onCheckedChange={(checked) => 
                          handleMultipleAnswerChange(currentQuestion, option, checked as boolean)
                        }
                        data-testid={`checkbox-option-${currentQuestion + 1}-${index + 1}`}
                        className="mt-0.5"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300 flex-1 leading-relaxed">
                        {option}
                      </span>
                    </label>
                  </div>
                );
              })}
            </div>
            {Array.isArray(currentAnswer) && currentAnswer.length > 0 && (
              <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-xs text-green-700 dark:text-green-300 font-medium">
                  {currentAnswer.length} opção{currentAnswer.length > 1 ? 'ões' : ''} selecionada{currentAnswer.length > 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        )}

        {needsDocument() && (
          <div className="mt-6 p-6 bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-950/30 dark:via-amber-950/30 dark:to-yellow-950/30 border-2 border-dashed border-orange-200 dark:border-orange-800 rounded-xl">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Upload className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <Label className="text-sm font-semibold text-orange-800 dark:text-orange-200">
                    Documento Comprobatório
                  </Label>
                  <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                    Para esta resposta, é necessário anexar um documento oficial
                  </p>
                </div>
              </div>
              <div className="relative">
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(currentQuestion, e.target.files)}
                  data-testid={`file-upload-${currentQuestion + 1}`}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 file:cursor-pointer cursor-pointer"
                />
              </div>
              {currentFiles && currentFiles.length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                  <FileIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm text-green-700 dark:text-green-300 font-medium">{currentFiles[0].name}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 space-y-3">
          <div className="p-4 bg-slate-50/50 dark:bg-slate-800/20 rounded-xl border border-slate-200 dark:border-slate-700">
            <Label htmlFor={`observation-${currentQuestion}`} className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 block">
              Observações adicionais (opcional):
            </Label>
            <Textarea
              id={`observation-${currentQuestion}`}
              placeholder="Adicione contextos, esclarecimentos ou observações relevantes..."
              value={currentObservation}
              onChange={(e) => handleObservationChange(currentQuestion, e.target.value)}
              rows={3}
              className="w-full resize-none border-0 bg-card shadow-sm rounded-lg focus:ring-2 focus:ring-blue-500 transition-all text-sm"
              data-testid={`textarea-observation-${currentQuestion + 1}`}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen hero-gradient">
      {/* Modern Header */}
      <div className="border-b bg-background/80 backdrop-blur-lg sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg shadow-lg">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Avaliação LGPD
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Questionário de conformidade empresarial
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-xs px-3 py-1">
                {currentQuestion + 1} de {totalQuestions}
              </Badge>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSaveDraft}
                disabled={saveMutation.isPending}
                data-testid="button-save-draft"
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {saveMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
          
          {/* Modern Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Progresso da Avaliação
              </span>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4">
        <div className="mt-8">
          <Card className="glass-card shadow-xl backdrop-blur-lg overflow-hidden">
            {/* Question Header */}
            <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 p-6 border-b">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Questão {currentQuestion + 1}
                    </h2>
                    <Badge variant="outline" className="text-xs">
                      {currentQuestionData?.type === 'text' ? 'Texto' :
                       currentQuestionData?.type === 'single' ? 'Única escolha' : 'Múltipla escolha'}
                    </Badge>
                  </div>
                  <h3 className="text-base font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {currentQuestionData?.question}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-1">
                    <HelpCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    {currentQuestionData?.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Question Content */}
            <CardContent className="p-8">
              {renderQuestion()}
            </CardContent>

            {/* Navigation Footer */}
            <div className="bg-slate-50/50 dark:bg-slate-800/50 border-t px-8 py-6">
              <div className="flex justify-between items-center">
                <Button 
                  variant="ghost" 
                  onClick={handlePrevious}
                  disabled={currentQuestion === 0}
                  data-testid="button-previous"
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Anterior
                </Button>
                
                <div className="flex gap-3">
                  <Button 
                    onClick={handleNext}
                    disabled={
                      (!currentAnswer || (Array.isArray(currentAnswer) && currentAnswer.length === 0)) ||
                      (needsDocument() && (!currentFiles || currentFiles.length === 0)) ||
                      saveMutation.isPending
                    }
                    data-testid="button-next"
                    className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg"
                  >
                    {currentQuestion === totalQuestions - 1 ? (
                      <>
                        <Check className="h-4 w-4" />
                        Finalizar Avaliação
                      </>
                    ) : (
                      <>
                        Próxima
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              {/* Question Status Indicators */}
              <div className="flex justify-center mt-6">
                <div className="flex gap-2">
                  {Array.from({ length: totalQuestions }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentQuestion(i)}
                      className={`w-3 h-3 rounded-full transition-all duration-200 ${
                        i === currentQuestion
                          ? 'bg-blue-500 shadow-lg shadow-blue-500/30'
                          : answers[i]
                          ? 'bg-green-400 hover:bg-green-500'
                          : 'bg-slate-300 dark:bg-slate-600 hover:bg-slate-400'
                      }`}
                      data-testid={`indicator-${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
