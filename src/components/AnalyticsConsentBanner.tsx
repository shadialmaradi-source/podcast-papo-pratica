import { Button } from "@/components/ui/button";
import { getAnalyticsConsent, setAnalyticsConsent } from "@/lib/analytics";

interface AnalyticsConsentBannerProps {
  onConsentUpdated: () => void;
}

export function AnalyticsConsentBanner({ onConsentUpdated }: AnalyticsConsentBannerProps) {
  const consent = getAnalyticsConsent();

  if (consent) return null;

  const handleChoice = (choice: "accepted" | "rejected") => {
    setAnalyticsConsent(choice);
    onConsentUpdated();
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] rounded-xl border bg-background/95 p-4 shadow-lg backdrop-blur md:left-auto md:max-w-md">
      <p className="text-sm text-foreground">
        We use optional analytics cookies to improve the product.
      </p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={() => handleChoice("accepted")}>Accept</Button>
        <Button size="sm" variant="outline" onClick={() => handleChoice("rejected")}>Reject</Button>
      </div>
    </div>
  );
}
