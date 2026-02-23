import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { initAnalytics } from "@/lib/analytics";
import LandingPage from "./pages/LandingPage";
import Onboarding from "./pages/Onboarding";
import AppHome from "./pages/AppHome";
import Library from "./pages/Library";
import Lesson from "./pages/Lesson";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { ProfilePage } from "./components/ProfilePage";

import Premium from "./pages/Premium";
import FirstLesson from "./pages/FirstLesson";
import AuthCallback from "./pages/AuthCallback";
import WeekDetail from "./pages/WeekDetail";
import WeekVideo from "./pages/WeekVideo";
import TeacherDashboard from "./pages/TeacherDashboard";
import TeacherLesson from "./pages/TeacherLesson";
import StudentLesson from "./pages/StudentLesson";
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient();

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
}

// Wrapper to provide onBack to ProfilePage
function ProfilePageWrapper() {
  const navigate = useNavigate();
  return <ProfilePage onBack={() => navigate("/app")} />;
}

function AuthRedirector() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname === "/auth/callback") return;

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
  // Initialize PostHog analytics on app load
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
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            <Route path="/lesson/first" element={<FirstLesson />} />
            <Route path="/premium" element={<Premium />} />

            {/* Teacher routes */}
            <Route
              path="/teacher"
              element={
                <ProtectedRoute>
                  <TeacherDashboard />
            </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/lesson/:id"
            element={
              <ProtectedRoute>
                <TeacherLesson />
              </ProtectedRoute>
            }
          />

          {/* Protected app routes */}
            <Route 
              path="/app" 
              element={
                <ProtectedRoute>
                  <AppHome />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/library" 
              element={
                <ProtectedRoute>
                  <Library />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/lesson/:videoId" 
              element={
                <ProtectedRoute>
                  <Lesson />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/learn/week/:weekId" 
              element={
                <ProtectedRoute>
                  <WeekDetail />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/learn/video/:weekVideoId" 
              element={
                <ProtectedRoute>
                  <WeekVideo />
                </ProtectedRoute>
              } 
            />
            <Route
              path="/profile" 
              element={
                <ProtectedRoute>
                  <ProfilePageWrapper />
                </ProtectedRoute>
              } 
            />
            <Route
              path="/lesson/student/:id"
              element={
                <ProtectedRoute>
                  <StudentLesson />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  );
};

export default App;
