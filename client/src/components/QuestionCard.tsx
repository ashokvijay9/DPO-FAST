import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Paperclip } from "lucide-react";

interface QuestionCardProps {
  question: string;
  questionIndex: number;
  selectedAnswer: string;
  observation: string;
  files: FileList | null;
  onAnswerChange: (questionIndex: number, answer: string) => void;
  onObservationChange: (questionIndex: number, observation: string) => void;
  onFileChange: (questionIndex: number, files: FileList | null) => void;
}

export default function QuestionCard({
  question,
  questionIndex,
  selectedAnswer,
  observation,
  files,
  onAnswerChange,
  onObservationChange,
  onFileChange,
}: QuestionCardProps) {
  const answerOptions = [
    { value: "sim", label: "Sim", description: "Está totalmente implementado na empresa" },
    { value: "parcial", label: "Parcialmente", description: "Está parcialmente implementado ou em desenvolvimento" },
    { value: "nao", label: "Não", description: "Ainda não está implementado" },
    { value: "nao-sei", label: "Não sei", description: "Não tenho certeza sobre esta informação" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold mb-6" data-testid={`question-${questionIndex}`}>
        {questionIndex + 1}. {question}
      </h2>

      <RadioGroup 
        value={selectedAnswer} 
        onValueChange={(value) => onAnswerChange(questionIndex, value)}
        className="space-y-4"
        data-testid={`radio-group-${questionIndex}`}
      >
        {answerOptions.map((option) => (
          <div key={option.value} className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
            <RadioGroupItem 
              value={option.value} 
              id={`${questionIndex}-${option.value}`}
              className="mt-1" 
              data-testid={`radio-${questionIndex}-${option.value}`}
            />
            <Label 
              htmlFor={`${questionIndex}-${option.value}`} 
              className="flex-1 cursor-pointer"
            >
              <div className="font-medium text-foreground">{option.label}</div>
              <div className="text-sm text-muted-foreground mt-1">{option.description}</div>
            </Label>
          </div>
        ))}
      </RadioGroup>

      <div className="space-y-4">
        <div>
          <Label htmlFor={`documents-${questionIndex}`} className="flex items-center text-base font-medium mb-2">
            <Paperclip className="mr-2 h-4 w-4" />
            Anexar documentos comprobatórios (opcional)
          </Label>
          <Input
            id={`documents-${questionIndex}`}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.docx"
            onChange={(e) => onFileChange(questionIndex, e.target.files)}
            className="cursor-pointer"
            data-testid={`file-input-${questionIndex}`}
          />
          <p className="text-sm text-muted-foreground mt-1">
            Formatos aceitos: PDF, JPG, PNG, DOCX (máx. 5MB cada)
          </p>
          {files && files.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-muted-foreground">
                {files.length} arquivo(s) selecionado(s):
              </p>
              <ul className="text-sm text-muted-foreground ml-4">
                {Array.from(files).map((file, index) => (
                  <li key={index}>• {file.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div>
          <Label htmlFor={`observations-${questionIndex}`} className="text-base font-medium">
            Observações adicionais (opcional)
          </Label>
          <Textarea
            id={`observations-${questionIndex}`}
            value={observation}
            onChange={(e) => onObservationChange(questionIndex, e.target.value)}
            placeholder="Descreva detalhes relevantes sobre esta questão..."
            rows={3}
            className="mt-2"
            data-testid={`textarea-observation-${questionIndex}`}
          />
        </div>
      </div>
    </div>
  );
}
