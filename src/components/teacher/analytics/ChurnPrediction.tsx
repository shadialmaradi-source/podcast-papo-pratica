import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export type ChurnStudent = {
  id: string;
  student_name: string | null;
  student_email: string;
  riskScore: number;
  riskLevel: "high" | "medium" | "low";
  lastActive: string | null;
  completionRate: number;
};

const riskEmoji = { high: "🔴", medium: "🟡", low: "🟢" };
const riskLabel = { high: "High Risk", medium: "Medium Risk", low: "Low Risk" };

function formatLastActive(date: string | null) {
  if (!date) return "Never";
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === 1) return "1 day ago";
  return `${diff} days ago`;
}

export function ChurnPrediction({ students }: { students: ChurnStudent[] }) {
  const navigate = useNavigate();
  const sorted = [...students].sort((a, b) => b.riskScore - a.riskScore);

  return (
    <Card className="border-destructive/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Churn Prediction ({students.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">All students are healthy! 🎉</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-center">Risk</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className="text-center">Completion</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <p className="font-medium text-foreground">{s.student_name || s.student_email}</p>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-mono font-bold">
                        {riskEmoji[s.riskLevel]} {s.riskScore}
                      </span>
                      <p className="text-xs text-muted-foreground">{riskLabel[s.riskLevel]}</p>
                    </TableCell>
                    <TableCell>{formatLastActive(s.lastActive)}</TableCell>
                    <TableCell className="text-center">{s.completionRate}%</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/teacher/student/${s.id}`)}>
                        View Detail
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
