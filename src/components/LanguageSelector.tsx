import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { User, LogOut } from "lucide-react";
import { languages } from "@/utils/languageUtils";
import { useTranslation } from "@/hooks/useTranslation";

interface LanguageSelectorProps {
  onLanguageSelect: (language: string) => void;
  user?: any;
  onProfileClick: () => void;
  onLogout: () => void;
}

export const LanguageSelector = ({ onLanguageSelect, user, onProfileClick, onLogout }: LanguageSelectorProps) => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 relative">
      {/* Header with User Menu */}
      <div className="absolute top-0 right-0 p-4 sm:p-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 bg-card/50 backdrop-blur-sm border border-border/50">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatar_url} />
                <AvatarFallback>
                  {user?.display_name?.charAt(0) || user?.email?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline text-sm text-foreground">
                {user?.display_name || user?.email?.split('@')[0] || "User"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onProfileClick} className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {t('myProfile')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onLogout} className="flex items-center gap-2 text-destructive">
              <LogOut className="h-4 w-4" />
              {t('logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              {t('chooseLanguage')}
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground px-4">
              {t('selectLanguagePrompt')}
            </p>
          </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {languages.map((language) => (
            <Card 
              key={language.code}
              className="cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg bg-card/50 backdrop-blur-sm border-border/50"
              onClick={() => onLanguageSelect(language.code)}
            >
              <CardHeader className="text-center pb-3 sm:pb-4">
                <div className="text-4xl sm:text-5xl lg:text-6xl mb-3 sm:mb-4">{language.flag}</div>
                <CardTitle className="text-lg sm:text-xl lg:text-2xl text-foreground">
                  {language.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-sm sm:text-base mb-4 sm:mb-6 px-2">
                  {language.description}
                </CardDescription>
                <Button 
                  variant="default"
                  className="w-full text-sm sm:text-base"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLanguageSelect(language.code);
                  }}
                >
                  {t('startLearning')}
                </Button>
              </CardContent>
            </Card>
          ))}
          </div>
        </div>
      </div>
    </div>
  );
};