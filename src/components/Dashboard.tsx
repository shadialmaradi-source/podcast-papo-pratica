import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Flame, Star, Trophy, User, LogOut, Youtube, Plus, Play, Clock, Sparkles, Headphones, ArrowRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { LanguageSelectionModal } from "@/components/LanguageSelectionModal";
import { LearningDestinationModal } from "@/components/LearningDestinationModal";
import { getLanguageFlag } from "@/utils/languageUtils";
import { useTranslation } from "@/hooks/useTranslation";

interface UserProfile {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  selected_language: string;
  current_level: string;
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  last_login_date: string | null;
}

interface CommunityVideo {
  id: string;
  video_id: string;
  title: string;
  thumbnail_url: string | null;
  category: string | null;
  difficulty_level: string;
}

interface DashboardProps {
  onNavigate: (page: 'podcasts' | 'profile' | 'youtube' | 'vocabulary' | 'leaderboard') => void;
  onVideoSelect?: (videoId: string) => void;
  selectedLanguage?: string;
  onLanguageChange?: (language: string) => void;
  onNavigateToLibrary?: () => void;
}

export default function Dashboard({ onNavigate, onVideoSelect, selectedLanguage, onLanguageChange, onNavigateToLibrary }: DashboardProps) {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showDestinationModal, setShowDestinationModal] = useState(false);
  
  // Community videos state
  const [communityVideos, setCommunityVideos] = useState<CommunityVideo[]>([]);
  const [themes, setThemes] = useState<string[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [loadingVideos, setLoadingVideos] = useState(true);
  
  // YouTube import state
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  
  // Podcast content count
  const [podcastEpisodeCount, setPodcastEpisodeCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchProfile();
      updateDailyActivity();
      fetchCommunityVideos();
      fetchPodcastCount();
    }
  }, [user, selectedLanguage]);

  const fetchPodcastCount = async () => {
    try {
      const lang = selectedLanguage || profile?.selected_language || 'italian';
      
      // First get podcast sources for this language
      const { data: sources } = await supabase
        .from('podcast_sources')
        .select('id')
        .eq('language', lang)
        .eq('is_public', true);
      
      if (!sources || sources.length === 0) {
        setPodcastEpisodeCount(0);
        return;
      }
      
      const sourceIds = sources.map(s => s.id);
      
      // Then count episodes with transcripts
      const { count } = await supabase
        .from('podcast_episodes')
        .select('id', { count: 'exact', head: true })
        .in('podcast_source_id', sourceIds)
        .not('transcript', 'is', null)
        .neq('transcript', '');
      
      setPodcastEpisodeCount(count || 0);
    } catch (error) {
      console.error('Error fetching podcast count:', error);
    }
  };

  const fetchProfile = async () => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*, username')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      const { data: streakData } = await supabase
        .from('user_streak_data')
        .select('current_streak, longest_streak, last_activity_date')
        .eq('user_id', user?.id)
        .maybeSingle();

      const enrichedProfile = {
        ...profile,
        current_streak: streakData?.current_streak || 0,
        longest_streak: streakData?.longest_streak || 0,
        last_activity_date: streakData?.last_activity_date
      };

      setProfile(enrichedProfile);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCommunityVideos = async () => {
    setLoadingVideos(true);
    try {
      const lang = selectedLanguage || profile?.selected_language || 'italian';
      
      let query = supabase
        .from('youtube_videos')
        .select('id, video_id, title, thumbnail_url, category, difficulty_level')
        .eq('status', 'completed')
        .eq('language', lang)
        .order('created_at', { ascending: false })
        .limit(8);

      if (selectedTheme) {
        query = query.eq('category', selectedTheme);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching videos:', error);
        return;
      }

      setCommunityVideos(data || []);
      
      // Extract unique themes for this language
      const { data: allVideos } = await supabase
        .from('youtube_videos')
        .select('category')
        .eq('status', 'completed')
        .eq('language', lang)
        .not('category', 'is', null);
      
      const uniqueThemes = [...new Set(allVideos?.map(v => v.category).filter(Boolean) as string[])];
      setThemes(uniqueThemes);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoadingVideos(false);
    }
  };

  const handleImportVideo = async () => {
    if (!youtubeUrl.trim()) {
      toast({
        title: "URL richiesto",
        description: "Inserisci un link YouTube valido",
        variant: "destructive"
      });
      return;
    }

    setIsImporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('process-youtube-video', {
        body: { 
          videoUrl: youtubeUrl,
          language: selectedLanguage || 'italian',
          difficulty: 'beginner'
        }
      });

      if (response.error) throw new Error(response.error.message);

      toast({
        title: "Video in elaborazione!",
        description: "90 esercizi saranno pronti in 1-2 minuti",
      });

      setShowImportDialog(false);
      setYoutubeUrl('');
      
      // Refresh videos after import
      setTimeout(() => fetchCommunityVideos(), 3000);
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Impossibile importare il video",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleVideoClick = (video: CommunityVideo) => {
    if (onVideoSelect) {
      onVideoSelect(video.id);
    }
  };

  const updateDailyActivity = async () => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    
    try {
      let { data: streakData } = await supabase
        .from('user_streak_data')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!streakData) {
        const { data: newStreakData } = await supabase
          .from('user_streak_data')
          .insert({
            user_id: user.id,
            current_streak: 1,
            longest_streak: 1,
            last_activity_date: today,
            streak_freezes_available: 1
          })
          .select()
          .single();

        if (newStreakData) {
          toast({
            title: "Streak iniziata!",
            description: "Il tuo primo giorno di apprendimento!",
          });
          fetchProfile();
        }
        return;
      }

      if (streakData.last_activity_date === today) return;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const newStreak = streakData.last_activity_date === yesterdayStr 
        ? streakData.current_streak + 1 
        : 1;

      const { error } = await supabase
        .from('user_streak_data')
        .update({
          current_streak: newStreak,
          longest_streak: Math.max(newStreak, streakData.longest_streak),
          last_activity_date: today
        })
        .eq('user_id', user.id);

      if (!error) {
        toast({
          title: `${newStreak} giorni di streak!`,
          description: "Continua così!",
        });
      }

      fetchProfile();
    } catch (error) {
      console.error('Error updating daily activity:', error);
    }
  };

  const getXPProgress = () => {
    if (!profile) return 0;
    const currentLevelXP = profile.total_xp % 1000;
    return (currentLevelXP / 1000) * 100;
  };

  const getCurrentLevel = () => {
    if (!profile) return 1;
    return Math.floor(profile.total_xp / 1000) + 1;
  };

  const handleLanguageChange = async (newLanguage: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ selected_language: newLanguage })
        .eq('user_id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, selected_language: newLanguage } : null);
      onLanguageChange?.(newLanguage);
      setShowLanguageModal(false);
      
      toast({
        title: "Lingua aggiornata!",
        description: `Passato a ${newLanguage}. Dove vuoi andare?`,
      });
      
      setShowDestinationModal(true);
    } catch (error) {
      console.error('Error updating language:', error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare la lingua.",
        variant: "destructive"
      });
    }
  };

  const handleDestinationSelect = (destination: 'podcasts' | 'youtube') => {
    setShowDestinationModal(false);
    onNavigate(destination);
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Disconnesso",
      description: "A presto!",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3">{t('loading')}</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6"
        >
          <div className="flex items-center gap-4 mx-auto sm:mx-0">
            <Avatar className="h-12 w-12">
              <AvatarImage src={profile?.avatar_url || ""} alt={profile?.username || ""} />
              <AvatarFallback>
                {(profile?.username || profile?.display_name || "U").substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
                ListenFlow
              </h1>
              <p className="text-muted-foreground">
                {t('welcome')}, {profile?.username}!
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('streak')}</p>
                  <p className="font-bold">{profile?.current_streak || 0}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('xp')}</p>
                  <p className="font-bold">{profile?.total_xp || 0}</p>
                </div>
              </div>
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowLanguageModal(true)}
                className="text-2xl p-2 hover:scale-110 transition-transform"
                title={t('changeLanguage')}
              >
                {getLanguageFlag(selectedLanguage || profile?.selected_language || 'italian')}
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onNavigate('profile')}>
                <User className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Main 2-Column Layout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8"
        >
          {/* Column 1: Community Videos (60% = 3/5) */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Play className="h-5 w-5 text-primary" />
                Video pronti community
              </h2>
              {themes.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  <Badge 
                    variant={selectedTheme === null ? "default" : "outline"}
                    onClick={() => {
                      setSelectedTheme(null);
                      fetchCommunityVideos();
                    }}
                    className="cursor-pointer hover:scale-105 transition-transform"
                  >
                    Tutti
                  </Badge>
                  {themes.map(theme => (
                    <Badge 
                      key={theme} 
                      variant={selectedTheme === theme ? "default" : "outline"}
                      onClick={() => {
                        setSelectedTheme(theme);
                        setTimeout(fetchCommunityVideos, 0);
                      }}
                      className="cursor-pointer hover:scale-105 transition-transform"
                    >
                      {theme}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            
            {/* Video Grid 2x4 */}
            {loadingVideos ? (
              <div className="grid grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="aspect-video bg-muted rounded-t-lg" />
                    <CardContent className="p-3">
                      <div className="h-4 bg-muted rounded w-3/4" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : communityVideos.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {communityVideos.map(video => (
                  <Card 
                    key={video.id}
                    className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] overflow-hidden group"
                    onClick={() => handleVideoClick(video)}
                  >
                    <div className="relative aspect-video">
                      <img 
                        src={video.thumbnail_url || `https://img.youtube.com/vi/${video.video_id}/mqdefault.jpg`}
                        alt={video.title}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                      />
                      <Badge className="absolute top-2 left-2 bg-black/70 text-white">
                        {video.category || 'Generale'}
                      </Badge>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <Play className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <h4 className="font-medium text-sm line-clamp-2">{video.title}</h4>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground mb-4">Nessun video disponibile ancora</p>
                <Button variant="outline" onClick={() => setShowImportDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi il primo video
                </Button>
              </Card>
            )}
          </div>

          {/* Column 2: Cards Stack (40% = 2/5) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Card 1: YouTube Import CTA (Red) */}
            <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20 hover:border-red-500/40 transition-colors">
              <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                <div className="p-3 bg-red-500/10 rounded-full mb-3">
                  <Youtube className="h-10 w-10 text-red-500" />
                </div>
                <h3 className="text-xl font-bold mb-2">Il tuo primo video</h3>
                <div className="flex items-center gap-4 text-muted-foreground mb-4 text-sm">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Max 15min
                  </span>
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-4 w-4" />
                    90 esercizi
                  </span>
                </div>
                
                <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                  <DialogTrigger asChild>
                    <Button size="default" className="bg-red-500 hover:bg-red-600 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Inserisci link YouTube
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Aggiungi video YouTube</DialogTitle>
                      <DialogDescription>
                        Incolla il link di un video YouTube (max 15 minuti) e genereremo 90 esercizi automaticamente.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <Input
                        placeholder="https://youtube.com/watch?v=..."
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        disabled={isImporting}
                      />
                      <Button 
                        onClick={handleImportVideo} 
                        disabled={isImporting || !youtubeUrl.trim()}
                        className="w-full bg-red-500 hover:bg-red-600"
                      >
                        {isImporting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            Elaborazione...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Genera esercizi
                          </>
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            {/* Card 2: Ready Content (Green) */}
            <Card 
              className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 hover:border-green-500/40 transition-colors cursor-pointer"
              onClick={() => onNavigateToLibrary?.()}
            >
              <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                <div className="p-3 bg-green-500/10 rounded-full mb-3">
                  <Headphones className="h-10 w-10 text-green-500" />
                </div>
                <h3 className="text-xl font-bold mb-2">Contenuti pronti</h3>
                <p className="text-muted-foreground mb-4 text-sm">
                  {podcastEpisodeCount} episodi con transcript disponibili
                </p>
                <Button variant="outline" className="border-green-500/50 text-green-600 hover:bg-green-500/10">
                  Esplora tutti
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Progress section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-purple-500" />
                  <span className="font-semibold">{t('level')} {getCurrentLevel()}</span>
                </div>
              </div>
              <Progress value={getXPProgress()} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2">
                {profile?.total_xp % 1000} / 1000 {t('xp')}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Modals */}
        <LanguageSelectionModal
          isOpen={showLanguageModal}
          onClose={() => setShowLanguageModal(false)}
          onLanguageSelect={handleLanguageChange}
          currentLanguage={selectedLanguage || profile?.selected_language}
        />

        <LearningDestinationModal
          isOpen={showDestinationModal}
          onClose={() => setShowDestinationModal(false)}
          onDestinationSelect={handleDestinationSelect}
          selectedLanguage={selectedLanguage || profile?.selected_language || 'italian'}
        />
      </div>
    </div>
  );
}
