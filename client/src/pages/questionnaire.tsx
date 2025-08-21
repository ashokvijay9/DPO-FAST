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
import { ChevronLeft, ChevronRight, Save, Check, FileIcon } from "lucide-react";
import QuestionCard from "@/components/QuestionCard";

export default function Questionnaire() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
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
        const answersObj: Record<number, string> = {};
        existingAnswers.forEach((answer: string, index: number) => {
          answersObj[index] = answer;
        });
        setAnswers(answersObj);
      } catch (error) {
        console.error("Error parsing existing answers:", error);
      }
    }
  }, [existingResponse]);

  const handleAnswerChange = (questionIndex: number, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
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
      answersArray[parseInt(index)] = answer;
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
      answersArray[parseInt(index)] = answer;
    });

    // Check if all questions are answered
    const unanswered = answersArray.findIndex((answer, index) => !answer && index < totalQuestions);
    if (unanswered !== -1) {
      toast({
        title: "Questionário Incompleto",
        description: `Por favor, responda a pergunta ${unanswered + 1} antes de finalizar.`,
        variant: "destructive",
      });
      setCurrentQuestion(unanswered);
      return;
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
              <QuestionCard
                question={questions[currentQuestion]}
                questionIndex={currentQuestion}
                selectedAnswer={currentAnswer}
                observation={currentObservation}
                files={currentFiles}
                onAnswerChange={handleAnswerChange}
                onObservationChange={handleObservationChange}
                onFileChange={handleFileChange}
              />
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
                    disabled={!currentAnswer || saveMutation.isPending}
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
