import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, X, Clock, BookOpen } from "lucide-react";
import type { ScheduleSlot } from "@/types/attendance";

interface PostClassPromptProps {
  slot: ScheduleSlot | null;
  onResponse: (present: boolean) => void;
  onClose: () => void;
}

export function PostClassPrompt({ slot, onResponse, onClose }: PostClassPromptProps) {
  if (!slot) return null;

  return (
    <Dialog open={!!slot} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px] border-primary/20 bg-card/95 backdrop-blur shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest mb-2">
            <Clock className="h-3 w-3" />
            Class Ended
          </div>
          <DialogTitle className="text-2xl font-black leading-tight">
            Did you attend {slot.subjectName}?
          </DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
            <BookOpen className="h-3.5 w-3.5" />
            <span>{slot.subjectCode}</span>
            <span>•</span>
            <span>{slot.startTime} - {slot.endTime}</span>
          </div>
        </DialogHeader>

        <div className="py-6">
          <p className="text-sm text-muted-foreground">
            The scheduled time for this class has passed. Update your attendance now to keep your analytics accurate!
          </p>
        </div>

        <DialogFooter className="flex-row gap-3 sm:justify-center">
          <Button
            variant="outline"
            className="flex-1 gap-2 border-destructive text-destructive hover:bg-destructive hover:text-white transition-all h-12"
            onClick={() => onResponse(false)}
          >
            <X className="h-4 w-4" />
            Missed
          </Button>
          <Button
            variant="default"
            className="flex-1 gap-2 h-12 shadow-md shadow-primary/20"
            onClick={() => onResponse(true)}
          >
            <Check className="h-4 w-4" />
            Attended
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
