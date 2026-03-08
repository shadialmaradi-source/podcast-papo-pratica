import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, BarChart3, CreditCard, Globe, Palette, LogOut } from "lucide-react";
import { TeacherNav } from "@/components/teacher/TeacherNav";
import { trackPageLoad } from "@/lib/analytics";
import { useEffect } from "react";

const settingsItems = [
  { icon: BarChart3, label: "Analytics", description: "Track student progress", path: "/teacher/analytics" },
  { icon: CreditCard, label: "Pricing", description: "Manage your subscription", path: "/teacher/pricing" },
  { icon: Globe, label: "Community", description: "Discover & share lessons", path: "/teacher/community" },
  { icon: Palette, label: "Branding", description: "White-label your lessons", path: "/teacher/branding" },
];

export default function TeacherSettings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    trackPageLoad("teacher_settings");
  }, []);

  const handleSignOut = async () => {
    await signOut();
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
            {(user?.email?.[0] ?? "T").toUpperCase()}
          </div>
          <p className="font-semibold text-foreground">{user?.email?.split("@")[0]}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>

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
      </main>
    </div>
  );
}
