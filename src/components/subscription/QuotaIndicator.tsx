import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface QuotaIndicatorProps {
  used: number;
  limit: number;
  label: string;
  showUpgradeHint?: boolean;
  className?: string;
}

export function QuotaIndicator({ 
  used, 
  limit, 
  label, 
  showUpgradeHint = false,
  className 
}: QuotaIndicatorProps) {
  // Handle unlimited case
  if (limit === -1) {
    return null;
  }

  const percentage = Math.min((used / limit) * 100, 100);
  const isNearLimit = percentage >= 80;
  const isAtLimit = used >= limit;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn(
          "font-medium",
          isAtLimit && "text-destructive",
          isNearLimit && !isAtLimit && "text-yellow-600 dark:text-yellow-500"
        )}>
          {used}/{limit}
        </span>
      </div>
      <Progress 
        value={percentage} 
        className={cn(
          "h-2",
          isAtLimit && "[&>div]:bg-destructive",
          isNearLimit && !isAtLimit && "[&>div]:bg-yellow-500"
        )}
      />
      {showUpgradeHint && isAtLimit && (
        <p className="text-xs text-muted-foreground">
          Upgrade to Premium for more
        </p>
      )}
    </div>
  );
}
