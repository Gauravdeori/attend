import { useState, useCallback } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Subject } from '@/hooks/useAttendanceDB';
import type { BunkAnalysis } from '@/types/attendance';
import {
  Check, 
  X, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  History,
  User,
  BookOpen,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Shield
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SubjectCardProps {
  subject: Subject;
  attendancePercentage: number;
  attendanceCriteria: number;
  bunkAnalysis: BunkAnalysis;
  onMarkPresent: () => void;
  onMarkAbsent: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onViewHistory: () => void;
}

export function SubjectCard({
  subject,
  attendancePercentage,
  attendanceCriteria,
  bunkAnalysis,
  onMarkPresent,
  onMarkAbsent,
  onEdit,
  onDelete,
  onViewHistory,
}: SubjectCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [presentAnimation, setPresentAnimation] = useState(false);
  const [absentAnimation, setAbsentAnimation] = useState(false);

  const isLowAttendance = attendancePercentage < attendanceCriteria && subject.totalClasses > 0;

  const handleMarkPresent = useCallback(() => {
    if (presentAnimation) return;
    setPresentAnimation(true);
    onMarkPresent();
    setTimeout(() => setPresentAnimation(false), 600);
  }, [presentAnimation, onMarkPresent]);

  const handleMarkAbsent = useCallback(() => {
    if (absentAnimation) return;
    setAbsentAnimation(true);
    onMarkAbsent();
    setTimeout(() => setAbsentAnimation(false), 600);
  }, [absentAnimation, onMarkAbsent]);

  return (
    <>
      <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 border-border/50">
        {/* Low Attendance Warning Strip */}
        {isLowAttendance && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-warning" />
        )}
        
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg leading-none">{subject.name}</h3>
                {isLowAttendance && (
                  <Badge variant="outline" className="text-warning border-warning gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Low
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground font-medium">{subject.code}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onViewHistory}>
                  <History className="h-4 w-4 mr-2" />
                  View History
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Subject
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setIsDeleting(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Subject
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {subject.teacherName && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground pt-1">
              <User className="h-3.5 w-3.5" />
              <span>{subject.teacherName}</span>
            </div>
          )}
        </CardHeader>

        <CardContent className="pb-4">
          {/* Attendance Percentage Display */}
          <div className="mb-4">
            <div className="flex items-end justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                Attendance (min {attendanceCriteria}%)
              </span>
              <span className={`text-2xl font-bold ${
                isLowAttendance ? 'text-warning' : 'text-foreground'
              }`}>
                {attendancePercentage.toFixed(1)}%
              </span>
            </div>
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  isLowAttendance ? 'bg-warning' : 'bg-primary'
                }`}
                style={{ width: `${Math.min(attendancePercentage, 100)}%` }}
              />
              {/* Criteria marker */}
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-foreground/30"
                style={{ left: `${attendanceCriteria}%` }}
              />
            </div>
          </div>

          {/* Bunk Analysis Badge */}
          {subject.totalClasses > 0 && (
            <div className={`mb-4 p-2.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
              bunkAnalysis.status === 'safe' 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                : bunkAnalysis.status === 'warning'
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'bg-red-500/10 text-red-600 dark:text-red-400'
            }`}>
              {bunkAnalysis.status === 'safe' ? (
                <Shield className="h-3.5 w-3.5 flex-shrink-0" />
              ) : bunkAnalysis.status === 'warning' ? (
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 flex-shrink-0" />
              )}
              <span>{bunkAnalysis.message}</span>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <BookOpen className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-semibold">{subject.totalClasses}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-success/10">
              <Check className="h-4 w-4 mx-auto mb-1 text-success" />
              <p className="text-lg font-semibold text-success">{subject.classesPresent}</p>
              <p className="text-xs text-muted-foreground">Present</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-destructive/10">
              <X className="h-4 w-4 mx-auto mb-1 text-destructive" />
              <p className="text-lg font-semibold text-destructive">{subject.classesAbsent}</p>
              <p className="text-xs text-muted-foreground">Absent</p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="gap-2 pt-0">
          <Button
            variant="outline"
            className={`flex-1 gap-2 border-success text-success hover:bg-success hover:text-success-foreground animate-click ${
              presentAnimation ? 'animate-pulse-success' : ''
            }`}
            onClick={handleMarkPresent}
            disabled={presentAnimation || absentAnimation}
          >
            <Check className="h-4 w-4" />
            Present
          </Button>
          <Button
            variant="outline"
            className={`flex-1 gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground animate-click ${
              absentAnimation ? 'animate-pulse-destructive' : ''
            }`}
            onClick={handleMarkAbsent}
            disabled={presentAnimation || absentAnimation}
          >
            <X className="h-4 w-4" />
            Absent
          </Button>
        </CardFooter>
      </Card>

      <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subject?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{subject.name}</strong> and all its attendance records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete();
                setIsDeleting(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
