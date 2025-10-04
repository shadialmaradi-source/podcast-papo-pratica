import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Trophy, 
  Medal, 
  Crown, 
  ArrowLeft,
  Users,
  Zap
} from "lucide-react";
import { motion } from "framer-motion";

interface LeaderboardUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  total_xp: number;
  current_streak: number;
  selected_language: string;
  rank: number;
}

interface LeaderboardProps {
  onBack: () => void;
}

export function Leaderboard({ onBack }: LeaderboardProps) {
  const { user } = useAuth();
  const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardUser[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userRank, setUserRank] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadLeaderboards();
    }
  }, [user]);

  const loadLeaderboards = async () => {
    try {
      setLoading(true);
      
      // Get user's profile first
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (profile) {
        setUserProfile(profile);
      }

      // Global leaderboard - top 50 users by XP
      const { data: globalData } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, total_xp, current_streak, selected_language')
        .order('total_xp', { ascending: false })
        .limit(50);

      if (globalData) {
        const globalWithRanks = globalData.map((user, index) => ({
          ...user,
          rank: index + 1
        }));
        setGlobalLeaderboard(globalWithRanks);

        // Find user's global rank
        const userGlobalRank = globalWithRanks.findIndex(u => u.id === profile?.id) + 1;
        setUserRank(userGlobalRank);
      }

    } catch (error) {
      console.error('Error loading leaderboards:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2: return <Medal className="h-5 w-5 text-gray-400" />;
      case 3: return <Medal className="h-5 w-5 text-amber-600" />;
      default: return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getLanguageFlag = (language: string) => {
    const flags: { [key: string]: string } = {
      'portuguese': '🇧🇷',
      'english': '🇺🇸',
      'spanish': '🇪🇸',
      'french': '🇫🇷',
      'italian': '🇮🇹',
      'german': '🇩🇪'
    };
    return flags[language] || '🌍';
  };

  const renderLeaderboardRow = (user: LeaderboardUser, isCurrentUser: boolean = false) => (
    <motion.div
      key={user.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: user.rank * 0.05 }}
      className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
        isCurrentUser 
          ? 'bg-primary/10 border-2 border-primary/20' 
          : 'hover:bg-muted/50'
      }`}
    >
      <div className="flex items-center justify-center w-12">
        {getRankIcon(user.rank)}
      </div>

      <Avatar className="h-12 w-12">
        <AvatarImage src={user.avatar_url || ""} alt={user.username || ""} />
        <AvatarFallback>
          {(user.username || user.display_name || "U").substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold">{user.username}</h4>
          {isCurrentUser && (
            <Badge variant="outline" className="text-xs">You</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{getLanguageFlag(user.selected_language)}</span>
          <span>{user.selected_language?.charAt(0).toUpperCase() + user.selected_language?.slice(1)}</span>
        </div>
      </div>

      <div className="text-right">
        <div className="font-bold text-lg">{user.total_xp}</div>
        <div className="text-xs text-muted-foreground">XP</div>
      </div>

      <div className="text-right">
        <div className="flex items-center gap-1 text-orange-500">
          <Zap className="h-4 w-4" />
          <span className="font-semibold">{user.current_streak}</span>
        </div>
        <div className="text-xs text-muted-foreground">streak</div>
      </div>
    </motion.div>
  );

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
            Back to Profile
          </Button>
        </div>

        {/* User's Current Position */}
        {userProfile && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="border-0 shadow-lg bg-gradient-to-r from-primary/10 to-secondary/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 border-4 border-background shadow-lg">
                    <AvatarImage src={userProfile.avatar_url || ""} alt={userProfile.display_name || ""} />
                    <AvatarFallback className="text-lg">
                      {(userProfile.display_name || "U").split(" ").map((n: string) => n[0]).join("").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold">{userProfile.display_name}</h2>
                    <p className="text-muted-foreground">Your Current Global Ranking</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-1">
                      #{userRank || 'Unranked'}
                    </div>
                    <p className="text-sm text-muted-foreground">Global Rank</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Global Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Global Leaderboard
            </CardTitle>
            <CardDescription>
              Top learners from all languages ranked by total XP
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {globalLeaderboard.map((user) => 
              renderLeaderboardRow(user, user.id === userProfile?.id)
            )}
            
            {globalLeaderboard.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No rankings yet</h3>
                <p className="text-muted-foreground">
                  Be the first to earn XP and appear on the leaderboard!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}