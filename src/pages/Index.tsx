import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import Dashboard from "@/components/Dashboard";
import { LanguageSelector } from "@/components/LanguageSelector";
import { PodcastLibrary } from "@/components/PodcastLibrary";
import { EpisodeSelector } from "@/components/EpisodeSelector";
import { ExerciseGenerator } from "@/components/ExerciseGenerator";
import { YouTubeVideos } from "@/components/YouTubeVideos";
import { YouTubeExercises } from "@/components/YouTubeExercises";
import { PodcastPlayer } from "@/components/PodcastPlayer";
import { PodcastSource, PodcastEpisode } from "@/services/podcastService";

type AppState = "language-select" | "dashboard" | "podcasts" | "episodes" | "player" | "exercises" | "profile" | "youtube" | "youtube-exercises";

const Index = () => {
  const { user, loading } = useAuth();
  const [appState, setAppState] = useState<AppState>("language-select");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [selectedPodcast, setSelectedPodcast] = useState<PodcastSource | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<PodcastEpisode | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string>("A1");
  const [selectedVideoId, setSelectedVideoId] = useState<string>("");

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
    setAppState("player");
  };

  const handleStartExercises = (episode: PodcastEpisode, level: string) => {
    setSelectedEpisode(episode);
    setSelectedLevel(level);
    setAppState("exercises");
  };

  const handleExerciseComplete = () => {
    setAppState("episodes");
  };

  const handleBackToEpisodes = () => {
    setAppState("episodes");
  };

  const handleBackToEpisodesFromPlayer = () => {
    setSelectedEpisode(null);
    setAppState("episodes");
  };

  const handleBackToPodcasts = () => {
    setAppState("podcasts");
  };

  const handleBackToDashboard = () => {
    setAppState("dashboard");
  };

  const handleNavigate = (page: 'podcasts' | 'profile' | 'youtube') => {
    if (page === 'podcasts') {
      handleNavigateToPodcasts();
    } else if (page === 'youtube') {
      setAppState('youtube');
    } else {
      setAppState(page);
    }
  };

  const handleYouTubeExercises = (videoId: string, level: string) => {
    setSelectedVideoId(videoId);
    setSelectedLevel(level);
    setAppState("youtube-exercises");
  };

  const handleBackToYouTube = () => {
    setAppState("youtube");
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
            onStartExercises={handleStartExercises}
            onBack={handleBackToPodcasts}
          />
        </div>
      )}

      {appState === "player" && selectedEpisode && (
        <PodcastPlayer
          episode={selectedEpisode}
          onBack={handleBackToEpisodesFromPlayer}
        />
      )}
      
      {appState === "exercises" && selectedEpisode && (
        <div className="container mx-auto px-4 py-8">
          <ExerciseGenerator
            episode={selectedEpisode}
            level={selectedLevel}
            onComplete={handleExerciseComplete}
            onBack={handleBackToEpisodes}
          />
        </div>
      )}

      {appState === "youtube" && (
        <div className="container mx-auto">
          <YouTubeVideos 
            onBack={handleBackToDashboard}
            onStartExercises={handleYouTubeExercises}
          />
        </div>
      )}

      {appState === "youtube-exercises" && selectedVideoId && (
        <div className="container mx-auto px-4 py-8">
          <YouTubeExercises
            videoId={selectedVideoId}
            level={selectedLevel}
            onBack={handleBackToYouTube}
            onComplete={handleBackToYouTube}
          />
        </div>
      )}
    </div>
  );
};

export default Index;