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
      const fetchedMemberships: ClassMembership[] = membershipSnap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as ClassMembership[];

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
          classesData.push({
            id: d.id,
            ...d.data()
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
        joinCode,
        teacherId: user.uid,
        teacherName: user.displayName || 'Teacher',
        createdAt: serverTimestamp(),
      };

      const classRef = await addDoc(collection(db, 'classes'), classData);
      
      // Automatically add the creator as a teacher membership
      const membershipData = {
        userId: user.uid,
        classId: classRef.id,
        role: 'teacher',
        joinedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'class_memberships', `${user.uid}_${classRef.id}`), membershipData);
      
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
        userId: user.uid,
        classId,
        role: 'student',
        studentName,
        rollNumber,
        joinedAt: serverTimestamp(),
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
        where('classId', '==', classId),
        orderBy('startTime', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceSession));
    } catch (error) {
      console.error('Error fetching sessions:', error);
      return [];
    }
  };

  const startSession = async (classId: string, location: { lat: number, lng: number, radius: number }) => {
    if (!user) return null;
    try {
      const sessionData = {
        classId,
        teacherId: user.uid,
        startTime: serverTimestamp(),
        endTime: null,
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
        sessionId,
        classId,
        studentId: user.uid,
        studentName: user.displayName || 'Student',
        timestamp: serverTimestamp(),
        status,
        locationVerified,
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
        where('classId', '==', classId),
        orderBy('timestamp', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as ClassAttendanceRecord));
    } catch (error) {
      console.error('Error fetching records:', error);
      return [];
    }
  };

  const getAnnouncements = async (classId: string) => {
    try {
      const q = query(
        collection(db, 'announcements'),
        where('classId', '==', classId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement));
    } catch (error) {
      console.error('Error fetching announcements:', error);
      return [];
    }
  };

  const postAnnouncement = async (classId: string, content: string) => {
    if (!user) return null;
    try {
      const announcementData = {
        classId,
        authorId: user.uid,
        authorName: user.displayName || 'Teacher',
        content,
        createdAt: serverTimestamp(),
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
      
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as ClassMembership));
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
