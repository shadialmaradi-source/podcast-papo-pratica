import { CheckCircle } from "lucide-react";

interface StepProgressProps {
  currentStep: 1 | 2 | 3;
  showCheckOnComplete?: boolean;
}

export const StepProgress = ({ currentStep, showCheckOnComplete = true }: StepProgressProps) => (
  <div className="flex items-center justify-center gap-2">
    {[1, 2, 3].map((step) => (
      <div
        key={step}
        className={`w-3 h-3 rounded-full transition-colors ${
          step <= currentStep ? 'bg-primary' : 'bg-muted'
        }`}
      />
    ))}
    <span className="text-sm text-muted-foreground ml-2">
      Step {currentStep} of 3 {currentStep < 3 ? 'complete' : ''}
    </span>
    {currentStep === 3 && showCheckOnComplete && (
      <CheckCircle className="w-4 h-4 text-primary" />
    )}
  </div>
);

export default StepProgress;
