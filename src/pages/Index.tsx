import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import Dashboard from "@/components/Dashboard";
import { LanguageSelector } from "@/components/LanguageSelector";
import { PodcastLibrary } from "@/components/PodcastLibrary";
import { EpisodeSelector } from "@/components/EpisodeSelector";
import { ExerciseGenerator } from "@/components/ExerciseGenerator";
import { PodcastSource, PodcastEpisode } from "@/services/podcastService";

type AppState = "language-select" | "dashboard" | "podcasts" | "episodes" | "exercises" | "profile";

const Index = () => {
  const { user, loading } = useAuth();
  const [appState, setAppState] = useState<AppState>("language-select");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [selectedPodcast, setSelectedPodcast] = useState<PodcastSource | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<PodcastEpisode | null>(null);

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

  const handleLanguageSelect = (language: string) => {
    setSelectedLanguage(language);
    setAppState("dashboard");
  };

  const handleNavigateToPodcasts = () => {
    setAppState("podcasts");
  };

  const handlePodcastSelect = (podcast: PodcastSource) => {
    setSelectedPodcast(podcast);
    setAppState("episodes");
  };

  const handleEpisodeSelect = (episode: PodcastEpisode) => {
    setSelectedEpisode(episode);
    setAppState("exercises");
  };

  const handleExerciseComplete = () => {
    setAppState("episodes");
  };

  const handleBackToEpisodes = () => {
    setAppState("episodes");
  };

  const handleBackToPodcasts = () => {
    setAppState("podcasts");
  };

  const handleBackToDashboard = () => {
    setAppState("dashboard");
  };

  const handleNavigate = (page: 'podcasts' | 'profile') => {
    if (page === 'podcasts') {
      handleNavigateToPodcasts();
    } else {
      setAppState(page);
    }
  };

  return (
    <div className="min-h-screen">
      {appState === "language-select" && (
        <LanguageSelector onLanguageSelect={handleLanguageSelect} />
      )}

      {appState === "dashboard" && (
        <Dashboard onNavigate={handleNavigate} />
      )}
      
      {appState === "podcasts" && (
        <div className="container mx-auto">
          <PodcastLibrary 
            selectedLanguage={selectedLanguage}
            onSelectPodcast={handlePodcastSelect}
          />
        </div>
      )}

      {appState === "episodes" && selectedPodcast && (
        <div className="container mx-auto">
          <EpisodeSelector 
            podcast={selectedPodcast}
            onSelectEpisode={handleEpisodeSelect}
            onBack={handleBackToPodcasts}
          />
        </div>
      )}
      
      {appState === "exercises" && selectedEpisode && (
        <div className="container mx-auto px-4 py-8">
          <ExerciseGenerator
            episode={selectedEpisode}
            onComplete={handleExerciseComplete}
            onBack={handleBackToEpisodes}
          />
        </div>
      )}
    </div>
  );
};

export default Index;