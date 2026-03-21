import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CommunityVideoBrowser, type CommunityVideoSelection } from "@/components/teacher/CommunityVideoBrowser";
import { AssignVideoModal } from "@/components/teacher/AssignVideoModal";

interface VideoBrowserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentEmail: string;
  onAssigned?: () => void;
}

interface SelectedVideo {
  videoId: string;
  title: string;
}

export function VideoBrowserModal({ open, onOpenChange, studentEmail, onAssigned }: VideoBrowserModalProps) {
  const [selectedVideo, setSelectedVideo] = useState<SelectedVideo | null>(null);

  const handleSelectVideo = (selection: CommunityVideoSelection) => {
    const match = selection.url.match(/[?&]v=([^&]+)/);
    const videoId = match ? match[1] : "";
    setSelectedVideo({ videoId, title: selection.title });
  };

  const handleClose = () => {
    setSelectedVideo(null);
    onOpenChange(false);
  };

  if (selectedVideo) {
    return (
      <AssignVideoModal
        open={true}
        onOpenChange={(o) => {
          if (!o) {
            setSelectedVideo(null);
            onOpenChange(false);
          }
        }}
        videoTitle={selectedVideo.title}
        videoId={selectedVideo.videoId}
        preselectedStudentEmail={studentEmail}
        onAssigned={() => {
          setSelectedVideo(null);
          onOpenChange(false);
          onAssigned?.();
        }}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose a Video to Assign</DialogTitle>
        </DialogHeader>
        <CommunityVideoBrowser onSelectVideo={handleSelectVideo} />
      </DialogContent>
    </Dialog>
  );
}