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
import { ChevronLeft, ChevronRight, Save, Check, FileIcon, Upload } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

export default function Questionnaire() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  
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
  }, [isAuthenticated, isLoading, toast]);

  const { data: questionsData } = useQuery({
    queryKey: ["/api/questionnaire/questions"],
    enabled: isAuthenticated,
  });

  const { data: existingResponse } = useQuery({
    queryKey: ["/api/questionnaire/response"],
    enabled: isAuthenticated,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/questionnaire/save", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Questionário salvo com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/compliance-tasks"] });
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
    if ((existingResponse as any)?.answer) {
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
  }, [existingResponse, questions]);

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

    saveMutation.mutate({
      questionId: 1, // Single response for all questions
      answer: JSON.stringify(answersArray),
      observations: Object.values(observations).join("\n"),
      isComplete: true,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!questions.length) {
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
          <div className="space-y-2">
            <Label htmlFor={`answer-${currentQuestion}`}>Resposta:</Label>
            <Textarea
              id={`answer-${currentQuestion}`}
              placeholder="Digite sua resposta aqui..."
              value={currentAnswer as string}
              onChange={(e) => handleAnswerChange(currentQuestion, e.target.value)}
              rows={4}
              data-testid={`textarea-answer-${currentQuestion + 1}`}
            />
          </div>
        )}

        {currentQuestionData.type === "single" && (
          <div className="space-y-3">
            <Label>Selecione uma opção:</Label>
            <RadioGroup 
              value={currentAnswer as string} 
              onValueChange={(value) => handleAnswerChange(currentQuestion, value)}
              data-testid={`radio-group-${currentQuestion + 1}`}
            >
              {currentQuestionData.options?.map((option: string, index: number) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem 
                    value={option} 
                    id={`option-${currentQuestion}-${index}`}
                    data-testid={`radio-option-${currentQuestion + 1}-${index + 1}`}
                  />
                  <Label 
                    htmlFor={`option-${currentQuestion}-${index}`}
                    className="cursor-pointer text-sm"
                  >
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )}

        {currentQuestionData.type === "multiple" && (
          <div className="space-y-3">
            <Label>Selecione todas as opções que se aplicam:</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto border rounded-lg p-4">
              {currentQuestionData.options?.map((option: string, index: number) => (
                <div key={index} className="flex items-center space-x-2">
                  <Checkbox
                    id={`checkbox-${currentQuestion}-${index}`}
                    checked={(() => {
                      const answer = currentAnswer;
                      if (Array.isArray(answer)) {
                        return answer.includes(option);
                      } else if (typeof answer === 'string' && answer) {
                        return answer.split(", ").includes(option);
                      }
                      return false;
                    })()}
                    onCheckedChange={(checked) => 
                      handleMultipleAnswerChange(currentQuestion, option, checked as boolean)
                    }
                    data-testid={`checkbox-option-${currentQuestion + 1}-${index + 1}`}
                  />
                  <Label 
                    htmlFor={`checkbox-${currentQuestion}-${index}`}
                    className="cursor-pointer text-sm"
                  >
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}

        {needsDocument() && (
          <div className="border-2 border-dashed border-primary/20 rounded-lg p-6 bg-primary/5">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                <Label className="text-sm font-medium">
                  Documento Obrigatório
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Para esta resposta, é necessário anexar um documento comprobatório.
              </p>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => handleFileChange(currentQuestion, e.target.files)}
                data-testid={`file-upload-${currentQuestion + 1}`}
              />
              {currentFiles && currentFiles.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <FileIcon className="h-4 w-4" />
                  <span>{currentFiles[0].name}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor={`observation-${currentQuestion}`}>
            Observações (opcional):
          </Label>
          <Textarea
            id={`observation-${currentQuestion}`}
            placeholder="Adicione observações sobre esta pergunta (opcional)..."
            value={currentObservation}
            onChange={(e) => handleObservationChange(currentQuestion, e.target.value)}
            rows={3}
            data-testid={`textarea-observation-${currentQuestion + 1}`}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="question-card shadow-lg">
            <CardHeader className="bg-card border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-semibold">Avaliação de Conformidade LGPD</h1>
                  <p className="text-sm text-muted-foreground">
                    Questão <span data-testid="text-current-question">{currentQuestion + 1}</span> de {totalQuestions}
                  </p>
                </div>
                <div className="w-48">
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1 text-right">
                    {Math.round(progress)}%
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-8">
              {renderQuestion()}
            </CardContent>

            <div className="border-t bg-card px-8 py-4">
              <div className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={handlePrevious}
                  disabled={currentQuestion === 0}
                  data-testid="button-previous"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Anterior
                </Button>
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={handleSaveDraft}
                    disabled={saveMutation.isPending}
                    data-testid="button-save-draft"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Rascunho
                  </Button>
                  <Button 
                    onClick={handleNext}
                    disabled={
                      (!currentAnswer || (Array.isArray(currentAnswer) && currentAnswer.length === 0)) ||
                      (needsDocument() && (!currentFiles || currentFiles.length === 0)) ||
                      saveMutation.isPending
                    }
                    data-testid="button-next"
                  >
                    {currentQuestion === totalQuestions - 1 ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Finalizar
                      </>
                    ) : (
                      <>
                        Próxima
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
