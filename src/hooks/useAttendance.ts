import { useState, useEffect, useCallback } from 'react';
import { Subject, AttendanceRecord, AttendanceData } from '@/types/attendance';

const STORAGE_KEY = 'student-attendance-tracker';

const getInitialData = (): AttendanceData => {
  if (typeof window === 'undefined') return { subjects: [], records: [] };
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return { subjects: [], records: [] };
    }
  }
  return { subjects: [], records: [] };
};

export function useAttendance() {
  const [data, setData] = useState<AttendanceData>(getInitialData);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setData(getInitialData());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [data, isLoading]);

  const addSubject = useCallback((subject: Omit<Subject, 'id' | 'totalClasses' | 'classesPresent' | 'classesAbsent' | 'createdAt'>) => {
    const newSubject: Subject = {
      ...subject,
      id: crypto.randomUUID(),
      totalClasses: 0,
      classesPresent: 0,
      classesAbsent: 0,
      createdAt: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      subjects: [...prev.subjects, newSubject],
    }));
    return newSubject;
  }, []);

  const updateSubject = useCallback((id: string, updates: Partial<Pick<Subject, 'name' | 'code' | 'teacherName'>>) => {
    setData(prev => ({
      ...prev,
      subjects: prev.subjects.map(s => 
        s.id === id ? { ...s, ...updates } : s
      ),
    }));
  }, []);

  const deleteSubject = useCallback((id: string) => {
    setData(prev => ({
      subjects: prev.subjects.filter(s => s.id !== id),
      records: prev.records.filter(r => r.subjectId !== id),
    }));
  }, []);

  const markAttendance = useCallback((subjectId: string, status: 'present' | 'absent') => {
    const record: AttendanceRecord = {
      id: crypto.randomUUID(),
      subjectId,
      date: new Date().toISOString(),
      status,
    };

    setData(prev => ({
      subjects: prev.subjects.map(s => {
        if (s.id === subjectId) {
          return {
            ...s,
            totalClasses: s.totalClasses + 1,
            classesPresent: status === 'present' ? s.classesPresent + 1 : s.classesPresent,
            classesAbsent: status === 'absent' ? s.classesAbsent + 1 : s.classesAbsent,
          };
        }
        return s;
      }),
      records: [...prev.records, record],
    }));

    return record;
  }, []);

  const getSubjectRecords = useCallback((subjectId: string) => {
    return data.records
      .filter(r => r.subjectId === subjectId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data.records]);

  const getAttendancePercentage = useCallback((subject: Subject) => {
    if (subject.totalClasses === 0) return 0;
    return (subject.classesPresent / subject.totalClasses) * 100;
  }, []);

  return {
    subjects: data.subjects,
    records: data.records,
    isLoading,
    addSubject,
    updateSubject,
    deleteSubject,
    markAttendance,
    getSubjectRecords,
    getAttendancePercentage,
  };
}
