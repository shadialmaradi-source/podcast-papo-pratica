import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchWeeksForLevel, getEffectiveWeekState, type WeekWithProgress } from "@/services/learningPathService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Play,
  Target,
  Flame,
  BookOpen,
  Layers,
  Sparkles,
  Settings,
  LogOut,
  Bell,
  User,
  Trophy,
  Edit,
  Check,
  X,
  CreditCard,
  Loader2,
  GraduationCap,
  Globe
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { FlashcardRepository } from "./FlashcardRepository";
import { getFlashcardCount, getUserCreatedFlashcardCount } from "@/services/flashcardService";
import { PdfDownloadButton } from "./subscription/PdfDownloadButton";
import { 
  getUserSubscription, 
  type UserSubscription 
} from "@/services/subscriptionService";

interface UserProfile {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string;
  full_name: string;
  avatar_url: string;
  selected_language: string;
  native_language: string | null;
  current_level: string;
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  last_login_date: string;
  created_at: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked_at: string;
}

interface WeeklyStats {
  videosWatched: number;
  wordsLearned: number;
  studyTimeMinutes: number;
}

interface ProfilePageProps {
  onBack: () => void;
  selectedLanguage?: string;
}

export function ProfilePage({ onBack, selectedLanguage }: ProfilePageProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [usernameValidation, setUsernameValidation] = useState<{ valid: boolean; reason?: string } | null>(null);
  const [validatingUsername, setValidatingUsername] = useState(false);
  const [flashcardCount, setFlashcardCount] = useState(0);
  const [showFlashcardRepository, setShowFlashcardRepository] = useState(false);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({ videosWatched: 0, wordsLearned: 0, studyTimeMinutes: 0 });
  const [portalLoading, setPortalLoading] = useState(false);
  const [learningPathProgress, setLearningPathProgress] = useState<{
    currentWeek: WeekWithProgress | null;
    totalWeeks: number;
    totalCompleted: number;
    totalVideosCompleted: number;
    totalVideos: number;
  } | null>(null);

  // Load profile data on mount
  useEffect(() => {
    if (user) {
      loadProfileData();
      loadFlashcardCount();
      loadSubscriptionData();
      loadWeeklyStats();
      loadLearningPathData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadLearningPathData = async () => {
    if (!user) return;
    try {
      const weeks = await fetchWeeksForLevel("beginner", "english", user.id);
      if (weeks.length === 0) return;

      const totalVideos = weeks.reduce((sum, w) => sum + w.total_videos, 0);
      const totalVideosCompleted = weeks.reduce((sum, w) => {
        return sum + (w.progress?.videos_completed || 0);
      }, 0);
      const totalCompleted = weeks.filter(w => getEffectiveWeekState(w, weeks) === "completed").length;
      const currentWeek = weeks.find(w => getEffectiveWeekState(w, weeks) === "in_progress") || null;

      setLearningPathProgress({
        currentWeek,
        totalWeeks: weeks.length,
        totalCompleted,
        totalVideosCompleted,
        totalVideos,
      });
    } catch (error) {
      console.error("Error loading learning path data:", error);
    }
  };

  const loadSubscriptionData = async () => {
    if (!user) return;
    try {
      const sub = await getUserSubscription(user.id);
      setSubscription(sub);
    } catch (error) {
      console.error("Error loading subscription data:", error);
    }
  };

  const loadFlashcardCount = async () => {
    if (!user) return;
    // Get both system flashcards and user-created flashcards
    const [systemCount, userCreatedCount] = await Promise.all([
      getFlashcardCount(user.id),
      getUserCreatedFlashcardCount(user.id),
    ]);
    setFlashcardCount(systemCount + userCreatedCount);
  };

  const loadWeeklyStats = async () => {
    if (!user) return;
    
    try {
      // Get date 7 days ago
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoISO = weekAgo.toISOString();

      // Count videos watched this week (from youtube_video_analytics)
      const { data: videoAnalytics } = await supabase
        .from('youtube_video_analytics')
        .select('video_id')
        .eq('user_id', user.id)
        .eq('event_type', 'video_started')
        .gte('created_at', weekAgoISO);
      
      // Get unique videos watched
      const uniqueVideos = new Set(videoAnalytics?.map(v => v.video_id) || []);

      // Count flashcards reviewed this week (words learned approximation)
      const { data: flashcardReviews } = await supabase
        .from('user_viewed_flashcards')
        .select('id')
        .eq('user_id', user.id)
        .gte('last_reviewed_at', weekAgoISO);

      // Calculate study time from daily activities
      const { data: dailyActivities } = await supabase
        .from('daily_activities')
        .select('xp_earned_today')
        .eq('user_id', user.id)
        .gte('activity_date', weekAgo.toISOString().split('T')[0]);
      
      // Approximate study time: 1 XP ≈ 0.5 minutes
      const totalXP = dailyActivities?.reduce((sum, d) => sum + (d.xp_earned_today || 0), 0) || 0;
      const studyMinutes = Math.round(totalXP * 0.5);

      setWeeklyStats({
        videosWatched: uniqueVideos.size,
        wordsLearned: flashcardReviews?.length || 0,
        studyTimeMinutes: studyMinutes
      });
    } catch (error) {
      console.error('Error loading weekly stats:', error);
    }
  };

  const loadProfileData = async () => {
    try {
      setLoading(true);
      
      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*, username')
        .eq('user_id', user?.id)
        .single();

      if (profileData) {
        // Load streak data from user_streak_data table
        const { data: streakData } = await supabase
          .from('user_streak_data')
          .select('current_streak, longest_streak')
          .eq('user_id', user?.id)
          .maybeSingle();
        
        if (streakData) {
          profileData.current_streak = streakData.current_streak;
          profileData.longest_streak = streakData.longest_streak;
        }
        
        setProfile(profileData);
        setNewUsername(profileData.username || "");
      }

      // Load exercise results for achievements
      const { data: exerciseResults } = await supabase
        .from('user_exercise_results')
        .select('is_correct')
        .eq('user_id', user?.id);

      generateAchievements(profileData, exerciseResults || []);
      
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAchievements = (profile: UserProfile, exerciseResults: any[]) => {
    const achievementsList: Achievement[] = [];
    const now = new Date().toISOString();

    // XP-based achievements
    if (profile?.total_xp >= 100) {
      achievementsList.push({
        id: '100-xp',
        title: '100 XP Club',
        description: 'Earned your first 100 XP',
        icon: '🏆',
        unlocked_at: now
      });
    }

    if (profile?.total_xp >= 500) {
      achievementsList.push({
        id: '500-xp',
        title: 'XP Champion',
        description: 'Reached 500 XP milestone',
        icon: '🥇',
        unlocked_at: now
      });
    }

    if (profile?.total_xp >= 1000) {
      achievementsList.push({
        id: '1000-xp',
        title: 'XP Master',
        description: 'Achieved 1000 XP milestone',
        icon: '👑',
        unlocked_at: now
      });
    }

    // Streak-based achievements
    if (profile?.current_streak >= 3) {
      achievementsList.push({
        id: 'first-streak',
        title: 'First Streak',
        description: 'Maintained a 3-day learning streak',
        icon: '🔥',
        unlocked_at: now
      });
    }

    if (profile?.current_streak >= 7) {
      achievementsList.push({
        id: 'week-warrior',
        title: 'Week Warrior',
        description: 'Completed a 7-day streak',
        icon: '⚡',
        unlocked_at: now
      });
    }

    // Exercise-based achievements
    if (exerciseResults?.length >= 10) {
      achievementsList.push({
        id: 'exercise-starter',
        title: 'Exercise Starter',
        description: 'Completed 10 exercises',
        icon: '📚',
        unlocked_at: now
      });
    }

    if (exerciseResults?.length >= 50) {
      achievementsList.push({
        id: 'exercise-master',
        title: 'Exercise Master',
        description: 'Completed 50 exercises',
        icon: '🎯',
        unlocked_at: now
      });
    }

    setAchievements(achievementsList);
  };

  const getCurrentLevel = () => {
    if (!profile) return 1;
    return Math.floor(profile.total_xp / 1000) + 1;
  };

  const getXPProgress = () => {
    if (!profile) return 0;
    const currentLevelXP = profile.total_xp % 1000;
    return (currentLevelXP / 1000) * 100;
  };

  const getLanguageDisplay = (lang: string | undefined) => {
    switch (lang) {
      case 'portuguese': return 'Portuguese';
      case 'english': return 'English';
      case 'spanish': return 'Spanish';
      case 'french': return 'French';
      case 'italian': return 'Italian';
      default: return lang || 'a language';
    }
  };

  const handleSaveUsername = async () => {
    if (!newUsername || !user) return;

    try {
      setValidatingUsername(true);

      const { data: validationResult, error: validationError } = await supabase.functions.invoke(
        'validate-username',
        { body: { username: newUsername, currentUserId: user.id } }
      );

      if (validationError) {
        toast.error('Failed to validate username. Please try again.');
        return;
      }

      setUsernameValidation(validationResult);

      if (!validationResult.valid) {
        toast.error(validationResult.reason || 'Invalid username');
        return;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ username: newUsername })
        .eq('user_id', user.id);

      if (updateError) {
        toast.error('Failed to update username. Please try again.');
        return;
      }

      setProfile(prev => prev ? { ...prev, username: newUsername } : null);
      setIsEditingUsername(false);
      toast.success('Username updated successfully!');

    } catch (error) {
      console.error('Error saving username:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setValidatingUsername(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) return;
    setPortalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Session expired. Please sign in again.");
        return;
      }
      const response = await fetch(
        `https://fezpzihnvblzjrdzgioq.supabase.co/functions/v1/stripe-portal`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlenB6aWhudmJsempyZHpnaW9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODExNjksImV4cCI6MjA3MTk1NzE2OX0.LKxauwcMH0HaT-DeoBNG5mH7rneI8OiyfSQGrYG1R4M',
          },
          body: JSON.stringify({
            returnUrl: `${window.location.origin}/app?view=profile`,
          }),
        }
      );
      const data = await response.json();
      if (response.ok && data?.url) {
        window.location.href = data.url;
      } else {
        toast.error(data?.error || 'Unable to open subscription management.');
      }
    } catch (error) {
      console.error('Error opening portal:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show Flashcard Repository if active
  if (showFlashcardRepository && user) {
    return (
      <FlashcardRepository 
        userId={user.id} 
        onClose={() => {
          setShowFlashcardRepository(false);
          loadFlashcardCount();
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        
        {/* Back Navigation */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </motion.div>

        {/* User Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6"
        >
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center">
                {/* Avatar */}
                <Avatar className="h-20 w-20 border-4 border-primary/20 shadow-lg mb-4">
                  <AvatarImage src={profile?.avatar_url || ""} alt={profile?.username || profile?.display_name || ""} />
                  <AvatarFallback className="text-xl bg-primary/10 text-primary">
                    {(profile?.username || profile?.display_name || profile?.full_name || "U")
                      .split(" ")
                      .map(n => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                {/* Username */}
                <div className="flex items-center gap-2 mb-1">
                  {!isEditingUsername ? (
                    <>
                      <h1 className="text-2xl font-bold">
                        {profile?.username || profile?.display_name || "Set username"}
                      </h1>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setIsEditingUsername(true);
                          setUsernameValidation(null);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        value={newUsername}
                        onChange={(e) => {
                          setNewUsername(e.target.value);
                          setUsernameValidation(null);
                        }}
                        placeholder="Enter username"
                        className="max-w-[180px]"
                        maxLength={30}
                      />
                      <Button 
                        size="sm"
                        onClick={handleSaveUsername}
                        disabled={validatingUsername || !newUsername}
                        className="h-8 w-8 p-0"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsEditingUsername(false);
                          setNewUsername(profile?.username || "");
                          setUsernameValidation(null);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                
                {usernameValidation && !usernameValidation.valid && (
                  <p className="text-sm text-destructive mb-2">{usernameValidation.reason}</p>
                )}
                
                {/* Learning language */}
                <p className="text-muted-foreground mb-4">
                  Learning {getLanguageDisplay(profile?.selected_language)}
                </p>
                
                {/* Prominent Streak Display */}
                <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-full px-5 py-2 mb-4">
                  <span className="text-2xl font-bold text-orange-500 flex items-center gap-2">
                    <Flame className="h-6 w-6" />
                    {profile?.current_streak || 0} day streak
                  </span>
                </div>
                
                {/* Stats Row */}
                <div className="flex flex-wrap gap-2 justify-center">
                  <Badge variant="default" className="px-3 py-1 text-sm">
                    Level {getCurrentLevel()}
                  </Badge>
                  <Badge variant="secondary" className="px-3 py-1 text-sm">
                    {profile?.total_xp || 0} XP
                  </Badge>
                  {achievements.length > 0 && (
                    <Badge variant="outline" className="px-3 py-1 text-sm">
                      🏆 {achievements.length} badges
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Continue Learning CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <Button 
            onClick={() => navigate('/app')}
            size="lg"
            className="w-full h-14 text-lg gap-3 bg-primary hover:bg-primary/90 shadow-lg"
          >
            <Play className="h-5 w-5" />
            Continue Learning
          </Button>
        </motion.div>

        {/* Learning Path Progress Card */}
        {learningPathProgress && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="mb-6"
          >
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <h3 className="font-semibold text-foreground text-sm">Learning Path</h3>
                    <p className="text-xs text-muted-foreground">
                      {learningPathProgress.currentWeek
                        ? `Week ${learningPathProgress.currentWeek.week_number} of ${learningPathProgress.totalWeeks} — Beginner`
                        : `${learningPathProgress.totalCompleted} of ${learningPathProgress.totalWeeks} weeks completed`}
                    </p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{learningPathProgress.totalVideosCompleted}/{learningPathProgress.totalVideos} videos</span>
                        <span>
                          {learningPathProgress.totalVideos > 0
                            ? Math.round((learningPathProgress.totalVideosCompleted / learningPathProgress.totalVideos) * 100)
                            : 0}%
                        </span>
                      </div>
                      <Progress
                        value={
                          learningPathProgress.totalVideos > 0
                            ? (learningPathProgress.totalVideosCompleted / learningPathProgress.totalVideos) * 100
                            : 0
                        }
                        className="h-2"
                      />
                    </div>
                    {learningPathProgress.currentWeek && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-1 text-xs h-8"
                        onClick={() => navigate(`/learn/week/${learningPathProgress.currentWeek!.id}`)}
                      >
                        Continue — {learningPathProgress.currentWeek.title}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}


        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-6"
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-5 w-5 text-primary" />
                Level Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Level {getCurrentLevel()}</span>
                  <span className="text-sm text-muted-foreground">
                    {(profile?.total_xp || 0) % 1000} / 1000 XP
                  </span>
                </div>
                <Progress value={getXPProgress()} className="h-3" />
                <p className="text-sm text-muted-foreground">
                  {1000 - ((profile?.total_xp || 0) % 1000)} XP to next level
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* This Week Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                📊 This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weeklyStats.videosWatched > 0 || weeklyStats.wordsLearned > 0 || weeklyStats.studyTimeMinutes > 0 ? (
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary">{weeklyStats.videosWatched}</div>
                    <div className="text-xs text-muted-foreground">Videos watched</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">{weeklyStats.wordsLearned}</div>
                    <div className="text-xs text-muted-foreground">Words learned</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">{weeklyStats.studyTimeMinutes}m</div>
                    <div className="text-xs text-muted-foreground">Study time</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">
                    🚀 Start your first lesson this week!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Flashcards Section - UNCHANGED */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-6"
        >
          <Card className="border-0 shadow-lg bg-gradient-to-r from-primary/10 to-secondary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                My Flashcards
              </CardTitle>
              <CardDescription>
                All vocabulary from your completed video lessons
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <Layers className="w-8 h-8 text-primary" />
                </div>
                <div className="text-3xl font-bold text-primary mb-2">
                  {flashcardCount}
                </div>
                <p className="text-muted-foreground mb-4">
                  flashcards in your collection
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    onClick={() => setShowFlashcardRepository(true)} 
                    disabled={flashcardCount === 0}
                    className="gap-2"
                  >
                    <BookOpen className="h-4 w-4" />
                    {flashcardCount > 0 ? 'Start Study Session' : 'Complete a lesson first'}
                  </Button>
                  
                  <PdfDownloadButton
                    userId={user?.id || ''}
                    isPremium={subscription?.tier === 'premium' || subscription?.tier === 'promo'}
                    flashcardCount={flashcardCount}
                    username={profile?.username || profile?.display_name || 'User'}
                    language={profile?.selected_language || 'english'}
                  />
                </div>
              </div>
              
              {flashcardCount === 0 && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">
                    💡 Complete video lessons to build your flashcard collection!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Achievements Section - Only show if has achievements */}
        {achievements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-6"
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Achievements
                </CardTitle>
                <CardDescription>
                  You've earned {achievements.length} achievement{achievements.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-3">
                  {achievements.map((achievement) => (
                    <div 
                      key={achievement.id}
                      className="text-center p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                      title={achievement.description}
                    >
                      <div className="text-2xl mb-1">{achievement.icon}</div>
                      <div className="text-xs text-muted-foreground truncate">{achievement.title}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Settings Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-6"
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="h-5 w-5 text-muted-foreground" />
                Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Subscription Status */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  <span>Subscription</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={subscription?.tier === 'premium' || subscription?.tier === 'promo' ? 'default' : 'secondary'}>
                    {subscription?.tier === 'premium' ? 'Premium' : subscription?.tier === 'promo' ? 'Promo' : 'Free'}
                  </Badge>
                  {subscription?.tier === 'free' && (
                    <Button size="sm" variant="outline" onClick={() => navigate('/premium')}>
                      Upgrade
                    </Button>
                  )}
                </div>
              </div>

              {/* Manage Subscription (only for Stripe-paying premium users) */}
              {subscription?.tier === 'premium' && subscription?.stripeCustomerId && (
                <div 
                  className="flex items-center justify-between py-2 cursor-pointer hover:bg-muted/50 -mx-3 px-3 rounded-lg transition-colors"
                  onClick={handleManageSubscription}
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span>Manage Subscription</span>
                  </div>
                  {portalLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <ArrowLeft className="h-4 w-4 text-muted-foreground rotate-180" />
                  )}
                </div>
              )}
              
              {/* Notifications */}
              <div 
                className="flex items-center justify-between py-2 cursor-pointer hover:bg-muted/50 -mx-3 px-3 rounded-lg transition-colors"
                onClick={() => toast.info("Notification settings coming soon!")}
              >
                <div className="flex items-center gap-3">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <span>Notifications</span>
                </div>
                <ArrowLeft className="h-4 w-4 text-muted-foreground rotate-180" />
              </div>
              
              {/* Native Language */}
              <div className="flex items-center justify-between py-2 -mx-3 px-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span>Native Language</span>
                </div>
                <Select
                  value={profile?.native_language || 'en'}
                  onValueChange={async (value) => {
                    if (!user) return;
                    try {
                      const { error } = await supabase
                        .from('profiles')
                        .update({ native_language: value })
                        .eq('user_id', user.id);
                      if (error) throw error;
                      setProfile(prev => prev ? { ...prev, native_language: value } : null);
                      localStorage.setItem('onboarding_native_language', value);
                      toast.success('Native language updated!');
                    } catch (err) {
                      console.error('Error updating native language:', err);
                      toast.error('Failed to update native language');
                    }
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">🇬🇧 English</SelectItem>
                    <SelectItem value="es">🇪🇸 Español</SelectItem>
                    <SelectItem value="pt">🇧🇷 Português</SelectItem>
                    <SelectItem value="fr">🇫🇷 Français</SelectItem>
                    <SelectItem value="it">🇮🇹 Italiano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Logout */}
              <Button 
                variant="outline" 
                className="w-full mt-4 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Log out
              </Button>
            </CardContent>
          </Card>
        </motion.div>

      </div>
    </div>
  );
}
