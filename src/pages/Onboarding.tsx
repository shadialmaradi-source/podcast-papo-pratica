import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Headphones, ArrowRight, ArrowLeft, Check, Sprout, BookOpen, Zap, Award } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";

const targetLanguages = [
  { code: 'spanish', name: 'Spanish', flag: '🇪🇸', native: 'Español', available: true },
  { code: 'english', name: 'English', flag: '🇺🇸', native: 'English', available: true },
  { code: 'french', name: 'French', flag: '🇫🇷', native: 'Français', available: false },
  { code: 'italian', name: 'Italian', flag: '🇮🇹', native: 'Italiano', available: false },
  { code: 'german', name: 'German', flag: '🇩🇪', native: 'Deutsch', available: false },
];

const nativeLanguages = [
  { code: 'en', name: 'English', flag: '🇺🇸', native: 'English' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸', native: 'Español' },
  { code: 'fr', name: 'French', flag: '🇫🇷', native: 'Français' },
  { code: 'it', name: 'Italian', flag: '🇮🇹', native: 'Italiano' },
  { code: 'pt', name: 'Portuguese', flag: '🇧🇷', native: 'Português' },
];

type Step = 'language' | 'native' | 'level';

const targetToNativeCode: Record<string, string> = {
  english: 'en',
  spanish: 'es',
  french: 'fr',
  italian: 'it',
};

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('language');
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [selectedNativeLanguage, setSelectedNativeLanguage] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  // Check if coming from a shared lesson link
  const pendingLessonToken = localStorage.getItem('pending_lesson_token');
  const isLessonOnboarding = !!pendingLessonToken;

  const proficiencyLevels = [
    { code: 'absolute_beginner', label: t('absoluteBeginner'), description: t('absoluteBeginnerDesc'), icon: Sprout },
    { code: 'beginner', label: t('beginnerLabel'), description: t('beginnerDesc'), icon: BookOpen },
    { code: 'intermediate', label: t('intermediateLabel'), description: t('intermediateDesc'), icon: Zap },
    { code: 'advanced', label: t('advancedLabel'), description: t('advancedDesc'), icon: Award },
  ];

  // For lesson onboarding, skip the level step
  const steps: Step[] = isLessonOnboarding ? ['language', 'native'] : ['language', 'native', 'level'];
  const currentStepIndex = steps.indexOf(step);

  const filteredNativeLanguages = nativeLanguages.filter(
    lang => lang.code !== targetToNativeCode[selectedLanguage || '']
  );

  const handleLanguageSelect = (langCode: string, available: boolean) => {
    if (!available) return;
    setSelectedLanguage(langCode);
  };

  const handleContinueToNative = () => {
    if (!selectedLanguage) return;
    if (selectedNativeLanguage === targetToNativeCode[selectedLanguage]) {
      setSelectedNativeLanguage(null);
    }
    trackEvent('onboarding_step_changed', { step_name: 'native' });
    setStep('native');
  };

  const handleContinueToLevel = () => {
    if (!selectedNativeLanguage) return;
    trackEvent('onboarding_step_changed', { step_name: 'level' });
    setStep('level');
  };

  const handleBack = () => {
    if (step === 'native') setStep('language');
    else if (step === 'level') setStep('native');
  };

  // For lesson onboarding: after native language, save and go to lesson
  const handleLessonOnboardingComplete = async () => {
    if (!selectedLanguage || !selectedNativeLanguage) return;
    localStorage.setItem('onboarding_language', selectedLanguage);
    localStorage.setItem('onboarding_native_language', selectedNativeLanguage);

    trackEvent('onboarding_completed', {
      selected_language: selectedLanguage,
      native_language: selectedNativeLanguage,
      lesson_onboarding: true,
    });

    if (user) {
      await supabase.from('profiles').update({
        selected_language: selectedLanguage,
        native_language: selectedNativeLanguage,
        current_level: 'beginner', // Default for lesson onboarding
      }).eq('user_id', user.id);
    }

    // Clear the pending token and redirect to lesson
    const token = pendingLessonToken;
    localStorage.removeItem('pending_lesson_token');
    navigate(`/lesson/student/${token}`);
  };

  const handleFinalContinue = async () => {
    if (!selectedLanguage || !selectedLevel || !selectedNativeLanguage) return;
    localStorage.setItem('onboarding_language', selectedLanguage);
    localStorage.setItem('onboarding_level', selectedLevel);
    localStorage.setItem('onboarding_native_language', selectedNativeLanguage);

    trackEvent('onboarding_completed', {
      selected_language: selectedLanguage,
      native_language: selectedNativeLanguage,
      level: selectedLevel,
    });

    if (user) {
      await supabase.from('profiles').update({
        selected_language: selectedLanguage,
        native_language: selectedNativeLanguage,
        current_level: selectedLevel,
      }).eq('user_id', user.id);
    }

    navigate('/lesson/first');
  };

  const stepLabels = isLessonOnboarding
    ? [t('onboardingStep1'), t('onboardingStep2')]
    : [t('onboardingStep1'), t('onboardingStep2'), t('onboardingStep3')];

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex flex-col">
      {/* Header */}
      <header className="p-3 md:p-4">
        <div className="container mx-auto flex items-center gap-2">
          <Headphones className="h-6 w-6 md:h-8 md:w-8 text-primary" />
          <span className="text-lg md:text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            ListenFlow
          </span>
        </div>
      </header>

      {/* Progress Indicator */}
      <div className="container mx-auto px-4 pt-2 md:pt-4">
        <div className="flex items-center justify-center gap-1 md:gap-2 text-xs md:text-sm text-muted-foreground">
          {stepLabels.map((label, i) => (
            <span key={i} className="flex items-center gap-1 md:gap-2">
              {i > 0 && <ArrowRight className="h-3 w-3 md:h-4 md:w-4" />}
              <span className={currentStepIndex === i ? 'text-primary font-medium' : currentStepIndex > i ? 'text-primary/60' : ''}>
                {label}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-3 md:p-4 overflow-auto">
        <AnimatePresence mode="wait">
          {step === 'language' && (
            <motion.div key="language" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full max-w-lg">
              <div className="text-center mb-4 md:mb-8">
                <h1 className="text-xl md:text-3xl font-bold text-foreground mb-1 md:mb-2">{t('onboardingLangTitle')}</h1>
                <p className="text-sm md:text-base text-muted-foreground">{t('onboardingLangSubtitle')}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 md:gap-4 mb-4 md:mb-8">
                {targetLanguages.map((lang) => (
                  <Card
                    key={lang.code}
                    onClick={() => handleLanguageSelect(lang.code, lang.available)}
                    className={`relative transition-all ${lang.available ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02]' : 'cursor-not-allowed'} ${
                      selectedLanguage === lang.code ? 'ring-2 ring-primary border-primary bg-primary/5' : lang.available ? 'hover:border-primary/50' : 'opacity-60'
                    }`}
                  >
                    <CardContent className="p-3 md:p-6 text-center relative">
                      {selectedLanguage === lang.code && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-1 right-1 md:top-2 md:right-2">
                          <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-3 w-3 md:h-4 md:w-4 text-primary-foreground" />
                          </div>
                        </motion.div>
                      )}
                      {!lang.available && (
                        <div className="absolute inset-0 bg-muted/40 rounded-lg flex items-center justify-center z-10">
                          <Badge variant="secondary" className="bg-muted-foreground/80 text-background text-xs">{t('soon')}</Badge>
                        </div>
                      )}
                      <span className="text-3xl md:text-4xl mb-2 md:mb-3 block">{lang.flag}</span>
                      <h3 className="font-bold text-foreground text-sm md:text-base">{lang.name}</h3>
                      <p className="text-xs md:text-sm text-muted-foreground">{lang.native}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Button onClick={handleContinueToNative} disabled={!selectedLanguage} size="lg" className="w-full py-4 md:py-6 text-base md:text-lg rounded-full">
                {t('continue')} <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </motion.div>
          )}

          {step === 'native' && (
            <motion.div key="native" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full max-w-lg">
              <div className="text-center mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{t('onboardingNativeTitle')}</h1>
                <p className="text-muted-foreground">{t('onboardingNativeSubtitle')}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-8">
                {filteredNativeLanguages.map((lang) => (
                  <Card
                    key={lang.code}
                    onClick={() => setSelectedNativeLanguage(lang.code)}
                    className={`cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${
                      selectedNativeLanguage === lang.code ? 'ring-2 ring-primary border-primary bg-primary/5' : 'hover:border-primary/50'
                    }`}
                  >
                    <CardContent className="p-6 text-center relative">
                      {selectedNativeLanguage === lang.code && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-2 right-2">
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
              <div className="flex gap-3">
                <Button onClick={handleBack} variant="outline" size="lg" className="py-6 text-lg rounded-full">
                  <ArrowLeft className="mr-2 h-5 w-5" /> {t('back')}
                </Button>
                {isLessonOnboarding ? (
                  <Button onClick={handleLessonOnboardingComplete} disabled={!selectedNativeLanguage} size="lg" className="flex-1 py-6 text-lg rounded-full">
                    Start Lesson <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                ) : (
                  <Button onClick={handleContinueToLevel} disabled={!selectedNativeLanguage} size="lg" className="flex-1 py-6 text-lg rounded-full">
                    {t('continue')} <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {step === 'level' && !isLessonOnboarding && (
            <motion.div key="level" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="w-full max-w-lg">
              <div className="text-center mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{t('onboardingLevelTitle')}</h1>
                <p className="text-muted-foreground">{t('onboardingLevelSubtitle')}</p>
              </div>
              <div className="space-y-3 mb-8">
                {proficiencyLevels.map((level) => {
                  const IconComponent = level.icon;
                  return (
                    <Card
                      key={level.code}
                      onClick={() => setSelectedLevel(level.code)}
                      className={`cursor-pointer transition-all hover:shadow-lg hover:scale-[1.01] ${
                        selectedLevel === level.code ? 'ring-2 ring-primary border-primary bg-primary/5' : 'hover:border-primary/50'
                      }`}
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                          selectedLevel === level.code ? 'bg-primary/20' : 'bg-muted'
                        }`}>
                          <IconComponent className={`h-6 w-6 ${selectedLevel === level.code ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-foreground">{level.label}</h3>
                          <p className="text-sm text-muted-foreground">{level.description}</p>
                        </div>
                        {selectedLevel === level.code && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
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
                <Button onClick={handleBack} variant="outline" size="lg" className="py-6 text-lg rounded-full">
                  <ArrowLeft className="mr-2 h-5 w-5" /> {t('back')}
                </Button>
                <Button onClick={handleFinalContinue} disabled={!selectedLevel} size="lg" className="flex-1 py-6 text-lg rounded-full">
                  {t('continue')} <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
