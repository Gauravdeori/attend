import { useEffect, useCallback, useRef } from 'react';
import type { Reminder, ScheduleSlot, DayOfWeek } from '@/types/attendance';
import { useToast } from '@/hooks/use-toast';

const DAY_MAP: Record<number, DayOfWeek> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
};

export function useReminders(
  reminders: Reminder[],
  scheduleSlots: ScheduleSlot[]
) {
  const { toast } = useToast();
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const permissionRef = useRef<NotificationPermission>('default');

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      permissionRef.current = 'granted';
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      permissionRef.current = permission;
      return permission === 'granted';
    }

    return false;
  }, []);

  // Send notification
  const sendNotification = useCallback((title: string, body: string) => {
    if (permissionRef.current === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
        });
      } catch {
        // Fallback to toast
        toast({ title, description: body });
      }
    } else {
      toast({ title, description: body });
    }
  }, [toast]);

  // Schedule reminders for today
  useEffect(() => {
    // Clear previous timeouts
    timeoutsRef.current.forEach(t => clearTimeout(t));
    timeoutsRef.current = [];

    const activeReminders = reminders.filter(r => r.enabled);
    if (activeReminders.length === 0 || scheduleSlots.length === 0) return;

    // Request permission
    requestPermission();

    const now = new Date();
    const today = DAY_MAP[now.getDay()];
    if (!today) return; // Sunday

    // Get today's schedule
    const todaySlots = scheduleSlots.filter(slot => slot.day === today);
    if (todaySlots.length === 0) return;

    // For each active reminder, check if there's a matching schedule slot today
    activeReminders.forEach(reminder => {
      const matchingSlots = todaySlots.filter(
        slot => slot.subjectName.toLowerCase().trim() === reminder.subjectName.toLowerCase().trim()
      );

      matchingSlots.forEach(slot => {
        // Parse start time
        const [hours, mins] = slot.startTime.split(':').map(Number);
        const classTime = new Date();
        classTime.setHours(hours, mins, 0, 0);

        // Calculate reminder time
        const reminderTime = new Date(classTime.getTime() - reminder.minutesBefore * 60 * 1000);

        const msUntilReminder = reminderTime.getTime() - now.getTime();

        if (msUntilReminder > 0) {
          const timeout = setTimeout(() => {
            sendNotification(
              `📚 ${reminder.subjectName}`,
              `Your class starts in ${reminder.minutesBefore} minutes! (${slot.startTime} - ${slot.endTime})`
            );
          }, msUntilReminder);

          timeoutsRef.current.push(timeout);
        }
      });
    });

    return () => {
      timeoutsRef.current.forEach(t => clearTimeout(t));
      timeoutsRef.current = [];
    };
  }, [reminders, scheduleSlots, requestPermission, sendNotification]);
}
