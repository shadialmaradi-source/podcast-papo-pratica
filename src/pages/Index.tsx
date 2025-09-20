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
import { ProfilePage } from "@/components/ProfilePage";
import { Leaderboard } from "@/components/Leaderboard";
import { VocabularyManager } from "@/components/VocabularyManager";
import { VocabularyReview } from "@/components/VocabularyReview";
import YouTubeLibrary from "@/components/YouTubeLibrary";
import { PodcastSource, PodcastEpisode } from "@/services/podcastService";

type AppState = "language-select" | "dashboard" | "podcasts" | "episodes" | "exercises" | "profile" | "youtube" | "youtube-exercises" | "youtube-library" | "leaderboard" | "vocabulary" | "vocabulary-review";

const Index = () => {
  const { user, loading } = useAuth();
  const [appState, setAppState] = useState<AppState>("language-select");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [selectedPodcast, setSelectedPodcast] = useState<PodcastSource | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<PodcastEpisode | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string>("beginner");
  const [selectedIntensity, setSelectedIntensity] = useState<string>("light");
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
    // Keep in episodes view for the player
  };

  const handleStartExercises = (episode: PodcastEpisode, level: string, intensity: string) => {
    setSelectedEpisode(episode);
    setSelectedLevel(level);
    setSelectedIntensity(intensity);
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

  const handleNavigate = (page: 'podcasts' | 'profile' | 'youtube' | 'vocabulary' | 'leaderboard') => {
    if (page === 'podcasts') {
      handleNavigateToPodcasts();
    } else if (page === 'youtube') {
      setAppState('youtube-library');
    } else {
      setAppState(page);
    }
  };

  const handleVideoSelect = (videoId: string, difficulty: string) => {
    setSelectedVideoId(videoId);
    setSelectedLevel(difficulty);
    setAppState('youtube');
  };

  const handleNavigateToLeaderboard = () => {
    setAppState('leaderboard');
  };

  useEffect(() => {
    const handleCustomNavigation = () => {
      setAppState('leaderboard');
    };

    window.addEventListener('navigate-to-leaderboard', handleCustomNavigation);
    return () => window.removeEventListener('navigate-to-leaderboard', handleCustomNavigation);
  }, []);

  const handleYouTubeExercises = (videoId: string, level: string, intensity: string) => {
    setSelectedVideoId(videoId);
    setSelectedLevel(level);
    setSelectedIntensity(intensity);
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

      {appState === "profile" && (
        <ProfilePage onBack={handleBackToDashboard} />
      )}

      {appState === "leaderboard" && (
        <Leaderboard onBack={() => setAppState("profile")} />
      )}
      
      {appState === "podcasts" && (
        <div className="container mx-auto px-4">
          <PodcastLibrary 
            selectedLanguage={selectedLanguage}
            onSelectPodcast={handlePodcastSelect}
            onStartExercises={handleStartExercises}
          />
        </div>
      )}

      {appState === "episodes" && selectedPodcast && (
        <div className="container mx-auto px-4">
          <EpisodeSelector 
            podcast={selectedPodcast}
            onSelectEpisode={handleEpisodeSelect}
            onStartExercises={handleStartExercises}
            onBack={handleBackToPodcasts}
          />
        </div>
      )}
      
      {appState === "exercises" && selectedEpisode && (
        <div className="container mx-auto px-4 py-8">
          <ExerciseGenerator
            episode={selectedEpisode}
            level={selectedLevel}
            intensity={selectedIntensity}
            onComplete={handleExerciseComplete}
            onBack={handleBackToEpisodes}
          />
        </div>
      )}

      {appState === "youtube-library" && (
        <YouTubeLibrary 
          onVideoSelect={handleVideoSelect}
          onBack={handleBackToDashboard}
        />
      )}

      {appState === "youtube" && (
        <div className="container mx-auto px-4">
          <YouTubeVideos 
            onBack={() => setAppState('youtube-library')}
            onStartExercises={handleYouTubeExercises}
          />
        </div>
      )}

      {appState === "youtube-exercises" && selectedVideoId && (
        <div className="container mx-auto px-4 py-8">
          <YouTubeExercises
            videoId={selectedVideoId}
            level={selectedLevel}
            intensity={selectedIntensity}
            onBack={handleBackToYouTube}
            onComplete={handleBackToYouTube}
          />
        </div>
      )}

      {appState === "vocabulary" && (
        <VocabularyManager 
          onBack={handleBackToDashboard}
          onStartReview={() => setAppState("vocabulary-review")}
        />
      )}
      
      {appState === "vocabulary-review" && (
        <VocabularyReview onBack={() => setAppState("vocabulary")} />
      )}
    </div>
  );
};

export default Index;