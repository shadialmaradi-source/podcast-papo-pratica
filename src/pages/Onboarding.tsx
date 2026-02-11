import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Headphones, ArrowRight, ArrowLeft, Check, Sprout, BookOpen, Zap, Award } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";

const languages = [
  { code: 'spanish', name: 'Spanish', flag: '🇪🇸', native: 'Español', available: true },
  { code: 'english', name: 'English', flag: '🇺🇸', native: 'English', available: true },
  { code: 'french', name: 'French', flag: '🇫🇷', native: 'Français', available: false },
  { code: 'italian', name: 'Italian', flag: '🇮🇹', native: 'Italiano', available: false },
  { code: 'german', name: 'German', flag: '🇩🇪', native: 'Deutsch', available: false },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [step, setStep] = useState<'language' | 'level'>('language');
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  const proficiencyLevels = [
    { 
      code: 'absolute_beginner', 
      label: t('absoluteBeginner'), 
      description: t('absoluteBeginnerDesc'),
      icon: Sprout
    },
    { 
      code: 'beginner', 
      label: t('beginnerLabel'), 
      description: t('beginnerDesc'),
      icon: BookOpen
    },
    { 
      code: 'intermediate', 
      label: t('intermediateLabel'), 
      description: t('intermediateDesc'),
      icon: Zap
    },
    { 
      code: 'advanced', 
      label: t('advancedLabel'), 
      description: t('advancedDesc'),
      icon: Award
    },
  ];

  const handleLanguageSelect = (langCode: string, available: boolean) => {
    if (!available) return;
    setSelectedLanguage(langCode);
  };

  const handleContinueToLevel = () => {
    if (!selectedLanguage) return;
    setStep('level');
  };

  const handleBack = () => {
    setStep('language');
  };

  const handleFinalContinue = () => {
    if (!selectedLanguage || !selectedLevel) return;
    
    // Store selected preferences in localStorage
    localStorage.setItem('onboarding_language', selectedLanguage);
    localStorage.setItem('onboarding_level', selectedLevel);
    
    // Navigate to first lesson
    navigate('/lesson/first');
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

      {/* Progress Indicator */}
      <div className="container mx-auto px-4 pt-4">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span className={step === 'language' ? 'text-primary font-medium' : ''}>
            {t('onboardingStep1')}
          </span>
          <ArrowRight className="h-4 w-4" />
          <span className={step === 'level' ? 'text-primary font-medium' : ''}>
            {t('onboardingStep2')}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <AnimatePresence mode="wait">
          {step === 'language' ? (
            <motion.div
              key="language"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full max-w-lg"
            >
              <div className="text-center mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                  {t('onboardingLangTitle')}
                </h1>
                <p className="text-muted-foreground">
                  {t('onboardingLangSubtitle')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                {languages.map((lang) => (
                  <Card
                    key={lang.code}
                    onClick={() => handleLanguageSelect(lang.code, lang.available)}
                    className={`relative transition-all ${
                      lang.available 
                        ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02]' 
                        : 'cursor-not-allowed'
                    } ${
                      selectedLanguage === lang.code
                        ? 'ring-2 ring-primary border-primary bg-primary/5'
                        : lang.available 
                          ? 'hover:border-primary/50' 
                          : 'opacity-60'
                    }`}
                  >
                    <CardContent className="p-6 text-center relative">
                      {/* Selected checkmark */}
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
                      
                      {/* Coming soon badge */}
                      {!lang.available && (
                        <div className="absolute inset-0 bg-muted/40 rounded-lg flex items-center justify-center z-10">
                          <Badge variant="secondary" className="bg-muted-foreground/80 text-background">
                            {t('soon')}
                          </Badge>
                        </div>
                      )}
                      
                      <span className="text-4xl mb-3 block">{lang.flag}</span>
                      <h3 className="font-bold text-foreground">{lang.name}</h3>
                      <p className="text-sm text-muted-foreground">{lang.native}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Button
                onClick={handleContinueToLevel}
                disabled={!selectedLanguage}
                size="lg"
                className="w-full py-6 text-lg rounded-full"
              >
                {t('continue')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="level"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-full max-w-lg"
            >
              <div className="text-center mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                  {t('onboardingLevelTitle')}
                </h1>
                <p className="text-muted-foreground">
                  {t('onboardingLevelSubtitle')}
                </p>
              </div>

              <div className="space-y-3 mb-8">
                {proficiencyLevels.map((level) => {
                  const IconComponent = level.icon;
                  return (
                    <Card
                      key={level.code}
                      onClick={() => setSelectedLevel(level.code)}
                      className={`cursor-pointer transition-all hover:shadow-lg hover:scale-[1.01] ${
                        selectedLevel === level.code
                          ? 'ring-2 ring-primary border-primary bg-primary/5'
                          : 'hover:border-primary/50'
                      }`}
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                          selectedLevel === level.code ? 'bg-primary/20' : 'bg-muted'
                        }`}>
                          <IconComponent className={`h-6 w-6 ${
                            selectedLevel === level.code ? 'text-primary' : 'text-muted-foreground'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-foreground">{level.label}</h3>
                          <p className="text-sm text-muted-foreground">{level.description}</p>
                        </div>
                        {selectedLevel === level.code && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                          >
                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                              <Check className="h-4 w-4 text-primary-foreground" />
                            </div>
                          </motion.div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  size="lg"
                  className="py-6 text-lg rounded-full"
                >
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  {t('back')}
                </Button>
                <Button
                  onClick={handleFinalContinue}
                  disabled={!selectedLevel}
                  size="lg"
                  className="flex-1 py-6 text-lg rounded-full"
                >
                  {t('continue')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
