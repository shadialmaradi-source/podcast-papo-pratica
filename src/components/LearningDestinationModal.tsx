import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Headphones, Play, Youtube } from "lucide-react";

interface LearningDestinationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDestinationSelect: (destination: 'podcasts' | 'youtube') => void;
  selectedLanguage: string;
}

export const LearningDestinationModal = ({ 
  isOpen, 
  onClose, 
  onDestinationSelect,
  selectedLanguage 
}: LearningDestinationModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            Where do you want to go?
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
          <Card 
            className="cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg border-2 hover:border-primary/50"
            onClick={() => onDestinationSelect('podcasts')}
          >
            <CardHeader className="text-center pb-4">
              <div className="p-4 bg-primary/10 rounded-xl mx-auto w-fit">
                <Headphones className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-xl">Podcast Learning</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <CardDescription className="mb-4">
                Learn through podcasts with interactive exercises
              </CardDescription>
              <Button className="w-full">
                <Play className="h-4 w-4 mr-2" />
                Listen & Practice
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg border-2 hover:border-red-500/50"
            onClick={() => onDestinationSelect('youtube')}
          >
            <CardHeader className="text-center pb-4">
              <div className="p-4 bg-red-500/10 rounded-xl mx-auto w-fit">
                <Play className="h-8 w-8 text-red-500" />
              </div>
              <CardTitle className="text-xl">YouTube Videos</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <CardDescription className="mb-4">
                Practice with YouTube content and exercises
              </CardDescription>
              <Button variant="outline" className="w-full">
                <Youtube className="h-4 w-4 mr-2" />
                Watch & Learn
              </Button>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};