import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

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
      const [subjectsRes, recordsRes] = await Promise.all([
        supabase
          .from('subjects')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('attendance_records')
          .select('*')
          .order('date', { ascending: false }),
      ]);

      if (subjectsRes.error) throw subjectsRes.error;
      if (recordsRes.error) throw recordsRes.error;

      setSubjects(
        subjectsRes.data.map((s) => ({
          id: s.id,
          name: s.name,
          code: s.code,
          teacherName: s.teacher_name || '',
          totalClasses: s.total_classes,
          classesPresent: s.classes_present,
          classesAbsent: s.classes_absent,
          createdAt: s.created_at,
        }))
      );

      setRecords(
        recordsRes.data.map((r) => ({
          id: r.id,
          subjectId: r.subject_id,
          date: r.date,
          status: r.status as 'present' | 'absent',
        }))
      );
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

      try {
        const { data, error } = await supabase
          .from('subjects')
          .insert({
            user_id: user.id,
            name: subject.name,
            code: subject.code,
            teacher_name: subject.teacherName,
          })
          .select()
          .single();

        if (error) throw error;

        const newSubject: Subject = {
          id: data.id,
          name: data.name,
          code: data.code,
          teacherName: data.teacher_name || '',
          totalClasses: data.total_classes,
          classesPresent: data.classes_present,
          classesAbsent: data.classes_absent,
          createdAt: data.created_at,
        };

        setSubjects((prev) => [newSubject, ...prev]);
        return newSubject;
      } catch (error: any) {
        console.error('Error adding subject:', error);
        toast({
          title: 'Error adding subject',
          description: error.message,
          variant: 'destructive',
        });
        return null;
      }
    },
    [user, toast]
  );

  const updateSubject = useCallback(
    async (id: string, updates: Partial<Pick<Subject, 'name' | 'code' | 'teacherName'>>) => {
      if (!user) return;

      try {
        const { error } = await supabase
          .from('subjects')
          .update({
            name: updates.name,
            code: updates.code,
            teacher_name: updates.teacherName,
          })
          .eq('id', id);

        if (error) throw error;

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
        const { error } = await supabase
          .from('subjects')
          .delete()
          .eq('id', id);

        if (error) throw error;

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
        // Insert attendance record
        const { data: recordData, error: recordError } = await supabase
          .from('attendance_records')
          .insert({
            user_id: user.id,
            subject_id: subjectId,
            status,
          })
          .select()
          .single();

        if (recordError) throw recordError;

        // Update subject counts
        const subject = subjects.find((s) => s.id === subjectId);
        if (subject) {
          const updates = {
            total_classes: subject.totalClasses + 1,
            classes_present: status === 'present' ? subject.classesPresent + 1 : subject.classesPresent,
            classes_absent: status === 'absent' ? subject.classesAbsent + 1 : subject.classesAbsent,
          };

          const { error: updateError } = await supabase
            .from('subjects')
            .update(updates)
            .eq('id', subjectId);

          if (updateError) throw updateError;

          setSubjects((prev) =>
            prev.map((s) =>
              s.id === subjectId
                ? {
                    ...s,
                    totalClasses: updates.total_classes,
                    classesPresent: updates.classes_present,
                    classesAbsent: updates.classes_absent,
                  }
                : s
            )
          );
        }

        const newRecord: AttendanceRecord = {
          id: recordData.id,
          subjectId: recordData.subject_id,
          date: recordData.date,
          status: recordData.status as 'present' | 'absent',
        };

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
    updateSubject,
    deleteSubject,
    markAttendance,
    getSubjectRecords,
    getAttendancePercentage,
  };
}
