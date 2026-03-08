import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users } from "lucide-react";

export type CohortRow = {
  label: string;
  totalStudents: number;
  activeStudents: number;
  retentionRate: number;
};

export function CohortAnalysis({ byMonth, byLevel }: { byMonth: CohortRow[]; byLevel: CohortRow[] }) {
  const renderTable = (rows: CohortRow[], title: string) => (
    <div>
      <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
      {rows.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">No data.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cohort</TableHead>
              <TableHead className="text-center">Students</TableHead>
              <TableHead className="text-center">Active</TableHead>
              <TableHead className="text-center">Retention</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium text-foreground">{r.label}</TableCell>
                <TableCell className="text-center">{r.totalStudents}</TableCell>
                <TableCell className="text-center">{r.activeStudents}</TableCell>
                <TableCell className="text-center">{r.retentionRate}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Cohort Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderTable(byMonth, "By Enrollment Month")}
        {renderTable(byLevel, "By Level")}
      </CardContent>
    </Card>
  );
}
