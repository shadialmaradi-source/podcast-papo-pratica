import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { BookOpen, LogOut, Plus } from "lucide-react";

export default function TeacherDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Teacher Dashboard</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Esci
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">
            Benvenuto, {user?.email?.split("@")[0]}!
          </h2>
          <p className="text-muted-foreground mt-1">
            Gestisci le tue lezioni interattive da qui.
          </p>
        </div>

        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-lg">Le tue Lezioni</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm mb-4">
              Non hai ancora creato nessuna lezione. Inizia creandone una!
            </p>
            <Button variant="learning" disabled>
              <Plus className="mr-2 h-4 w-4" />
              Crea Lezione (prossimamente)
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
