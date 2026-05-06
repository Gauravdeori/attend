import { useState, useEffect, useCallback } from 'react';
import { db } from '@/integrations/firebase/client';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  getDoc,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { ScheduleSlot, DayOfWeek, Reminder, UserSettings, BunkAnalysis } from '@/types/attendance';

// Helper to prevent Firestore operations from hanging indefinitely
function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMsg)), ms)
    ),
  ]);
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  teacherName: string;
  totalClasses: number;
  classesPresent: number;
  classesAbsent: number;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  subjectId: string;
  date: string;
  status: 'present' | 'absent';
}

const DEFAULT_SETTINGS: UserSettings = {
  attendanceCriteria: 75,
  aiProvider: 'groq',
};

export function useAttendanceDB() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // ─── Fetch all data ───────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!user) {
      setSubjects([]);
      setRecords([]);
      setScheduleSlots([]);
      setReminders([]);
      setUserSettings(DEFAULT_SETTINGS);
      setIsLoading(false);
      return;
    }

    try {
      console.log('Fetching data for user:', user.uid);
      const subjectsQuery = query(
        collection(db, 'subjects'),
        where('user_id', '==', user.uid)
      );
      const recordsQuery = query(
        collection(db, 'attendance_records'),
        where('user_id', '==', user.uid)
      );
      const scheduleQuery = query(
        collection(db, 'schedule_slots'),
        where('user_id', '==', user.uid)
      );
      const remindersQuery = query(
        collection(db, 'reminders'),
        where('user_id', '==', user.uid)
      );

      const [subjectsSnap, recordsSnap, scheduleSnap, remindersSnap] = await Promise.all([
        getDocs(subjectsQuery),
        getDocs(recordsQuery),
        getDocs(scheduleQuery),
        getDocs(remindersQuery),
      ]);

      // Fetch user settings
      const settingsDoc = await getDoc(doc(db, 'user_settings', user.uid));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        setUserSettings({
          attendanceCriteria: data.attendance_criteria ?? 75,
          aiProvider: data.ai_provider ?? 'groq',
        });
      }

      const fetchedSubjects: Subject[] = subjectsSnap.docs.map(docData => {
        const data = docData.data();
        let createdAt = new Date().toISOString();
        try {
          if (data.created_at && typeof data.created_at.toDate === 'function') {
            createdAt = data.created_at.toDate().toISOString();
          }
        } catch (e) {
          console.warn('Failed to parse created_at timestamp', e);
        }
        return {
          id: docData.id,
          name: data.name,
          code: data.code,
          teacherName: data.teacher_name || '',
          totalClasses: data.total_classes || 0,
          classesPresent: data.classes_present || 0,
          classesAbsent: data.classes_absent || 0,
          createdAt,
        };
      });

      const fetchedRecords: AttendanceRecord[] = recordsSnap.docs.map(docData => {
        const data = docData.data();
        let date = new Date().toISOString();
        try {
          if (data.date && typeof data.date.toDate === 'function') {
            date = data.date.toDate().toISOString();
          }
        } catch (e) {
          console.warn('Failed to parse record date', e);
        }
        return {
          id: docData.id,
          subjectId: data.subject_id,
          date,
          status: data.status as 'present' | 'absent',
        };
      });

      const fetchedSchedule: ScheduleSlot[] = scheduleSnap.docs.map(docData => {
        const data = docData.data();
        return {
          id: docData.id,
          subjectId: data.subject_id || '',
          subjectName: data.subject_name,
          subjectCode: data.subject_code || '',
          day: data.day as DayOfWeek,
          startTime: data.start_time,
          endTime: data.end_time,
        };
      });

      const fetchedReminders: Reminder[] = remindersSnap.docs.map(docData => {
        const data = docData.data();
        return {
          id: docData.id,
          subjectId: data.subject_id,
          subjectName: data.subject_name,
          minutesBefore: data.minutes_before ?? 10,
          enabled: data.enabled ?? true,
        };
      });

      setSubjects(fetchedSubjects);
      setRecords(fetchedRecords);
      setScheduleSlots(fetchedSchedule);
      setReminders(fetchedReminders);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error loading data',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Subject CRUD ─────────────────────────────────────────────
  const addSubject = useCallback(
    async (subject: { name: string; code: string; teacherName: string }) => {
      if (!user) return null;

      const key = `${subject.name.toLowerCase().trim()}|${subject.code.toLowerCase().trim()}`;
      const exists = subjects.some(
        s => `${s.name.toLowerCase().trim()}|${s.code.toLowerCase().trim()}` === key
      );
      if (exists) {
        toast({
          title: 'Subject already exists',
          description: `"${subject.name}" (${subject.code}) is already in your tracker.`,
          variant: 'destructive',
        });
        return null;
      }

      try {
        const newSubjectData = {
          user_id: user.uid,
          name: subject.name,
          code: subject.code,
          teacher_name: subject.teacherName,
          total_classes: 0,
          classes_present: 0,
          classes_absent: 0,
          created_at: serverTimestamp(),
        };

        const docRef = await withTimeout(
          addDoc(collection(db, 'subjects'), newSubjectData),
          10000,
          'Firestore write timed out. Please check your Firestore security rules.'
        );

        const newSubject: Subject = {
          id: docRef.id,
          name: subject.name,
          code: subject.code,
          teacherName: subject.teacherName,
          totalClasses: 0,
          classesPresent: 0,
          classesAbsent: 0,
          createdAt: new Date().toISOString(),
        };

        setSubjects((prev) => [newSubject, ...prev]);
        return newSubject;
      } catch (error: any) {
        console.error('Error adding subject to Firestore:', error);
        toast({
          title: 'Error adding subject',
          description: error.message,
          variant: 'destructive',
        });
        return null;
      }
    },
    [user, subjects, toast]
  );

  const batchAddSubjects = useCallback(
    async (newSubjects: { name: string; code: string; teacherName: string }[]) => {
      if (!user) return [];

      try {
        const existingKeys = new Set(
          subjects.map(s => `${s.name.toLowerCase().trim()}|${s.code.toLowerCase().trim()}`)
        );
        const uniqueNewSubjects = newSubjects.filter(s => {
          const key = `${s.name.toLowerCase().trim()}|${s.code.toLowerCase().trim()}`;
          return !existingKeys.has(key);
        });

        const addedSubjects: Subject[] = [];
        
        if (uniqueNewSubjects.length > 0) {
          await Promise.all(uniqueNewSubjects.map(async (s) => {
            try {
              const newSubjectData = {
                user_id: user.uid,
                name: s.name,
                code: s.code,
                teacher_name: s.teacherName,
                total_classes: 0,
                classes_present: 0,
                classes_absent: 0,
                created_at: serverTimestamp(),
              };

              const docRef = await withTimeout(
                addDoc(collection(db, 'subjects'), newSubjectData),
                10000,
                `Firestore write timed out for "${s.name}". Check your Firestore security rules.`
              );
              
              addedSubjects.push({
                id: docRef.id,
                name: s.name,
                code: s.code,
                teacherName: s.teacherName,
                totalClasses: 0,
                classesPresent: 0,
                classesAbsent: 0,
                createdAt: new Date().toISOString(),
              });
            } catch (err: any) {
              console.error(`Failed to add subject ${s.name}:`, err);
            }
          }));

          setSubjects((prev) => [...addedSubjects, ...prev]);
        }

        // Also find existing subjects that were requested but not added (already existed)
        const allRequestedSubjects: Subject[] = [];
        newSubjects.forEach(req => {
          const reqKey = `${req.name.toLowerCase().trim()}|${req.code.toLowerCase().trim()}`;
          const existing = subjects.find(s => 
            `${s.name.toLowerCase().trim()}|${s.code.toLowerCase().trim()}` === reqKey
          );
          if (existing) {
            allRequestedSubjects.push(existing);
          } else {
            const newlyAdded = addedSubjects.find(s => 
              `${s.name.toLowerCase().trim()}|${s.code.toLowerCase().trim()}` === reqKey
            );
            if (newlyAdded) allRequestedSubjects.push(newlyAdded);
          }
        });

        if (addedSubjects.length > 0) {
          toast({
            title: 'Import Successful',
            description: `Added ${addedSubjects.length} subjects to your schedule.`,
          });
        }
        
        return allRequestedSubjects;
      } catch (error: any) {
        console.error('Error batch adding subjects:', error);
        toast({
          title: 'Import Failed',
          description: error.message,
          variant: 'destructive',
        });
        return [];
      }
    },
    [user, subjects, toast]
  );

  const updateSubject = useCallback(
    async (id: string, updates: Partial<Pick<Subject, 'name' | 'code' | 'teacherName'>>) => {
      if (!user) return;

      try {
        const docRef = doc(db, 'subjects', id);
        const firestoreUpdates: any = {};
        if (updates.name !== undefined) firestoreUpdates.name = updates.name;
        if (updates.code !== undefined) firestoreUpdates.code = updates.code;
        if (updates.teacherName !== undefined) firestoreUpdates.teacher_name = updates.teacherName;

        await withTimeout(
          updateDoc(docRef, firestoreUpdates),
          10000,
          'Firestore update timed out. Check your Firestore security rules.'
        );

        setSubjects((prev) =>
          prev.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          )
        );
      } catch (error: any) {
        console.error('Error updating subject:', error);
        toast({
          title: 'Error updating subject',
          description: error.message,
          variant: 'destructive',
        });
      }
    },
    [user, toast]
  );

  const deleteSubject = useCallback(
    async (id: string) => {
      if (!user) return;

      try {
        await withTimeout(
          deleteDoc(doc(db, 'subjects', id)),
          10000,
          'Firestore delete timed out. Check your Firestore security rules.'
        );

        setSubjects((prev) => prev.filter((s) => s.id !== id));
        setRecords((prev) => prev.filter((r) => r.subjectId !== id));
      } catch (error: any) {
        console.error('Error deleting subject:', error);
        toast({
          title: 'Error deleting subject',
          description: error.message,
          variant: 'destructive',
        });
      }
    },
    [user, toast]
  );

  const markAttendance = useCallback(
    async (subjectId: string, status: 'present' | 'absent') => {
      if (!user) return null;

      try {
        const recordData = {
          user_id: user.uid,
          subject_id: subjectId,
          status,
          date: serverTimestamp(),
        };

        const recordRef = await withTimeout(
          addDoc(collection(db, 'attendance_records'), recordData),
          10000,
          'Firestore write timed out for attendance record.'
        );

        const subjectDocRef = doc(db, 'subjects', subjectId);
        await withTimeout(
          updateDoc(subjectDocRef, {
            total_classes: increment(1),
            classes_present: status === 'present' ? increment(1) : increment(0),
            classes_absent: status === 'absent' ? increment(1) : increment(0),
          }),
          10000,
          'Firestore update timed out for attendance counts.'
        );

        const newRecord: AttendanceRecord = {
          id: recordRef.id,
          subjectId: subjectId,
          date: new Date().toISOString(),
          status,
        };

        setSubjects((prev) =>
          prev.map((s) =>
            s.id === subjectId
              ? {
                  ...s,
                  totalClasses: s.totalClasses + 1,
                  classesPresent: status === 'present' ? s.classesPresent + 1 : s.classesPresent,
                  classesAbsent: status === 'absent' ? s.classesAbsent + 1 : s.classesAbsent,
                }
              : s
          )
        );

        setRecords((prev) => [newRecord, ...prev]);
        return newRecord;
      } catch (error: any) {
        console.error('Error marking attendance:', error);
        toast({
          title: 'Error marking attendance',
          description: error.message,
          variant: 'destructive',
        });
        return null;
      }
    },
    [user, toast]
  );

  const deleteAllSubjects = useCallback(
    async () => {
      if (!user) return;
      if (subjects.length === 0) return;

      try {
        await Promise.all(
          subjects.map((s) =>
            withTimeout(
              deleteDoc(doc(db, 'subjects', s.id)),
              10000,
              `Firestore delete timed out for "${s.name}".`
            )
          )
        );

        setSubjects([]);
        setRecords([]);
        toast({
          title: 'All subjects deleted',
          description: `Removed ${subjects.length} subjects from your tracker.`,
        });
      } catch (error: any) {
        console.error('Error deleting all subjects:', error);
        toast({
          title: 'Error deleting subjects',
          description: error.message,
          variant: 'destructive',
        });
      }
    },
    [user, subjects, toast]
  );

  const getSubjectRecords = useCallback(
    (subjectId: string) => {
      return records
        .filter((r) => r.subjectId === subjectId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    [records]
  );

  const getAttendancePercentage = useCallback((subject: Subject) => {
    if (subject.totalClasses === 0) return 0;
    return (subject.classesPresent / subject.totalClasses) * 100;
  }, []);

  // ─── Schedule CRUD ────────────────────────────────────────────
  const saveSchedule = useCallback(
    async (slots: Omit<ScheduleSlot, 'id'>[]) => {
      if (!user) return false;

      try {
        // Delete old schedule first
        const oldQuery = query(
          collection(db, 'schedule_slots'),
          where('user_id', '==', user.uid)
        );
        const oldSnap = await getDocs(oldQuery);
        await Promise.all(oldSnap.docs.map(d => deleteDoc(d.ref)));

        // Add new slots
        const addedSlots: ScheduleSlot[] = [];
        await Promise.all(slots.map(async (slot) => {
          const slotData = {
            user_id: user.uid,
            subject_id: slot.subjectId,
            subject_name: slot.subjectName,
            subject_code: slot.subjectCode,
            day: slot.day,
            start_time: slot.startTime,
            end_time: slot.endTime,
          };
          const docRef = await withTimeout(
            addDoc(collection(db, 'schedule_slots'), slotData),
            10000,
            'Firestore write timed out for schedule slot.'
          );
          addedSlots.push({ ...slot, id: docRef.id });
        }));

        setScheduleSlots(addedSlots);
        toast({
          title: 'Schedule Saved',
          description: `Saved ${addedSlots.length} time slots to your schedule.`,
        });
        return true;
      } catch (error: any) {
        console.error('Error saving schedule:', error);
        toast({
          title: 'Error saving schedule',
          description: error.message,
          variant: 'destructive',
        });
        return false;
      }
    },
    [user, toast]
  );

  const clearSchedule = useCallback(
    async () => {
      if (!user) return;
      try {
        const oldQuery = query(
          collection(db, 'schedule_slots'),
          where('user_id', '==', user.uid)
        );
        const oldSnap = await getDocs(oldQuery);
        await Promise.all(oldSnap.docs.map(d => deleteDoc(d.ref)));
        setScheduleSlots([]);
      } catch (error: any) {
        console.error('Error clearing schedule:', error);
      }
    },
    [user]
  );

  // ─── Reminders CRUD ──────────────────────────────────────────
  const saveReminder = useCallback(
    async (reminder: Omit<Reminder, 'id'>) => {
      if (!user) return null;

      try {
        const reminderData = {
          user_id: user.uid,
          subject_id: reminder.subjectId,
          subject_name: reminder.subjectName,
          minutes_before: reminder.minutesBefore,
          enabled: reminder.enabled,
        };

        const docRef = await withTimeout(
          addDoc(collection(db, 'reminders'), reminderData),
          10000,
          'Firestore write timed out for reminder.'
        );

        const newReminder: Reminder = { ...reminder, id: docRef.id };
        setReminders(prev => [...prev, newReminder]);
        return newReminder;
      } catch (error: any) {
        console.error('Error saving reminder:', error);
        toast({
          title: 'Error saving reminder',
          description: error.message,
          variant: 'destructive',
        });
        return null;
      }
    },
    [user, toast]
  );

  const updateReminder = useCallback(
    async (id: string, updates: Partial<Pick<Reminder, 'minutesBefore' | 'enabled'>>) => {
      if (!user) return;

      try {
        const docRef = doc(db, 'reminders', id);
        const firestoreUpdates: any = {};
        if (updates.minutesBefore !== undefined) firestoreUpdates.minutes_before = updates.minutesBefore;
        if (updates.enabled !== undefined) firestoreUpdates.enabled = updates.enabled;

        await withTimeout(updateDoc(docRef, firestoreUpdates), 10000, 'Firestore update timed out.');

        setReminders(prev =>
          prev.map(r => (r.id === id ? { ...r, ...updates } : r))
        );
      } catch (error: any) {
        console.error('Error updating reminder:', error);
        toast({
          title: 'Error updating reminder',
          description: error.message,
          variant: 'destructive',
        });
      }
    },
    [user, toast]
  );

  const deleteReminder = useCallback(
    async (id: string) => {
      if (!user) return;

      try {
        await withTimeout(deleteDoc(doc(db, 'reminders', id)), 10000, 'Firestore delete timed out.');
        setReminders(prev => prev.filter(r => r.id !== id));
      } catch (error: any) {
        console.error('Error deleting reminder:', error);
      }
    },
    [user]
  );

  // ─── User Settings ───────────────────────────────────────────
  const updateSettings = useCallback(
    async (settings: Partial<UserSettings>) => {
      if (!user) return;

      try {
        const docRef = doc(db, 'user_settings', user.uid);
        const firestoreData: any = {};
        if (settings.attendanceCriteria !== undefined) {
          firestoreData.attendance_criteria = settings.attendanceCriteria;
        }
        if (settings.aiProvider !== undefined) {
          firestoreData.ai_provider = settings.aiProvider;
        }

        await withTimeout(
          setDoc(docRef, { ...firestoreData, user_id: user.uid }, { merge: true }),
          10000,
          'Firestore update timed out for settings.'
        );

        setUserSettings(prev => ({ ...prev, ...settings }));
        toast({
          title: 'Settings Updated',
          description: `Attendance criteria set to ${settings.attendanceCriteria}%`,
        });
      } catch (error: any) {
        console.error('Error updating settings:', error);
        toast({
          title: 'Error updating settings',
          description: error.message,
          variant: 'destructive',
        });
      }
    },
    [user, toast]
  );

  // ─── Bunk Analysis ───────────────────────────────────────────
  const getBunkAnalysis = useCallback(
    (subject: Subject, criteria?: number): BunkAnalysis => {
      const threshold = criteria ?? userSettings.attendanceCriteria;
      const { totalClasses, classesPresent } = subject;

      if (totalClasses === 0) {
        return {
          canBunk: true,
          bunkableClasses: 0,
          classesNeeded: 0,
          currentPercentage: 0,
          status: 'safe',
          message: 'No classes recorded yet',
        };
      }

      const currentPercentage = (classesPresent / totalClasses) * 100;

      if (currentPercentage >= threshold) {
        // Calculate how many classes can be skipped:
        // P / (T + n) >= threshold/100
        // n <= P * 100 / threshold - T
        const maxBunks = Math.floor((classesPresent * 100) / threshold - totalClasses);

        if (maxBunks <= 0) {
          return {
            canBunk: false,
            bunkableClasses: 0,
            classesNeeded: 0,
            currentPercentage,
            status: 'warning',
            message: "On the edge — don't skip!",
          };
        }

        return {
          canBunk: true,
          bunkableClasses: maxBunks,
          classesNeeded: 0,
          currentPercentage,
          status: 'safe',
          message: `You can skip ${maxBunks} more class${maxBunks > 1 ? 'es' : ''}`,
        };
      } else {
        // Below threshold: calculate classes needed to attend consecutively:
        // (P + n) / (T + n) >= threshold/100
        // n >= (threshold * T - 100 * P) / (100 - threshold)
        const classesNeeded = Math.ceil(
          (threshold * totalClasses - 100 * classesPresent) / (100 - threshold)
        );

        return {
          canBunk: false,
          bunkableClasses: 0,
          classesNeeded: Math.max(classesNeeded, 1),
          currentPercentage,
          status: 'danger',
          message: `Attend next ${Math.max(classesNeeded, 1)} class${classesNeeded > 1 ? 'es' : ''} to recover`,
        };
      }
    },
    [userSettings.attendanceCriteria]
  );

  return {
    subjects,
    records,
    scheduleSlots,
    reminders,
    userSettings,
    isLoading,
    addSubject,
    batchAddSubjects,
    updateSubject,
    deleteSubject,
    deleteAllSubjects,
    markAttendance,
    getSubjectRecords,
    getAttendancePercentage,
    saveSchedule,
    clearSchedule,
    saveReminder,
    updateReminder,
    deleteReminder,
    updateSettings,
    getBunkAnalysis,
  };
}
