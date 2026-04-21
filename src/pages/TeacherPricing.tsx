import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useTeacherQuota } from "@/hooks/useTeacherQuota";
import { trackEvent, trackPageView, trackTeacherFunnelStep } from "@/lib/analytics";
import { canAccessSection } from "@/lib/accessControl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Check, Crown, Building2, Loader2, AlertTriangle, CalendarDays, XCircle } from "lucide-react";
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
  { feature: "Lessons/month", pro: "30", premium: "100" },
  { feature: "Max video length", pro: "10 min", premium: "15 min" },
  { feature: "Lesson types", pro: "All 3", premium: "All 3" },
  { feature: "Student progress tracking", pro: "✓", premium: "✓" },
  { feature: "Basic analytics", pro: "✓", premium: "✓" },
  { feature: "Advanced analytics", pro: "—", premium: "✓" },
  { feature: "Email notifications", pro: "—", premium: "✓" },
  { feature: "Support", pro: "Email", premium: "Priority" },
];

const faqItems = [
  {
    q: "How does the 14-day free trial work?",
    a: "Sign up and get 14 days to create up to 30 lessons. No credit card required. After 14 days, choose Pro or Premium to continue. Your lessons stay active even if you don't upgrade immediately.",
  },
  {
    q: "Do I need to enter my credit card for the trial?",
    a: "No! The trial is completely free with no credit card required. You only add payment details if you decide to continue after 14 days.",
  },
  {
    q: 'What counts as a "lesson"?',
    a: "Each custom lesson you create (YouTube, Paragraph, or Speaking). Assigning library videos to students does NOT count toward your limit.",
  },
  {
    q: "What happens after my trial ends?",
    a: "You can upgrade to Pro ($19/month) or Premium ($39/month). Your existing lessons stay active, but you can't create new ones until you upgrade.",
  },
  {
    q: "Can I switch between Pro and Premium?",
    a: "Yes! Upgrade or downgrade anytime. Changes take effect at the end of your current billing period.",
  },
  {
    q: "What if I hit my lesson limit mid-month?",
    a: "You can upgrade to Premium for more lessons (100/month). Or wait until next month when your limit resets.",
  },
  {
    q: "Do my students need to pay?",
    a: "No. Students access all assigned lessons completely free.",
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
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    if (roleLoading) return;
    if (!canAccessSection("teacher", role, user?.email)) { navigate("/app"); return; }
  }, [role, roleLoading, navigate, user]);

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
        trackTeacherFunnelStep("checkout_started", {
          source: "teacher_pricing",
          plan,
        });
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

  const handleCancelSubscription = async (immediate: boolean) => {
    setCancelLoading(true);
    trackEvent("teacher_subscription_cancel_clicked", { immediate });
    try {
      const { data, error } = await supabase.functions.invoke("teacher-cancel-subscription", {
        body: { immediate },
      });
      if (error) throw error;

      if (immediate) {
        toast({
          title: "Subscription canceled",
          description: "Your subscription has been canceled. You're now on the free plan.",
        });
      } else {
        const endDate = data?.current_period_end
          ? new Date(data.current_period_end * 1000).toLocaleDateString()
          : "the end of your billing period";
        toast({
          title: "Cancellation scheduled",
          description: `Your subscription will end on ${endDate}. You can keep using all features until then.`,
        });
      }

      // Refresh subscription
      const { data: refreshed } = await supabase
        .from("teacher_subscriptions" as any)
        .select("plan, status, stripe_customer_id, current_period_end, trial_ends_at")
        .eq("teacher_id", user!.id)
        .maybeSingle();
      setSubscription(refreshed as unknown as TeacherSub | null);
    } catch (err: any) {
      toast({ title: "Cancellation failed", description: err.message, variant: "destructive" });
    } finally {
      setCancelLoading(false);
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
              {subscription?.status === "canceling" ? (
                <div className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                  Your subscription is scheduled to cancel
                  {subscription.current_period_end && (
                    <> on <strong className="text-foreground">{new Date(subscription.current_period_end).toLocaleDateString()}</strong></>
                  )}
                  . You can keep using all features until then.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  {subscription?.stripe_customer_id && (
                    <Button variant="outline" size="sm" onClick={handleManageSubscription}>
                      Manage Billing
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        <XCircle className="h-4 w-4 mr-1" />
                        Cancel Subscription
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
                        <AlertDialogDescription>
                          You'll keep access to all {currentPlan} features until{" "}
                          <strong>
                            {subscription?.current_period_end
                              ? new Date(subscription.current_period_end).toLocaleDateString()
                              : "the end of your billing period"}
                          </strong>
                          . After that, your account will revert to the free plan and you won't be able to create new lessons. Existing lessons stay active.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={cancelLoading}>Keep Subscription</AlertDialogCancel>
                        <AlertDialogAction
                          disabled={cancelLoading}
                          onClick={() => handleCancelSubscription(false)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {cancelLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Cancel at period end
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
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
                    MOST POPULAR
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

        {/* Value Comparison */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-8 space-y-6">
            <h3 className="text-2xl font-bold text-foreground text-center">
              Why ListenFlow Saves You Money
            </h3>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold text-foreground mb-2">Creating homework manually:</h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li>⏱️ 5 hours/week × $20/hour = <strong className="text-foreground">$100/week</strong></li>
                  <li>📝 Finding videos, writing questions, formatting</li>
                  <li>😓 Students don't complete it anyway</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">With ListenFlow Pro:</h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li>✅ $19/month = <strong className="text-foreground">$4.75/week</strong></li>
                  <li>🚀 2 minutes to create each lesson</li>
                  <li>📊 Students complete 3x more (tracked!)</li>
                </ul>
              </div>
            </div>
            <div className="text-center">
              <div className="inline-block rounded-lg bg-green-100 dark:bg-green-900/30 px-6 py-3">
                <p className="text-lg font-bold text-green-900 dark:text-green-100">
                  Save $95/week = $380/month 💰
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Even if you value your time at just $20/hour
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

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
