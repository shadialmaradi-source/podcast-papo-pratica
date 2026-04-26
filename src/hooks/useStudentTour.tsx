import { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type StudentTourPhase = "home" | "library" | "transcript" | "completed";

interface StudentTourContextType {
  phase: StudentTourPhase;
  isActive: boolean;
  advancePhase: () => void;
  skipAll: () => void;
}

const StudentTourContext = createContext<StudentTourContextType | undefined>(undefined);

const PHASE_ORDER: StudentTourPhase[] = ["home", "library", "transcript", "completed"];

const PHASE_LEGACY_KEY: Record<string, string> = {
  home: "has_seen_home_hints",
  library: "library_tour_completed",
  transcript: "transcript_tutorial_completed",
};

const PHASE_DB_COLUMN: Record<string, "home_hints_completed" | "library_tour_completed" | "transcript_tutorial_completed"> = {
  home: "home_hints_completed",
  library: "library_tour_completed",
  transcript: "transcript_tutorial_completed",
};

type CompletionFlags = {
  home: boolean;
  library: boolean;
  transcript: boolean;
};

function readLegacyFlags(): CompletionFlags {
  return {
    home: localStorage.getItem(PHASE_LEGACY_KEY.home) === "true",
    library: localStorage.getItem(PHASE_LEGACY_KEY.library) === "true",
    transcript: localStorage.getItem(PHASE_LEGACY_KEY.transcript) === "true",
  };
}

function resolvePhaseFromFlags(flags: CompletionFlags): StudentTourPhase {
  if (!flags.home) return "home";
  if (!flags.library) return "library";
  if (!flags.transcript) return "transcript";
  return "completed";
}

export function StudentTourProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // Default to "completed" until we resolve flags — avoids flashing the tour on returning users.
  const [phase, setPhase] = useState<StudentTourPhase>("completed");
  const [resolved, setResolved] = useState(false);

  // Resolve initial phase from DB (with legacy localStorage as fallback)
  useEffect(() => {
    let cancelled = false;
    const legacy = readLegacyFlags();

    if (!user) {
      // No logged-in user: fall back to legacy local flags only
      if (!cancelled) {
        setPhase(resolvePhaseFromFlags(legacy));
        setResolved(true);
      }
      return () => { cancelled = true; };
    }

    (async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("home_hints_completed, library_tour_completed, transcript_tutorial_completed, total_xp, current_streak, longest_streak, last_login_date")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      // DB wins, fall back to legacy flag if DB column not yet true
      const dbHome = !!data?.home_hints_completed;
      const dbLibrary = !!data?.library_tour_completed;
      const dbTranscript = !!data?.transcript_tutorial_completed;

      const flags: CompletionFlags = {
        home: dbHome || legacy.home,
        library: dbLibrary || legacy.library,
        transcript: dbTranscript || legacy.transcript,
      };

      // Safety net: existing user with progress evidence — never show onboarding again
      const hasProgress = (data?.total_xp ?? 0) > 0
        || (data?.current_streak ?? 0) > 0
        || (data?.longest_streak ?? 0) > 0
        || !!data?.last_login_date;

      if (hasProgress && (!dbHome || !dbLibrary || !dbTranscript)) {
        flags.home = true;
        flags.library = true;
        flags.transcript = true;
        // Persist so we never recompute this for them
        (supabase as any)
          .from("profiles")
          .update({
            home_hints_completed: true,
            library_tour_completed: true,
            transcript_tutorial_completed: true,
          })
          .eq("user_id", user.id)
          .then(() => {});
      }

      // Sync legacy flags back to DB if local has it but DB doesn't (cross-device migration)
      const updates: Record<string, boolean> = {};
      if (!dbHome && legacy.home) updates.home_hints_completed = true;
      if (!dbLibrary && legacy.library) updates.library_tour_completed = true;
      if (!dbTranscript && legacy.transcript) updates.transcript_tutorial_completed = true;
      if (Object.keys(updates).length > 0) {
        (supabase as any).from("profiles").update(updates).eq("user_id", user.id).then(() => {});
      }

      setPhase(resolvePhaseFromFlags(flags));
      setResolved(true);
    })();

    return () => { cancelled = true; };
  }, [user]);

  const persistPhaseDone = useCallback((done: StudentTourPhase) => {
    const legacyKey = PHASE_LEGACY_KEY[done];
    if (legacyKey) localStorage.setItem(legacyKey, "true");
    const dbColumn = PHASE_DB_COLUMN[done];
    if (dbColumn && user) {
      (supabase as any)
        .from("profiles")
        .update({ [dbColumn]: true })
        .eq("user_id", user.id)
        .then(() => {});
    }
  }, [user]);

  const advancePhase = useCallback(() => {
    setPhase((prev) => {
      persistPhaseDone(prev);
      const idx = PHASE_ORDER.indexOf(prev);
      const next = (PHASE_ORDER[idx + 1] || "completed") as StudentTourPhase;
      return next;
    });
  }, [persistPhaseDone]);

  const skipAll = useCallback(() => {
    Object.values(PHASE_LEGACY_KEY).forEach((k) => localStorage.setItem(k, "true"));
    if (user) {
      (supabase as any)
        .from("profiles")
        .update({
          home_hints_completed: true,
          library_tour_completed: true,
          transcript_tutorial_completed: true,
        })
        .eq("user_id", user.id)
        .then(() => {});
    }
    setPhase("completed");
  }, [user]);

  const isActive = resolved && phase !== "completed";

  const value = useMemo(
    () => ({ phase: resolved ? phase : "completed" as StudentTourPhase, isActive, advancePhase, skipAll }),
    [phase, resolved, isActive, advancePhase, skipAll]
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
    return {
      phase: "completed" as StudentTourPhase,
      isActive: false,
      advancePhase: () => {},
      skipAll: () => {},
    };
  }
  return ctx;
}
