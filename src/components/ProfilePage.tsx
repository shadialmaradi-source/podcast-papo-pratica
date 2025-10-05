import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  Trophy, 
  Star, 
  Target, 
  Calendar, 
  ArrowLeft, 
  Award,
  TrendingUp,
  BookOpen,
  Zap,
  Clock,
  Users,
  Flame,
  Gift,
  Headphones,
  Crown,
  Medal,
  Edit,
  Check,
  X
} from "lucide-react";
import { motion } from "framer-motion";
import { EngagementFeatures } from "./EngagementFeatures";
import { PersonalizedRecommendations } from "./PersonalizedRecommendations";

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  username: string | null;
  display_name: string;
  full_name: string;
  avatar_url: string;
  selected_language: string;
  current_level: string;
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  last_login_date: string;
  created_at: string;
}

interface ExerciseStats {
  total_exercises: number;
  correct_answers: number;
  beginner_completed: number;
  intermediate_completed: number;
  advanced_completed: number;
  listening_exercises: number;
  vocabulary_exercises: number;
  grammar_exercises: number;
  comprehension_exercises: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked_at: string;
  xp_requirement?: number;
  streak_requirement?: number;
}

interface EpisodeProgress {
  episode_id: string;
  episode_title: string;
  progress_percentage: number;
  completed_at: string | null;
  is_completed: boolean;
}

interface LeaderboardUser {
  id: string;
  username: string | null;
  display_name: string;
  avatar_url: string;
  total_xp: number;
  current_streak: number;
  selected_language: string;
  rank: number;
}

interface ProfilePageProps {
  onBack: () => void;
}

export function ProfilePage({ onBack }: ProfilePageProps) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [exerciseStats, setExerciseStats] = useState<ExerciseStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [episodeProgress, setEpisodeProgress] = useState<EpisodeProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [userGlobalRank, setUserGlobalRank] = useState<number>(0);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [usernameValidation, setUsernameValidation] = useState<{ valid: boolean; reason?: string } | null>(null);
  const [validatingUsername, setValidatingUsername] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfileData();
    }
  }, [user]);

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
          // Merge streak data into profile
          profileData.current_streak = streakData.current_streak;
          profileData.longest_streak = streakData.longest_streak;
        }
        
        setProfile(profileData);
        setNewUsername(profileData.username || "");
      }

      // Load exercise statistics
      const { data: exerciseResults } = await supabase
        .from('user_exercise_results')
        .select(`
          *,
          exercises!inner(difficulty, exercise_type)
        `)
        .eq('user_id', user?.id);

      if (exerciseResults) {
        const stats: ExerciseStats = {
          total_exercises: exerciseResults.length,
          correct_answers: exerciseResults.filter(r => r.is_correct).length,
          beginner_completed: exerciseResults.filter(r => 
            r.exercises?.difficulty === 'beginner' && r.is_correct
          ).length,
          intermediate_completed: exerciseResults.filter(r => 
            r.exercises?.difficulty === 'intermediate' && r.is_correct
          ).length,
          advanced_completed: exerciseResults.filter(r => 
            r.exercises?.difficulty === 'advanced' && r.is_correct
          ).length,
          listening_exercises: exerciseResults.filter(r => 
            r.exercises?.exercise_type === 'listening' && r.is_correct
          ).length,
          vocabulary_exercises: exerciseResults.filter(r => 
            r.exercises?.exercise_type === 'vocabulary' && r.is_correct
          ).length,
          grammar_exercises: exerciseResults.filter(r => 
            r.exercises?.exercise_type === 'grammar' && r.is_correct
          ).length,
          comprehension_exercises: exerciseResults.filter(r => 
            r.exercises?.exercise_type === 'comprehension' && r.is_correct
          ).length,
        };
        setExerciseStats(stats);
      }

      // Load episode progress
      const { data: progressData } = await supabase
        .from('user_episode_progress')
        .select(`
          *,
          podcast_episodes!inner(title)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (progressData) {
        const episodes: EpisodeProgress[] = progressData.map(p => ({
          episode_id: p.episode_id || '',
          episode_title: p.podcast_episodes?.title || 'Unknown Episode',
          progress_percentage: p.progress_percentage || 0,
          completed_at: p.completed_at,
          is_completed: p.is_completed || false
        }));
        setEpisodeProgress(episodes);
      }

      // Generate achievements based on current stats
      generateAchievements(profileData, exerciseResults);

      // Load leaderboard data
      await loadLeaderboardData(profileData);
      
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboardData = async (profileData: UserProfile) => {
    try {
      // Get top 10 global users for the leaderboard preview
      const { data: globalData } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, total_xp, current_streak, selected_language')
        .order('total_xp', { ascending: false })
        .limit(10);

      if (globalData) {
        const globalWithRanks = globalData.map((user, index) => ({
          ...user,
          rank: index + 1
        }));
        setLeaderboardData(globalWithRanks);

        // Find user's global rank
        const userRank = globalWithRanks.findIndex(u => u.id === profileData?.id) + 1;
        setUserGlobalRank(userRank || 0);
      }
    } catch (error) {
      console.error('Error loading leaderboard data:', error);
    }
  };

  const generateAchievements = (profile: UserProfile, exerciseResults: any[]) => {
    const achievementsList: Achievement[] = [];
    const now = new Date().toISOString();

    // XP-based achievements
    if (profile.total_xp >= 100) {
      achievementsList.push({
        id: '100-xp',
        title: '100 XP Club',
        description: 'Earned your first 100 XP',
        icon: '🏆',
        unlocked_at: now,
        xp_requirement: 100
      });
    }

    if (profile.total_xp >= 500) {
      achievementsList.push({
        id: '500-xp',
        title: 'XP Champion',
        description: 'Reached 500 XP milestone',
        icon: '🥇',
        unlocked_at: now,
        xp_requirement: 500
      });
    }

    if (profile.total_xp >= 1000) {
      achievementsList.push({
        id: '1000-xp',
        title: 'XP Master',
        description: 'Achieved 1000 XP milestone',
        icon: '👑',
        unlocked_at: now,
        xp_requirement: 1000
      });
    }

    // Streak-based achievements
    if (profile.current_streak >= 3) {
      achievementsList.push({
        id: 'first-streak',
        title: 'First Streak',
        description: 'Maintained a 3-day learning streak',
        icon: '🔥',
        unlocked_at: now,
        streak_requirement: 3
      });
    }

    if (profile.current_streak >= 7) {
      achievementsList.push({
        id: 'week-warrior',
        title: 'Week Warrior',
        description: 'Completed a 7-day streak',
        icon: '⚡',
        unlocked_at: now,
        streak_requirement: 7
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
        id: 'episode-master',
        title: 'Episode Master',
        description: 'Completed 50 exercises',
        icon: '🎯',
        unlocked_at: now
      });
    }

    setAchievements(achievementsList);
  };

  const getAccuracyPercentage = () => {
    if (!exerciseStats || exerciseStats.total_exercises === 0) return 0;
    return Math.round((exerciseStats.correct_answers / exerciseStats.total_exercises) * 100);
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

  const handleSaveUsername = async () => {
    if (!newUsername || !user) return;

    try {
      setValidatingUsername(true);

      // Call validation edge function
      const { data: validationResult, error: validationError } = await supabase.functions.invoke(
        'validate-username',
        {
          body: { username: newUsername, currentUserId: user.id }
        }
      );

      if (validationError) {
        console.error('Validation error:', validationError);
        toast.error('Failed to validate username. Please try again.');
        return;
      }

      setUsernameValidation(validationResult);

      if (!validationResult.valid) {
        toast.error(validationResult.reason || 'Invalid username');
        return;
      }

      // Update username in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ username: newUsername })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Update error:', updateError);
        toast.error('Failed to update username. Please try again.');
        return;
      }

      // Update local state
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

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="h-4 w-4 text-yellow-500" />;
      case 2: return <Medal className="h-4 w-4 text-gray-400" />;
      case 3: return <Medal className="h-4 w-4 text-amber-600" />;
      default: return <span className="text-xs font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna alla Dashboard
          </Button>
        </div>

        {/* Profile Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="border-0 shadow-lg bg-gradient-to-r from-primary/10 to-secondary/10">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                  <AvatarImage src={profile?.avatar_url || ""} alt={profile?.username || profile?.display_name || ""} />
                  <AvatarFallback className="text-2xl">
                    {(profile?.username || profile?.display_name || profile?.full_name || "U")
                      .split(" ")
                      .map(n => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 text-center md:text-left">
                  <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                    {!isEditingUsername ? (
                      <>
                        <h1 className="text-3xl font-bold">
                          {profile?.username || profile?.display_name || profile?.full_name || "Set your username"}
                        </h1>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setIsEditingUsername(true);
                            setUsernameValidation(null);
                          }}
                        >
                          <Edit className="h-4 w-4" />
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
                          className="max-w-xs"
                          maxLength={30}
                        />
                        <Button 
                          size="sm"
                          onClick={handleSaveUsername}
                          disabled={validatingUsername || !newUsername}
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
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {usernameValidation && !usernameValidation.valid && (
                    <p className="text-sm text-destructive mb-2">{usernameValidation.reason}</p>
                  )}
                  {isEditingUsername && (
                    <p className="text-xs text-muted-foreground mb-2">
                      3-30 characters, letters, numbers, underscore, hyphen only
                    </p>
                  )}
                  <p className="text-muted-foreground mb-4">
                    Learning {profile?.selected_language === 'portuguese' ? 'Portuguese' : 
                             profile?.selected_language === 'english' ? 'English' :
                             profile?.selected_language === 'spanish' ? 'Spanish' :
                             profile?.selected_language === 'french' ? 'French' : 
                             profile?.selected_language}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    <Badge variant="default" className="px-3 py-1">
                      Level {getCurrentLevel()}
                    </Badge>
                    <Badge variant="secondary" className="px-3 py-1">
                      {profile?.total_xp || 0} XP
                    </Badge>
                    <Badge variant="outline" className="px-3 py-1">
                      {profile?.current_streak || 0} day streak
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary">{exerciseStats?.total_exercises || 0}</div>
                    <div className="text-xs text-muted-foreground">Exercises</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-500">{getAccuracyPercentage()}%</div>
                    <div className="text-xs text-muted-foreground">Accuracy</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-500">{achievements.length}</div>
                    <div className="text-xs text-muted-foreground">Badges</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs for different sections */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="challenges">Challenges</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Level Progress */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Level Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Level {getCurrentLevel()}</span>
                      <span className="text-sm text-muted-foreground">
                        {profile?.total_xp % 1000} / 1000 XP
                      </span>
                    </div>
                    <Progress value={getXPProgress()} className="h-3" />
                    <p className="text-xs text-muted-foreground">
                      {1000 - (profile?.total_xp || 0) % 1000} XP to next level
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Episodes Listened */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Headphones className="h-5 w-5 text-blue-500" />
                    Episodes Listened
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-500 mb-2">
                      {episodeProgress.filter(ep => ep.is_completed).length}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Episodes Completed
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-sm">
                        {profile?.selected_language === 'portuguese' ? '🇧🇷' : 
                         profile?.selected_language === 'english' ? '🇺🇸' :
                         profile?.selected_language === 'spanish' ? '🇪🇸' :
                         profile?.selected_language === 'french' ? '🇫🇷' : 
                         '🌍'}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {profile?.selected_language === 'portuguese' ? 'Portuguese' : 
                         profile?.selected_language === 'english' ? 'English' :
                         profile?.selected_language === 'spanish' ? 'Spanish' :
                         profile?.selected_language === 'french' ? 'French' : 
                         profile?.selected_language}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Leaderboard */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Leaderboard
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-center mb-4">
                      <div className="text-sm text-muted-foreground mb-1">Your Rank</div>
                      <div className="text-2xl font-bold text-primary">
                        #{userGlobalRank || 'Unranked'}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground mb-2">Top 3</div>
                      {leaderboardData.slice(0, 3).map((user) => (
                        <div key={user.id} className="flex items-center gap-2 text-sm">
                          <div className="w-6 flex justify-center">
                            {getRankIcon(user.rank)}
                          </div>
                          <div className="flex-1 truncate">
                            <span className="font-medium">{user.username || user.display_name}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {user.total_xp} XP
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <Button size="sm" variant="outline" className="w-full mt-3" onClick={() => {
                      onBack();
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('navigate-to-leaderboard'));
                      }, 100);
                    }}>
                      View Full Leaderboard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="challenges" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Streak System */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Flame className="h-5 w-5 text-orange-500" />
                    Streak System
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-orange-500 flex items-center justify-center gap-1">
                        <Flame className="h-6 w-6" />
                        {profile?.current_streak || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Current Streak</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-yellow-500 flex items-center justify-center gap-1">
                        <Trophy className="h-6 w-6" />
                        {profile?.longest_streak || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Best Streak</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-500">1</div>
                      <div className="text-xs text-muted-foreground">Freezes Available</div>
                      <Button size="sm" variant="outline" className="mt-2 text-xs">
                        Use Freeze
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Personalized Recommendations */}
              <div>
                <PersonalizedRecommendations 
                  userId={user?.id || ''} 
                  onRecommendationClick={(rec) => {
                    console.log('Recommendation clicked:', rec);
                    // Handle recommendation actions here
                  }}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Episode Progress Tracker
                </CardTitle>
                <CardDescription>
                  Track your progress through podcast episodes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {episodeProgress.length > 0 ? (
                    episodeProgress.map((episode) => (
                      <div key={episode.episode_id} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium text-sm">{episode.episode_title}</h4>
                          <Badge variant={episode.is_completed ? "default" : "outline"}>
                            {episode.is_completed ? "Completed" : `${episode.progress_percentage}%`}
                          </Badge>
                        </div>
                        <Progress value={episode.progress_percentage} className="h-2" />
                        {episode.completed_at && (
                          <p className="text-xs text-muted-foreground">
                            Completed on {new Date(episode.completed_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No episode progress yet. Start listening to track your progress!
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map((achievement) => (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                  className="cursor-pointer"
                >
                  <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors">
                    <CardContent className="p-6 text-center">
                      <div className="text-4xl mb-3">{achievement.icon}</div>
                      <h3 className="font-bold mb-2">{achievement.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {achievement.description}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(achievement.unlocked_at).toLocaleDateString()}
                      </Badge>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
              
              {achievements.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No achievements yet</h3>
                  <p className="text-muted-foreground">
                    Keep learning to unlock your first badge!
                  </p>
                </div>
              )}
            </div>

            {/* Achievements Timeline */}
            {achievements.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Achievements Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {achievements
                      .sort((a, b) => new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime())
                      .map((achievement, index) => (
                        <div key={achievement.id} className="flex items-center gap-4">
                          <div className="text-2xl">{achievement.icon}</div>
                          <div className="flex-1">
                            <p className="font-medium">{achievement.title}</p>
                            <p className="text-sm text-muted-foreground">
                              Unlocked on {new Date(achievement.unlocked_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}