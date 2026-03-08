import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, SkipForward } from "lucide-react";

interface DemoTooltipProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  onSkip: () => void;
  position?: "top" | "bottom" | "center";
  step: number;
  totalSteps: number;
}

export function DemoTooltip({
  title,
  description,
  actionLabel = "Next",
  onAction,
  onSkip,
  position = "bottom",
  step,
  totalSteps,
}: DemoTooltipProps) {
  const [showSkip, setShowSkip] = useState(false);

  useEffect(() => {
    setShowSkip(false);
    const timer = setTimeout(() => setShowSkip(true), 3000);
    return () => clearTimeout(timer);
  }, [step]);

  const positionClasses = {
    top: "top-4 left-1/2 -translate-x-1/2",
    bottom: "bottom-4 left-1/2 -translate-x-1/2",
    center: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`absolute z-50 ${positionClasses[position]} w-[90%] max-w-sm`}
      >
        <div className="bg-primary text-primary-foreground rounded-xl p-4 shadow-2xl">
          {/* Step indicator */}
          <div className="flex items-center gap-1.5 mb-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step
                    ? "w-5 bg-primary-foreground"
                    : i < step
                    ? "w-3 bg-primary-foreground/60"
                    : "w-3 bg-primary-foreground/25"
                }`}
              />
            ))}
          </div>

          <h4 className="font-semibold text-base mb-1">{title}</h4>
          <p className="text-sm text-primary-foreground/80 mb-3">{description}</p>

          <div className="flex items-center justify-between">
            <AnimatePresence>
              {showSkip && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={onSkip}
                  className="text-xs text-primary-foreground/60 hover:text-primary-foreground/90 flex items-center gap-1 transition-colors"
                >
                  <SkipForward className="h-3 w-3" />
                  Skip demo
                </motion.button>
              )}
            </AnimatePresence>

            {onAction && (
              <Button
                size="sm"
                variant="secondary"
                onClick={onAction}
                className="ml-auto"
              >
                {actionLabel}
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Arrow */}
        {position === "bottom" && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-primary rotate-45 rounded-sm" />
        )}
        {position === "top" && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-primary rotate-45 rounded-sm" />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
