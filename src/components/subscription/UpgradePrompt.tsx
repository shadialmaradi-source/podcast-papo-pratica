import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PromoCodeInput } from "./PromoCodeInput";
import { format } from "date-fns";

interface UpgradePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  quotaUsed?: number;
  quotaLimit?: number;
  resetDate?: Date;
  onSkip?: () => void;
  skipLabel?: string;
}

export function UpgradePrompt({
  open,
  onOpenChange,
  title,
  description,
  quotaUsed,
  quotaLimit,
  resetDate,
  onSkip,
  skipLabel = "Skip",
}: UpgradePromptProps) {
  const navigate = useNavigate();
  const [showPromoInput, setShowPromoInput] = useState(false);

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate('/premium');
  };

  const handlePromoSuccess = () => {
    onOpenChange(false);
    // Refresh the page to get new subscription status
    window.location.reload();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {quotaUsed !== undefined && quotaLimit !== undefined && (
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-sm text-muted-foreground">
                You've used <span className="font-semibold text-foreground">{quotaUsed}/{quotaLimit}</span> this month
              </p>
            </div>
          )}

          <Button 
            onClick={handleUpgrade} 
            className="w-full gap-2"
            size="lg"
          >
            <Sparkles className="h-4 w-4" />
            Upgrade to Premium
          </Button>

          {onSkip && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <Button 
                variant="outline" 
                onClick={() => {
                  onOpenChange(false);
                  onSkip();
                }}
                className="w-full"
              >
                {skipLabel}
              </Button>
            </>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          {showPromoInput ? (
            <PromoCodeInput 
              onSuccess={handlePromoSuccess}
              onCancel={() => setShowPromoInput(false)}
            />
          ) : (
            <Button 
              variant="ghost" 
              onClick={() => setShowPromoInput(true)}
              className="w-full text-muted-foreground"
              size="sm"
            >
              Have a promo code?
            </Button>
          )}

          {resetDate && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>Resets: {format(resetDate, 'MMMM d, yyyy')}</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
