import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Flame, Star, Heart, Trophy, BookOpen, User, LogOut, Youtube } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface UserProfile {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  selected_language: string;
  current_level: string;
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  hearts: number;
  last_login_date: string | null;
}

interface DashboardProps {
  onNavigate: (page: 'podcasts' | 'profile' | 'youtube') => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
      updateDailyActivity();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateDailyActivity = async () => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    
    try {
      // Check if today's activity exists
      const { data: existingActivity } = await supabase
        .from('daily_activities')
        .select('*')
        .eq('user_id', user.id)
        .eq('activity_date', today)
        .maybeSingle();

      if (!existingActivity) {
        // Create today's activity and update streak
        await supabase
          .from('daily_activities')
          .insert({
            user_id: user.id,
            activity_date: today,
            activities_completed: 1,
            xp_earned_today: 0
          });

        // Update profile with new streak
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        const { data: yesterdayActivity } = await supabase
          .from('daily_activities')
          .select('*')
          .eq('user_id', user.id)
          .eq('activity_date', yesterdayStr)
          .maybeSingle();

        const newStreak = yesterdayActivity ? (profile?.current_streak || 0) + 1 : 1;

        await supabase
          .from('profiles')
          .update({
            current_streak: newStreak,
            longest_streak: Math.max(newStreak, profile?.longest_streak || 0),
            last_login_date: today
          })
          .eq('user_id', user.id);

        if (newStreak > (profile?.current_streak || 0)) {
          toast({
            title: "Streak aggiornato! 🔥",
            description: `Sei a ${newStreak} giorni consecutivi!`,
          });
        }

        fetchProfile();
      }
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto p-6 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
              PodcastLearn
            </h1>
            <p className="text-muted-foreground">
              Ciao, {profile?.display_name || user?.email}!
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onNavigate('profile')}>
              <User className="h-4 w-4 mr-2" />
              Profilo
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Esci
            </Button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500/10 to-red-500/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/20 rounded-lg">
                    <Flame className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Streak</p>
                    <p className="text-2xl font-bold">{profile?.current_streak || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-500/10 to-orange-500/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <Star className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">XP Totale</p>
                    <p className="text-2xl font-bold">{profile?.total_xp || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-0 shadow-lg bg-gradient-to-br from-red-500/10 to-pink-500/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <Heart className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cuori</p>
                    <p className="text-2xl font-bold">{profile?.hearts || 0}/5</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500/10 to-blue-500/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Trophy className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Livello</p>
                    <p className="text-2xl font-bold">{getCurrentLevel()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Progress Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Progresso Livello {getCurrentLevel()}
                </CardTitle>
                <CardDescription>
                  {profile?.total_xp % 1000} / 1000 XP
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Progress value={getXPProgress()} className="h-3" />
                <p className="text-sm text-muted-foreground mt-2">
                  {1000 - (profile?.total_xp || 0) % 1000} XP al prossimo livello
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Language & Level Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Impostazioni Apprendimento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Lingua</p>
                  <Badge variant="secondary" className="text-base px-3 py-1">
                    {profile?.selected_language === 'portuguese' ? '🇧🇷 Portoghese' : 
                     profile?.selected_language === 'english' ? '🇺🇸 Inglese' :
                     profile?.selected_language === 'spanish' ? '🇪🇸 Spagnolo' :
                     profile?.selected_language === 'french' ? '🇫🇷 Francese' : profile?.selected_language}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Livello</p>
                  <Badge variant="outline" className="text-base px-3 py-1">
                    {profile?.current_level}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <Button 
              size="lg" 
              className="text-lg px-8 py-6"
              variant="learning"
              onClick={() => onNavigate('podcasts')}
            >
              <BookOpen className="h-5 w-5 mr-2" />
              Esplora Podcast
            </Button>
            
            <Button 
              size="lg" 
              className="text-lg px-8 py-6"
              variant="outline"
              onClick={() => onNavigate('youtube')}
            >
              <Youtube className="h-5 w-5 mr-2 text-red-500" />
              Video YouTube
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}