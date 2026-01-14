import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import LandingPage from "./pages/LandingPage";
import Onboarding from "./pages/Onboarding";
import Index from "./pages/Index";
import AppHome from "./pages/AppHome";
import Library from "./pages/Library";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import TestTranscript from "./pages/TestTranscript";
import FirstLesson from "./pages/FirstLesson";
import AuthCallback from "./pages/AuthCallback";

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

const App = () => (
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
            <Route path="/test-transcript" element={<TestTranscript />} />
            <Route path="/lesson/first" element={<FirstLesson />} />
            
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
              path="/app/legacy" 
              element={
                <ProtectedRoute>
                  <Index />
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

export default App;
