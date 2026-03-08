import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { trackEvent, trackPageView } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Check, X, Crown, Zap, Building2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface TeacherSub {
  plan: string;
  status: string;
  stripe_customer_id: string | null;
}

const tiers = [
  {
    id: "free",
    name: "Free",
    price: 0,
    description: "Get started with the basics",
    icon: Zap,
    features: [
      "3 students max",
      "10 lessons/month",
      "Videos up to 5 min",
      "All lesson types",
      "Basic analytics",
      "ListenFlow branding",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 19,
    description: "Everything you need to teach effectively",
    icon: Crown,
    recommended: true,
    features: [
      "Unlimited students",
      "60 lessons/month",
      "Videos up to 10 min",
      "Advanced analytics",
      "Priority support",
      "Remove branding",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: 39,
    description: "For schools and professional teachers",
    icon: Building2,
    features: [
      "Everything in Pro",
      "160 lessons/month",
      "Videos up to 15 min",
      "White-label (your branding)",
      "API access",
      "Dedicated support",
    ],
  },
];

const comparisonRows = [
  { feature: "Students", free: "3", pro: "Unlimited", premium: "Unlimited" },
  { feature: "Lessons/month", free: "10", pro: "60", premium: "160" },
  { feature: "Max video length", free: "5 min", pro: "10 min", premium: "15 min" },
  { feature: "Lesson types", free: "All", pro: "All", premium: "All" },
  { feature: "Analytics", free: "Basic", pro: "Advanced", premium: "Advanced" },
  { feature: "Branding", free: "ListenFlow", pro: "Removable", premium: "Your Brand" },
  { feature: "Support", free: "Email", pro: "Priority", premium: "Dedicated" },
  { feature: "API Access", free: false, pro: false, premium: true },
];

const faqItems = [
  {
    q: "Can I cancel anytime?",
    a: "Yes! There are no long-term contracts. You can cancel your subscription at any time and it will remain active until the end of your billing period.",
  },
  {
    q: "What happens to my students if I downgrade?",
    a: "Your students keep their access to existing lessons. However, on the Free plan you can only actively manage up to 3 students. You won't be able to add new students until you're under the limit.",
  },
  {
    q: "Do students need to pay?",
    a: "No! Student access is included in your plan. They can complete all assigned lessons for free.",
  },
  {
    q: "Can I switch plans later?",
    a: "Absolutely. You can upgrade or downgrade at any time. When upgrading, you'll be charged the prorated difference.",
  },
  {
    q: "What are the lesson limits?",
    a: "Each plan has a monthly lesson creation limit that resets at the start of each month. Free: 10 lessons, Pro: 60 lessons, Premium: 160 lessons. Video duration limits also apply to prevent excessive transcription costs.",
  },
];

export default function TeacherPricing() {
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
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
      .select("plan, status, stripe_customer_id")
      .eq("teacher_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setSubscription(data as unknown as TeacherSub | null);
        setLoading(false);
      });
  }, [user]);

  const currentPlan = subscription?.plan || "free";

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
        {/* Hero */}
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-foreground">Choose Your Plan</h2>
          <p className="text-muted-foreground text-lg">Start free, upgrade anytime. No credit card required.</p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  ) : tier.id === "free" ? (
                    <Button variant="outline" className="w-full" disabled={currentPlan !== "free"}>
                      {currentPlan === "free" ? "Current Plan" : "Downgrade via Portal"}
                    </Button>
                  ) : tier.id === "premium" ? (
                    <div className="space-y-2">
                      <Button
                        className="w-full"
                        onClick={() => handleCheckout("premium")}
                        disabled={!!checkoutLoading}
                      >
                        {checkoutLoading === "premium" ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
                        ) : (
                          "Upgrade to Premium"
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => window.open("mailto:support@listenflow.app?subject=Premium Plan Inquiry", "_blank")}
                      >
                        Contact Sales
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => handleCheckout("pro")}
                      disabled={!!checkoutLoading}
                    >
                      {checkoutLoading === "pro" ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
                      ) : (
                        "Upgrade to Pro"
                      )}
                    </Button>
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
                  <TableHead className="text-center">Free</TableHead>
                  <TableHead className="text-center">Pro</TableHead>
                  <TableHead className="text-center">Premium</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisonRows.map((row) => (
                  <TableRow key={row.feature}>
                    <TableCell className="font-medium text-foreground">{row.feature}</TableCell>
                    {(["free", "pro", "premium"] as const).map((plan) => (
                      <TableCell key={plan} className="text-center">
                        {typeof row[plan] === "boolean" ? (
                          row[plan] ? (
                            <Check className="h-4 w-4 text-primary mx-auto" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground mx-auto" />
                          )
                        ) : (
                          <span className="text-sm text-foreground">{row[plan]}</span>
                        )}
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
