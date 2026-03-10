import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useTeacherQuota } from "@/hooks/useTeacherQuota";
import { trackEvent, trackPageView } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Check, Crown, Building2, Loader2, AlertTriangle, CalendarDays } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface TeacherSub {
  plan: string;
  status: string;
  stripe_customer_id: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
}

const tiers = [
  {
    id: "pro",
    name: "Pro",
    price: 19,
    description: "Perfect for active tutors",
    icon: Crown,
    recommended: false,
    features: [
      "Unlimited students",
      "30 lessons/month",
      "Videos up to 10 min",
      "All lesson types (YouTube, Paragraph, Speaking)",
      "Student progress tracking",
      "Basic analytics",
      "Email support",
    ],
    trialText: "14-day free trial • No credit card required",
  },
  {
    id: "premium",
    name: "Premium",
    price: 39,
    description: "For professional tutors",
    icon: Building2,
    recommended: true,
    features: [
      "Everything in Pro, plus:",
      "100 lessons/month",
      "Videos up to 15 min",
      "Advanced analytics (retention, churn, engagement)",
      "Email notifications when students complete",
      "Priority support",
    ],
    trialText: "14-day free trial • No credit card required",
  },
];

const comparisonRows = [
  { feature: "Students", pro: "Unlimited", premium: "Unlimited" },
  { feature: "Lessons/month", pro: "60", premium: "160" },
  { feature: "Max video length", pro: "10 min", premium: "15 min" },
  { feature: "Lesson types", pro: "All", premium: "All" },
  { feature: "Analytics", pro: "Advanced", premium: "Advanced" },
  { feature: "Branding", pro: "Removable", premium: "Your Brand" },
];

const faqItems = [
  {
    q: "How does the free trial work?",
    a: "Sign up and get 14 days to create up to 60 lessons with Pro-level features. No credit card required. After 14 days, choose Pro or Premium to continue.",
  },
  {
    q: "Do I need to verify my email?",
    a: "Yes. You'll receive a verification link after signup. Verify your email to start creating lessons during your trial. Google sign-in users are verified automatically.",
  },
  {
    q: "What happens after my trial ends?",
    a: "You'll need to upgrade to Pro ($19/month) or Premium ($39/month) to continue creating lessons. Your existing lessons and students stay active.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes! There are no long-term contracts. You can cancel your subscription at any time and it will remain active until the end of your billing period.",
  },
  {
    q: "Do students need to pay?",
    a: "No! Student access is included in your plan. They can complete all assigned lessons for free.",
  },
  {
    q: "Can I switch plans later?",
    a: "Absolutely. You can upgrade or downgrade at any time. When upgrading, you'll be charged the prorated difference.",
  },
];

export default function TeacherPricing() {
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { quota, loading: quotaLoading } = useTeacherQuota();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<TeacherSub | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    if (roleLoading) return;
    if (role !== "teacher") { navigate("/app"); return; }
  }, [role, roleLoading, navigate]);

  useEffect(() => {
    trackPageView("teacher_pricing", "teacher");
    trackEvent("teacher_pricing_viewed");
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("teacher_subscriptions" as any)
      .select("plan, status, stripe_customer_id, current_period_end, trial_ends_at")
      .eq("teacher_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setSubscription(data as unknown as TeacherSub | null);
        setLoading(false);
      });
  }, [user]);

  const currentPlan = subscription?.plan || "free";
  const isTrialing = currentPlan === "trial";
  const isActivePaid = ["pro", "premium"].includes(currentPlan);

  const handleCheckout = async (plan: "pro" | "premium") => {
    if (!user) return;
    setCheckoutLoading(plan);
    trackEvent("teacher_upgrade_clicked", { plan });

    try {
      const { data, error } = await supabase.functions.invoke("teacher-stripe-checkout", {
        body: {
          plan,
          successUrl: `${window.location.origin}/teacher/pricing?success=true`,
          cancelUrl: `${window.location.origin}/teacher/pricing?canceled=true`,
        },
      });

      if (error) throw error;
      if (data?.url) {
        trackEvent("checkout_started", { plan });
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast({ title: "Checkout failed", description: err.message, variant: "destructive" });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    if (!subscription?.stripe_customer_id) return;
    try {
      const { data, error } = await supabase.functions.invoke("stripe-portal", {
        body: { returnUrl: `${window.location.origin}/teacher/pricing` },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (roleLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  const isPastDue = subscription?.status === "past_due";
  const usagePercent = quota ? Math.round((quota.lessonsUsed / quota.lessonsLimit) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/teacher")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Pricing</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-12">
        {/* Payment failure banner */}
        {isPastDue && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-destructive">Payment failed</p>
                <p className="text-sm text-muted-foreground">
                  Your last payment didn't go through. Lesson creation is paused until this is resolved.
                </p>
              </div>
              {subscription?.stripe_customer_id && (
                <Button variant="destructive" size="sm" onClick={handleManageSubscription}>
                  Update Payment
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Current subscription summary */}
        {isActivePaid && quota && !quotaLoading && (
          <Card>
            <CardContent className="py-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Plan</p>
                  <p className="text-lg font-semibold text-foreground capitalize">
                    {currentPlan} — ${currentPlan === "pro" ? 19 : 39}/month
                  </p>
                </div>
                {subscription?.current_period_end && (
                  <div className="text-right flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="h-4 w-4" />
                    Next billing: {new Date(subscription.current_period_end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Lessons this month</span>
                  <span className="font-medium text-foreground">{quota.lessonsUsed} / {quota.lessonsLimit}</span>
                </div>
                <Progress value={usagePercent} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trial summary */}
        {isTrialing && quota && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Plan</p>
                  <p className="text-lg font-semibold text-foreground">
                    🎉 Free Trial — {quota.trialDaysRemaining} day{quota.trialDaysRemaining !== 1 ? "s" : ""} remaining
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Lessons this month</span>
                  <span className="font-medium text-foreground">{quota.lessonsUsed} / {quota.lessonsLimit}</span>
                </div>
                <Progress value={usagePercent} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Hero */}
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-foreground">Choose Your Plan</h2>
          <p className="text-muted-foreground text-lg">Start with a 14-day free trial. No credit card required.</p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {tiers.map((tier) => {
            const isCurrent = currentPlan === tier.id;
            const Icon = tier.icon;
            return (
              <Card
                key={tier.id}
                className={`relative flex flex-col ${tier.recommended ? "border-primary shadow-lg ring-2 ring-primary/20" : ""}`}
              >
                {tier.recommended && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                    RECOMMENDED
                  </Badge>
                )}
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{tier.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{tier.description}</p>
                  <div className="pt-2">
                    <span className="text-4xl font-bold text-foreground">${tier.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-2 mb-6 flex-1">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span className="text-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full" disabled>
                        Current Plan
                      </Button>
                      {subscription?.stripe_customer_id && (
                        <Button variant="ghost" size="sm" className="w-full" onClick={handleManageSubscription}>
                          Manage Subscription
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 text-center">
                      <Button
                        className="w-full"
                        size="lg"
                        onClick={() => handleCheckout(tier.id as "pro" | "premium")}
                        disabled={!!checkoutLoading}
                      >
                        {checkoutLoading === tier.id ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
                        ) : isTrialing || currentPlan === "free" || !isActivePaid ? (
                          `Start 14-Day Free Trial`
                        ) : (
                          `Upgrade to ${tier.name}`
                        )}
                      </Button>
                      {(isTrialing || !isActivePaid) && (
                        <p className="text-xs text-muted-foreground">{tier.trialText}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Comparison Table */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-foreground text-center">Compare Plans</h3>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Feature</TableHead>
                  <TableHead className="text-center">Pro</TableHead>
                  <TableHead className="text-center">Premium</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisonRows.map((row) => (
                  <TableRow key={row.feature}>
                    <TableCell className="font-medium text-foreground">{row.feature}</TableCell>
                    {(["pro", "premium"] as const).map((plan) => (
                      <TableCell key={plan} className="text-center">
                        <span className="text-sm text-foreground">{row[plan]}</span>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>

        <Separator />

        {/* FAQ */}
        <div className="space-y-4 max-w-2xl mx-auto">
          <h3 className="text-xl font-bold text-foreground text-center">Frequently Asked Questions</h3>
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </main>
    </div>
  );
}
