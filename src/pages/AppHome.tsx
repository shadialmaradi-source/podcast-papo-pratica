import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Link2, Flame, Star, GraduationCap, X, RotateCw, MessageSquare, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { getUploadQuotaStatus } from "@/services/subscriptionService";
import { QuotaIndicator } from "@/components/subscription/QuotaIndicator";
import { UpgradePrompt } from "@/components/subscription/UpgradePrompt";
import { trackEvent, trackPageLoad, trackPageView } from "@/lib/analytics";
import { FlashcardRepository } from "@/components/FlashcardRepository";
import { useStudentTour } from "@/hooks/useStudentTour";
import AssignedVideosSection from "@/components/AssignedVideosSection";

interface UserProfile {
  full_name: string | null;
  avatar_url: string | null;
  current_streak: number;
  total_xp: number;
  selected_language: string;
}

interface AssignedLesson {
  id: string;
  title: string;
  cefr_level: string;
  topic: string | null;
  status: string;
}


interface SpeakingAssignment {
  id: string;
  topic_title: string;
  cefr_level: string;
  language: string;
  custom_instructions: string | null;
  due_date: string | null;
  status: string;
}

export default function AppHome() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [streakData, setStreakData] = useState<{ current_streak: number; longest_streak: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [assignedLessons, setAssignedLessons] = useState<AssignedLesson[]>([]);
  const { phase: tourPhase, advancePhase: advanceTourPhase } = useStudentTour();
  const [showHints, setShowHints] = useState(() => tourPhase === "home");
  const [showQuickReview, setShowQuickReview] = useState(false);
  const [flashcardCount, setFlashcardCount] = useState(0);
  
  const [speakingAssignments, setSpeakingAssignments] = useState<SpeakingAssignment[]>([]);
  
  // Upload quota state
  const [uploadQuota, setUploadQuota] = useState<{
    uploadsUsed: number;
    uploadsLimit: number;
    totalDurationUsed: number;
    totalDurationLimit: number;
    isPremium: boolean;
  } | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");

  useEffect(() => {
    trackPageView("app_home", "student");
    trackPageLoad("app_home");
    if (user) {
      fetchProfile();
      fetchStreakData();
      fetchUploadQuota();
      fetchAssignedLessons();
      fetchFlashcardCount();
      fetchSpeakingAssignments();
    }
  }, [user]);

  const fetchStreakData = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_streak_data")
      .select("current_streak, longest_streak")
      .eq("user_id", user.id)
      .single();
    if (data) setStreakData(data);
  };

  const fetchAssignedLessons = async () => {
    if (!user?.email) return;
    const { data } = await supabase
      .from("teacher_lessons")
      .select("id, title, cefr_level, topic, status")
      .eq("student_email", user.email)
      .in("status", ["ready", "active", "completed"])
      .order("created_at", { ascending: false });
    if (data) setAssignedLessons(data as AssignedLesson[]);
  };

  const fetchFlashcardCount = async () => {
    if (!user) return;
    const { count } = await supabase
      .from("user_viewed_flashcards")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    setFlashcardCount(count || 0);
  };

  const fetchSpeakingAssignments = async () => {
    if (!user?.email) return;
    const { data } = await supabase
      .from("speaking_assignments" as any)
      .select("id, topic_title, cefr_level, language, custom_instructions, due_date, status")
      .eq("student_email", user.email)
      .in("status", ["assigned", "reviewed"])
      .order("created_at", { ascending: false });
    if (data) setSpeakingAssignments(data as unknown as SpeakingAssignment[]);
  };




  const fetchUploadQuota = async () => {
    if (!user) return;
    try {
      const quota = await getUploadQuotaStatus(user.id);
      setUploadQuota(quota);
    } catch (error) {
      console.error("Error fetching upload quota:", error);
    }
  };

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

  const dismissHints = () => {
    setShowHints(false);
    if (tourPhase === "home") {
      advanceTourPhase();
    } else {
      localStorage.setItem("has_seen_home_hints", "true");
    }
  };

  const handleCardClick = (action: () => void, cardType: string) => {
    trackEvent('home_card_clicked', { card_type: cardType });
    if (showHints) dismissHints();
    action();
  };

  const handleImportVideo = async () => {
    if (!videoUrl.trim()) {
      toast.error("Please enter a video URL");
      return;
    }

    if (!user) {
      toast.error("Please log in to import videos");
      return;
    }

    setImporting(true);
    try {
      // Use direct fetch to properly capture error messages from response body
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      if (!accessToken) {
        toast.error("Please log in to import videos");
        return;
      }
      
      const response = await fetch(
        `https://fezpzihnvblzjrdzgioq.supabase.co/functions/v1/process-youtube-video`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            videoUrl: videoUrl,
            language: profile?.selected_language || "english"
          }),
        }
      );
      
      const data = await response.json();
      
      // Handle error from response (non-2xx or data.error)
      if (!response.ok || data.error) {
        const errorMessage = data.error || "Failed to import video";
        
        // Check for quota/limit errors
        if (errorMessage.includes("quota") || errorMessage.includes("limit")) {
          setUpgradeReason(errorMessage);
          setShowUpgradePrompt(true);
          return;
        }
        
        // Show the actual error message (e.g., "Video is 25 minutes long...")
        toast.error(errorMessage);
        return;
      }

      const videoDbId = data?.video?.id;
      
      if (videoDbId) {
        setVideoUrl("");
        setImportDialogOpen(false);
        toast.success("Video ready! Starting your lesson...");
        // Refresh quota after successful upload
        await fetchUploadQuota();
        navigate(`/lesson/${videoDbId}`);
      } else {
        toast.success("Video added! Check the library when processing completes.");
        setVideoUrl("");
        setImportDialogOpen(false);
        await fetchUploadQuota();
      }
    } catch (error: any) {
      console.error("Error importing video:", error);
      toast.error(error?.message || "Failed to import video. Please try again.");
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

  if (showQuickReview) {
    return (
      <FlashcardRepository
        userId={user!.id}
        onClose={() => setShowQuickReview(false)}
      />
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
              className="relative"
            >
              <Card
                className="cursor-pointer border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-colors h-full"
                onClick={() => handleCardClick(() => navigate("/library"), "library")}
              >
                <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Learn from Library</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Structured learning path
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Your Own Video */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative"
            >
              <Card
                className="cursor-pointer border-2 hover:border-primary/50 transition-colors h-full"
                onClick={() => handleCardClick(() => { trackEvent('import_dialog_opened', { source_page: 'home' }); setImportDialogOpen(true); }, "import")}
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

          {/* Consolidated onboarding hint banner below the grid */}
          <AnimatePresence>
            {showHints && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="mt-4"
              >
                <div className="relative bg-popover border border-border rounded-lg px-4 py-3 shadow-lg text-xs text-popover-foreground space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse mt-1 shrink-0" />
                    <span><strong>Learn from Library</strong> — Follow a structured path with videos curated by ListenFlow and the community</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse mt-1 shrink-0" />
                    <span><strong>Your Own Video</strong> — Paste any YouTube link to create a personalized lesson</span>
                  </div>
                  <div className="flex justify-center pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={dismissHints}
                      className="text-xs text-muted-foreground gap-1 h-7"
                    >
                      <X className="w-3 h-3" />
                      Got it
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick Review Button */}
          {flashcardCount > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Button
                variant="ghost"
                className="w-full justify-between border border-border rounded-xl px-4 py-3 h-auto hover:border-primary/40 transition-colors"
                onClick={() => {
                  trackEvent("quick_review_opened", { flashcard_count: flashcardCount });
                  setShowQuickReview(true);
                }}
              >
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <RotateCw className="w-4 h-4 text-primary" />
                  Review Flashcards
                </span>
                <span className="text-xs text-muted-foreground">{flashcardCount} cards</span>
              </Button>
            </motion.div>
          )}


          {/* Stats */}
          <div className="flex items-center justify-center gap-6 pt-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                <Flame className="w-4 h-4 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{streakData?.current_streak || 0}</p>
                <p className="text-xs text-muted-foreground">Day streak</p>
              </div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <Star className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{profile?.total_xp || 0}</p>
                <p className="text-xs text-muted-foreground">Total XP</p>
              </div>
            </div>
          </div>

          {/* Teacher Assignments - Videos */}
          <AssignedVideosSection />

          {/* Teacher Assignments - Speaking */}
          {speakingAssignments.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Speaking Practice</h3>
              </div>
              <div className="space-y-2">
                {speakingAssignments.slice(0, 5).map((a) => (
                  <Card key={a.id} className="border border-border">
                    <CardContent className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <MessageSquare className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground text-sm truncate">{a.topic_title}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-[10px] h-4">{a.cefr_level}</Badge>
                            {a.due_date && (
                              <span className="flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" />
                                {format(new Date(a.due_date), "MMM d")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs shrink-0"
                        onClick={() => { trackEvent("student_speaking_assignment_clicked", { assignment_id: a.id }); navigate(`/speaking/${a.id}`); }}
                      >
                        View Questions
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Assigned Lessons from Teacher */}
          {assignedLessons.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">My Lessons</h3>
                </div>
                {assignedLessons.length > 3 && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => navigate("/my-lessons")}
                    className="text-xs text-primary p-0 h-auto"
                  >
                    See All →
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {assignedLessons.slice(0, 3).map((lesson) => (
                  <Card
                    key={lesson.id}
                    className="cursor-pointer border border-border hover:border-primary/50 transition-colors"
                    onClick={() => navigate(`/lesson/student/${lesson.id}`)}
                  >
                    <CardContent className="px-4 py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{lesson.title}</p>
                        {lesson.topic && (
                          <p className="text-xs text-muted-foreground truncate">{lesson.topic}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-xs">{lesson.cefr_level}</Badge>
                        <Badge
                          variant={lesson.status === "completed" ? "outline" : "default"}
                          className="text-xs capitalize"
                        >
                          {lesson.status === "completed" ? "Done" : "Open"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {assignedLessons.length <= 3 && assignedLessons.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/my-lessons")}
                  className="w-full text-xs text-muted-foreground"
                >
                  View all lessons
                </Button>
              )}
            </div>
          )}
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
            {/* Quota Indicator */}
            {uploadQuota && (
              <QuotaIndicator
                used={uploadQuota.uploadsUsed}
                limit={uploadQuota.uploadsLimit}
                label="uploads"
                showUpgradeHint={!uploadQuota.isPremium}
              />
            )}
            
            <div className="space-y-2">
              <Label htmlFor="video-url">Video URL</Label>
              <Input
                id="video-url"
                placeholder="https://youtube.com/watch?v=..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
              {!uploadQuota?.isPremium && (
                <p className="text-xs text-muted-foreground">
                  Max video length: 10 minutes
                </p>
              )}
            </div>
            <Button
              className="w-full"
              onClick={handleImportVideo}
              disabled={importing || (uploadQuota?.uploadsUsed ?? 0) >= (uploadQuota?.uploadsLimit ?? 2)}
            >
              {importing ? "Processing..." : "Add Video"}
            </Button>
            
            {!uploadQuota?.isPremium && (
              <div className="text-center pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-2">Want more uploads?</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigate('/premium')}
                  className="text-xs"
                >
                  Upgrade to Premium
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade Prompt */}
      <UpgradePrompt
        open={showUpgradePrompt}
        onOpenChange={setShowUpgradePrompt}
        title="Upload Limit Reached"
        description={upgradeReason || "Upgrade to Premium for more video uploads."}
        quotaUsed={uploadQuota?.uploadsUsed}
        quotaLimit={uploadQuota?.uploadsLimit}
      />
    </div>
  );
}
