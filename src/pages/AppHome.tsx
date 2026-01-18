import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Link2, Flame, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UserProfile {
  full_name: string | null;
  avatar_url: string | null;
  current_streak: number;
  total_xp: number;
  selected_language: string;
}

export default function AppHome() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, current_streak, total_xp, selected_language")
        .eq("user_id", user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImportVideo = async () => {
    if (!videoUrl.trim()) {
      toast.error("Please enter a video URL");
      return;
    }

    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-youtube-video", {
        body: { 
          videoUrl: videoUrl,
          language: profile?.selected_language || "english"
        },
      });

      if (error) throw error;

      const videoDbId = data?.video?.id;
      
      if (videoDbId) {
        setVideoUrl("");
        setImportDialogOpen(false);
        toast.success("Video ready! Starting your lesson...");
        navigate(`/lesson/${videoDbId}`);
      } else {
        toast.success("Video added! Check the library when processing completes.");
        setVideoUrl("");
        setImportDialogOpen(false);
      }
    } catch (error) {
      console.error("Error importing video:", error);
      toast.error("Failed to import video. Please check the URL and try again.");
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <AppHeader title="ListenFlow" />

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-lg mx-auto space-y-8"
        >
          {/* Welcome section */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              What do you want to learn today?
            </h2>
            <p className="text-muted-foreground">
              Choose videos from our library or add your own
            </p>
          </div>

          {/* Two primary buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Learn from Library */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                className="cursor-pointer border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-colors h-full"
                onClick={() => navigate("/library")}
              >
                <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Learn from Library</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Curated videos by level
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Your Own Video */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                className="cursor-pointer border-2 hover:border-primary/50 transition-colors h-full"
                onClick={() => setImportDialogOpen(true)}
              >
                <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <Link2 className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Your Own Video</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      YouTube or podcast link
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-6 pt-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                <Flame className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{profile?.current_streak || 0}</p>
                <p className="text-xs text-muted-foreground">Day streak</p>
              </div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                <Star className="w-4 h-4 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{profile?.total_xp || 0}</p>
                <p className="text-xs text-muted-foreground">Total XP</p>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Import Video Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Your Own Video</DialogTitle>
            <DialogDescription>
              Paste a YouTube video URL to create personalized lessons
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="video-url">Video URL</Label>
              <Input
                id="video-url"
                placeholder="https://youtube.com/watch?v=..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleImportVideo}
              disabled={importing}
            >
              {importing ? "Processing..." : "Add Video"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
