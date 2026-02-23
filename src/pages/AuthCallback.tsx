import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      // Check for error in URL hash/query (e.g., expired link)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const queryParamsForError = new URLSearchParams(window.location.search);

      const errorCode = hashParams.get("error_code") || queryParamsForError.get("error_code");
      const errorDescription =
        hashParams.get("error_description") || queryParamsForError.get("error_description");

      if (errorCode) {
        setError(errorDescription?.replace(/\+/g, " ") || "Authentication failed");
        setTimeout(() => navigate("/auth"), 3000);
        return;
      }

      // Check for access token in hash (OAuth flow)
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      // Helper: check profile and redirect accordingly
      const redirectBasedOnProfile = async () => {
        // Check for recovery flow
        const hp = new URLSearchParams(window.location.hash.substring(1));
        if (hp.get("type") === "recovery") {
          navigate("/reset-password" + window.location.hash, { replace: true });
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate("/auth", { replace: true }); return; }

        const { data: profile } = await supabase.from('profiles')
          .select('native_language')
          .eq('user_id', user.id)
          .single();

        if (!profile?.native_language) {
          navigate("/onboarding", { replace: true });
        } else {
          navigate("/app", { replace: true });
        }
      };

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          setError(error.message);
          setTimeout(() => navigate("/auth"), 3000);
          return;
        }

        await redirectBasedOnProfile();
        return;
      }

      // Check for code in query params (PKCE flow)
      const queryParams = new URLSearchParams(window.location.search);
      const code = queryParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          setError(error.message);
          setTimeout(() => navigate("/auth"), 3000);
          return;
        }

        await redirectBasedOnProfile();
        return;
      }

      // Check if already authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await redirectBasedOnProfile();
        return;
      }

      // No tokens found, redirect to auth
      navigate("/auth", { replace: true });
    };

    handleAuthCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <div className="text-destructive text-center">
          <p className="text-lg font-medium">Authentication Error</p>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
          <p className="text-xs text-muted-foreground mt-4">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">Completing authentication...</p>
    </div>
  );
}
