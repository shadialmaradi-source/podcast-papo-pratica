import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Activity } from "lucide-react";

type EngagementData = {
  avgLessonsPerWeek: number;
  mostActiveDay: string;
  weeklyActivity: { week: string; responses: number }[];
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function EngagementMetrics({ data }: { data: EngagementData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Student Engagement
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold text-foreground">{data.avgLessonsPerWeek.toFixed(1)}</p>
            <p className="text-sm text-muted-foreground">Avg completions/week</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold text-foreground">{data.mostActiveDay || "N/A"}</p>
            <p className="text-sm text-muted-foreground">Most active day</p>
          </div>
        </div>

        {data.weeklyActivity.length > 0 ? (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Engagement Over Time</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.weeklyActivity}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <Tooltip />
                <Bar dataKey="responses" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">No engagement data yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
