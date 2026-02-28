import { PipelineStep } from "@/hooks/useJobStream";
import { CheckCircle, Circle, Loader2 } from "lucide-react";

const STEPS: { key: PipelineStep; label: string; icon: string }[] = [
  { key: "clarifier",         label: "Strategy & Dialect Analysis",       icon: "🧠" },
  { key: "researcher",        label: "Local Market Scouting (Tavily)",    icon: "🔎" },
  { key: "copywriter",        label: "AIDA Arabic Copy Generation",       icon: "✍️" },
  { key: "structure_builder", label: "Architecting UI Layout",            icon: "🏗️" },
];

interface StepperProps {
  currentStep: PipelineStep | null;
  completedSteps: PipelineStep[];
  currentMessage: string;
}

export default function Stepper({ currentStep, completedSteps, currentMessage }: StepperProps) {
  return (
    <div className="w-full max-w-xl mx-auto py-8">
      <div className="flex flex-col gap-4">
        {STEPS.map((step, idx) => {
          const isDone    = completedSteps.includes(step.key);
          const isActive  = currentStep === step.key && !isDone;
          const isPending = !isDone && !isActive;

          return (
            <div key={step.key} className="flex items-start gap-4">
              {/* Icon */}
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all duration-500 ${
                  isDone   ? "bg-green-100 text-green-600" :
                  isActive ? "bg-amber-100 text-amber-600 animate-pulse" :
                             "bg-gray-100 text-gray-400"
                }`}>
                  {isDone   ? <CheckCircle className="w-5 h-5" /> :
                   isActive ? <Loader2 className="w-5 h-5 animate-spin" /> :
                              <Circle className="w-5 h-5" />}
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`w-0.5 h-8 mt-1 transition-all duration-500 ${
                    isDone ? "bg-green-300" : "bg-gray-200"
                  }`} />
                )}
              </div>

              {/* Label */}
              <div className="pt-2">
                <p className={`font-semibold text-sm transition-all duration-300 ${
                  isDone   ? "text-green-700" :
                  isActive ? "text-amber-700" :
                             "text-gray-400"
                }`}>
                  {step.icon} {step.label}
                </p>
                {isActive && (
                  <p className="text-xs text-gray-500 mt-0.5 animate-pulse">{currentMessage}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
