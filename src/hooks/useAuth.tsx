import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { identifyUser, setUserProperties, setSection, trackEvent, resetAnalytics } from "@/lib/analytics";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (event === 'SIGNED_IN' && session?.user) {
          identifyUser(session.user.id, session.user.email);
          trackEvent('user_login', {
            method: session.user.app_metadata?.provider || 'email',
            timestamp: new Date().toISOString()
          });

          // Fetch role + profile to enrich PostHog person properties
          setTimeout(async () => {
            const uid = session.user.id;

            const [roleRes, profileRes] = await Promise.all([
              supabase
                .from("user_roles" as any)
                .select("role")
                .eq("user_id", uid)
                .limit(1)
                .maybeSingle(),
              supabase
                .from("profiles")
                .select("current_level, selected_language, native_language")
                .eq("user_id", uid)
                .maybeSingle(),
            ]);

            const role = (roleRes.data as any)?.role || "student";
            const profile = profileRes.data;

            const props: Record<string, unknown> = {
              role,
              email: session.user.email,
            };

            if (profile) {
              if (profile.current_level) props.cefr_level = profile.current_level;
              if (profile.selected_language) props.target_language = profile.selected_language;
              if (profile.native_language) props.native_language = profile.native_language;
            }

            // For teachers, fetch plan
            if (role === "teacher") {
              const { data: subData } = await supabase
                .from("teacher_subscriptions" as any)
                .select("plan")
                .eq("teacher_id", uid)
                .maybeSingle();
              props.plan = (subData as any)?.plan || "free";
              setSection("teacher");
            } else {
              setSection("student");
            }

            setUserProperties(props);
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          resetAnalytics();
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
