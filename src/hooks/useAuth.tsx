import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { identifyUser, setUserProperties, setSection, trackEvent, resetAnalytics } from "@/lib/analytics";
import { type AppRole, resolveUserRole } from "@/lib/accessControl";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: AppRole | null;
  roleLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    // Track which user id we've already resolved a role for, so token refreshes
    // and tab-focus SIGNED_IN events don't re-trigger a role fetch that would
    // flip roleLoading and unmount protected pages (wiping their form state).
    let resolvedRoleForUserId: string | null = null;

    const enrichSession = async (uid: string, userEmail: string | undefined, provider: string | undefined) => {
      setRoleLoading(true);

      const [fetchedRole, profileRes] = await Promise.all([
        resolveUserRole(uid),
        supabase
          .from("profiles")
          .select("current_level, selected_language, native_language")
          .eq("user_id", uid)
          .maybeSingle(),
      ]);
      setRole(fetchedRole);
      setRoleLoading(false);
      resolvedRoleForUserId = uid;

      const profile = profileRes.data;

      const props: Record<string, unknown> = {
        role: fetchedRole,
        email: userEmail,
      };

      if (profile) {
        if (profile.current_level) props.cefr_level = profile.current_level;
        if (profile.selected_language) props.target_language = profile.selected_language;
        if (profile.native_language) props.native_language = profile.native_language;
      }

      if (fetchedRole === "teacher") {
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
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (event === 'SIGNED_IN' && session?.user) {
          // Skip re-enrichment for the same user (tab refocus / token refresh
          // can fire SIGNED_IN repeatedly). Only run on a real user change.
          if (resolvedRoleForUserId === session.user.id) {
            return;
          }

          identifyUser(session.user.id, session.user.email);
          trackEvent('user_login', {
            method: session.user.app_metadata?.provider || 'email',
            timestamp: new Date().toISOString()
          });

          setTimeout(() => {
            enrichSession(session.user.id, session.user.email, session.user.app_metadata?.provider);
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          resolvedRoleForUserId = null;
          setRole(null);
          setRoleLoading(false);
          resetAnalytics();
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        // Load role on initial session restore
        setRoleLoading(true);
        resolveUserRole(session.user.id).then((resolvedRole) => {
          setRole(resolvedRole);
          setRoleLoading(false);
          resolvedRoleForUserId = session.user.id;
        });
      } else {
        setRoleLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, role, roleLoading, signOut }}>
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
