import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Lightbulb, 
  TrendingUp, 
  BookOpen, 
  Target, 
  ArrowRight,
  Star,
  Zap
} from "lucide-react";
import { motion } from "framer-motion";

interface Recommendation {
  id: string;
  type: 'next_episode' | 'difficulty_progression' | 'skill_focus' | 'streak_maintenance';
  title: string;
  description: string;
  action_text: string;
  priority: 'high' | 'medium' | 'low';
  data?: any;
}

interface DifficultyStats {
  total: number;
  correct: number;
}

interface PersonalizedRecommendationsProps {
  userId: string;
  onRecommendationClick?: (recommendation: Recommendation) => void;
}

export function PersonalizedRecommendations({ 
  userId, 
  onRecommendationClick 
}: PersonalizedRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      generateRecommendations();
    }
  }, [userId]);

  const generateRecommendations = async () => {
    try {
      setLoading(true);
      
      // Get user profile and stats
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Get exercise results
      const { data: exerciseResults } = await supabase
        .from('user_exercise_results')
        .select(`
          *,
          exercises!inner(difficulty, exercise_type, episode_id)
        `)
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })
        .limit(50);

      // Get episode progress
      const { data: episodeProgress } = await supabase
        .from('user_episode_progress')
        .select(`
          *,
          podcast_episodes!inner(title, podcast_source_id)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Get streak data
      const { data: streakData } = await supabase
        .from('user_streak_data')
        .select('*')
        .eq('user_id', userId)
        .single();

      const recs: Recommendation[] = [];

      if (profile && exerciseResults && episodeProgress) {
        // Generate recommendations based on data
        recs.push(...await generateSkillRecommendations(exerciseResults));
        recs.push(...await generateProgressionRecommendations(profile, exerciseResults));
        recs.push(...await generateEngagementRecommendations(streakData, exerciseResults));
        recs.push(...await generateContentRecommendations(episodeProgress, profile));
      }

      // Sort by priority
      const sortedRecs = recs.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      setRecommendations(sortedRecs.slice(0, 6)); // Show top 6
      
    } catch (error) {
      console.error('Error generating recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSkillRecommendations = async (exerciseResults: any[]): Promise<Recommendation[]> => {
    const recs: Recommendation[] = [];
    
    if (exerciseResults.length === 0) {
      recs.push({
        id: 'first_exercise',
        type: 'skill_focus',
        title: 'Start Your Learning Journey',
        description: 'Complete your first exercise to begin building your language skills.',
        action_text: 'Start First Exercise',
        priority: 'high'
      });
      return recs;
    }

    // Analyze accuracy by difficulty
    const difficultyStats = exerciseResults.reduce((acc, result) => {
      const difficulty = result.exercises?.difficulty || 'beginner';
      if (!acc[difficulty]) {
        acc[difficulty] = { total: 0, correct: 0 };
      }
      acc[difficulty].total++;
      if (result.is_correct) acc[difficulty].correct++;
      return acc;
    }, {} as Record<string, DifficultyStats>);

    // Recommend progression if high accuracy
    Object.entries(difficultyStats).forEach(([difficulty, stats]: [string, DifficultyStats]) => {
      const accuracy = stats.correct / stats.total;
      if (accuracy >= 0.8 && stats.total >= 5) {
        const nextDifficulty = difficulty === 'beginner' ? 'intermediate' : 
                              difficulty === 'intermediate' ? 'advanced' : null;
        
        if (nextDifficulty) {
          recs.push({
            id: `progress_to_${nextDifficulty}`,
            type: 'difficulty_progression',
            title: `Ready for ${nextDifficulty.charAt(0).toUpperCase() + nextDifficulty.slice(1)}?`,
            description: `You have ${Math.round(accuracy * 100)}% accuracy in ${difficulty}. Time to level up!`,
            action_text: `Try ${nextDifficulty.charAt(0).toUpperCase() + nextDifficulty.slice(1)}`,
            priority: 'high',
            data: { from: difficulty, to: nextDifficulty }
          });
        }
      } else if (accuracy < 0.6 && stats.total >= 3) {
        // Recommend practice if low accuracy
        recs.push({
          id: `practice_${difficulty}`,
          type: 'skill_focus',
          title: `Practice More ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`,
          description: `Your accuracy in ${difficulty} is ${Math.round(accuracy * 100)}%. More practice will help!`,
          action_text: `Practice ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`,
          priority: 'medium',
          data: { difficulty }
        });
      }
    });

    return recs;
  };

  const generateProgressionRecommendations = async (profile: any, exerciseResults: any[]): Promise<Recommendation[]> => {
    const recs: Recommendation[] = [];
    
    // XP-based recommendations
    const currentXP = Number(profile.total_xp) || 0;
    const nextLevelXP = Math.ceil(currentXP / 1000) * 1000;
    const xpToNext = nextLevelXP - currentXP;
    
    if (xpToNext <= 100 && xpToNext > 0) {
      recs.push({
        id: 'level_up_soon',
        type: 'skill_focus',
        title: 'Level Up Soon!',
        description: `You're only ${xpToNext} XP away from the next level.`,
        action_text: 'Earn XP Now',
        priority: 'high',
        data: { xp_needed: xpToNext }
      });
    }

    // Exercise type recommendations
    const typeStats = exerciseResults.reduce((acc, result) => {
      const type = result.exercises?.exercise_type || 'multiple_choice';
      if (!acc[type]) acc[type] = 0;
      acc[type]++;
      return acc;
    }, {} as Record<string, number>);

    const totalExercises = exerciseResults.length;
    const underrepresentedTypes = Object.entries(typeStats)
      .filter(([_, count]: [string, number]) => count / totalExercises < 0.2)
      .map(([type]) => type);

    if (underrepresentedTypes.length > 0) {
      const type = underrepresentedTypes[0];
      recs.push({
        id: `try_${type}`,
        type: 'skill_focus',
        title: `Try ${type.replace('_', ' ').charAt(0).toUpperCase() + type.slice(1)} Exercises`,
        description: 'Diversify your practice with different exercise types.',
        action_text: 'Try New Type',
        priority: 'low',
        data: { exercise_type: type }
      });
    }

    return recs;
  };

  const generateEngagementRecommendations = async (streakData: any, exerciseResults: any[]): Promise<Recommendation[]> => {
    const recs: Recommendation[] = [];
    
    if (!streakData) return recs;

    const currentStreak = streakData.current_streak || 0;
    const lastActivity = streakData.last_activity_date;
    const today = new Date().toISOString().split('T')[0];
    
    // Streak maintenance
    if (currentStreak > 0 && lastActivity !== today) {
      recs.push({
        id: 'maintain_streak',
        type: 'streak_maintenance',
        title: `Maintain Your ${currentStreak}-Day Streak!`,
        description: 'Complete an exercise today to keep your streak alive.',
        action_text: 'Practice Now',
        priority: 'high',
        data: { current_streak: currentStreak }
      });
    }

    // Streak milestone approaching
    const nextMilestone = Math.ceil((currentStreak + 1) / 5) * 5;
    if (nextMilestone - currentStreak <= 2 && currentStreak > 0) {
      recs.push({
        id: 'streak_milestone',
        type: 'streak_maintenance',
        title: `${nextMilestone}-Day Streak Almost There!`,
        description: `Just ${nextMilestone - currentStreak} more days to reach your next milestone.`,
        action_text: 'Keep Going',
        priority: 'medium',
        data: { milestone: nextMilestone, days_left: nextMilestone - currentStreak }
      });
    }

    return recs;
  };

  const generateContentRecommendations = async (episodeProgress: any[], profile: any): Promise<Recommendation[]> => {
    const recs: Recommendation[] = [];
    
    if (episodeProgress.length === 0) {
      recs.push({
        id: 'first_episode',
        type: 'next_episode',
        title: 'Start Your First Episode',
        description: 'Begin your learning journey with a podcast episode.',
        action_text: 'Browse Episodes',
        priority: 'high'
      });
      return recs;
    }

    // Find incomplete episodes
    const incompleteEpisodes = episodeProgress.filter(ep => !ep.is_completed);
    if (incompleteEpisodes.length > 0) {
      const latest = incompleteEpisodes[0];
      recs.push({
        id: 'continue_episode',
        type: 'next_episode',
        title: 'Continue Your Episode',
        description: `Resume "${latest.podcast_episodes?.title || 'Unknown'}" where you left off.`,
        action_text: 'Continue Episode',
        priority: 'medium',
        data: { episode_id: latest.episode_id }
      });
    }

    // Recommend new content based on language
    const language = profile?.selected_language;
    if (language) {
      recs.push({
        id: 'explore_new',
        type: 'next_episode',
        title: 'Explore New Content',
        description: `Discover more ${language} episodes to expand your learning.`,
        action_text: 'Browse Library',
        priority: 'low',
        data: { language }
      });
    }

    return recs;
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <Star className="h-4 w-4 text-yellow-500" />;
      case 'medium': return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case 'low': return <Lightbulb className="h-4 w-4 text-green-500" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'next_episode': return <BookOpen className="h-4 w-4" />;
      case 'difficulty_progression': return <TrendingUp className="h-4 w-4" />;
      case 'skill_focus': return <Target className="h-4 w-4" />;
      case 'streak_maintenance': return <Zap className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-24 bg-muted rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Your Next Challenge</h3>
      </div>
      
      {recommendations.length > 0 ? (
        recommendations.map((recommendation, index) => (
          <motion.div
            key={recommendation.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
              recommendation.priority === 'high' 
                ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950' 
                : recommendation.priority === 'medium'
                ? 'border-blue-200 bg-blue-50 dark:bg-blue-950'
                : 'hover:bg-muted/50'
            }`}>
              <CardContent 
                className="p-4 cursor-pointer" 
                onClick={() => onRecommendationClick?.(recommendation)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="flex items-center gap-1 mt-1">
                      {getPriorityIcon(recommendation.priority)}
                      {getTypeIcon(recommendation.type)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{recommendation.title}</h4>
                        <Badge 
                          variant={recommendation.priority === 'high' ? 'default' : 'outline'}
                          className="text-xs"
                        >
                          {recommendation.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {recommendation.description}
                      </p>
                    </div>
                  </div>
                  
                  <Button size="sm" variant="ghost" className="ml-2">
                    {recommendation.action_text}
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <Lightbulb className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No recommendations available</p>
            <p className="text-sm text-muted-foreground mt-1">
              Complete more exercises to get personalized suggestions!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}