import { Timestamp } from 'firebase/firestore';

export interface Class {
  id: string;
  name: string;
  description?: string;
  joinCode: string;
  teacherId: string;
  teacherName: string;
  createdAt: Timestamp;
}

export interface ClassMembership {
  id: string;
  userId: string;
  classId: string;
  role: 'teacher' | 'student';
  joinedAt: Timestamp;
  rollNumber?: string;
  studentName?: string;
}

export interface AttendanceSession {
  id: string;
  classId: string;
  startTime: Timestamp;
  endTime: Timestamp | null;
  status: 'active' | 'completed';
  location: {
    lat: number;
    lng: number;
    radius: number; // in meters
  };
  teacherId: string;
}

export interface ClassAttendanceRecord {
  id: string;
  sessionId: string;
  classId: string;
  studentId: string;
  studentName: string;
  timestamp: Timestamp;
  status: 'present' | 'absent';
  locationVerified: boolean;
}

export interface Announcement {
  id: string;
  classId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: Timestamp;
}
