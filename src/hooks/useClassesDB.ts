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
  Timestamp,
  orderBy,
  limit
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

export function useClassesDB() {
  const { user } = useAuth();
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
      // Get all memberships for the user
      const membershipQuery = query(
        collection(db, 'class_memberships'),
        where('user_id', '==', user.uid)
      );
      const membershipSnap = await getDocs(membershipQuery);
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
      // Firestore 'in' query supports up to 10-30 IDs usually, but let's assume it's fine for now
      // If there are many classes, we might need to chunk this
      const classesData: Class[] = [];
      
      // Fetch classes in chunks of 10
      for (let i = 0; i < classIds.length; i += 10) {
        const chunk = classIds.slice(i, i + 10);
        const classesQuery = query(
          collection(db, 'classes'),
          where('__name__', 'in', chunk)
        );
        const classesSnap = await getDocs(classesQuery);
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
  }, [user, toast]);

  useEffect(() => {
    fetchUserClasses();
  }, [fetchUserClasses]);

  const generateJoinCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const createClass = async (name: string, description: string) => {
    if (!user) return null;

    try {
      const joinCode = generateJoinCode();
      const classData = {
        name,
        description,
        join_code: joinCode,
        teacher_id: user.uid,
        teacher_name: user.displayName || 'Teacher',
        created_at: serverTimestamp(),
      };

      const classRef = await addDoc(collection(db, 'classes'), classData);
      
      // Automatically add the creator as a teacher membership
      const membershipData = {
        user_id: user.uid,
        class_id: classRef.id,
        role: 'teacher',
        joined_at: serverTimestamp(),
      };

      await setDoc(doc(db, 'class_memberships', `${user.uid}_${classRef.id}`), membershipData);
      
      // Update local state immediately to avoid race conditions
      setClasses(prev => [{
        id: classRef.id,
        name,
        description,
        joinCode,
        teacherId: user.uid,
        teacherName: user.displayName || 'Teacher',
        createdAt: null as any // Will be updated by refresh
      }, ...prev]);
      
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
        where('joinCode', '==', joinCode.toUpperCase())
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

  const getAttendanceSessions = async (classId: string) => {
    try {
      const q = query(
        collection(db, 'attendance_sessions'),
        where('class_id', '==', classId),
        orderBy('start_time', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          classId: data.class_id,
          teacherId: data.teacher_id,
          startTime: data.start_time,
          endTime: data.end_time,
          status: data.status,
          location: data.location
        };
      }) as AttendanceSession[];
    } catch (error) {
      console.error('Error fetching sessions:', error);
      return [];
    }
  };

  const startSession = async (classId: string, location: { lat: number, lng: number, radius: number }) => {
    if (!user) return null;
    try {
      const sessionData = {
        class_id: classId,
        teacher_id: user.uid,
        start_time: serverTimestamp(),
        end_time: null,
        status: 'active',
        location,
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
        endTime: serverTimestamp(),
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

  const getAttendanceRecords = async (classId: string) => {
    try {
      const q = query(
        collection(db, 'class_attendance_records'),
        where('class_id', '==', classId),
        orderBy('timestamp', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => {
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
    } catch (error) {
      console.error('Error fetching records:', error);
      return [];
    }
  };

  const getAnnouncements = async (classId: string) => {
    try {
      const q = query(
        collection(db, 'announcements'),
        where('class_id', '==', classId),
        orderBy('created_at', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => {
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
    } catch (error) {
      console.error('Error fetching announcements:', error);
      return [];
    }
  };

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

  const getClassMembers = async (classId: string): Promise<ClassMembership[]> => {
    try {
      const q = query(
        collection(db, 'class_memberships'),
        where('classId', '==', classId)
      );
      const snap = await getDocs(q);
      
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
  };

  return {
    classes,
    memberships,
    isLoading,
    createClass,
    joinClass,
    getAttendanceSessions,
    startSession,
    endSession,
    markAttendance,
    getAttendanceRecords,
    getAnnouncements,
    postAnnouncement,
    getClassMembers,
    refreshClasses: fetchUserClasses,
  };
}
