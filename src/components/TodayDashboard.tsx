import { useMemo } from 'react';
import type { ScheduleSlot, DayOfWeek } from '@/types/attendance';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, BookOpen, ChevronRight, LayoutDashboard, Coffee } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface TodayDashboardProps {
  scheduleSlots: ScheduleSlot[];
  onMarkAttendance: (subjectId: string, status: 'present' | 'absent') => void;
}

const DAY_MAP: Record<number, DayOfWeek> = {
  1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat',
};

export function TodayDashboard({ scheduleSlots, onMarkAttendance }: TodayDashboardProps) {
  const now = new Date();
  const today = DAY_MAP[now.getDay()];
  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const todaySlots = useMemo(() => {
    if (!today) return [];
    return scheduleSlots
      .filter(slot => slot.day === today)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [scheduleSlots, today]);

  const { currentSlot, upcomingSlots, completedSlots } = useMemo(() => {
    const current = todaySlots.find(
      slot => currentTimeStr >= slot.startTime && currentTimeStr < slot.endTime
    );
    const upcoming = todaySlots.filter(slot => slot.startTime > currentTimeStr);
    const completed = todaySlots.filter(slot => slot.endTime <= currentTimeStr);
    
    return { currentSlot: current, upcomingSlots: upcoming, completedSlots: completed };
  }, [todaySlots, currentTimeStr]);

  const dayProgress = todaySlots.length > 0 
    ? (completedSlots.length / todaySlots.length) * 100 
    : 0;

  if (!today || todaySlots.length === 0) {
    return (
      <Card className="border-primary/10 bg-primary/5 mb-8">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <div className="p-3 bg-muted rounded-full mb-3">
            <Coffee className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg">No classes scheduled for today</h3>
          <p className="text-sm text-muted-foreground">Enjoy your free time!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 mb-8">
      <div className="flex items-center gap-2 mb-2">
        <LayoutDashboard className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Today's Dashboard</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Progress Card */}
        <Card className="border-border/50 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-muted/30 border-b flex items-center justify-between">
            <span className="text-sm font-medium">Day Progress</span>
            <span className="text-xs text-muted-foreground">{completedSlots.length} / {todaySlots.length} Done</span>
          </div>
          <CardContent className="py-6 space-y-4 text-center">
            <div className="text-4xl font-black text-primary">{Math.round(dayProgress)}%</div>
            <Progress value={dayProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {upcomingSlots.length > 0 
                ? `${upcomingSlots.length} classes remaining` 
                : "All classes for today finished!"}
            </p>
          </CardContent>
        </Card>

        {/* Current/Next Class Hero */}
        <Card className={`md:col-span-2 overflow-hidden border-2 transition-all ${
          currentSlot ? 'border-primary/20 bg-primary/5 ring-1 ring-primary/10' : 'border-border/50'
        }`}>
          <div className={`px-4 py-3 border-b flex items-center gap-2 ${
            currentSlot ? 'bg-primary/10' : 'bg-muted/30'
          }`}>
            <Clock className={`h-4 w-4 ${currentSlot ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
            <span className="text-sm font-bold uppercase tracking-wider">
              {currentSlot ? "Ongoing Session" : "Next Up"}
            </span>
          </div>
          <CardContent className="p-6">
            {currentSlot || upcomingSlots[0] ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black tracking-tight leading-none text-primary">
                    {(currentSlot || upcomingSlots[0])?.subjectName}
                  </h3>
                  <div className="flex items-center gap-2 text-muted-foreground font-medium">
                    <BookOpen className="h-4 w-4" />
                    <span className="text-sm">{(currentSlot || upcomingSlots[0])?.subjectCode}</span>
                    <span className="text-sm">•</span>
                    <span className="text-sm">{(currentSlot || upcomingSlots[0])?.startTime} — {(currentSlot || upcomingSlots[0])?.endTime}</span>
                  </div>
                </div>
                
                {currentSlot && (
                  <Badge variant="default" className="w-fit animate-pulse px-3 py-1 text-xs">
                    HAPPENING NOW
                  </Badge>
                )}
                
                {!currentSlot && upcomingSlots[0] && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Starts at</p>
                    <p className="text-xl font-bold">{upcomingSlots[0].startTime}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground font-medium">No more classes today. See you tomorrow!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today's Timeline */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-muted-foreground flex items-center gap-2 px-1">
          <BookOpen className="h-4 w-4" />
          Today's Timeline
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {todaySlots.map((slot, idx) => {
            const isCompleted = completedSlots.some(s => s.id === slot.id);
            const isCurrent = currentSlot?.id === slot.id;
            
            return (
              <Card key={slot.id || idx} className={`border-border/50 transition-all ${
                isCompleted ? 'opacity-50 grayscale bg-muted/20' : 
                isCurrent ? 'border-primary/30 ring-1 ring-primary/5 shadow-md' : 'hover:border-primary/20'
              }`}>
                <CardContent className="p-3">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">
                      {slot.startTime}
                    </span>
                    {isCurrent && <div className="w-2 h-2 rounded-full bg-primary animate-ping" />}
                  </div>
                  <p className="text-sm font-bold truncate leading-tight mb-1">{slot.subjectName}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">{slot.subjectCode}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
