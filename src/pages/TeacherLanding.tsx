import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Headphones,
  BookOpen,
  Brain,
  BarChart3,
  Target,
  Share2,
  RefreshCw,
  Check,
  X,
  ArrowRight,
  UserPlus,
  FolderOpen,
  Eye,
  Quote,
  Star,
  Play,
  Timer,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trackEvent } from "@/lib/analytics";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
};

const problems = [
  {
    problem: "Students forget homework",
    solution: "Auto-assign video lessons",
  },
  {
    problem: "Tracking progress manually",
    solution: "See completion rates instantly",
  },
  {
    problem: "Creating materials takes hours",
    solution: "Curated video library + AI exercises",
  },
];

const steps = [
  { icon: UserPlus, title: "Create account", desc: "Free, takes 30 seconds" },
  { icon: Share2, title: "Add students", desc: "Via email invite or share link" },
  { icon: FolderOpen, title: "Assign learning paths", desc: "Pre-built modules A1–C2" },
  { icon: Eye, title: "Track progress", desc: "See what they completed" },
];

const features = [
  { icon: BookOpen, title: "Curated Video Library", desc: "100+ videos for A1–C2 levels, ready to assign" },
  { icon: Brain, title: "AI Exercise Generation", desc: "Auto-create comprehension questions from any video" },
  { icon: BarChart3, title: "Progress Tracking", desc: "See student completion rates and scores at a glance" },
  { icon: Target, title: "Structured Learning Paths", desc: "Pre-built weekly curricula you can customize" },
  { icon: Share2, title: "Share Links", desc: "Students access lessons with one click, no app download" },
  { icon: RefreshCw, title: "Real-time Sync", desc: "Control lesson pace during live class sessions" },
];

const pricingTiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    features: ["3 students max", "Basic features", "Email support"],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/month",
    features: ["Unlimited students", "All features", "Priority support", "Remove branding"],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Premium",
    price: "$39",
    period: "/month",
    features: ["Everything in Pro", "White-label option", "Custom video upload", "API access"],
    cta: "Start Free Trial",
    highlighted: false,
  },
];

const testimonials = [
  {
    quote: "This saves me 5 hours/week on homework assignments!",
    name: "Maria R.",
    title: "Italian Tutor on Preply",
  },
  {
    quote: "My students actually do their homework now. The video format keeps them engaged.",
    name: "James L.",
    title: "English Teacher, Berlin",
  },
  {
    quote: "Finally, a tool built for tutors, not classrooms. I can manage everything from one place.",
    name: "Sophie K.",
    title: "French Tutor, Freelance",
  },
];

const faqs = [
  {
    q: "How do students access lessons?",
    a: "You can invite students via email or share a direct link. They click the link, create an account, and see the lesson immediately — no app download needed.",
  },
  {
    q: "Do I need to create content myself?",
    a: "No! Use our curated library of 100+ videos across all levels (A1–C2), or paste any YouTube URL and we'll generate exercises automatically with AI.",
  },
  {
    q: "Can I customize lessons?",
    a: "Absolutely. Choose which videos to assign, select exercise types (comprehension, vocabulary, speaking), and set the difficulty level for each student.",
  },
];

export default function TeacherLanding() {
  const navigate = useNavigate();

  useEffect(() => {
    trackEvent("teacher_landing_viewed");
  }, []);

  const handleCTA = () => {
    trackEvent("teacher_landing_cta_clicked");
    navigate("/auth?role=teacher");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <Headphones className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-foreground">ListenFlow</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              For Students
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/auth")}>
              Log in
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-accent/5" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <Badge variant="secondary" className="mb-6 text-sm px-4 py-1.5">
              For Language Tutors
            </Badge>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              Teach Better. Manage Smarter.{" "}
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Keep Students Engaged.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              The all-in-one platform for online language tutors to assign homework, track progress, and manage students.
            </p>
            <Button size="lg" className="text-lg px-8 h-14 gap-2" onClick={handleCTA}>
              Start Free Trial <ArrowRight className="h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Problems We Solve */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="text-2xl md:text-4xl font-bold text-center text-foreground mb-12"
          >
            Problems We Solve
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {problems.map((p, i) => (
              <motion.div
                key={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i + 1}
              >
                <Card className="h-full text-center">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center gap-2 justify-center text-destructive">
                      <X className="h-5 w-5" />
                      <span className="text-sm font-medium line-through">{p.problem}</span>
                    </div>
                    <div className="flex items-center gap-2 justify-center text-primary font-semibold">
                      <Check className="h-5 w-5" />
                      <span>{p.solution}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="text-2xl md:text-4xl font-bold text-center text-foreground mb-12"
          >
            How It Works
          </motion.h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {steps.map((s, i) => (
              <motion.div
                key={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i + 1}
                className="text-center"
              >
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <s.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="text-sm font-bold text-primary mb-1">Step {i + 1}</div>
                <h3 className="text-lg font-semibold text-foreground mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="text-2xl md:text-4xl font-bold text-center text-foreground mb-12"
          >
            Everything You Need to Teach Online
          </motion.h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i + 1}
              >
                <Card className="h-full">
                  <CardHeader className="pb-2">
                    <f.icon className="h-8 w-8 text-primary mb-2" />
                    <CardTitle className="text-lg">{f.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{f.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="text-2xl md:text-4xl font-bold text-center text-foreground mb-4"
          >
            Simple, Transparent Pricing
          </motion.h2>
          <p className="text-center text-muted-foreground mb-12">Start free. Upgrade when you're ready.</p>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {pricingTiers.map((tier, i) => (
              <motion.div
                key={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i + 1}
              >
                <Card
                  className={`h-full flex flex-col ${
                    tier.highlighted ? "border-primary shadow-lg ring-2 ring-primary/20" : ""
                  }`}
                >
                  {tier.highlighted && (
                    <div className="bg-primary text-primary-foreground text-center text-sm font-medium py-1.5 rounded-t-lg -mt-px">
                      Most Popular
                    </div>
                  )}
                  <CardHeader className="text-center">
                    <CardTitle className="text-xl">{tier.name}</CardTitle>
                    <div className="mt-2">
                      <span className="text-4xl font-bold text-foreground">{tier.price}</span>
                      <span className="text-muted-foreground">{tier.period}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <ul className="space-y-3 flex-1 mb-6">
                      {tier.features.map((f, fi) => (
                        <li key={fi} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary shrink-0" />
                          <span className="text-muted-foreground">{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      variant={tier.highlighted ? "default" : "outline"}
                      onClick={handleCTA}
                    >
                      {tier.cta}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="text-2xl md:text-4xl font-bold text-center text-foreground mb-12"
          >
            Loved by Tutors
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i + 1}
              >
                <Card className="h-full">
                  <CardContent className="pt-6">
                    <Quote className="h-6 w-6 text-primary/40 mb-3" />
                    <p className="text-foreground mb-4 italic">"{t.quote}"</p>
                    <div className="flex items-center gap-1 mb-1">
                      {[...Array(5)].map((_, si) => (
                        <Star key={si} className="h-3.5 w-3.5 fill-accent text-accent" />
                      ))}
                    </div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.title}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-2xl">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="text-2xl md:text-4xl font-bold text-center text-foreground mb-12"
          >
            Frequently Asked Questions
          </motion.h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 md:py-24 bg-primary/5">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
          >
            <p className="text-muted-foreground mb-2">Join 100+ tutors using ListenFlow</p>
            <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-8">
              Start teaching smarter today
            </h2>
            <Button size="lg" className="text-lg px-8 h-14 gap-2" onClick={handleCTA}>
              Start Free Trial <ArrowRight className="h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
