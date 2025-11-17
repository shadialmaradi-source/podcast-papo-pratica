import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Flame, Star, Heart, Trophy, BookOpen, User, LogOut, Youtube, ArrowRight, Headphones, Play } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { LanguageSelectionModal } from "@/components/LanguageSelectionModal";
import { LearningDestinationModal } from "@/components/LearningDestinationModal";
import { getLanguageFlag, getLanguageDescription } from "@/utils/languageUtils";
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

interface DashboardProps {
  onNavigate: (page: 'podcasts' | 'profile' | 'youtube' | 'vocabulary' | 'leaderboard') => void;
  selectedLanguage?: string;
  onLanguageChange?: (language: string) => void;
}

export default function Dashboard({ onNavigate, selectedLanguage, onLanguageChange }: DashboardProps) {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showDestinationModal, setShowDestinationModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
      updateDailyActivity();
    }
  }, [user]);

  const fetchProfile = async () => {
  try {
    // Get basic profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*, username')
      .eq('user_id', user?.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return;
    }

    // Get streak data from unified streak system
    const { data: streakData } = await supabase
      .from('user_streak_data')
      .select('current_streak, longest_streak, last_activity_date')
      .eq('user_id', user?.id)
      .maybeSingle();

    // Merge profile with streak data
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
const updateDailyActivity = async () => {
  console.log('updateDailyActivity chiamata');
  if (!user) {
    console.log('No user, return');
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  console.log('Today:', today);
  
  try {
    let { data: streakData } = await supabase
      .from('user_streak_data')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    console.log('Streak data from DB:', streakData);

    if (!streakData) {
      console.log('Creating new streak data');
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
          title: "Streak iniziato!",
          description: "Il tuo primo giorno di apprendimento!",
        });
        fetchProfile();
      }
      return;
    }

    console.log('Last activity date:', streakData.last_activity_date);
    console.log('Already updated today?', streakData.last_activity_date === today);

    if (streakData.last_activity_date === today) {
      console.log('Already updated today, skipping');
      return;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    console.log('Yesterday string:', yesterdayStr);
    console.log('Should increment streak:', streakData.last_activity_date === yesterdayStr);

    let newStreak;
    
    if (streakData.last_activity_date === yesterdayStr) {
      newStreak = streakData.current_streak + 1;
      console.log('Incrementing streak to:', newStreak);
    } else {
      newStreak = 1;
      console.log('Resetting streak to:', newStreak);
    }

    const { error } = await supabase
      .from('user_streak_data')
      .update({
        current_streak: newStreak,
        longest_streak: Math.max(newStreak, streakData.longest_streak),
        last_activity_date: today
      })
      .eq('user_id', user.id);

    console.log('Update error:', error);
    console.log('New streak:', newStreak);

    if (!error) {
      toast({
        title: `Streak ${newStreak} giorni!`,
        description: `Continua cosi!`,
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

      // Update local state
      setProfile(prev => prev ? { ...prev, selected_language: newLanguage } : null);
      
      // Notify parent component
      onLanguageChange?.(newLanguage);
      
      setShowLanguageModal(false);
      
      toast({
        title: "Language Updated!",
        description: `Switched to ${newLanguage}. Where would you like to go?`,
      });
      
      // Show destination selection
      setShowDestinationModal(true);
    } catch (error) {
      console.error('Error updating language:', error);
      toast({
        title: "Error",
        description: "Failed to update language. Please try again.",
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
      <div className="container mx-auto p-4 sm:p-6 max-w-4xl">
        {/* Header con Stats integrate */}
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
                ItalianPod
              </h1>
              <p className="text-muted-foreground">
                {t('welcome')}, {profile?.username}!
              </p>
            </div>
          </div>
          
          {/* Stats and actions - responsive layout */}
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
            {/* Stats row */}
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Streak */}
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('streak')}</p>
                  <p className="font-bold">{profile?.current_streak || 0}</p>
                </div>
              </div>
              
              {/* XP */}
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('xp')}</p>
                  <p className="font-bold">{profile?.total_xp || 0}</p>
                </div>
              </div>
              
              {/* Language flag */}
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
            
            {/* Action buttons */}
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

        {/* Learning Options - Sezione principale */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8"
        >
          <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105 border-2 hover:border-primary/50" onClick={() => onNavigate('podcasts')}>
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-4">
                <div className="p-4 bg-primary/10 rounded-xl">
                  <Headphones className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{t('podcastLearning')}</CardTitle>
                  <CardDescription className="text-base mt-1">
                    {getLanguageDescription(selectedLanguage || profile?.selected_language || 'italian')}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Button className="w-full" size="lg">
                <Play className="h-5 w-5 mr-2" />
                {t('start')}
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105 border-2 hover:border-red-500/50" onClick={() => onNavigate('youtube')}>
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-4">
                <div className="p-4 bg-red-500/10 rounded-xl">
                  <Play className="h-8 w-8 text-red-500" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{t('youtubeVideos')}</CardTitle>
                  <CardDescription className="text-base mt-1">
                    {t('youtubeDescription')}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Button className="w-full" size="lg" variant="outline">
                <Youtube className="h-5 w-5 mr-2" />
                {t('start')}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Progress minimalista */}
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

        {/* Language Selection Modal */}
        <LanguageSelectionModal
          isOpen={showLanguageModal}
          onClose={() => setShowLanguageModal(false)}
          onLanguageSelect={handleLanguageChange}
          currentLanguage={selectedLanguage || profile?.selected_language}
        />

        {/* Learning Destination Modal */}
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