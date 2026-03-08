import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { initAnalytics } from "@/lib/analytics";

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
const TeacherCommunity = lazy(() => import("./pages/TeacherCommunity"));
const TeacherBranding = lazy(() => import("./pages/TeacherBranding"));
const TeacherPricing = lazy(() => import("./pages/TeacherPricing"));
const TeacherAnalytics = lazy(() => import("./pages/TeacherAnalytics"));
const TeacherSettings = lazy(() => import("./pages/TeacherSettings"));
const TeacherOnboarding = lazy(() => import("./pages/TeacherOnboarding"));
const TeacherStudents = lazy(() => import("./pages/TeacherStudents"));
const TeacherStudentDetail = lazy(() => import("./pages/TeacherStudentDetail"));
const TeacherLesson = lazy(() => import("./pages/TeacherLesson"));
const StudentLesson = lazy(() => import("./pages/StudentLesson"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const MyLessons = lazy(() => import("./pages/MyLessons"));

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
  useEffect(() => {
    initAnalytics();
  }, []);

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

              {/* Teacher routes */}
              <Route path="/teacher/onboarding" element={<ProtectedRoute><TeacherOnboarding /></ProtectedRoute>} />
              <Route path="/teacher" element={<ProtectedRoute><TeacherDashboard /></ProtectedRoute>} />
              <Route path="/teacher/pricing" element={<ProtectedRoute><TeacherPricing /></ProtectedRoute>} />
              <Route path="/teacher/analytics" element={<ProtectedRoute><TeacherAnalytics /></ProtectedRoute>} />
              <Route path="/teacher/settings" element={<ProtectedRoute><TeacherSettings /></ProtectedRoute>} />
              <Route path="/teacher/students" element={<ProtectedRoute><TeacherStudents /></ProtectedRoute>} />
              <Route path="/teacher/student/:studentId" element={<ProtectedRoute><TeacherStudentDetail /></ProtectedRoute>} />
              <Route path="/teacher/community" element={<ProtectedRoute><TeacherCommunity /></ProtectedRoute>} />
              <Route path="/teacher/branding" element={<ProtectedRoute><TeacherBranding /></ProtectedRoute>} />
              <Route path="/teacher/lesson/:id" element={<ProtectedRoute><TeacherLesson /></ProtectedRoute>} />

              {/* Protected app routes */}
              <Route path="/app" element={<ProtectedRoute><AppHome /></ProtectedRoute>} />
              <Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
              <Route path="/lesson/:videoId" element={<ProtectedRoute><Lesson /></ProtectedRoute>} />
              <Route path="/learn/week/:weekId" element={<ProtectedRoute><WeekDetail /></ProtectedRoute>} />
              <Route path="/learn/video/:weekVideoId" element={<ProtectedRoute><WeekVideo /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/lesson/student/:id" element={<ProtectedRoute><StudentLesson /></ProtectedRoute>} />
              <Route path="/my-lessons" element={<ProtectedRoute><MyLessons /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  );
};

export default App;
