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

export interface AttendanceData {
  subjects: Subject[];
  records: AttendanceRecord[];
}
