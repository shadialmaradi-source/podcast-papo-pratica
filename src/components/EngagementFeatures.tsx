import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Flame, 
  Shield, 
  Target, 
  Trophy, 
  Calendar,
  CheckCircle,
  Clock,
  Zap,
  Star,
  Gift
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";

interface Challenge {
  id: string;
  title: string;
  description: string;
  challenge_type: 'daily' | 'weekly';
  target_type: 'xp' | 'exercises' | 'streak' | 'episodes';
  target_value: number;
  bonus_xp: number;
  badge_reward: string | null;
  start_date: string;
  end_date: string;
  current_progress?: number;
  is_completed?: boolean;
}

interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string;
  streak_freezes_available: number;
  streak_freezes_used: number;
  last_freeze_used_date: string | null;
}

interface ActivityHistory {
  id: string;
  activity_type: string;
  activity_data: any;
  xp_earned: number;
  created_at: string;
}

interface EngagementFeaturesProps {
  userId: string;
}

export function EngagementFeatures({ userId }: EngagementFeaturesProps) {
  const [dailyChallenges, setDailyChallenges] = useState<Challenge[]>([]);
  const [weeklyChallenges, setWeeklyChallenges] = useState<Challenge[]>([]);
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [activityHistory, setActivityHistory] = useState<ActivityHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadEngagementData();
    }
  }, [userId]);

  const loadEngagementData = async () => {
    try {
      setLoading(true);
      
      // Load challenges with user progress
      await Promise.all([
        loadChallenges(),
        loadStreakData(),
        loadActivityHistory()
      ]);
      
    } catch (error) {
      console.error('Error loading engagement data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChallenges = async () => {
    // Get active challenges
    const { data: challenges } = await supabase
      .from('challenges')
      .select('*')
      .eq('is_active', true)
      .gte('end_date', new Date().toISOString().split('T')[0]);

    if (challenges) {
      // Get user progress for these challenges
      const challengeIds = challenges.map(c => c.id);
      const { data: userProgress } = await supabase
        .from('user_challenge_progress')
        .select('*')
        .eq('user_id', userId)
        .in('challenge_id', challengeIds);

      // Merge challenges with user progress
      const challengesWithProgress = challenges.map(challenge => {
        const progress = userProgress?.find(p => p.challenge_id === challenge.id);
        return {
          ...challenge,
          current_progress: progress?.current_progress || 0,
          is_completed: progress?.is_completed || false
        } as Challenge;
      });

      // Separate daily and weekly challenges
      setDailyChallenges(challengesWithProgress.filter(c => c.challenge_type === 'daily'));
      setWeeklyChallenges(challengesWithProgress.filter(c => c.challenge_type === 'weekly'));
    }
  };

  const loadStreakData = async () => {
    const { data } = await supabase
      .from('user_streak_data')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (data) {
      setStreakData(data);
    } else {
      // Create initial streak data
      const { data: newStreakData } = await supabase
        .from('user_streak_data')
        .insert({
          user_id: userId,
          current_streak: 0,
          longest_streak: 0,
          streak_freezes_available: 1 // Give users 1 free freeze
        })
        .select()
        .single();

      if (newStreakData) {
        setStreakData(newStreakData);
      }
    }
  };

  const loadActivityHistory = async () => {
    const { data } = await supabase
      .from('user_activity_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setActivityHistory(data);
    }
  };

  const useStreakFreeze = async () => {
    if (!streakData || streakData.streak_freezes_available <= 0) {
      toast({
        title: "No streak freezes available",
        description: "You don't have any streak freezes left.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('user_streak_data')
        .update({
          streak_freezes_available: streakData.streak_freezes_available - 1,
          streak_freezes_used: streakData.streak_freezes_used + 1,
          last_freeze_used_date: new Date().toISOString().split('T')[0]
        })
        .eq('user_id', userId);

      if (!error) {
        toast({
          title: "Streak frozen! 🧊",
          description: "Your streak is protected for today.",
        });
        loadStreakData();
      }
    } catch (error) {
      console.error('Error using streak freeze:', error);
    }
  };

  const getChallengeIcon = (targetType: string) => {
    switch (targetType) {
      case 'xp': return <Star className="h-4 w-4" />;
      case 'exercises': return <Target className="h-4 w-4" />;
      case 'streak': return <Flame className="h-4 w-4" />;
      case 'episodes': return <Calendar className="h-4 w-4" />;
      default: return <Trophy className="h-4 w-4" />;
    }
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'exercise_completed': return <Target className="h-4 w-4 text-green-500" />;
      case 'episode_started': return <Calendar className="h-4 w-4 text-blue-500" />;
      case 'episode_completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'challenge_completed': return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 'badge_earned': return <Star className="h-4 w-4 text-purple-500" />;
      case 'streak_milestone': return <Flame className="h-4 w-4 text-orange-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatActivityDescription = (activity: ActivityHistory) => {
    switch (activity.activity_type) {
      case 'exercise_completed':
        return `Completed ${activity.activity_data?.exercise_type || 'exercise'} (${activity.activity_data?.difficulty || 'unknown'})`;
      case 'episode_started':
        return `Started episode: ${activity.activity_data?.episode_title || 'Unknown'}`;
      case 'episode_completed':
        return `Completed episode: ${activity.activity_data?.episode_title || 'Unknown'}`;
      case 'challenge_completed':
        return `Completed challenge: ${activity.activity_data?.challenge_title || 'Unknown'}`;
      case 'badge_earned':
        return `Earned badge: ${activity.activity_data?.badge_title || 'Unknown'}`;
      case 'streak_milestone':
        return `Reached ${activity.activity_data?.streak_count || 0}-day streak!`;
      default:
        return 'Activity completed';
    }
  };

  const renderChallengeCard = (challenge: Challenge) => (
    <motion.div
      key={challenge.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      <Card className={`transition-all duration-200 ${
        challenge.is_completed 
          ? 'border-green-500 bg-green-50 dark:bg-green-950' 
          : 'hover:shadow-md'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {getChallengeIcon(challenge.target_type)}
              <h4 className="font-semibold">{challenge.title}</h4>
              {challenge.is_completed && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
            </div>
            <Badge variant={challenge.challenge_type === 'daily' ? 'default' : 'secondary'}>
              {challenge.challenge_type}
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground mb-3">
            {challenge.description}
          </p>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{challenge.current_progress || 0} / {challenge.target_value}</span>
            </div>
            <Progress 
              value={((challenge.current_progress || 0) / challenge.target_value) * 100} 
              className="h-2"
            />
          </div>
          
          <div className="flex justify-between items-center mt-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Gift className="h-3 w-3" />
              <span>+{challenge.bonus_xp} XP</span>
            </div>
            {challenge.badge_reward && (
              <Badge variant="outline" className="text-xs">
                +Badge: {challenge.badge_reward}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Streak System */}
      <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Streak System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-500 mb-1">
                🔥 {streakData?.current_streak || 0}
              </div>
              <p className="text-sm text-muted-foreground">Current Streak</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500 mb-1">
                🏆 {streakData?.longest_streak || 0}
              </div>
              <p className="text-sm text-muted-foreground">Best Streak</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-blue-500" />
                <span className="text-lg font-bold text-blue-500">
                  {streakData?.streak_freezes_available || 0}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">Freezes Available</p>
              <Button 
                size="sm" 
                variant="outline"
                onClick={useStreakFreeze}
                disabled={!streakData?.streak_freezes_available}
              >
                Use Freeze
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Challenges */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Daily Challenges
        </h3>
        {dailyChallenges.length > 0 ? (
          dailyChallenges.map(renderChallengeCard)
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">No daily challenges available</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Weekly Challenges */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-secondary" />
          Weekly Challenges
        </h3>
        {weeklyChallenges.length > 0 ? (
          weeklyChallenges.map(renderChallengeCard)
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">No weekly challenges available</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Activity History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Your learning activity over the past few days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activityHistory.length > 0 ? (
              activityHistory.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                  {getActivityIcon(activity.activity_type)}
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {formatActivityDescription(activity)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.created_at).toLocaleDateString()} at{' '}
                      {new Date(activity.created_at).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                  {activity.xp_earned > 0 && (
                    <Badge variant="outline" className="text-xs">
                      +{activity.xp_earned} XP
                    </Badge>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No activity yet</p>
                <p className="text-sm text-muted-foreground">
                  Start learning to see your progress here!
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}