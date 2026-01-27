import { Check, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Feature {
  name: string;
  free: string | boolean;
  premium: string | boolean;
}

const features: Feature[] = [
  { name: "Curated Video Library", free: true, premium: true },
  { name: "Community Videos", free: true, premium: true },
  { name: "Quiz Exercises", free: true, premium: true },
  { name: "Flashcards", free: true, premium: true },
  { name: "Personal Video Uploads", free: "2/month", premium: "10/month" },
  { name: "Max Video Length", free: "10 min", premium: "15 min" },
  { name: "Vocal Practice", free: "5/month", premium: "Unlimited" },
  { name: "PDF Export", free: false, premium: true },
  { name: "Transcript Download", free: false, premium: true },
  { name: "Ad-Free Experience", free: false, premium: true },
];

function FeatureValue({ value }: { value: string | boolean }) {
  if (typeof value === 'boolean') {
    return value ? (
      <Check className="h-5 w-5 text-green-500 mx-auto" />
    ) : (
      <X className="h-5 w-5 text-muted-foreground mx-auto" />
    );
  }
  return <span className="text-sm">{value}</span>;
}

export function ComparisonTable() {
  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[50%]">Feature</TableHead>
            <TableHead className="text-center">Free</TableHead>
            <TableHead className="text-center bg-primary/5">Premium</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {features.map((feature, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{feature.name}</TableCell>
              <TableCell className="text-center">
                <FeatureValue value={feature.free} />
              </TableCell>
              <TableCell className="text-center bg-primary/5">
                <FeatureValue value={feature.premium} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
