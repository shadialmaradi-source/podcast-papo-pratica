import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LibraryTourTooltipProps {
  message: string;
  onClose: () => void;
  autoCloseMs?: number;
  position?: "top" | "bottom";
}

export function LibraryTourTooltip({
  message,
  onClose,
  autoCloseMs = 3000,
  position = "bottom",
}: LibraryTourTooltipProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    timerRef.current = setTimeout(onClose, autoCloseMs);
    return () => clearTimeout(timerRef.current);
  }, [onClose, autoCloseMs]);

  const arrow =
    position === "bottom"
      ? "after:absolute after:-top-2 after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-b-primary"
      : "after:absolute after:-bottom-2 after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-primary";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        className="fixed bottom-4 left-4 right-4 z-[60] mx-auto max-w-sm sm:absolute sm:bottom-auto sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-64 sm:top-full sm:mt-3"
      >
        <div
          className={`relative rounded-lg bg-primary px-4 py-3 text-primary-foreground text-sm shadow-lg sm:${arrow}`}
        >
          <button
            onClick={onClose}
            className="absolute top-1.5 right-1.5 p-0.5 rounded-full hover:bg-primary-foreground/20 transition-colors"
            aria-label="Close tooltip"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <p className="pr-4 leading-snug">{message}</p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
