import { useState } from "react";
import { Download, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UpgradePrompt } from "./UpgradePrompt";
import { getFlashcardsForExport } from "@/services/flashcardService";
import { generateFlashcardPDF } from "@/services/pdfGeneratorService";
import { toast } from "sonner";

interface PdfDownloadButtonProps {
  userId: string;
  isPremium: boolean;
  flashcardCount: number;
  username: string;
  language: string;
}

export function PdfDownloadButton({
  userId,
  isPremium,
  flashcardCount,
  username,
  language,
}: PdfDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const handleClick = async () => {
    // If not premium, show upgrade prompt
    if (!isPremium) {
      setShowUpgradePrompt(true);
      return;
    }

    // If no flashcards, don't proceed
    if (flashcardCount === 0) {
      toast.error("You don't have any flashcards yet. Complete a lesson first!");
      return;
    }

    // Generate PDF
    setIsGenerating(true);
    try {
      const flashcards = await getFlashcardsForExport(userId);
      
      if (flashcards.length === 0) {
        toast.error("No flashcards found. Complete a lesson to build your collection!");
        return;
      }

      await generateFlashcardPDF(flashcards, { username, language });
      toast.success("Your flashcards PDF has been downloaded!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Disabled state - no flashcards
  if (flashcardCount === 0) {
    return (
      <Button
        variant="outline"
        disabled
        className="gap-2 opacity-50"
      >
        <Download className="h-4 w-4" />
        Download PDF
      </Button>
    );
  }

  // Free user - locked state
  if (!isPremium) {
    return (
      <>
        <Button
          variant="outline"
          onClick={handleClick}
          className="gap-2 relative"
        >
          <Download className="h-4 w-4" />
          Download PDF
          <Lock className="h-3 w-3 ml-1 text-muted-foreground" />
        </Button>

        <UpgradePrompt
          open={showUpgradePrompt}
          onOpenChange={setShowUpgradePrompt}
          title="Upgrade to Premium"
          description="Download your flashcards as printable PDFs and unlock all premium features."
        />
      </>
    );
  }

  // Premium user - enabled state
  return (
    <Button
      onClick={handleClick}
      disabled={isGenerating}
      className="gap-2"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating PDF...
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          Download PDF
        </>
      )}
    </Button>
  );
}
