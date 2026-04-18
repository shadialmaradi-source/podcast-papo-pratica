import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { trackEvent, trackTeacherFunnelStep } from "@/lib/analytics";
import { ensureTeacherTrialSubscription } from "@/services/teacherSubscriptionService";
import { Mail, Lock, LogIn, AlertCircle, BookOpen, Eye, EyeOff, GraduationCap, Headphones, Check } from "lucide-react";
import { clearPendingLessonRedirect, getPendingLessonRedirect, getPendingLessonEmail } from "@/utils/authRedirect";
import { STUDENT_ONBOARDING_PROFILE_FIELDS, requiresOnboarding, shouldRouteToFirstLesson, hydrateProfileFromLesson, fetchLessonForHydration, extractShareTokenFromPath } from "@/utils/onboardingStatus";

type AuthRole = "teacher" | "student";

const roleConfig = {
  teacher: {
    signUpTitle: "Start Your Free Trial",
    signInTitle: "Welcome Back, Teacher",
    signUpSubtitle: "14 days free · No credit card required",
    signInSubtitle: "Sign in to your teacher account",
    benefits: [
      "Create up to 30 lessons during trial",
      "All lesson types (YouTube, Paragraph, Speaking)",
      "Track student progress",
      "Full access to analytics",
    ],
    signupButton: "Start 14-Day Free Trial",
    signinButton: "Sign In to Teacher Account",
    accountType: "Teacher Account",
    icon: GraduationCap,
    gradientClass: "from-blue-600 to-purple-600",
    bgClass: "from-blue-600/10 to-purple-600/10",
  },
  student: {
    signUpTitle: "Start Learning Today",
    signInTitle: "Welcome Back",
    signUpSubtitle: "Free forever · No credit card needed",
    signInSubtitle: "Sign in to continue learning",
    benefits: [
      "Access all assigned lessons",
      "Track your progress",
      "Build your flashcard collection",
      "Practice anytime, anywhere",
    ],
    signupButton: "Create Free Account",
    signinButton: "Sign In",
    accountType: "Student Account",
    icon: Headphones,
    gradientClass: "from-emerald-600 to-teal-600",
    bgClass: "from-emerald-600/10 to-teal-600/10",
  },
};

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const rawRole = searchParams.get("role");
  const role: AuthRole = rawRole === "teacher" ? "teacher" : "student";
  const config = roleConfig[role];
  const modeParam = searchParams.get("mode");
  const lessonTokenParam = searchParams.get("lessonToken");
  const pendingLessonEmail = typeof window !== "undefined" ? getPendingLessonEmail() : null;
  const hasLessonInvite = Boolean(lessonTokenParam || pendingLessonEmail);

  const [isSignUp, setIsSignUp] = useState(modeParam === "signup" || hasLessonInvite || rawRole === "teacher");
  const [email, setEmail] = useState(pendingLessonEmail ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [resendingEmail, setResendingEmail] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_roles" as any)
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data: roleData }) => {
        if (roleData && (roleData as any).role === "teacher") {
          supabase
            .from("teacher_profiles" as any)
            .select("onboarding_completed")
            .eq("teacher_id", user.id)
            .maybeSingle()
            .then(({ data: tp }) => {
              if (!tp || !(tp as any).onboarding_completed) {
                navigate("/teacher/onboarding");
              } else {
                navigate("/teacher");
              }
            });
        } else {
          (async () => {
            const { data } = await supabase
              .from("profiles")
              .select(STUDENT_ONBOARDING_PROFILE_FIELDS)
              .eq("user_id", user.id)
              .single();

            const lessonRedirect = getPendingLessonRedirect();
            const shareToken = extractShareTokenFromPath(lessonRedirect);
            if (shareToken && requiresOnboarding(data)) {
              const lesson = await fetchLessonForHydration(supabase, shareToken);
              if (lesson) {
                await hydrateProfileFromLesson(supabase, user.id, lesson);
                navigate(lessonRedirect!);
                return;
              }
            }

            if (requiresOnboarding(data)) {
              navigate(lessonRedirect ? `/onboarding?return=${encodeURIComponent(lessonRedirect)}` : "/onboarding");
            } else if (lessonRedirect) {
              navigate(lessonRedirect);
            } else if (shouldRouteToFirstLesson(data)) {
              clearPendingLessonRedirect();
              navigate("/lesson/first");
            } else {
              clearPendingLessonRedirect();
              navigate("/app");
            }
          })();
        }
      });
  }, [user, navigate]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?role=${role}`,
        },
      });
      if (error) {
        setError(error.message);
        toast({ title: "Login Error", description: error.message, variant: "destructive" });
      }
    } catch {
      setError("Error during Google sign-in");
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!pendingVerificationEmail) return;
    setResendingEmail(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: pendingVerificationEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?role=${role}`,
        },
      });
      if (error) {
        if (error.message.toLowerCase().includes("rate") || error.message.toLowerCase().includes("limit")) {
          toast({ title: "Too many requests", description: "Please wait a few minutes before trying again.", variant: "destructive" });
        } else {
          toast({ title: "Error", description: error.message, variant: "destructive" });
        }
      } else {
        toast({ title: "Email Sent", description: "Verification email resent. Check your inbox and spam folder." });
      }
    } catch {
      toast({ title: "Error", description: "Could not resend email. Try again later.", variant: "destructive" });
    } finally {
      setResendingEmail(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPendingVerificationEmail(null);

    try {
      if (isSignUp) {
        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?role=${role}`,
            data: { role },
          },
        });

        if (error) {
          if (error.message.toLowerCase().includes("rate") || error.message.toLowerCase().includes("limit")) {
            setError("Too many signup attempts. Please wait a few minutes and try again.");
          } else if (error.message.includes("already registered")) {
            setError("This email is already registered. Try signing in instead.");
            setIsSignUp(false);
          } else {
            setError(error.message);
          }
        } else if (signUpData.user && (!signUpData.user.identities || signUpData.user.identities.length === 0)) {
          // Repeated signup — account already exists
          setError("This email already has an account. Please sign in or reset your password.");
          setIsSignUp(false);
        } else {
          // True first-time signup
          if (role === "teacher" && signUpData.user) {
            await supabase
              .from("user_roles" as any)
              .update({ role: "teacher" } as any)
              .eq("user_id", signUpData.user.id);

            await ensureTeacherTrialSubscription(signUpData.user.id);

            trackEvent("trial_started", {
              teacher_id: signUpData.user.id,
              plan_selected: "trial",
            });
          }

          trackEvent("user_signup", {
            method: "email",
            role,
            timestamp: new Date().toISOString(),
          });

          if (role === "teacher") {
            trackTeacherFunnelStep("signup_completed", {
              method: "email",
              source: "auth_page",
            });
          }

          const emailConfirmationRequired = !signUpData.session;

          if (emailConfirmationRequired) {
            setPendingVerificationEmail(email);
          }

          toast({
            title: "Registration Complete",
            description: emailConfirmationRequired
              ? (role === "teacher"
                ? "Your 14-day free trial has started! Check your email to verify your account."
                : "Check your email to confirm your account and start learning.")
              : (role === "teacher"
                ? "Your 14-day free trial has started! Redirecting you now..."
                : "Your account is ready. Redirecting you now..."),
          });
        }
      } else {
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            setError("Invalid email or password. Check your credentials or sign up for a new account.");
          } else if (error.message.toLowerCase().includes("email not confirmed")) {
            setError("Your email is not yet verified. Check your inbox (and spam) for the confirmation link.");
            setPendingVerificationEmail(email);
          } else if (error.message.toLowerCase().includes("rate") || error.message.toLowerCase().includes("limit")) {
            setError("Too many login attempts. Please wait a few minutes and try again.");
          } else {
            setError(error.message);
          }
        } else if (authData.user) {
          const { data: roleData } = await supabase
            .from("user_roles" as any)
            .select("role")
            .eq("user_id", authData.user.id)
            .maybeSingle();

          const userRole = (roleData as any)?.role || "student";

          if (userRole === "teacher") {
            const lessonRedirectT = getPendingLessonRedirect();
            if (lessonRedirectT) {
              navigate(lessonRedirectT);
              return;
            }
            const { data: tp } = await supabase
              .from("teacher_profiles" as any)
              .select("onboarding_completed")
              .eq("teacher_id", authData.user.id)
              .maybeSingle();

            navigate((!tp || !(tp as any).onboarding_completed) ? "/teacher/onboarding" : "/teacher");
          } else {
            // Existing student via shared lesson link → go straight to the lesson.
            const lessonRedirect = getPendingLessonRedirect();
            const shareToken = extractShareTokenFromPath(lessonRedirect);

            const { data: profile } = await supabase
              .from("profiles")
              .select(STUDENT_ONBOARDING_PROFILE_FIELDS)
              .eq("user_id", authData.user.id)
              .single();

            // New student arriving from a teacher's share link → hydrate from lesson and skip onboarding.
            if (shareToken && requiresOnboarding(profile)) {
              const lesson = await fetchLessonForHydration(supabase, shareToken);
              if (lesson) {
                await hydrateProfileFromLesson(supabase, authData.user.id, lesson);
                navigate(lessonRedirect!);
                return;
              }
            }

            // Existing student (no onboarding needed) but came via lesson link → go to the lesson.
            if (lessonRedirect && !requiresOnboarding(profile)) {
              navigate(lessonRedirect);
              return;
            }

            if (requiresOnboarding(profile)) {
              navigate(lessonRedirect ? `/onboarding?return=${encodeURIComponent(lessonRedirect)}` : "/onboarding");
            } else {
              // Onboarding already done — go straight to the app, even with no progress yet.
              clearPendingLessonRedirect();
              navigate("/app");
            }
          }
        }
      }
    } catch {
      setError("An error occurred. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotPasswordLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Email Sent", description: "Check your email for password reset instructions" });
        setShowForgotPassword(false);
        setForgotPasswordEmail("");
      }
    } catch {
      toast({ title: "Error", description: "An error occurred. Please try again later.", variant: "destructive" });
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const RoleIcon = config.icon;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left branding panel */}
      <div className={`hidden lg:flex lg:w-1/2 bg-gradient-to-br ${config.bgClass} relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-br from-background/50 to-transparent" />
        <div className="relative z-10 flex flex-col justify-center p-12 xl:p-16 max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold text-foreground">ListenFlow</span>
          </div>
          <div className="flex items-center gap-2 mb-8">
            <RoleIcon className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-medium">{config.accountType}</span>
          </div>

          <h2 className="text-3xl xl:text-4xl font-bold text-foreground mb-3">
            {isSignUp ? config.signUpTitle : config.signInTitle}
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            {isSignUp ? config.signUpSubtitle : config.signInSubtitle}
          </p>

          {isSignUp && (
            <ul className="space-y-3">
              {config.benefits.map((b, i) => (
                <li key={i} className="flex items-start gap-3 text-foreground">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}

          <p className="text-sm text-muted-foreground mt-auto pt-12">
            {role === "teacher"
              ? "Join hundreds of language tutors saving 5+ hours/week"
              : "Learn languages from real content"}
          </p>
        </div>
      </div>

      {/* Right auth form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card className="border-0 shadow-2xl bg-background/80 backdrop-blur">
            <CardHeader className="text-center space-y-2">
              {/* Mobile header */}
              <div className="lg:hidden flex items-center justify-center gap-2 mb-2">
                <BookOpen className="h-7 w-7 text-primary" />
                <span className="text-xl font-bold text-foreground">ListenFlow</span>
              </div>
              <div className="lg:hidden flex items-center justify-center gap-1.5 mb-2">
                <RoleIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">{config.accountType}</span>
              </div>
              <CardTitle className="text-xl">
                {isSignUp ? config.signUpTitle : config.signInTitle}
              </CardTitle>
              <CardDescription>
                {isSignUp ? config.signUpSubtitle : config.signInSubtitle}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {hasLessonInvite && (
                <Alert className="border-primary/40 bg-primary/5">
                  <AlertDescription className="text-sm">
                    <strong>You've been invited to a lesson.</strong> Sign up below to access it.
                  </AlertDescription>
                </Alert>
              )}
              {/* Google */}
              <Button onClick={handleGoogleSignIn} disabled={loading} variant="outline" className="w-full h-12 border-2 hover:bg-primary/5">
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {loading ? "Signing in..." : "Continue with Google"}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><Separator className="w-full" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>

              {/* Pending verification banner */}
              {pendingVerificationEmail && (
                <Alert className="border-primary/30 bg-primary/5">
                  <Mail className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-sm">
                    <p className="font-medium text-foreground mb-1">Check your email</p>
                    <p className="text-muted-foreground mb-2">
                      We sent a verification link to <strong>{pendingVerificationEmail}</strong>. Check your spam folder too.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResendVerification}
                      disabled={resendingEmail}
                      className="text-xs"
                    >
                      {resendingEmail ? "Sending..." : "Resend verification email"}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Email form */}
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                      readOnly={Boolean(pendingLessonEmail)}
                    />
                  </div>
                  {pendingLessonEmail && (
                    <p className="text-xs text-muted-foreground">Your teacher invited you with this email.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {!isSignUp && (
                  <div className="text-right">
                    <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-sm text-muted-foreground hover:text-primary p-0 h-auto">Forgot password?</Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Reset Password</DialogTitle>
                          <DialogDescription>Enter your email and we'll send you instructions to reset your password.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleForgotPassword} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="forgot-email">Email</Label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input id="forgot-email" type="email" placeholder="your@email.com" value={forgotPasswordEmail} onChange={(e) => setForgotPasswordEmail(e.target.value)} className="pl-10" required />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={() => setShowForgotPassword(false)} className="flex-1">Cancel</Button>
                            <Button type="submit" disabled={forgotPasswordLoading} className="flex-1">{forgotPasswordLoading ? "Sending..." : "Send Email"}</Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  <LogIn className="mr-2 h-4 w-4" />
                  {loading ? "Loading..." : (isSignUp ? config.signupButton : config.signinButton)}
                </Button>
              </form>

              {/* Toggle signup/signin */}
              <div className="text-center">
                <Button variant="ghost" type="button" onClick={() => { setIsSignUp(!isSignUp); setError(null); setPendingVerificationEmail(null); }} className="text-sm">
                  {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                </Button>
              </div>

              {/* Wrong account type link */}
              <div className="text-center text-sm text-muted-foreground">
                {role === "teacher" ? (
                  <span>Looking for a student account? <a href="/auth?role=student" className="text-primary hover:underline">Student login</a></span>
                ) : (
                  <span>Are you a teacher? <a href="/auth?role=teacher" className="text-primary hover:underline">Teacher login</a></span>
                )}
              </div>

              <div className="text-center text-xs text-muted-foreground">
                <Link to="/privacy-policy" className="hover:text-foreground underline underline-offset-4">
                  Privacy Policy
                </Link>
                <span className="mx-2">·</span>
                <Link to="/blog" className="hover:text-foreground underline underline-offset-4">
                  Blog
                </Link>
                <span className="mx-2">·</span>
                <Link to="/terms-of-service" className="hover:text-foreground underline underline-offset-4">
                  Terms of Service
                </Link>
                <span className="mx-2">·</span>
                <Link to="/cookie-policy" className="hover:text-foreground underline underline-offset-4">
                  Cookie Policy
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
