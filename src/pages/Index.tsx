import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import Dashboard from "@/components/Dashboard";
import { PodcastBrowser } from "@/components/PodcastBrowser";
import { ExerciseGenerator } from "@/components/ExerciseGenerator";

type AppState = "dashboard" | "podcasts" | "exercises" | "profile";

interface Podcast {
  id: string;
  title: string;
  description: string;
  duration: string;
  difficulty: "A1" | "A2" | "B1" | "B2" | "C1";
  category: string;
  rating: number;
  thumbnail: string;
}

const Index = () => {
  const { user, loading } = useAuth();
  const [appState, setAppState] = useState<AppState>("dashboard");
  const [selectedPodcast, setSelectedPodcast] = useState<Podcast | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handlePodcastSelect = (podcast: Podcast) => {
    setSelectedPodcast(podcast);
    setAppState("exercises");
  };

  const handleExerciseComplete = () => {
    setAppState("podcasts");
  };

  const handleNavigate = (page: 'podcasts' | 'profile') => {
    setAppState(page);
  };

  return (
    <div className="min-h-screen">
      {appState === "dashboard" && (
        <Dashboard onNavigate={handleNavigate} />
      )}
      
      {appState === "podcasts" && (
        <div className="container mx-auto px-4 py-8">
          <PodcastBrowser onSelectPodcast={handlePodcastSelect} />
        </div>
      )}
      
      {appState === "exercises" && selectedPodcast && (
        <div className="container mx-auto px-4 py-8">
          <ExerciseGenerator
            podcastTitle={selectedPodcast.title}
            difficulty={selectedPodcast.difficulty}
            language="portuguese"
            onComplete={handleExerciseComplete}
          />
        </div>
      )}
    </div>
  );
};

export default Index;