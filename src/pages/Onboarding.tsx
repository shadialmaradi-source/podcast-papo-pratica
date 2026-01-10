import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Headphones, ArrowRight, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const languages = [
  { code: 'spanish', name: 'Spanish', flag: '🇪🇸', native: 'Español' },
  { code: 'french', name: 'French', flag: '🇫🇷', native: 'Français' },
  { code: 'italian', name: 'Italian', flag: '🇮🇹', native: 'Italiano' },
  { code: 'german', name: 'German', flag: '🇩🇪', native: 'Deutsch' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);

  const handleContinue = () => {
    if (!selectedLanguage) return;
    
    // Store selected language in localStorage for now
    localStorage.setItem('onboarding_language', selectedLanguage);
    
    // If user is logged in, go to app; otherwise go to auth
    if (user) {
      navigate('/app');
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex flex-col">
      {/* Header */}
      <header className="p-4">
        <div className="container mx-auto flex items-center gap-2">
          <Headphones className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            ListenFlow
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg"
        >
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              What language do you want to learn?
            </h1>
            <p className="text-muted-foreground">
              Choose your target language to get started
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            {languages.map((lang) => (
              <Card
                key={lang.code}
                onClick={() => setSelectedLanguage(lang.code)}
                className={`cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${
                  selectedLanguage === lang.code
                    ? 'ring-2 ring-primary border-primary bg-primary/5'
                    : 'hover:border-primary/50'
                }`}
              >
                <CardContent className="p-6 text-center relative">
                  {selectedLanguage === lang.code && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-2 right-2"
                    >
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    </motion.div>
                  )}
                  <span className="text-4xl mb-3 block">{lang.flag}</span>
                  <h3 className="font-bold text-foreground">{lang.name}</h3>
                  <p className="text-sm text-muted-foreground">{lang.native}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button
            onClick={handleContinue}
            disabled={!selectedLanguage}
            size="lg"
            className="w-full py-6 text-lg rounded-full"
          >
            Continue
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </motion.div>
      </main>
    </div>
  );
}
