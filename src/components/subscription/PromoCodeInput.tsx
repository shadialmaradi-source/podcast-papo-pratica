import { useState } from "react";
import { Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { trackEvent } from "@/lib/analytics";

interface PromoCodeInputProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

export function PromoCodeInput({ onSuccess, onCancel, className }: PromoCodeInputProps) {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState("");

  const handleRedeem = async () => {
    if (!code.trim() || !user?.id) {
      toast.error("Please enter a promo code");
      return;
    }

    setLoading(true);
    setStatus('idle');
    setMessage("");

    try {
      const { data, error } = await supabase.functions.invoke('redeem-promo-code', {
        body: { code: code.trim().toUpperCase() },
      });

      if (error) throw error;

      if (data.success) {
        setStatus('success');
        setMessage(data.message);
        toast.success(data.message);
        trackEvent('promo_code_redeemed', {
          timestamp: new Date().toISOString()
        });
        onSuccess?.();
      } else {
        setStatus('error');
        setMessage(data.message);
        toast.error(data.message);
      }
    } catch (error) {
      console.error('Error redeeming promo code:', error);
      setStatus('error');
      setMessage('Failed to redeem code. Please try again.');
      toast.error('Failed to redeem code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <div className="flex gap-2">
        <Input
          placeholder="Enter promo code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          disabled={loading || status === 'success'}
          className="uppercase"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleRedeem();
            }
          }}
        />
        <Button 
          onClick={handleRedeem} 
          disabled={loading || !code.trim() || status === 'success'}
          size="default"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : status === 'success' ? (
            <Check className="h-4 w-4" />
          ) : (
            'Redeem'
          )}
        </Button>
        {onCancel && (
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onCancel}
            disabled={loading}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {message && (
        <p className={`text-sm mt-2 ${status === 'success' ? 'text-green-600' : 'text-destructive'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
