import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, BarChart3, CreditCard, LogOut, Save, AlertTriangle } from "lucide-react";
import { TeacherNav } from "@/components/teacher/TeacherNav";
import { trackPageView, trackEvent } from "@/lib/analytics";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const settingsItems = [
  { icon: BarChart3, label: "Analytics", description: "Track student progress", path: "/teacher/analytics" },
  { icon: CreditCard, label: "Pricing", description: "Manage your subscription", path: "/teacher/pricing" },
];

export default function TeacherSettings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [resolvedName, setResolvedName] = useState("");
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    trackPageView("teacher_settings", "teacher");
    trackEvent("teacher_settings_viewed");
  }, []);

  // Resolve display name with priority: teacher_profiles.full_name > profiles.display_name > profiles.full_name > profiles.username > email
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: tp } = await supabase
        .from("teacher_profiles" as any)
        .select("full_name")
        .eq("teacher_id", user.id)
        .maybeSingle();
      const tpName = (tp as any)?.full_name || "";
      if (tpName) {
        setResolvedName(tpName);
        setEditName(tpName);
        return;
      }
      const { data: p } = await supabase
        .from("profiles")
        .select("display_name, full_name, username")
        .eq("user_id", user.id)
        .maybeSingle();
      const name = p?.display_name || p?.full_name || p?.username || "";
      setResolvedName(name);
      setEditName(name);
    })();
  }, [user]);

  const handleSaveName = async () => {
    if (!user || !editName.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("teacher_profiles" as any)
        .update({ full_name: editName.trim() } as any)
        .eq("teacher_id", user.id);
      if (error) throw error;
      setResolvedName(editName.trim());
      toast({ title: "Display name updated" });
    } catch {
      toast({ title: "Failed to update name", variant: "destructive" });
    }
    setSaving(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const displayLabel = resolvedName || user?.email?.split("@")[0] || "Teacher";
  const handleDeleteAccount = async () => {
  if (deletingAccount) return;
  const confirmed = window.confirm(
    "Delete teacher account? Existing student lesson access will be preserved, and your account will be deactivated."
  );
  if (!confirmed) return;

  const typed = window.prompt('Type DELETE to confirm account deletion.');
  if (typed !== "DELETE") {
    toast.error("Account deletion cancelled.");
    return;
  }

  setDeletingAccount(true);
  try {
    const { data, error } = await supabase.functions.invoke("delete-account", {
      body: { confirmation: "DELETE" },
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || "Unable to delete account");
    toast.success("Account deactivated. You have been signed out.");
  } catch (error: any) {
    toast.error(error?.message || "Failed to delete account");
    setDeletingAccount(false);
    return;
  }

  try {
    await signOut();
  } catch {
    // no-op
  }
  navigate("/auth");
};

const displayLabel = resolvedName || user?.email?.split("@")[0] || "Teacher";
    try {
      await signOut();
    } catch {
      // no-op
    }
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/teacher")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Settings</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary mb-3">
            {displayLabel[0]?.toUpperCase() || "T"}
          </div>
          <p className="font-semibold text-foreground">{displayLabel}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>

        {/* Editable display name */}
        <div className="mb-6 space-y-2">
          <Label htmlFor="display-name" className="text-sm font-medium">Display Name</Label>
          <div className="flex gap-2">
            <Input
              id="display-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Your display name"
              className="flex-1"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={saving || editName.trim() === resolvedName}
              onClick={handleSaveName}
            >
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">This name appears on your dashboard and lessons.</p>
        </div>

        <Separator className="mb-6" />

        <div className="space-y-3 mb-8">
          {settingsItems.map((item) => (
            <Card
              key={item.path}
              className="cursor-pointer transition-all hover:border-primary hover:shadow-sm"
              onClick={() => navigate(item.path)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <item.icon className="h-5 w-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator className="mb-6" />

        <Button variant="outline" className="w-full text-destructive hover:text-destructive" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
        <Button
          variant="outline"
          className="w-full mt-3 text-destructive hover:text-destructive"
          onClick={handleDeleteAccount}
          disabled={deletingAccount}
        >
          <AlertTriangle className="mr-2 h-4 w-4" />
          {deletingAccount ? "Deleting account..." : "Delete Account"}
        </Button>
      </main>
      <TeacherNav />
    </div>
  );
}
