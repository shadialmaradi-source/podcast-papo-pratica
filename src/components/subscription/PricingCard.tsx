import { LucideIcon } from "lucide-react";

interface PricingCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function PricingCard({ icon: Icon, title, description }: PricingCardProps) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border bg-card">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}
