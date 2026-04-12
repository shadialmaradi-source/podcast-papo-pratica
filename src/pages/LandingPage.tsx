import { useState, useEffect } from "react";
import LandingFooter from "@/components/LandingFooter";
import FeedbackSection from "@/components/FeedbackSection";
import { detectUILanguage } from "@/utils/browserLanguage";
import { trackPageView } from "@/lib/analytics";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Headphones, MessageSquare, BookOpen, Mic, Brain, ArrowRight, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type LandingLanguage = 'en' | 'es' | 'fr' | 'it' | 'de';

const landingTranslations = {
  en: {
    heroTitle: "Learn Languages from Real Conversations",
    heroSubtitle: "ListenFlow turns short real-world clips into a simple 3-part system: Understand what you hear → Use it immediately → Remember useful phrases for later.",
    tryCTA: "Start your first 60-second lesson",
    diffTitle: "Why ListenFlow feels different",
    otherApps: "OTHER APPS",
    listenFlow: "LISTENFLOW",
    comp1Other: "Most apps teach language in isolation",
    comp1Flow: "ListenFlow starts from real conversations",
    comp2Other: "Most apps focus on streaks",
    comp2Flow: "ListenFlow focuses on understanding and speaking",
    comp3Other: "Most apps teach single words",
    comp3Flow: "ListenFlow helps you keep useful full phrases",
    comp4Other: "Most apps repeat content blindly",
    comp4Flow: "ListenFlow gives targeted practice with purpose",
    comp5Other: "Language app progress",
    comp5Flow: "Language for real life",
    methodTitle: "One lesson. Three outcomes.",
    step1Title: "UNDERSTAND",
    step1Desc: "Watch a short real-world clip and train your ear on natural speech.",
    step2Title: "USE",
    step2Desc: "Answer focused questions and say key phrases out loud right away.",
    step3Title: "REMEMBER",
    step3Desc: "Save practical phrases you actually want to use, and review them over time.",
    trustText: "Science-backed, designed for everyday learners.",
    finalCTA: "Ready to understand real conversations—then speak with confidence?",
    startLesson: "Start your first 60-second lesson",
    selectLanguage: "Select language",
    login: "Log in",
  },
  es: {
    heroTitle: "Aprende Idiomas de Conversaciones Reales",
    heroSubtitle: "Mira clips de 60 segundos → Responde preguntas inteligentes → Habla frases clave → Guarda para siempre",
    tryCTA: "Prueba tu primera lección de 60 segundos",
    diffTitle: "No es Duolingo. No es Babbel. Esto es Diferente.",
    otherApps: "OTRAS APPS",
    listenFlow: "LISTENFLOW",
    comp1Other: "Lecciones fijas",
    comp1Flow: "Aprende de tus videos/podcasts favoritos",
    comp2Other: "Ejercicios de gramática",
    comp2Flow: "Conversaciones reales",
    comp3Other: "Palabras aisladas",
    comp3Flow: "Frases útiles completas",
    comp4Other: "Puntos gamificados",
    comp4Flow: "Método respaldado por investigación",
    comp5Other: "Repetición sin fin",
    comp5Flow: "Escucha + habla inteligente",
    methodTitle: "3 Pasos Respaldados por Investigación",
    step1Title: "MIRA",
    step1Desc: "un clip de 60 segundos del mundo real (entrada comprensible)",
    step2Title: "RESPONDE",
    step2Desc: "10 preguntas específicas (comprensión activa)",
    step3Title: "HABLA + GUARDA",
    step3Desc: "5 frases clave (producción + investigación de fragmentación)",
    trustText: "Basado en más de 40 años de investigación: Hipótesis de Input de Krashen + Hipótesis de Output de Swain",
    finalCTA: "¿Listo para entender conversaciones reales?",
    startLesson: "Comenzar lección de 60 segundos",
    selectLanguage: "Seleccionar idioma",
    login: "Iniciar sesión",
  },
  fr: {
    heroTitle: "Apprenez les Langues à partir de Vraies Conversations",
    heroSubtitle: "Regardez des clips de 60 secondes → Répondez à des questions intelligentes → Parlez des phrases clés → Sauvegardez pour toujours",
    tryCTA: "Essayez votre première leçon de 60 secondes",
    diffTitle: "Pas Duolingo. Pas Babbel. C'est Différent.",
    otherApps: "AUTRES APPS",
    listenFlow: "LISTENFLOW",
    comp1Other: "Leçons fixes",
    comp1Flow: "Apprenez de vos vidéos/podcasts préférés",
    comp2Other: "Exercices de grammaire",
    comp2Flow: "Vraies conversations",
    comp3Other: "Mots isolés",
    comp3Flow: "Phrases utiles complètes",
    comp4Other: "Points gamifiés",
    comp4Flow: "Méthode basée sur la recherche",
    comp5Other: "Répétition sans fin",
    comp5Flow: "Écoute + parole intelligente",
    methodTitle: "3 Étapes Basées sur la Recherche",
    step1Title: "REGARDEZ",
    step1Desc: "un clip de 60 secondes du monde réel (entrée compréhensible)",
    step2Title: "RÉPONDEZ",
    step2Desc: "10 questions ciblées (compréhension active)",
    step3Title: "PARLEZ + SAUVEGARDEZ",
    step3Desc: "5 phrases clés (production + recherche sur le chunking)",
    trustText: "Basé sur plus de 40 ans de recherche: Hypothèse de l'Input de Krashen + Hypothèse de l'Output de Swain",
    finalCTA: "Prêt à comprendre de vraies conversations?",
    startLesson: "Commencer une leçon de 60 secondes",
    selectLanguage: "Sélectionner la langue",
    login: "Se connecter",
  },
  it: {
    heroTitle: "Impara le Lingue dalle Conversazioni Reali",
    heroSubtitle: "Guarda clip di 60 secondi → Rispondi a domande intelligenti → Parla frasi chiave → Salva per sempre",
    tryCTA: "Prova la tua prima lezione di 60 secondi",
    diffTitle: "Non è Duolingo. Non è Babbel. Questo è Diverso.",
    otherApps: "ALTRE APP",
    listenFlow: "LISTENFLOW",
    comp1Other: "Lezioni fisse",
    comp1Flow: "Impara dai tuoi video/podcast preferiti",
    comp2Other: "Esercizi di grammatica",
    comp2Flow: "Conversazioni reali",
    comp3Other: "Parole isolate",
    comp3Flow: "Frasi utili complete",
    comp4Other: "Punti gamificati",
    comp4Flow: "Metodo basato sulla ricerca",
    comp5Other: "Ripetizione infinita",
    comp5Flow: "Ascolto + parlato intelligente",
    methodTitle: "3 Passi Supportati dalla Ricerca",
    step1Title: "GUARDA",
    step1Desc: "un clip di 60 secondi dal mondo reale (input comprensibile)",
    step2Title: "RISPONDI",
    step2Desc: "10 domande mirate (comprensione attiva)",
    step3Title: "PARLA + SALVA",
    step3Desc: "5 frasi chiave (output + ricerca sul chunking)",
    trustText: "Basato su oltre 40 anni di ricerca: Ipotesi dell'Input di Krashen + Ipotesi dell'Output di Swain",
    finalCTA: "Pronto a capire le conversazioni reali?",
    startLesson: "Inizia una lezione di 60 secondi",
    selectLanguage: "Seleziona lingua",
    login: "Accedi",
  },
  de: {
    heroTitle: "Sprachen aus Echten Gesprächen Lernen",
    heroSubtitle: "60-Sekunden-Clips ansehen → Clevere Fragen beantworten → Schlüsselphrasen sprechen → Für immer speichern",
    tryCTA: "Probiere deine erste 60-Sekunden-Lektion",
    diffTitle: "Nicht Duolingo. Nicht Babbel. Das ist Anders.",
    otherApps: "ANDERE APPS",
    listenFlow: "LISTENFLOW",
    comp1Other: "Feste Lektionen",
    comp1Flow: "Lerne von deinen Lieblingsvideos/-podcasts",
    comp2Other: "Grammatikübungen",
    comp2Flow: "Echte Gespräche",
    comp3Other: "Isolierte Wörter",
    comp3Flow: "Vollständige nützliche Phrasen",
    comp4Other: "Gamifizierte Punkte",
    comp4Flow: "Forschungsbasierte Methode",
    comp5Other: "Endlose Wiederholung",
    comp5Flow: "Smartes Hören + Sprechen",
    methodTitle: "3 Forschungsbasierte Schritte",
    step1Title: "ANSEHEN",
    step1Desc: "einen 60-Sekunden-Clip aus der realen Welt (verständlicher Input)",
    step2Title: "ANTWORTEN",
    step2Desc: "10 gezielte Fragen (aktives Verstehen)",
    step3Title: "SPRECHEN + SPEICHERN",
    step3Desc: "5 Schlüsselphrasen (Output + Chunking-Forschung)",
    trustText: "Basiert auf über 40 Jahren Forschung: Krashens Input-Hypothese + Swains Output-Hypothese",
    finalCTA: "Bereit, echte Gespräche zu verstehen?",
    startLesson: "60-Sekunden-Lektion starten",
    selectLanguage: "Sprache auswählen",
    login: "Anmelden",
  },
};

const detectLandingLanguage = (): LandingLanguage => {
  const base = detectUILanguage(); // returns en|es|fr|it (no pt)
  if (['en', 'es', 'fr', 'it'].includes(base)) return base as LandingLanguage;
  // Also support German for landing page only
  const browserLang = navigator.language.split('-')[0].toLowerCase();
  if (browserLang === 'de') return 'de';
  return 'en';
};

export default function LandingPage() {
  const navigate = useNavigate();
  const [selectedLanguage, setSelectedLanguage] = useState<LandingLanguage>(() => detectLandingLanguage());
  const [showMobileCTA, setShowMobileCTA] = useState(false);
  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackEmail, setFeedbackEmail] = useState("");
  const [feedbackCategory, setFeedbackCategory] = useState<"feedback" | "bug" | "feature_request">("feedback");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackHoneypot, setFeedbackHoneypot] = useState("");
  const [feedbackCreatedAt] = useState<string>(() => new Date().toISOString());
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const t = landingTranslations[selectedLanguage];

  useEffect(() => {
    trackPageView("landing", "shared");
    const handleScroll = () => {
      setShowMobileCTA(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleStartLesson = () => {
    navigate('/onboarding');
  };

  const handleFeedbackSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmittingFeedback) return;

    const normalizedMessage = feedbackMessage.trim();
    const normalizedEmail = feedbackEmail.trim();
    const normalizedName = feedbackName.trim();

    if (!normalizedMessage) {
      toast.error("Please add your message before submitting.");
      return;
    }

    if (!feedbackCategory) {
      toast.error("Please select a feedback type.");
      return;
    }

    if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (feedbackHoneypot.trim().length > 0) {
      toast.success("Thanks! Your feedback was submitted.");
      setFeedbackMessage("");
      return;
    }

    setIsSubmittingFeedback(true);
    const { error } = await supabase.from("landing_feedback_submissions").insert({
      name: normalizedName || null,
      email: normalizedEmail || null,
      category: feedbackCategory,
      message: normalizedMessage,
      source_page: window.location.pathname,
      user_agent: navigator.userAgent || null,
      submitted_at_client: feedbackCreatedAt,
    });
    setIsSubmittingFeedback(false);

    if (error) {
      toast.error("We couldn't submit your feedback right now. Please try again.");
      return;
    }

    setFeedbackName("");
    setFeedbackEmail("");
    setFeedbackCategory("feedback");
    setFeedbackMessage("");
    setFeedbackHoneypot("");
    toast.success("Thanks! Your feedback was submitted.");
  };

  const comparisonData = [
    { other: t.comp1Other, flow: t.comp1Flow },
    { other: t.comp2Other, flow: t.comp2Flow },
    { other: t.comp3Other, flow: t.comp3Flow },
    { other: t.comp4Other, flow: t.comp4Flow },
  ];

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border/50">

        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Headphones className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-foreground">ListenFlow</span>
          </div>
          
          {/* Nav links */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/teachers')}>
              For Teachers
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/auth?role=student')}
            >
              {t.login}
            </Button>
          </div>
        </div>
      </header>

      <main>
      {/* Hero Section */}
      <section className="relative min-h-[85dvh] md:min-h-[90vh] flex items-center justify-center overflow-hidden pt-16">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          </div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="flex items-center justify-center gap-3 mb-8"
            >
              <Headphones className="h-12 w-12 text-primary" />
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                ListenFlow
              </h1>
            </motion.div>

            {/* Headline */}
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              {t.heroTitle}
            </h2>

            {/* Subheadline */}
            <p className="text-base md:text-xl text-muted-foreground mb-4 max-w-3xl mx-auto">
              {t.heroSubtitle}
            </p>
            <p className="text-sm md:text-base text-muted-foreground/90 mb-6 md:mb-8 max-w-2xl mx-auto">
              No grammar drills. No random word lists.
              <br className="hidden md:block" />
              Built for real listening and real speaking.
            </p>

            {/* Language Picker */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 mb-6 md:mb-8">
              <Select value={selectedLanguage} onValueChange={(v) => setSelectedLanguage(v as LandingLanguage)}>
                <SelectTrigger className="w-44 md:w-48" aria-label={t.selectLanguage}>
                  <SelectValue placeholder={t.selectLanguage} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">🇺🇸 English</SelectItem>
                  <SelectItem value="es">🇪🇸 Español</SelectItem>
                  <SelectItem value="fr">🇫🇷 Français</SelectItem>
                  <SelectItem value="it">🇮🇹 Italiano</SelectItem>
                  <SelectItem value="de">🇩🇪 Deutsch</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Primary CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
                <Button
                  size="lg"
                  onClick={handleStartLesson}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 md:px-8 py-5 md:py-6 text-base md:text-lg rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
                >
                  {t.tryCTA}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Differentiation Section */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
              {t.diffTitle}
            </h2>
          </motion.div>

          {/* Comparison Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="max-w-3xl mx-auto"
          >
            {/* Desktop Comparison */}
            <div className="hidden md:block bg-background rounded-2xl shadow-xl overflow-hidden border">
              <div className="grid grid-cols-2">
                <div className="p-4 bg-muted/50 font-bold text-center text-muted-foreground border-b border-r">
                  {t.otherApps}
                </div>
                <div className="p-4 bg-primary/10 font-bold text-center text-primary border-b">
                  {t.listenFlow}
                </div>
              </div>
              {comparisonData.map((row, idx) => (
                <div key={idx} className="grid grid-cols-2">
                  <div className="p-4 flex items-center gap-3 border-b border-r text-muted-foreground">
                    <X className="h-5 w-5 text-destructive shrink-0" />
                    <span>{row.other}</span>
                  </div>
                  <div className="p-4 flex items-center gap-3 border-b bg-primary/5 text-foreground">
                    <Check className="h-5 w-5 text-primary shrink-0" />
                    <span className="font-medium">{row.flow}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile Comparison */}
            <div className="md:hidden space-y-4">
              {comparisonData.map((row, idx) => (
                <div key={idx} className="bg-background rounded-xl shadow-md border overflow-hidden">
                  <div className="p-4 bg-muted/50 flex items-center gap-3 text-muted-foreground">
                    <X className="h-5 w-5 text-destructive shrink-0" />
                    <span className="text-sm">{row.other}</span>
                  </div>
                  <div className="p-4 bg-primary/5 flex items-center gap-3">
                    <Check className="h-5 w-5 text-primary shrink-0" />
                    <span className="font-medium">{row.flow}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-center text-sm md:text-base text-muted-foreground mt-6">
              Language for real life, not just app progress.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Method Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl md:text-4xl font-bold text-foreground">
              {t.methodTitle}
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { icon: MessageSquare, title: t.step1Title, desc: t.step1Desc, color: "text-blue-500" },
              { icon: Brain, title: t.step2Title, desc: t.step2Desc, color: "text-purple-500" },
              { icon: Mic, title: t.step3Title, desc: t.step3Desc, color: "text-primary" },
            ].map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.15 }}
                className="bg-background rounded-2xl p-8 shadow-lg border hover:shadow-xl transition-shadow"
              >
                <div className={`w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6 mx-auto`}>
                  <step.icon className={`h-8 w-8 ${step.color}`} />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3 text-center">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-center">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
          <p className="text-center text-muted-foreground mt-8 max-w-3xl mx-auto">
            You don’t just study. You learn to understand, use, and keep the language.
          </p>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto"
          >
            <BookOpen className="h-10 w-10 text-primary mx-auto mb-4" />
            <h3 className="text-xl md:text-2xl font-semibold text-foreground mb-4">
              Built on proven language-learning principles
            </h3>
            <p className="text-base md:text-lg text-muted-foreground mb-4">
              ListenFlow is grounded in decades of language-learning research:
            </p>
            <ul className="text-left text-sm md:text-base text-muted-foreground space-y-2 max-w-2xl mx-auto">
              <li>• strong input helps comprehension</li>
              <li>• active output builds fluency</li>
              <li>• phrase-level practice improves recall and real-world use</li>
            </ul>
            <p className="text-sm md:text-base text-muted-foreground mt-5 font-medium">
              {t.trustText}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-8">
              {t.finalCTA}
            </h2>
            <Button
              size="lg"
              onClick={handleStartLesson}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              {t.startLesson}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <p className="text-sm md:text-base text-muted-foreground mt-4">
              Learn from real content. Use it today. Remember it tomorrow.
            </p>
          </motion.div>
        </div>
      </section>

      <FeedbackSection />

      {/* Mobile Fixed Bottom CTA */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: showMobileCTA ? 0 : 100 }}
        className="fixed bottom-0 left-0 right-0 md:hidden bg-background/95 backdrop-blur border-t p-4 z-50"
      >
        <Button
          onClick={handleStartLesson}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 text-lg rounded-full"
        >
          {t.startLesson}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </motion.div>
      </main>

      <LandingFooter />

      {/* Spacer for mobile CTA */}
      <div className="h-24 md:hidden" />
    </div>
  );
}
