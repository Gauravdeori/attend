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
  type?: 'gps' | 'manual';
  pin?: string;
  location: {
    lat: number;
    lng: number;
    radius: number; // in meters
  } | null;
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

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'teacher' | 'student';
  institutionId?: string;
  institutionName?: string;
  createdAt: Timestamp | null;
  rollNumber?: string;
  studentName?: string;
}

export interface Institution {
  id: string;
  name: string;
  adminId: string;
  joinCode: string;
  createdAt: Timestamp | null;
}

