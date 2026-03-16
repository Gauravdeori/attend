import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Subject, AttendanceRecord } from '@/hooks/useAttendanceDB';
import { Check, X, Calendar } from 'lucide-react';

interface AttendanceHistoryDialogProps {
  subject: Subject | null;
  records: AttendanceRecord[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AttendanceHistoryDialog({ 
  subject, 
  records, 
  open, 
  onOpenChange 
}: AttendanceHistoryDialogProps) {
  if (!subject) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Attendance History
          </DialogTitle>
          <DialogDescription>
            {subject.name} ({subject.code})
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[400px] pr-4">
          {records.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Calendar className="mx-auto h-12 w-12 opacity-50 mb-3" />
              <p>No attendance records yet.</p>
              <p className="text-sm">Start marking attendance to see history here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-full ${
                      record.status === 'present' 
                        ? 'bg-success/10 text-success' 
                        : 'bg-destructive/10 text-destructive'
                    }`}>
                      {record.status === 'present' ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {format(new Date(record.date), 'EEEE, MMMM d, yyyy')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(record.date), 'h:mm a')}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant={record.status === 'present' ? 'default' : 'destructive'}
                    className={record.status === 'present' ? 'bg-success hover:bg-success/90' : ''}
                  >
                    {record.status === 'present' ? 'Present' : 'Absent'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
