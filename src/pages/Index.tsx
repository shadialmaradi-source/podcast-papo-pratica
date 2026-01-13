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
import YouTubeVideoExercises from "@/components/YouTubeVideoExercises";
import { YouTubeSpeaking } from "@/components/YouTubeSpeaking";
import { PodcastSource, PodcastEpisode } from "@/services/podcastService";

type AppState = "language-select" | "dashboard" | "podcasts" | "episodes" | "exercises" | "profile" | "youtube" | "youtube-exercises" | "youtube-library" | "youtube-exercises-view" | "youtube-speaking" | "leaderboard" | "vocabulary" | "vocabulary-review";

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
  const [generatorKey, setGeneratorKey] = useState(0);

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
        
        // Check for onboarding preferences from localStorage
        const onboardingLang = localStorage.getItem('onboarding_language');
        const onboardingLevel = localStorage.getItem('onboarding_level');
        
        // If we have onboarding preferences, use them and save to profile
        if (onboardingLang) {
          setSelectedLanguage(onboardingLang);
          // Save to profile if not already set
          if (!profile?.selected_language || profile.selected_language !== onboardingLang) {
            await supabase
              .from('profiles')
              .update({ 
                selected_language: onboardingLang,
                current_level: onboardingLevel || profile?.current_level 
              })
              .eq('user_id', user.id);
          }
          // Clear localStorage after saving
          localStorage.removeItem('onboarding_language');
          localStorage.removeItem('onboarding_level');
          // Only force dashboard during initial onboarding flow
          setAppState((prev) => (prev === "language-select" ? "dashboard" : prev));
        } else if (profile?.selected_language) {
          // Use existing profile language
          setSelectedLanguage(profile.selected_language);
          // Don't override in-app navigation (e.g., profile) if auth refresh re-triggers this effect
          setAppState((prev) => (prev === "language-select" ? "dashboard" : prev));
        }
        
        // Set level from profile or onboarding
        if (onboardingLevel) {
          setSelectedLevel(onboardingLevel);
        } else if (profile?.current_level) {
          setSelectedLevel(profile.current_level);
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

  const handleStartExercises = (episode: PodcastEpisode, level: string) => {
    setSelectedEpisode(episode);
    setSelectedLevel(level);
    setSelectedIntensity('intense');
    setAppState("exercises");
  };

  const handleExerciseComplete = (nextLevel?: string, nextIntensity?: string) => {
    console.log('[Index] handleExerciseComplete called', { nextLevel, nextIntensity, currentKey: generatorKey });
    
    if (nextLevel && nextIntensity) {
      // User is progressing to next level/intensity - force unmount/remount
      console.log('[Index] Progressing to next level:', nextLevel, nextIntensity);
      setSelectedLevel(nextLevel);
      setSelectedIntensity(nextIntensity);
      setGeneratorKey(k => k + 1);
      
      // Force unmount by switching to episodes briefly, then remount with new props
      setAppState("episodes");
      setTimeout(() => {
        console.log('[Index] Remounting ExerciseGenerator with new key:', generatorKey + 1);
        setAppState("exercises");
      }, 0);
    } else {
      // Return to episodes selection
      console.log('[Index] Returning to episodes');
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
    setAppState('youtube-exercises-view');
  };

  const handleNavigateToLeaderboard = () => {
    setAppState('leaderboard');
  };

  const handleYouTubeExercises = (videoId: string, level: string) => {
    setSelectedVideoId(videoId);
    setSelectedLevel(level);
    setSelectedIntensity('intense');
    setAppState("youtube-exercises");
  };

  const handleBackToYouTube = () => {
    setAppState("youtube-exercises-view");
  };

  const handleBackToYouTubeLibrary = () => {
    setAppState("youtube-library");
  };

  const handleContinueToSpeaking = (videoId: string, lvl: string) => {
    setSelectedVideoId(videoId);
    setSelectedLevel(lvl);
    setAppState('youtube-speaking');
  };

  const handleSpeakingComplete = () => {
    setAppState('youtube-library');
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
          onNavigate={handleNavigate}
          onVideoSelect={(videoId: string) => {
            setSelectedVideoId(videoId);
            setAppState('youtube-exercises-view');
          }}
          selectedLanguage={selectedLanguage || userProfile?.selected_language}
          onLanguageChange={handleLanguageChange}
          onNavigateToLibrary={() => setAppState('youtube-library')}
        />
      )}

      {appState === "profile" && (
        <ProfilePage 
          onBack={handleBackToDashboard}
          onNavigateToYouTube={() => setAppState('youtube')}
          onNavigateToLibrary={() => setAppState('youtube-library')}
          onResumeExercise={(videoId: string, level: string) => {
            setSelectedVideoId(videoId);
            setSelectedLevel(level);
            setSelectedIntensity('intense');
            setAppState('youtube-exercises');
          }}
          selectedLanguage={selectedLanguage || userProfile?.selected_language}
        />
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
            key={`${selectedEpisode.id}-${selectedLevel}-${selectedIntensity}-${generatorKey}`}
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

      {appState === "youtube" && (
        <div className="container mx-auto px-4">
          <YouTubeVideos 
            onBack={() => setAppState('youtube-library')}
            onStartExercises={handleYouTubeExercises}
          />
        </div>
      )}

      {appState === "youtube-exercises-view" && selectedVideoId && (
        <YouTubeVideoExercises
          videoId={selectedVideoId}
          onBack={handleBackToYouTubeLibrary}
          onStartExercises={(level: string) => {
            setSelectedLevel(level);
            setSelectedIntensity('intense');
            setAppState("youtube-exercises");
          }}
        />
      )}

      {appState === "youtube-exercises" && selectedVideoId && (
        <div className="container mx-auto px-4 py-8">
          <YouTubeExercises
            videoId={selectedVideoId}
            level={selectedLevel}
            intensity={selectedIntensity}
            onBack={handleBackToYouTube}
            onComplete={handleBackToYouTube}
            onContinueToSpeaking={handleContinueToSpeaking}
          />
        </div>
      )}

      {appState === "youtube-speaking" && selectedVideoId && (
        <YouTubeSpeaking
          videoId={selectedVideoId}
          level={selectedLevel}
          onComplete={handleSpeakingComplete}
          onBack={() => setAppState('youtube-exercises')}
        />
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