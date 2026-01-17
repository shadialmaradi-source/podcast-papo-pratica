import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { languages, getLanguageFlag } from "@/utils/languageUtils";
import { toast } from "sonner";

interface AppHeaderProps {
  title?: string;
  showBackButton?: boolean;
  backTo?: string;
}

interface UserProfile {
  full_name: string | null;
  avatar_url: string | null;
  selected_language: string | null;
}

export function AppHeader({ title = "ListenFlow", showBackButton = false, backTo = "/app" }: AppHeaderProps) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [updatingLanguage, setUpdatingLanguage] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, selected_language")
        .eq("user_id", user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const handleLanguageChange = async (languageCode: string) => {
    if (!user) return;
    
    setUpdatingLanguage(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ selected_language: languageCode })
        .eq("user_id", user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, selected_language: languageCode } : null);
      toast.success(`Language changed to ${languages.find(l => l.code === languageCode)?.name || languageCode}`);
      
      // Refresh the page to update content
      window.location.reload();
    } catch (error) {
      console.error("Error updating language:", error);
      toast.error("Failed to update language");
    } finally {
      setUpdatingLanguage(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const currentLanguage = profile?.selected_language || "english";
  const currentFlag = getLanguageFlag(currentLanguage);

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBackButton && (
            <Button variant="ghost" size="icon" onClick={() => navigate(backTo)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5" disabled={updatingLanguage}>
                <span className="text-lg">{currentFlag}</span>
                <Globe className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {languages.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={currentLanguage === lang.code ? "bg-accent" : ""}
                >
                  <span className="text-lg mr-2">{lang.flag}</span>
                  <span>{lang.name}</span>
                  {currentLanguage === lang.code && (
                    <span className="ml-auto text-primary">✓</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Logout Button */}
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="w-4 h-4" />
          </Button>

          {/* Profile Avatar */}
          <Avatar 
            className="w-8 h-8 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all" 
            onClick={() => navigate("/profile")}
          >
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {getInitials(profile?.full_name)}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}