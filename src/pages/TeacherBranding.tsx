import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, Palette, BookOpen, Loader2, Crown, Globe } from "lucide-react";
import { toast } from "sonner";
import { trackEvent, trackPageView } from "@/lib/analytics";

interface BrandingConfig {
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  show_powered_by: boolean;
}

const DEFAULT_BRANDING: BrandingConfig = {
  logo_url: "",
  primary_color: "#6366f1",
  secondary_color: "#a855f7",
  show_powered_by: true,
};

export default function TeacherBranding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { role, loading: roleLoading } = useUserRole();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [teacherName, setTeacherName] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    trackPageView("teacher_branding", "teacher");
    if (roleLoading || !user) return;
    if (role !== "teacher") {
      navigate("/app");
      return;
    }

    const load = async () => {
      const [subRes, profileRes] = await Promise.all([
        supabase
          .from("teacher_subscriptions")
          .select("plan")
          .eq("teacher_id", user.id)
          .maybeSingle(),
        supabase
          .from("teacher_profiles" as any)
          .select("branding, full_name")
          .eq("teacher_id", user.id)
          .maybeSingle(),
      ]);

      setIsPremium(subRes.data?.plan === "premium");

      if (profileRes.data) {
        const d = profileRes.data as any;
        setTeacherName(d.full_name ?? user.email?.split("@")[0] ?? "");
        if (d.branding) {
          setBranding({ ...DEFAULT_BRANDING, ...d.branding });
        }
      }
      setLoadingData(false);
    };
    load();
  }, [user, role, roleLoading, navigate]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }

    setUploading(true);
    const path = `${user.id}/logo.${file.name.split(".").pop()}`;

    const { error } = await supabase.storage
      .from("teacher-logos")
      .upload(path, file, { upsert: true });

    if (error) {
      toast.error("Upload failed: " + error.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("teacher-logos")
      .getPublicUrl(path);

    setBranding((prev) => ({ ...prev, logo_url: urlData.publicUrl }));
    setUploading(false);
    toast.success("Logo uploaded!");
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from("teacher_profiles" as any)
      .update({ branding } as any)
      .eq("teacher_id", user.id);

    if (error) {
      toast.error("Failed to save: " + error.message);
    } else {
      toast.success("Branding saved!");
      trackEvent("branding_updated", {
        has_logo: !!branding.logo_url,
        primary_color: branding.primary_color,
      });
    }
    setSaving(false);
  };

  if (roleLoading || loadingData) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="container mx-auto flex items-center justify-between px-4 py-4">
            <Skeleton className="h-7 w-48" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </main>
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="container mx-auto flex items-center px-4 py-4 gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/teacher")}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <h1 className="text-xl font-bold text-foreground">White-Label Branding</h1>
          </div>
        </header>
        <main className="container mx-auto px-4 py-16 max-w-md text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Crown className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Premium Feature</h2>
          <p className="text-muted-foreground">
            White-label branding lets you customize the student experience with your own logo and colors. Upgrade to Premium to unlock this feature.
          </p>
          <Button onClick={() => navigate("/teacher/pricing")} className="gap-2">
            <Crown className="h-4 w-4" />
            Upgrade to Premium
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center px-4 py-4 gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/teacher")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Palette className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">White-Label Branding</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Settings */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Logo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {branding.logo_url && (
                  <div className="flex items-center justify-center p-4 border border-border rounded-lg bg-muted/30">
                    <img
                      src={branding.logo_url}
                      alt="Teacher logo"
                      className="max-h-16 max-w-full object-contain"
                    />
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {branding.logo_url ? "Replace Logo" : "Upload Logo"}
                </Button>
                <p className="text-xs text-muted-foreground">Max 2MB. PNG or SVG recommended.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Colors</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={branding.primary_color}
                      onChange={(e) =>
                        setBranding((prev) => ({ ...prev, primary_color: e.target.value }))
                      }
                      className="h-10 w-14 rounded border border-input cursor-pointer"
                    />
                    <Input
                      value={branding.primary_color}
                      onChange={(e) =>
                        setBranding((prev) => ({ ...prev, primary_color: e.target.value }))
                      }
                      placeholder="#6366f1"
                      className="font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Secondary Color</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={branding.secondary_color}
                      onChange={(e) =>
                        setBranding((prev) => ({ ...prev, secondary_color: e.target.value }))
                      }
                      className="h-10 w-14 rounded border border-input cursor-pointer"
                    />
                    <Input
                      value={branding.secondary_color}
                      onChange={(e) =>
                        setBranding((prev) => ({ ...prev, secondary_color: e.target.value }))
                      }
                      placeholder="#a855f7"
                      className="font-mono"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show "Powered by" badge</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Display a small ListenFlow attribution in the footer
                    </p>
                  </div>
                  <Switch
                    checked={branding.show_powered_by}
                    onCheckedChange={(v) =>
                      setBranding((prev) => ({ ...prev, show_powered_by: v }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between opacity-50">
                  <div>
                    <Label className="flex items-center gap-2">
                      Custom Domain
                      <Badge variant="secondary" className="text-[10px]">Coming Soon</Badge>
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Use your own domain for lesson links
                    </p>
                  </div>
                  <Globe className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Branding
            </Button>
          </div>

          {/* Live Preview */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Student View Preview
            </h3>
            <Card className="overflow-hidden">
              <div
                className="border-b px-4 py-3 flex items-center justify-between"
                style={{ backgroundColor: branding.primary_color + "15" }}
              >
                <div className="flex items-center gap-2">
                  {branding.logo_url ? (
                    <img src={branding.logo_url} alt="Logo" className="h-7 max-w-[120px] object-contain" />
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="h-5 w-5" style={{ color: branding.primary_color }} />
                      <span className="font-bold text-sm" style={{ color: branding.primary_color }}>
                        {teacherName || "Your Brand"}
                      </span>
                    </div>
                  )}
                </div>
                <Badge
                  className="text-[10px] text-white border-0"
                  style={{ backgroundColor: branding.primary_color }}
                >
                  A1
                </Badge>
              </div>
              <CardContent className="pt-5 space-y-4">
                <div>
                  <h4 className="text-lg font-bold text-foreground">Sample Lesson Title</h4>
                  <p className="text-sm text-muted-foreground">Topic: Everyday Conversation</p>
                </div>
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <p className="text-sm font-medium text-foreground">
                    Complete the sentence:
                  </p>
                  <div className="h-10 rounded-md border border-input bg-background" />
                  <Button
                    size="sm"
                    className="text-white border-0"
                    style={{ backgroundColor: branding.primary_color }}
                  >
                    Submit Answer
                  </Button>
                </div>
                {branding.show_powered_by && (
                  <p className="text-center text-[10px] text-muted-foreground pt-2 border-t border-border">
                    Powered by <span className="font-semibold">{teacherName || "Teacher"}</span> · ListenFlow
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
