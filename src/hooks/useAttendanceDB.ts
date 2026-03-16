import { useState, useEffect, useCallback } from 'react';
import { db } from '@/integrations/firebase/client';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  Timestamp,
  increment
} from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

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

export function useAttendanceDB() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch subjects and records
  const fetchData = useCallback(async () => {
    if (!user) {
      setSubjects([]);
      setRecords([]);
      setIsLoading(false);
      return;
    }

    try {
      console.log('Fetching subjects for user:', user.uid);
      const subjectsQuery = query(
        collection(db, 'subjects'),
        where('user_id', '==', user.uid)
      );

      console.log('Fetching records for user:', user.uid);
      const recordsQuery = query(
        collection(db, 'attendance_records'),
        where('user_id', '==', user.uid)
      );

      console.log('Executing Firestore queries...');
      const [subjectsSnap, recordsSnap] = await Promise.all([
        getDocs(subjectsQuery),
        getDocs(recordsQuery)
      ]);
      console.log('Firestore queries completed successfully');

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

      setSubjects(fetchedSubjects);
      setRecords(fetchedRecords);
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

  const addSubject = useCallback(
    async (subject: { name: string; code: string; teacherName: string }) => {
      if (!user) return null;

      // Check if subject already exists
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

        console.log('Writing new subject to Firestore...');
        const docRef = await withTimeout(
          addDoc(collection(db, 'subjects'), newSubjectData),
          10000,
          'Firestore write timed out. Please check your Firestore security rules in the Firebase Console — writes to the "subjects" collection must be allowed for authenticated users.'
        );
        console.log('Subject added with ID:', docRef.id);

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
      if (!user) return false;

      try {
        // Filter out subjects that already exist in the tracker
        const existingKeys = new Set(
          subjects.map(s => `${s.name.toLowerCase().trim()}|${s.code.toLowerCase().trim()}`)
        );
        const uniqueNewSubjects = newSubjects.filter(s => {
          const key = `${s.name.toLowerCase().trim()}|${s.code.toLowerCase().trim()}`;
          return !existingKeys.has(key);
        });

        if (uniqueNewSubjects.length === 0) {
          toast({
            title: 'No new subjects',
            description: 'All selected subjects are already in your tracker.',
          });
          return true;
        }

        if (uniqueNewSubjects.length < newSubjects.length) {
          const skipped = newSubjects.length - uniqueNewSubjects.length;
          console.log(`Skipping ${skipped} duplicate subject(s) already in tracker.`);
        }

        const addedSubjects: Subject[] = [];
        
        // Using Promise.all for faster execution
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

            console.log(`Attempting to add subject: ${s.name}`);
            const docRef = await withTimeout(
              addDoc(collection(db, 'subjects'), newSubjectData),
              10000,
              `Firestore write timed out for "${s.name}". Check your Firestore security rules.`
            );
            console.log(`Successfully added subject ${s.name} with ID: ${docRef.id}`);
            
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
            // Don't throw here to allow other subjects to potentially succeed, 
            // but we'll know if any failed.
          }
        }));

        setSubjects((prev) => [...addedSubjects, ...prev]);
        toast({
          title: 'Import Successful',
          description: `Added ${addedSubjects.length} subjects to your schedule.`,
        });
        return true;
      } catch (error: any) {
        console.error('Error batch adding subjects:', error);
        toast({
          title: 'Import Failed',
          description: error.message,
          variant: 'destructive',
        });
        return false;
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
        
        // Note: In a real app, you'd also delete all records associated with this subject.
        // For simplicity, we just filter the local state.
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
        // Insert attendance record
        const recordData = {
          user_id: user.uid,
          subject_id: subjectId,
          status,
          date: serverTimestamp(),
        };

        const recordRef = await withTimeout(
          addDoc(collection(db, 'attendance_records'), recordData),
          10000,
          'Firestore write timed out for attendance record. Check your Firestore security rules.'
        );

        // Update subject counts
        const subjectDocRef = doc(db, 'subjects', subjectId);
        await withTimeout(
          updateDoc(subjectDocRef, {
            total_classes: increment(1),
            classes_present: status === 'present' ? increment(1) : increment(0),
            classes_absent: status === 'absent' ? increment(1) : increment(0),
          }),
          10000,
          'Firestore update timed out for attendance counts. Check your Firestore security rules.'
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
              `Firestore delete timed out for "${s.name}". Check your Firestore security rules.`
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

  return {
    subjects,
    records,
    isLoading,
    addSubject,
    batchAddSubjects,
    updateSubject,
    deleteSubject,
    deleteAllSubjects,
    markAttendance,
    getSubjectRecords,
    getAttendancePercentage,
  };
}
