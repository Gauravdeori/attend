import { useState, useCallback, useEffect } from 'react';
import { db } from '@/integrations/firebase/client';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  getDoc,
  setDoc,
  Timestamp
} from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  Class, 
  ClassMembership, 
  AttendanceSession, 
  ClassAttendanceRecord, 
  Announcement 
} from '@/types/classes';

// Helper to prevent Firestore operations from hanging indefinitely
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) =>
      setTimeout(() => {
        console.warn(`Firestore query timed out after ${ms}ms, using fallback`);
        resolve(fallback);
      }, ms)
    ),
  ]);
}

export function useClassesDB() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState<Class[]>([]);
  const [memberships, setMemberships] = useState<ClassMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserClasses = useCallback(async () => {
    if (!user) {
      setClasses([]);
      setMemberships([]);
      setIsLoading(false);
      return;
    }

    try {
      // If user is an Admin, fetch all classes in their institution
      if (profile?.role === 'admin') {
        if (!profile.institutionId) {
          setClasses([]);
          setMemberships([]);
          setIsLoading(false);
          return;
        }

        const classesQuery = query(
          collection(db, 'classes'),
          where('institution_id', '==', profile.institutionId)
        );
        const classesSnap = await withTimeout(getDocs(classesQuery), 8000, { docs: [] } as any);
        const classesData: Class[] = classesSnap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name,
            description: data.description,
            joinCode: data.join_code,
            teacherId: data.teacher_id,
            teacherName: data.teacher_name,
            createdAt: data.created_at
          };
        });

        setClasses(classesData);

        // Map mock teacher memberships for the admin to get full access
        const adminMemberships: ClassMembership[] = classesData.map(c => ({
          id: `${user.uid}_${c.id}`,
          classId: c.id,
          userId: user.uid,
          role: 'teacher',
          joinedAt: c.createdAt
        }));

        setMemberships(adminMemberships);
        setIsLoading(false);
        return;
      }

      // Normal Flow for Teachers and Students: Get all memberships for the user
      const membershipQuery = query(
        collection(db, 'class_memberships'),
        where('user_id', '==', user.uid)
      );
      const membershipSnap = await withTimeout(getDocs(membershipQuery), 8000, { docs: [] } as any);
      const fetchedMemberships: ClassMembership[] = membershipSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          classId: data.class_id,
          userId: data.user_id,
          role: data.role,
          studentName: data.student_name,
          rollNumber: data.roll_number,
          joinedAt: data.joined_at
        };
      }) as ClassMembership[];

      setMemberships(fetchedMemberships);

      if (fetchedMemberships.length === 0) {
        setClasses([]);
        setIsLoading(false);
        return;
      }

      // Get the class details for those memberships
      const classIds = fetchedMemberships.map(m => m.classId);
      const classesData: Class[] = [];
      
      // Fetch classes in chunks of 10
      for (let i = 0; i < classIds.length; i += 10) {
        const chunk = classIds.slice(i, i + 10);
        const classesQuery = query(
          collection(db, 'classes'),
          where('__name__', 'in', chunk)
        );
        const classesSnap = await withTimeout(getDocs(classesQuery), 8000, { docs: [] } as any);
        classesSnap.docs.forEach(d => {
          const data = d.data();
          classesData.push({
            id: d.id,
            name: data.name,
            description: data.description,
            joinCode: data.join_code,
            teacherId: data.teacher_id,
            teacherName: data.teacher_name,
            createdAt: data.created_at
          } as Class);
        });
      }

      setClasses(classesData);
    } catch (error: unknown) {
      console.error('Error fetching classes:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error loading classes',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, profile, toast]);

  useEffect(() => {
    fetchUserClasses();
  }, [fetchUserClasses]);

  const generateJoinCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const createClass = async (name: string, description: string, assignedTeacherId?: string, assignedTeacherName?: string) => {
    if (!user) return null;

    try {
      const joinCode = generateJoinCode();
      const teacherId = assignedTeacherId || user.uid;
      const teacherName = assignedTeacherName || user.displayName || 'Teacher';

      const classData = {
        name,
        description,
        join_code: joinCode,
        teacher_id: teacherId,
        teacher_name: teacherName,
        institution_id: profile?.institutionId || '',
        created_at: serverTimestamp(),
      };

      const classRef = await addDoc(collection(db, 'classes'), classData);
      
      // Automatically add the creator/assigned teacher as a teacher membership
      const membershipData = {
        user_id: teacherId,
        class_id: classRef.id,
        role: 'teacher',
        joined_at: serverTimestamp(),
      };

      await setDoc(doc(db, 'class_memberships', `${teacherId}_${classRef.id}`), membershipData);
      
      await fetchUserClasses();
      return classRef.id;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error creating class',
        description: message,
        variant: 'destructive',
      });
      return null;
    }
  };

  const joinClass = async (joinCode: string, studentName: string, rollNumber: string) => {
    if (!user) return null;

    try {
      // Find the class with the join code
      const classQuery = query(
        collection(db, 'classes'),
        where('join_code', '==', joinCode.toUpperCase())
      );
      const classSnap = await getDocs(classQuery);
      
      if (classSnap.empty) {
        toast({
          title: 'Invalid Join Code',
          description: 'No class found with this code.',
          variant: 'destructive',
        });
        return null;
      }

      const classId = classSnap.docs[0].id;
      
      // Check if already a member
      const membershipRef = doc(db, 'class_memberships', `${user.uid}_${classId}`);
      const membershipSnap = await getDoc(membershipRef);
      
      if (membershipSnap.exists()) {
        toast({
          title: 'Already joined',
          description: 'You are already a member of this class.',
        });
        return classId;
      }

      // Add student membership
      const membershipData = {
        user_id: user.uid,
        class_id: classId,
        role: 'student',
        student_name: studentName,
        roll_number: rollNumber,
        joined_at: serverTimestamp(),
      };

      await setDoc(membershipRef, membershipData);
      
      setMemberships(prev => [{
        id: `${user.uid}_${classId}`,
        classId: classId,
        userId: user.uid,
        role: 'student',
        studentName,
        rollNumber,
        joinedAt: null as any
      }, ...prev]);
      
      await fetchUserClasses();
      return classId;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error joining class',
        description: message,
        variant: 'destructive',
      });
      return null;
    }
  };

  const getAttendanceSessions = useCallback(async (classId: string) => {
    try {
      const q = query(
        collection(db, 'attendance_sessions'),
        where('class_id', '==', classId)
      );
      const snap = await withTimeout(getDocs(q), 8000, { docs: [] } as any);
      const results = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          classId: data.class_id,
          teacherId: data.teacher_id,
          startTime: data.start_time,
          endTime: data.end_time,
          status: data.status,
          type: data.type || 'gps',
          pin: data.pin,
          location: data.location || null
        };
      }) as AttendanceSession[];
      // Sort client-side (desc by startTime) to avoid needing a composite index
      return results.sort((a, b) => {
        const aTime = a.startTime?.toDate?.() ?? new Date(0);
        const bTime = b.startTime?.toDate?.() ?? new Date(0);
        return bTime.getTime() - aTime.getTime();
      });
    } catch (error) {
      console.error('Error fetching sessions:', error);
      return [];
    }
  }, []);

  const startSession = async (classId: string, location: { lat: number, lng: number, radius: number }) => {
    if (!user) return null;
    try {
      const pin = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit pin
      const sessionData = {
        class_id: classId,
        teacher_id: user.uid,
        start_time: serverTimestamp(),
        end_time: null,
        status: 'active',
        location,
        pin,
      };
      const ref = await addDoc(collection(db, 'attendance_sessions'), sessionData);
      return ref.id;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error starting session',
        description: message,
        variant: 'destructive',
      });
      return null;
    }
  };

  const endSession = async (sessionId: string) => {
    try {
      await updateDoc(doc(db, 'attendance_sessions', sessionId), {
        status: 'completed',
        end_time: serverTimestamp(),
      });
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error ending session',
        description: message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const markAttendance = async (
    sessionId: string, 
    classId: string, 
    status: 'present' | 'absent', 
    locationVerified: boolean
  ) => {
    if (!user) return false;
    try {
      const recordData = {
        session_id: sessionId,
        class_id: classId,
        student_id: user.uid,
        student_name: user.displayName || 'Student',
        timestamp: serverTimestamp(),
        status,
        location_verified: locationVerified,
      };
      
      // Use setDoc with composite ID to prevent duplicate marking for the same session
      await setDoc(doc(db, 'class_attendance_records', `${user.uid}_${sessionId}`), recordData);
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error marking attendance',
        description: message,
        variant: 'destructive',
      });
      return false;
    }
  };

  // ─── Manual Swipe Attendance ─────────────────────────────────────

  const startManualSession = async (classId: string) => {
    if (!user) return null;
    try {
      const sessionData = {
        class_id: classId,
        teacher_id: user.uid,
        start_time: serverTimestamp(),
        end_time: null,
        status: 'active',
        type: 'manual',
        location: null,
      };
      const ref = await addDoc(collection(db, 'attendance_sessions'), sessionData);
      return ref.id;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error starting manual session',
        description: message,
        variant: 'destructive',
      });
      return null;
    }
  };

  const markAttendanceForStudent = async (
    sessionId: string,
    classId: string,
    studentId: string,
    studentName: string,
    status: 'present' | 'absent'
  ) => {
    if (!user) return false;
    try {
      const recordData = {
        session_id: sessionId,
        class_id: classId,
        student_id: studentId,
        student_name: studentName,
        timestamp: serverTimestamp(),
        status,
        location_verified: false,
      };
      await setDoc(doc(db, 'class_attendance_records', `${studentId}_${sessionId}`), recordData);
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error marking student attendance',
        description: message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const getAttendanceRecords = useCallback(async (classId: string) => {
    try {
      const q = query(
        collection(db, 'class_attendance_records'),
        where('class_id', '==', classId)
      );
      const snap = await withTimeout(getDocs(q), 8000, { docs: [] } as any);
      const results = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          sessionId: data.session_id,
          classId: data.class_id,
          studentId: data.student_id,
          studentName: data.student_name,
          timestamp: data.timestamp,
          status: data.status,
          locationVerified: data.location_verified
        };
      }) as ClassAttendanceRecord[];
      // Sort client-side (desc by timestamp)
      return results.sort((a, b) => {
        const aTime = a.timestamp?.toDate?.() ?? new Date(0);
        const bTime = b.timestamp?.toDate?.() ?? new Date(0);
        return bTime.getTime() - aTime.getTime();
      });
    } catch (error) {
      console.error('Error fetching records:', error);
      return [];
    }
  }, []);

  const getAnnouncements = useCallback(async (classId: string) => {
    try {
      const q = query(
        collection(db, 'announcements'),
        where('class_id', '==', classId)
      );
      const snap = await withTimeout(getDocs(q), 8000, { docs: [] } as any);
      const results = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          classId: data.class_id,
          authorId: data.author_id,
          authorName: data.author_name,
          content: data.content,
          createdAt: data.created_at
        };
      }) as Announcement[];
      // Sort client-side (desc by createdAt)
      return results.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() ?? new Date(0);
        const bTime = b.createdAt?.toDate?.() ?? new Date(0);
        return bTime.getTime() - aTime.getTime();
      });
    } catch (error) {
      console.error('Error fetching announcements:', error);
      return [];
    }
  }, []);

  const postAnnouncement = async (classId: string, content: string) => {
    if (!user) return null;
    try {
      const announcementData = {
        class_id: classId,
        author_id: user.uid,
        author_name: user.displayName || 'Teacher',
        content,
        created_at: serverTimestamp(),
      };
      const ref = await addDoc(collection(db, 'announcements'), announcementData);
      return ref.id;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error posting announcement',
        description: message,
        variant: 'destructive',
      });
      return null;
    }
  };

  const getClassMembers = useCallback(async (classId: string): Promise<ClassMembership[]> => {
    try {
      const q = query(
        collection(db, 'class_memberships'),
        where('class_id', '==', classId)
      );
      const snap = await withTimeout(getDocs(q), 8000, { docs: [] } as any);
      
      return snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          classId: data.class_id,
          userId: data.user_id,
          role: data.role,
          studentName: data.student_name,
          rollNumber: data.roll_number,
          joinedAt: data.joined_at
        };
      }) as ClassMembership[];
    } catch (error) {
      console.error('Error fetching members:', error);
      return [];
    }
  }, []);

  return {
    classes,
    memberships,
    isLoading,
    createClass,
    joinClass,
    getAttendanceSessions,
    startSession,
    startManualSession,
    endSession,
    markAttendance,
    markAttendanceForStudent,
    getAttendanceRecords,
    getAnnouncements,
    postAnnouncement,
    getClassMembers,
    refreshClasses: fetchUserClasses,
  };
}
