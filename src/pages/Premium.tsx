import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Sparkles, 
  Video, 
  Mic, 
  BookOpen, 
  Download, 
  Ban,
  ArrowLeft,
  Check,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PricingCard } from "@/components/subscription/PricingCard";
import { ComparisonTable } from "@/components/subscription/ComparisonTable";
import { PromoCodeInput } from "@/components/subscription/PromoCodeInput";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";

export default function Premium() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Track page view
  useEffect(() => {
    trackEvent('premium_viewed', {
      source: searchParams.get('source') || 'direct',
      timestamp: new Date().toISOString()
    });
  }, [searchParams]);

  // Track successful payment from redirect
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      trackEvent('payment_completed', {
        plan_type: 'monthly',
        amount: 9.99,
        currency: 'USD',
        timestamp: new Date().toISOString()
      });
      toast.success("Welcome to Premium! Your subscription is now active.");
    }
  }, [searchParams]);

  const handleUpgrade = async () => {
    if (!user) {
      toast.error("Please sign in to upgrade");
      navigate("/auth");
      return;
    }

    setLoading(true);
    
    trackEvent('payment_initiated', {
      plan_type: 'monthly',
      price: 9.99,
      timestamp: new Date().toISOString()
    });

    try {
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          successUrl: `${window.location.origin}/premium?success=true`,
          cancelUrl: `${window.location.origin}/premium?cancelled=true`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error('Unable to start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePromoSuccess = () => {
    toast.success("Premium access activated!");
    navigate("/app");
  };

  const benefits = [
    {
      icon: Video,
      title: "10 Video Uploads/Month",
      description: "Upload up to 10 personal YouTube videos, up to 15 minutes each"
    },
    {
      icon: Mic,
      title: "Unlimited Vocal Practice",
      description: "No monthly limits on speaking exercises with AI feedback"
    },
    {
      icon: BookOpen,
      title: "Complete Library Access",
      description: "Access all curated and community content, updated weekly"
    },
    {
      icon: Download,
      title: "Export & Download",
      description: "Export flashcards to PDF and download video transcripts"
    },
    {
      icon: Ban,
      title: "Ad-Free Experience",
      description: "Learn without interruptions or distractions"
    },
    {
      icon: Shield,
      title: "Priority Support",
      description: "Get help faster when you need it"
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold ml-2">Upgrade to Premium</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-8"
        >
          {/* Hero */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              Premium
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              Unlock Unlimited Learning
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Remove all limits and supercharge your language learning journey
            </p>
          </div>

          {/* Pricing Card */}
          <Card className="border-2 border-primary bg-gradient-to-br from-primary/5 to-background">
            <CardContent className="p-6 md:p-8 text-center space-y-4">
              <div className="space-y-1">
                <p className="text-4xl font-bold text-foreground">
                  $9.99
                  <span className="text-lg font-normal text-muted-foreground">/month</span>
                </p>
                <p className="text-sm text-muted-foreground">Billed monthly. Cancel anytime.</p>
              </div>
              
              <Button 
                size="lg" 
                className="w-full max-w-xs gap-2"
                onClick={handleUpgrade}
                disabled={loading}
              >
                {loading ? (
                  "Loading..."
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Get Premium Now
                  </>
                )}
              </Button>

              <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Check className="h-4 w-4 text-green-500" />
                  Cancel anytime
                </span>
                <span className="flex items-center gap-1">
                  <Shield className="h-4 w-4 text-green-500" />
                  Secure payment
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Benefits Grid */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground text-center">
              What's Included
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <PricingCard
                  key={index}
                  icon={benefit.icon}
                  title={benefit.title}
                  description={benefit.description}
                />
              ))}
            </div>
          </div>

          {/* Promo Code Section */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-foreground text-center">
                Have a Promo Code?
              </h3>
              <div className="max-w-md mx-auto">
                <PromoCodeInput onSuccess={handlePromoSuccess} />
              </div>
            </CardContent>
          </Card>

          {/* Comparison Table */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground text-center">
              Free vs Premium
            </h2>
            <ComparisonTable />
          </div>

          {/* Final CTA */}
          <div className="text-center py-8">
            <Button 
              size="lg" 
              className="gap-2"
              onClick={handleUpgrade}
              disabled={loading}
            >
              <Sparkles className="h-4 w-4" />
              Upgrade to Premium — $9.99/month
            </Button>
            <p className="text-sm text-muted-foreground mt-3">
              Questions? <a href="mailto:support@listenflow.app" className="text-primary hover:underline">Contact Support</a>
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
