import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { trackEvent } from "@/lib/analytics";

const SUPABASE_URL = "https://fezpzihnvblzjrdzgioq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlenB6aWhudmJsempyZHpnaW9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODExNjksImV4cCI6MjA3MTk1NzE2OX0.LKxauwcMH0HaT-DeoBNG5mH7rneI8OiyfSQGrYG1R4M";

interface PromoCodeInputProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

export function PromoCodeInput({ onSuccess, onCancel, className }: PromoCodeInputProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState("");

  const handleRedeem = async () => {
    if (!user?.id) {
      toast.error("Please sign in to redeem a promo code");
      navigate("/auth");
      return;
    }

    if (!code.trim()) {
      toast.error("Please enter a promo code");
      return;
    }

    setLoading(true);
    setStatus('idle');
    setMessage("");

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error("Session expired. Please sign in again.");
        navigate("/auth");
        return;
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/redeem-promo-code`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ code: code.trim().toUpperCase() }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus('success');
        setMessage(data.message || "Promo code redeemed successfully!");
        toast.success(data.message || "Promo code redeemed successfully!");
        trackEvent('promo_code_redeemed', {
          timestamp: new Date().toISOString()
        });
        onSuccess?.();
      } else {
        setStatus('error');
        const errorMsg = data.message || data.error || 'Invalid promo code. Please try again.';
        setMessage(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('Error redeeming promo code:', error);
      setStatus('error');
      const errorMsg = 'Network error. Please check your connection and try again.';
      setMessage(errorMsg);
      toast.error(errorMsg);
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
