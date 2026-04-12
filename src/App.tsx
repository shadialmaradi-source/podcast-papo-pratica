import { useEffect, useState, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { initAnalytics, trackSessionStart, trackSessionEnd } from "@/lib/analytics";
import { StudentTourProvider } from "@/hooks/useStudentTour";
import { AnalyticsConsentBanner } from "@/components/AnalyticsConsentBanner";

// Eager imports — critical entry paths
import LandingPage from "./pages/LandingPage";
import Auth from "./pages/Auth";

// Lazy-loaded pages
const TeacherLanding = lazy(() => import("./pages/TeacherLanding"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const AppHome = lazy(() => import("./pages/AppHome"));
const Library = lazy(() => import("./pages/Library"));
const Lesson = lazy(() => import("./pages/Lesson"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ProfilePage = lazy(() => import("./pages/ProfilePageWrapper"));
const Premium = lazy(() => import("./pages/Premium"));
const FirstLesson = lazy(() => import("./pages/FirstLesson"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const WeekDetail = lazy(() => import("./pages/WeekDetail"));
const WeekVideo = lazy(() => import("./pages/WeekVideo"));
const TeacherDashboard = lazy(() => import("./pages/TeacherDashboard"));
const TeacherPricing = lazy(() => import("./pages/TeacherPricing"));
const TeacherAnalytics = lazy(() => import("./pages/TeacherAnalytics"));
const TeacherNotifications = lazy(() => import("./pages/TeacherNotifications"));
const TeacherSettings = lazy(() => import("./pages/TeacherSettings"));
const TeacherOnboarding = lazy(() => import("./pages/TeacherOnboarding"));
const TeacherStudents = lazy(() => import("./pages/TeacherStudents"));
const TeacherStudentDetail = lazy(() => import("./pages/TeacherStudentDetail"));
const TeacherLesson = lazy(() => import("./pages/TeacherLesson"));
const StudentLesson = lazy(() => import("./pages/StudentLesson"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const MyLessons = lazy(() => import("./pages/MyLessons"));
const MyAssignments = lazy(() => import("./pages/MyAssignments"));
const SpeakingAssignment = lazy(() => import("./pages/SpeakingAssignment"));
const AdminImport = lazy(() => import("./pages/AdminImport"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
const ContactPage = lazy(() => import("./pages/Contact"));
const AboutPage = lazy(() => import("./pages/About"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogArticle = lazy(() => import("./pages/BlogArticle"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
});

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return <LoadingFallback />;
  }
  
  if (!user) {
    const studentLessonMatch = location.pathname.match(/^\/lesson\/student\/(.+)$/);
    if (studentLessonMatch) {
      localStorage.setItem('pending_lesson_token', studentLessonMatch[1]);
    }
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
}

function AuthRedirector() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname === "/auth/callback" || location.pathname === "/reset-password") return;

    const hashParams = new URLSearchParams((location.hash || "").replace(/^#/, ""));
    const searchParams = new URLSearchParams(location.search || "");

    const hasAuthHash =
      hashParams.has("access_token") ||
      hashParams.has("refresh_token") ||
      hashParams.has("error_code") ||
      hashParams.has("error");

    const hasAuthQuery = searchParams.has("code") || searchParams.has("error_code") || searchParams.has("error");

    if (!hasAuthHash && !hasAuthQuery) return;

    navigate(
      {
        pathname: "/auth/callback",
        search: location.search,
        hash: location.hash,
      },
      { replace: true }
    );
  }, [location.hash, location.pathname, location.search, navigate]);

  return null;
}

const App = () => {
  const [consentVersion, setConsentVersion] = useState(0);

  useEffect(() => {
    initAnalytics();
    trackSessionStart();
    const handleBeforeUnload = () => trackSessionEnd();
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [consentVersion]);

  return (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthRedirector />
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/teachers" element={<TeacherLanding />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/lesson/first" element={<FirstLesson />} />
              <Route path="/premium" element={<Premium />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/cookies" element={<CookiePolicy />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/blog" element={<Blog />} />
<Route path="/blog/:lang/:slug" element={<BlogArticle />} />
<Route path="/blog/:slug" element={<BlogArticle />} />

              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/cookie-policy" element={<CookiePolicy />} />

              {/* Teacher routes */}
              <Route path="/teacher/onboarding" element={<ProtectedRoute><TeacherOnboarding /></ProtectedRoute>} />
              <Route path="/teacher" element={<ProtectedRoute><TeacherDashboard /></ProtectedRoute>} />
              <Route path="/teacher/pricing" element={<ProtectedRoute><TeacherPricing /></ProtectedRoute>} />
              <Route path="/teacher/analytics" element={<ProtectedRoute><TeacherAnalytics /></ProtectedRoute>} />
              <Route path="/teacher/notifications" element={<ProtectedRoute><TeacherNotifications /></ProtectedRoute>} />
              <Route path="/teacher/settings" element={<ProtectedRoute><TeacherSettings /></ProtectedRoute>} />
              <Route path="/teacher/students" element={<ProtectedRoute><TeacherStudents /></ProtectedRoute>} />
              <Route path="/teacher/student/:studentId" element={<ProtectedRoute><TeacherStudentDetail /></ProtectedRoute>} />
              <Route path="/teacher/lesson/:id" element={<ProtectedRoute><TeacherLesson /></ProtectedRoute>} />

              {/* Protected app routes — wrapped with StudentTourProvider */}
              <Route path="/app" element={<ProtectedRoute><StudentTourProvider><AppHome /></StudentTourProvider></ProtectedRoute>} />
              <Route path="/library" element={<ProtectedRoute><StudentTourProvider><Library /></StudentTourProvider></ProtectedRoute>} />
              <Route path="/lesson/:videoId" element={<ProtectedRoute><StudentTourProvider><Lesson /></StudentTourProvider></ProtectedRoute>} />
              <Route path="/learn/week/:weekId" element={<ProtectedRoute><WeekDetail /></ProtectedRoute>} />
              <Route path="/learn/video/:weekVideoId" element={<ProtectedRoute><WeekVideo /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/lesson/student/:id" element={<ProtectedRoute><StudentLesson /></ProtectedRoute>} />
              <Route path="/speaking/:assignmentId" element={<ProtectedRoute><SpeakingAssignment /></ProtectedRoute>} />
              <Route path="/my-lessons" element={<ProtectedRoute><MyLessons /></ProtectedRoute>} />
              <Route path="/my-assignments" element={<ProtectedRoute><MyAssignments /></ProtectedRoute>} />
              <Route path="/admin/import" element={<ProtectedRoute><AdminImport /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <AnalyticsConsentBanner onConsentUpdated={() => setConsentVersion((v) => v + 1)} />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  );
};

export default App;
