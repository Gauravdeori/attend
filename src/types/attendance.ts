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

export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';

export interface ScheduleSlot {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  day: DayOfWeek;
  startTime: string; // "09:00"
  endTime: string;   // "10:00"
}

export interface Reminder {
  id: string;
  subjectId: string;
  subjectName: string;
  minutesBefore: number;
  enabled: boolean;
}

export interface UserSettings {
  attendanceCriteria: number; // default 75
  aiProvider?: 'groq' | 'openrouter' | 'openai';
}

export interface BunkAnalysis {
  canBunk: boolean;
  bunkableClasses: number;     // How many classes can be skipped
  classesNeeded: number;       // How many classes needed to reach criteria (if below)
  currentPercentage: number;
  status: 'safe' | 'warning' | 'danger';
  message: string;
}
