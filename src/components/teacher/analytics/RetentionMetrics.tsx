import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ShieldCheck } from "lucide-react";

type RetentionData = {
  week1: { active: number; total: number; rate: number };
  week2: { active: number; total: number; rate: number };
  week4: { active: number; total: number; rate: number };
  month1: { active: number; total: number; rate: number };
  curve: { week: string; retention: number }[];
};

export function RetentionMetrics({ data }: { data: RetentionData }) {
  const metrics = [
    { label: "Week 1", ...data.week1 },
    { label: "Week 2", ...data.week2 },
    { label: "Week 4", ...data.week4 },
    { label: "Month 1", ...data.month1 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Student Retention
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metrics.map((m) => (
            <div key={m.label} className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-foreground">{m.rate}%</p>
              <p className="text-sm text-muted-foreground">{m.label} Retention</p>
              <p className="text-xs text-muted-foreground">
                {m.active}/{m.total} students
              </p>
            </div>
          ))}
        </div>

        {data.curve.length > 0 ? (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Cohort Retention Curve</p>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.curve}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" domain={[0, 100]} unit="%" />
                <Tooltip formatter={(v: number) => [`${v}%`, "Retention"]} />
                <Line type="monotone" dataKey="retention" stroke="hsl(var(--primary))" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">Not enough data for retention curve yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
