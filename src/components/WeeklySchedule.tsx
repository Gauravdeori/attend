import { useMemo } from 'react';
import type { ScheduleSlot, DayOfWeek } from '@/types/attendance';
import { Card } from '@/components/ui/card';
import { Clock, BookOpen } from 'lucide-react';

interface WeeklyScheduleProps {
  scheduleSlots: ScheduleSlot[];
}

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const DAY_LABELS: Record<DayOfWeek, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
};

// Generate consistent pastel colors for subjects
function getSubjectColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 70%, 85%)`;
}

function getSubjectTextColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 60%, 30%)`;
}

export function WeeklySchedule({ scheduleSlots }: WeeklyScheduleProps) {
  const scheduleByDay = useMemo(() => {
    const grouped: Record<DayOfWeek, ScheduleSlot[]> = {
      Mon: [], Tue: [], Wed: [], Thu: [], Fri: [],
    };
    scheduleSlots.forEach(slot => {
      if (grouped[slot.day]) {
        grouped[slot.day].push(slot);
      }
    });
    // Sort each day by start time
    Object.values(grouped).forEach(daySlots => {
      daySlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    return grouped;
  }, [scheduleSlots]);

  const activeDays = useMemo(() => {
    return DAYS.filter(day => scheduleByDay[day].length > 0);
  }, [scheduleByDay]);

  if (scheduleSlots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          <Clock className="h-12 w-12 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">No Schedule Yet</h2>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Import a routine to see your day-wise class schedule here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Day-wise summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
        {DAYS.map(day => (
          <Card key={day} className={`p-3 text-center transition-all ${
            scheduleByDay[day].length > 0 
              ? 'border-primary/20 bg-primary/5' 
              : 'opacity-50'
          }`}>
            <p className="text-xs text-muted-foreground font-medium">{DAY_LABELS[day]}</p>
            <p className="text-2xl font-bold mt-1">{scheduleByDay[day].length}</p>
            <p className="text-[10px] text-muted-foreground">
              {scheduleByDay[day].length === 1 ? 'class' : 'classes'}
            </p>
          </Card>
        ))}
      </div>

      {/* Detailed schedule */}
      <div className="space-y-4">
        {activeDays.map(day => (
          <Card key={day} className="overflow-hidden border-border/50">
            <div className="px-4 py-3 bg-muted/30 border-b flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">{DAY_LABELS[day]}</h3>
              <span className="text-xs text-muted-foreground ml-auto">
                {scheduleByDay[day].length} {scheduleByDay[day].length === 1 ? 'class' : 'classes'}
              </span>
            </div>
            <div className="p-3 space-y-2">
              {scheduleByDay[day].map((slot, idx) => (
                <div
                  key={`${slot.id || idx}`}
                  className="flex items-center gap-3 p-3 rounded-lg transition-all hover:scale-[1.01]"
                  style={{
                    backgroundColor: getSubjectColor(slot.subjectName),
                    color: getSubjectTextColor(slot.subjectName),
                  }}
                >
                  <div className="flex-shrink-0 text-center min-w-[90px]">
                    <p className="text-xs font-medium opacity-70">
                      {slot.startTime} - {slot.endTime}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{slot.subjectName}</p>
                    {slot.subjectCode && (
                      <p className="text-xs opacity-70">{slot.subjectCode}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
