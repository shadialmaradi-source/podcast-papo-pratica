import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Language {
  code: string;
  name: string;
  flag: string;
  description: string;
}

interface LanguageSelectorProps {
  onLanguageSelect: (language: string) => void;
}

const languages: Language[] = [
  {
    code: "portuguese",
    name: "Português",
    flag: "🇧🇷",
    description: "Learn Brazilian Portuguese through podcasts"
  },
  {
    code: "english",
    name: "English",
    flag: "🇬🇧",
    description: "Learn English through podcasts"
  },
  {
    code: "italian",
    name: "Italiano",
    flag: "🇮🇹",
    description: "Impara l'italiano attraverso i podcast"
  }
];
export const LanguageSelector = ({ onLanguageSelect }: LanguageSelectorProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Choose Your Learning Language
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground px-4">
            Select the language you want to learn through podcasts
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
                  Start Learning {language.name}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};