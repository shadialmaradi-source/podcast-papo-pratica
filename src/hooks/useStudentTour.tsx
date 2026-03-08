import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";

export type StudentTourPhase = "home" | "library" | "transcript" | "completed";

interface StudentTourContextType {
  phase: StudentTourPhase;
  isActive: boolean;
  advancePhase: () => void;
  skipAll: () => void;
}

const StudentTourContext = createContext<StudentTourContextType | undefined>(undefined);

function resolveInitialPhase(): StudentTourPhase {
  const hasHome = localStorage.getItem("has_seen_home_hints") === "true";
  const hasLibrary = localStorage.getItem("library_tour_completed") === "true";
  const hasTranscript = localStorage.getItem("transcript_tutorial_completed") === "true";

  // If all done, completed
  if (hasHome && hasLibrary && hasTranscript) return "completed";
  // Find the first incomplete phase
  if (!hasHome) return "home";
  if (!hasLibrary) return "library";
  if (!hasTranscript) return "transcript";
  return "completed";
}

const PHASE_ORDER: StudentTourPhase[] = ["home", "library", "transcript", "completed"];

const PHASE_LEGACY_KEY: Record<string, string> = {
  home: "has_seen_home_hints",
  library: "library_tour_completed",
  transcript: "transcript_tutorial_completed",
};

export function StudentTourProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<StudentTourPhase>(resolveInitialPhase);

  const advancePhase = useCallback(() => {
    setPhase((prev) => {
      // Mark current phase done in localStorage
      const legacyKey = PHASE_LEGACY_KEY[prev];
      if (legacyKey) localStorage.setItem(legacyKey, "true");

      const idx = PHASE_ORDER.indexOf(prev);
      const next = PHASE_ORDER[idx + 1] || "completed";

      // Skip already-completed phases
      let nextPhase = next as StudentTourPhase;
      while (nextPhase !== "completed") {
        const key = PHASE_LEGACY_KEY[nextPhase];
        if (key && localStorage.getItem(key) === "true") {
          const nIdx = PHASE_ORDER.indexOf(nextPhase);
          nextPhase = (PHASE_ORDER[nIdx + 1] || "completed") as StudentTourPhase;
        } else {
          break;
        }
      }
      return nextPhase;
    });
  }, []);

  const skipAll = useCallback(() => {
    Object.values(PHASE_LEGACY_KEY).forEach((k) => localStorage.setItem(k, "true"));
    setPhase("completed");
  }, []);

  const isActive = phase !== "completed";

  const value = useMemo(
    () => ({ phase, isActive, advancePhase, skipAll }),
    [phase, isActive, advancePhase, skipAll]
  );

  return (
    <StudentTourContext.Provider value={value}>
      {children}
    </StudentTourContext.Provider>
  );
}

export function useStudentTour() {
  const ctx = useContext(StudentTourContext);
  if (!ctx) {
    // Return a safe fallback so components outside the provider still work
    return {
      phase: "completed" as StudentTourPhase,
      isActive: false,
      advancePhase: () => {},
      skipAll: () => {},
    };
  }
  return ctx;
}
