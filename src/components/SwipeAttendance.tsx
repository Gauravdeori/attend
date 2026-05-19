import { useState, useCallback, useMemo } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { ClassMembership } from '@/types/classes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import {
  X,
  Undo2,
  CheckCircle2,
  XCircle,
  Users,
  ArrowLeft,
  Send,
  Loader2,
  HandMetal,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeResult {
  member: ClassMembership;
  status: 'present' | 'absent';
}

interface SwipeAttendanceProps {
  members: ClassMembership[];
  onComplete: (results: SwipeResult[]) => Promise<void>;
  onClose: () => void;
}

// ─── Swipeable Student Card ─────────────────────────────────────
function SwipeCard({
  member,
  onSwipe,
  isTop,
}: {
  member: ClassMembership;
  onSwipe: (status: 'present' | 'absent') => void;
  isTop: boolean;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-18, 18]);
  const presentOpacity = useTransform(x, [-200, -60], [1, 0]);
  const absentOpacity = useTransform(x, [60, 200], [0, 1]);

  const handleDragEnd = (_: any, info: { offset: { x: number }; velocity: { x: number } }) => {
    const swipeThreshold = 100;
    const velocityThreshold = 500;

    if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
      onSwipe('present');
    } else if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
      onSwipe('absent');
    }
  };

  const initials = (member.studentName || 'S')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      style={{ zIndex: isTop ? 10 : 1 }}
      initial={{ scale: isTop ? 1 : 0.95, opacity: isTop ? 1 : 0.5 }}
      animate={{ scale: isTop ? 1 : 0.95, opacity: isTop ? 1 : 0.7 }}
      exit={{ 
        x: x.get() < 0 ? -400 : 400, 
        opacity: 0, 
        rotate: x.get() < 0 ? -25 : 25,
        transition: { duration: 0.3, ease: 'easeOut' } 
      }}
    >
      <motion.div
        className={cn(
          "relative w-[320px] h-[420px] rounded-3xl cursor-grab active:cursor-grabbing select-none",
          "bg-gradient-to-br from-card via-card to-muted/30",
          "border-2 border-border/50 shadow-2xl shadow-black/10",
          "flex flex-col items-center justify-center gap-6 p-8",
          !isTop && "pointer-events-none"
        )}
        drag={isTop ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.9}
        style={{ x, rotate }}
        onDragEnd={handleDragEnd}
        whileDrag={{ scale: 1.04 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {/* Present overlay (swipe left) */}
        <motion.div
          className="absolute inset-0 rounded-3xl bg-emerald-500/15 border-2 border-emerald-500/60 flex items-center justify-center pointer-events-none"
          style={{ opacity: presentOpacity }}
        >
          <div className="absolute top-6 left-6 rotate-[-12deg]">
            <Badge className="bg-emerald-500 text-white px-4 py-2 text-lg font-black tracking-wider shadow-lg">
              PRESENT ✓
            </Badge>
          </div>
        </motion.div>

        {/* Absent overlay (swipe right) */}
        <motion.div
          className="absolute inset-0 rounded-3xl bg-red-500/15 border-2 border-red-500/60 flex items-center justify-center pointer-events-none"
          style={{ opacity: absentOpacity }}
        >
          <div className="absolute top-6 right-6 rotate-[12deg]">
            <Badge className="bg-red-500 text-white px-4 py-2 text-lg font-black tracking-wider shadow-lg">
              ABSENT ✗
            </Badge>
          </div>
        </motion.div>

        {/* Student info */}
        <Avatar className="h-24 w-24 border-4 border-primary/20 shadow-xl">
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-3xl font-black">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-foreground tracking-tight leading-tight">
            {member.studentName || `Student`}
          </h2>
          <p className="text-base font-bold text-muted-foreground tracking-widest uppercase">
            {member.rollNumber || 'N/A'}
          </p>
        </div>

        {/* Swipe hints */}
        <div className="flex items-center justify-between w-full mt-4 px-2">
          <div className="flex items-center gap-1.5 text-emerald-500/60">
            <ChevronLeft className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Present</span>
          </div>
          <div className="flex items-center gap-1.5 text-red-500/60">
            <span className="text-xs font-bold uppercase tracking-wider">Absent</span>
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Component ─────────────────────────────────────────────
export function SwipeAttendance({ members, onComplete, onClose }: SwipeAttendanceProps) {
  const studentMembers = useMemo(
    () => members.filter(m => m.role === 'student'),
    [members]
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<SwipeResult[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const remaining = studentMembers.length - currentIndex;
  const progress = studentMembers.length > 0 
    ? ((currentIndex) / studentMembers.length) * 100 
    : 0;

  const handleSwipe = useCallback((status: 'present' | 'absent') => {
    const member = studentMembers[currentIndex];
    if (!member) return;

    setResults(prev => [...prev, { member, status }]);
    
    if (currentIndex + 1 >= studentMembers.length) {
      setIsCompleted(true);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, studentMembers]);

  const handleUndo = useCallback(() => {
    if (results.length === 0) return;
    setResults(prev => prev.slice(0, -1));
    setIsCompleted(false);
    setCurrentIndex(prev => prev - 1);
  }, [results]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onComplete(results);
    } finally {
      setIsSubmitting(false);
    }
  };

  const presentList = results.filter(r => r.status === 'present');
  const absentList = results.filter(r => r.status === 'absent');

  // No students in class
  if (studentMembers.length === 0) {
    return (
      <motion.div
        className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="text-center space-y-6">
          <div className="p-6 rounded-full bg-muted/20 inline-block">
            <Users className="h-16 w-16 text-muted-foreground/40" />
          </div>
          <div>
            <h2 className="text-2xl font-black">No Students Enrolled</h2>
            <p className="text-muted-foreground font-medium mt-2">
              Students need to join this class before you can take manual attendance.
            </p>
          </div>
          <Button onClick={onClose} variant="outline" className="rounded-2xl font-bold gap-2 px-8">
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-background/98 backdrop-blur-xl flex flex-col"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full h-10 w-10"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>

        <div className="text-center">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground">
            Manual Attendance
          </h2>
          {!isCompleted && (
            <p className="text-xs font-bold text-muted-foreground/60 mt-0.5">
              {currentIndex + 1} of {studentMembers.length} students
            </p>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="rounded-full h-10 w-10"
          onClick={handleUndo}
          disabled={results.length === 0}
        >
          <Undo2 className="h-5 w-5" />
        </Button>
      </div>

      {/* Progress Bar */}
      {!isCompleted && (
        <div className="px-6 pb-2">
          <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="popLayout">
          {!isCompleted ? (
            /* ─── Card Stack ─── */
            <div className="relative w-full h-full" key="card-stack">
              {studentMembers
                .slice(currentIndex, currentIndex + 2)
                .reverse()
                .map((member, i, arr) => (
                  <SwipeCard
                    key={member.id}
                    member={member}
                    onSwipe={handleSwipe}
                    isTop={i === arr.length - 1}
                  />
                ))}
            </div>
          ) : (
            /* ─── Completion Summary ─── */
            <motion.div
              key="summary"
              className="absolute inset-0 overflow-auto px-6 py-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 20 }}
            >
              {/* Summary header */}
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 15 }}
                  className="inline-block p-4 rounded-full bg-primary/10 mb-4"
                >
                  <CheckCircle2 className="h-10 w-10 text-primary" />
                </motion.div>
                <h2 className="text-2xl font-black">Attendance Complete</h2>
                <p className="text-muted-foreground font-medium mt-1">
                  {studentMembers.length} students marked
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <Card className="rounded-2xl border-2 border-emerald-500/20 bg-emerald-500/5">
                  <CardContent className="p-4 text-center">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
                    <p className="text-3xl font-black text-emerald-600">{presentList.length}</p>
                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-500/70 mt-1">Present</p>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border-2 border-red-500/20 bg-red-500/5">
                  <CardContent className="p-4 text-center">
                    <XCircle className="h-6 w-6 text-red-500 mx-auto mb-2" />
                    <p className="text-3xl font-black text-red-600">{absentList.length}</p>
                    <p className="text-xs font-bold uppercase tracking-widest text-red-500/70 mt-1">Absent</p>
                  </CardContent>
                </Card>
              </div>

              {/* Present list */}
              {presentList.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-black uppercase tracking-[0.15em] text-emerald-600 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Present Students
                  </h3>
                  <div className="space-y-1.5">
                    {presentList.map(({ member }) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10"
                      >
                        <Avatar className="h-8 w-8 border border-emerald-500/20">
                          <AvatarFallback className="bg-emerald-500/10 text-emerald-600 text-xs font-black">
                            {(member.studentName || 'S')[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">{member.studentName || 'Student'}</p>
                        </div>
                        <span className="text-xs font-bold text-muted-foreground tracking-wider">
                          {member.rollNumber || 'N/A'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Absent list */}
              {absentList.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-sm font-black uppercase tracking-[0.15em] text-red-600 mb-3 flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    Absent Students
                  </h3>
                  <div className="space-y-1.5">
                    {absentList.map(({ member }) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-red-500/5 border border-red-500/10"
                      >
                        <Avatar className="h-8 w-8 border border-red-500/20">
                          <AvatarFallback className="bg-red-500/10 text-red-600 text-xs font-black">
                            {(member.studentName || 'S')[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">{member.studentName || 'Student'}</p>
                        </div>
                        <span className="text-xs font-bold text-muted-foreground tracking-wider">
                          {member.rollNumber || 'N/A'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="sticky bottom-0 bg-background/80 backdrop-blur-lg pb-6 pt-4 space-y-3">
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full h-14 rounded-2xl bg-primary font-black text-lg gap-3 shadow-xl shadow-primary/20 transition-transform hover:scale-[1.02]"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                  {isSubmitting ? 'Saving...' : 'Submit Attendance'}
                </Button>
                <Button
                  onClick={handleUndo}
                  variant="outline"
                  disabled={isSubmitting}
                  className="w-full h-12 rounded-2xl font-bold gap-2 border-2"
                >
                  <Undo2 className="h-4 w-4" />
                  Undo Last
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom action buttons (visible during swiping) */}
      {!isCompleted && (
        <div className="px-6 pb-8 pt-4">
          <div className="flex items-center justify-center gap-6">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="h-16 w-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-lg shadow-emerald-500/10 transition-colors hover:bg-emerald-500/20"
              onClick={() => handleSwipe('present')}
            >
              <CheckCircle2 className="h-7 w-7" />
            </motion.button>

            <div className="flex flex-col items-center gap-1 opacity-40">
              <HandMetal className="h-5 w-5 text-muted-foreground" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                or swipe
              </span>
            </div>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="h-16 w-16 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center text-red-500 shadow-lg shadow-red-500/10 transition-colors hover:bg-red-500/20"
              onClick={() => handleSwipe('absent')}
            >
              <XCircle className="h-7 w-7" />
            </motion.button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
