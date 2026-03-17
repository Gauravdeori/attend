import { useState, useEffect, useCallback, useRef } from 'react';
import type { ScheduleSlot, DayOfWeek } from '@/types/attendance';

const DAY_MAP: Record<number, DayOfWeek> = {
  1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat',
};

export function useAutoAttendance(
  scheduleSlots: ScheduleSlot[],
  onPrompt: (slot: ScheduleSlot) => void
) {
  // Store IDs of slots prompted in the current session/day to avoid duplicates
  const promptedIds = useRef<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkAttendance = useCallback(() => {
    const now = new Date();
    const today = DAY_MAP[now.getDay()];
    if (!today) return;

    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // Find classes that ended recently (within the last 2 minutes)
    // but haven't been prompted yet.
    const recentlyEnded = scheduleSlots.filter(slot => {
      if (slot.day !== today) return false;
      if (promptedIds.current.has(slot.id)) return false;

      // Check if current time is at or slightly after endTime (within 5 minutes)
      const [endH, endM] = slot.endTime.split(':').map(Number);
      const endTotal = endH * 60 + endM;
      const currentTotal = now.getHours() * 60 + now.getMinutes();
      
      return currentTotal >= endTotal && currentTotal < endTotal + 5;
    });

    if (recentlyEnded.length > 0) {
      // Pick the most recently ended one
      const target = recentlyEnded[0];
      promptedIds.current.add(target.id);
      onPrompt(target);
    }
  }, [scheduleSlots, onPrompt]);

  useEffect(() => {
    // Check every 30 seconds
    intervalRef.current = setInterval(checkAttendance, 30000);
    // Initial check
    checkAttendance();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkAttendance]);

  // Expose a way to reset for testing if needed
  const resetPrompted = () => promptedIds.current.clear();

  return { resetPrompted };
}
