import { useState } from "react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { SpotifyConnect } from "@/components/SpotifyConnect";
import { PodcastBrowser } from "@/components/PodcastBrowser";
import { ExerciseGenerator } from "@/components/ExerciseGenerator";

type AppState = "language" | "connect" | "browse" | "exercise";

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
  const [appState, setAppState] = useState<AppState>("language");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [selectedPodcast, setSelectedPodcast] = useState<Podcast | null>(null);

  const handleLanguageSelect = (language: string) => {
    setSelectedLanguage(language);
    setAppState("connect");
  };

  const handleSpotifyConnect = () => {
    setAppState("browse");
  };

  const handlePodcastSelect = (podcast: Podcast) => {
    setSelectedPodcast(podcast);
    setAppState("exercise");
  };

  const handleExerciseComplete = () => {
    setAppState("browse");
    setSelectedPodcast(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {appState === "language" && (
        <LanguageSelector onLanguageSelect={handleLanguageSelect} />
      )}
      
      {appState === "connect" && (
        <SpotifyConnect onConnect={handleSpotifyConnect} />
      )}
      
      {appState === "browse" && (
        <div className="container mx-auto px-4 py-8">
          <PodcastBrowser onSelectPodcast={handlePodcastSelect} />
        </div>
      )}
      
      {appState === "exercise" && selectedPodcast && (
        <div className="container mx-auto px-4 py-8">
          <ExerciseGenerator
            podcastTitle={selectedPodcast.title}
            difficulty={selectedPodcast.difficulty}
            language={selectedLanguage}
            onComplete={handleExerciseComplete}
          />
        </div>
      )}
    </div>
  );
};

export default Index;