import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export type ContentItem = {
  title: string;
  assigned: number;
  completed: number;
  completionRate: number;
};

export function ContentPerformance({ items }: { items: ContentItem[] }) {
  const sorted = [...items].sort((a, b) => b.completionRate - a.completionRate);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Top Performing Content
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No content data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lesson</TableHead>
                  <TableHead className="text-center">Assigned</TableHead>
                  <TableHead className="text-center">Completed</TableHead>
                  <TableHead className="w-[200px]">Completion Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.slice(0, 10).map((item, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-foreground">{item.title}</TableCell>
                    <TableCell className="text-center">{item.assigned}</TableCell>
                    <TableCell className="text-center">{item.completed}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={item.completionRate} className="h-2 flex-1" />
                        <span className="text-sm text-muted-foreground w-10 text-right">{item.completionRate}%</span>
                      </div>
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
