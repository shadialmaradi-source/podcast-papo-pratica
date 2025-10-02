import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
import { YouTubeVideoPlayer } from "@/components/YouTubeVideoPlayer";
import { PodcastSource, PodcastEpisode } from "@/services/podcastService";

type AppState = "language-select" | "dashboard" | "podcasts" | "episodes" | "exercises" | "profile" | "youtube" | "youtube-exercises" | "youtube-library" | "youtube-player" | "leaderboard" | "vocabulary" | "vocabulary-review";

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const [appState, setAppState] = useState<AppState>("language-select");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [selectedPodcast, setSelectedPodcast] = useState<PodcastSource | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<PodcastEpisode | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string>("beginner");
  const [selectedIntensity, setSelectedIntensity] = useState<string>("light");
  const [selectedVideoId, setSelectedVideoId] = useState<string>("");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Fetch user profile on mount - MUST be before any early returns
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) {
        setProfileLoading(false);
        return;
      }
      
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (error) {
          console.error('Error fetching profile:', error);
          setProfileLoading(false);
          return;
        }
        
        setUserProfile(profile);
        
        // If user has a selected language, skip language selection
        if (profile?.selected_language) {
          setSelectedLanguage(profile.selected_language);
          setAppState("dashboard");
        }
        
        setProfileLoading(false);
      } catch (error) {
        console.error('Error fetching profile:', error);
        setProfileLoading(false);
      }
    };

    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    const handleCustomNavigation = () => {
      setAppState('leaderboard');
    };

    window.addEventListener('navigate-to-leaderboard', handleCustomNavigation);
    return () => window.removeEventListener('navigate-to-leaderboard', handleCustomNavigation);
  }, []);

  // Early returns AFTER all hooks
  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleLanguageSelect = async (language: string) => {
    setSelectedLanguage(language);
    
    // Save language to user profile
    try {
      await supabase
        .from('profiles')
        .update({ selected_language: language })
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error updating language preference:', error);
    }
    
    setAppState("dashboard");
  };

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
    // Update user profile language immediately
    if (userProfile) {
      setUserProfile(prev => ({
        ...prev,
        selected_language: language
      }));
    }
  };

  const handleNavigateToPodcasts = (page?: 'podcasts' | 'profile' | 'youtube' | 'vocabulary' | 'leaderboard') => {
    if (page === 'youtube') {
      setAppState('youtube-library');
    } else if (page === 'podcasts') {
      setAppState('podcasts');
    } else if (page) {
      setAppState(page);
    } else {
      setAppState("podcasts");
    }
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

  const handleExerciseComplete = (nextLevel?: string, nextIntensity?: string) => {
    if (nextLevel && nextIntensity) {
      // Start exercises with new level/intensity
      setSelectedLevel(nextLevel);
      setSelectedIntensity(nextIntensity);
      setAppState("exercises");
    } else {
      // Return to episodes selection
      setAppState("episodes");
    }
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
    setAppState('youtube-player');
  };

  const handleNavigateToLeaderboard = () => {
    setAppState('leaderboard');
  };

  const handleYouTubeExercises = (videoId: string, level: string, intensity: string) => {
    setSelectedVideoId(videoId);
    setSelectedLevel(level);
    setSelectedIntensity(intensity);
    setAppState("youtube-exercises");
  };

  const handleBackToYouTube = () => {
    setAppState("youtube-player");
  };

  const handleBackToYouTubeLibrary = () => {
    setAppState("youtube-library");
  };

  return (
    <div className="min-h-screen">
      {appState === "language-select" && (
        <LanguageSelector 
          onLanguageSelect={handleLanguageSelect}
          user={userProfile}
          onProfileClick={() => setAppState("profile")}
          onLogout={signOut}
        />
      )}

      {appState === "dashboard" && (
        <Dashboard 
          onNavigate={handleNavigateToPodcasts}
          selectedLanguage={selectedLanguage || userProfile?.selected_language}
          onLanguageChange={handleLanguageChange}
        />
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
                  onBack={handleBackToDashboard}
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
            key={`${selectedEpisode.id}-${selectedLevel}-${selectedIntensity}`}
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
          selectedLanguage={selectedLanguage || userProfile?.selected_language}
        />
      )}

      {appState === "youtube-player" && selectedVideoId && (
        <div className="container mx-auto px-4">
          <YouTubeVideoPlayer 
            videoId={selectedVideoId}
            onBack={handleBackToYouTubeLibrary}
            onStartExercises={(level: string, intensity: string) => {
              setSelectedLevel(level);
              setSelectedIntensity(intensity);
              setAppState("youtube-exercises");
            }}
          />
        </div>
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