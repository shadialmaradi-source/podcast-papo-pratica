import { useState } from "react";
import { Globe, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TranslationHintProps {
  translation: string | null | undefined;
}

export function TranslationHint({ translation }: TranslationHintProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!translation) return null;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Globe className="w-3.5 h-3.5" />
        <span className="italic">
          {isOpen ? "Hide translation" : "Need help? See translation"}
        </span>
        {isOpen ? (
          <ChevronUp className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" />
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-sm text-muted-foreground italic mt-1 pl-5 overflow-hidden"
          >
            {translation}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
