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
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Choose Your Learning Language
          </h1>
          <p className="text-xl text-muted-foreground">
            Select the language you want to learn through podcasts
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {languages.map((language) => (
            <Card 
              key={language.code}
              className="cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg bg-card/50 backdrop-blur-sm border-border/50"
              onClick={() => onLanguageSelect(language.code)}
            >
              <CardHeader className="text-center pb-4">
                <div className="text-6xl mb-4">{language.flag}</div>
                <CardTitle className="text-2xl text-foreground">
                  {language.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-base mb-6">
                  {language.description}
                </CardDescription>
                <Button 
                  variant="default"
                  className="w-full"
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