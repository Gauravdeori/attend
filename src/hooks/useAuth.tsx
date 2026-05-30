import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db } from '@/integrations/firebase/client';
import { UserProfile } from '@/types/classes';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  profileLoading: boolean;
  signUp: (
    email: string, 
    password: string, 
    role: 'admin' | 'teacher' | 'student',
    displayName: string,
    institutionName?: string,
    institutionJoinCode?: string,
    rollNumber?: string
  ) => Promise<{ error: any }>;
  completeOnboarding: (
    role: 'admin' | 'teacher' | 'student',
    displayName: string,
    institutionName?: string,
    institutionJoinCode?: string,
    rollNumber?: string
  ) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  updateUserProfile: (displayName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // Sync user profile from Firestore users collection
  const fetchProfile = async (uid: string) => {
    setProfileLoading(true);
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      } else {
        setProfile(null);
      }
    } catch (e) {
      console.error('Error fetching user profile:', e);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        fetchProfile(firebaseUser.uid);
      } else {
        setProfile(null);
        setProfileLoading(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Link pre-created class memberships to the registered student
  const linkMemberships = async (email: string, uid: string, displayName: string, rollNumber?: string) => {
    try {
      const q = query(
        collection(db, 'class_memberships'),
        where('email', '==', email.toLowerCase().trim())
      );
      const snap = await getDocs(q);
      
      const promises = snap.docs.map(async (docSnap) => {
        const updateData: any = { user_id: uid };
        const data = docSnap.data();
        if (!data.student_name) {
          updateData.student_name = displayName;
        }
        if (rollNumber && !data.roll_number) {
          updateData.roll_number = rollNumber;
        }
        await updateDoc(docSnap.ref, updateData);
      });
      await Promise.all(promises);
    } catch (e) {
      console.error('Error linking pre-created memberships:', e);
    }
  };

  const signUp = async (
    email: string, 
    password: string, 
    role: 'admin' | 'teacher' | 'student',
    displayName: string,
    institutionName?: string,
    institutionJoinCode?: string,
    rollNumber?: string
  ) => {
    try {
      let institutionId = '';
      let resolvedInstitutionName = institutionName || '';

      // Validate institution fields before creating the auth user
      if (role === 'admin') {
        if (!institutionName) throw new Error('Institution name is required for Admin registration.');
      } else {
        if (!institutionJoinCode) throw new Error('Institution Join Code is required.');
        const q = query(collection(db, 'institutions'), where('joinCode', '==', institutionJoinCode.toUpperCase().trim()));
        const snap = await getDocs(q);
        if (snap.empty) {
          throw new Error('Invalid Institution Join Code. Please ask your administrator for the correct code.');
        }
        const instDoc = snap.docs[0];
        institutionId = instDoc.id;
        resolvedInstitutionName = instDoc.data().name;
      }

      // Create the Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      await updateProfile(firebaseUser, { displayName });

      // Create Institution if Admin
      if (role === 'admin') {
        const instRef = doc(collection(db, 'institutions'));
        institutionId = instRef.id;
        // Generate a 6-character random uppercase code
        const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        await setDoc(instRef, {
          id: institutionId,
          name: institutionName,
          adminId: firebaseUser.uid,
          joinCode,
          createdAt: serverTimestamp()
        });
      }

      // Create User Profile in Firestore
      const profileData: UserProfile = {
        uid: firebaseUser.uid,
        email: email.toLowerCase().trim(),
        displayName,
        role,
        institutionId,
        institutionName: resolvedInstitutionName,
        createdAt: null, // set by Firestore rules/serverTimestamp
      };

      if (role === 'student' && rollNumber) {
        profileData.rollNumber = rollNumber;
        profileData.studentName = displayName;
      }

      await setDoc(doc(db, 'users', firebaseUser.uid), {
        ...profileData,
        createdAt: serverTimestamp()
      });

      // Link any pre-created student memberships by CSV
      if (role === 'student') {
        await linkMemberships(email, firebaseUser.uid, displayName, rollNumber);
      }

      // Refresh local profile state
      await fetchProfile(firebaseUser.uid);
      return { error: null };
    } catch (error) {
      console.error('Sign Up Error:', error);
      return { error };
    }
  };

  const completeOnboarding = async (
    role: 'admin' | 'teacher' | 'student',
    displayName: string,
    institutionName?: string,
    institutionJoinCode?: string,
    rollNumber?: string
  ) => {
    if (!auth.currentUser) return { error: new Error('No user signed in.') };
    const firebaseUser = auth.currentUser;
    const email = firebaseUser.email || '';

    try {
      let institutionId = '';
      let resolvedInstitutionName = institutionName || '';

      // Validate/resolve institution
      if (role === 'admin') {
        if (!institutionName) throw new Error('Institution name is required for Admin registration.');
      } else {
        if (!institutionJoinCode) throw new Error('Institution Join Code is required.');
        const q = query(collection(db, 'institutions'), where('joinCode', '==', institutionJoinCode.toUpperCase().trim()));
        const snap = await getDocs(q);
        if (snap.empty) {
          throw new Error('Invalid Institution Join Code. Please ask your administrator.');
        }
        const instDoc = snap.docs[0];
        institutionId = instDoc.id;
        resolvedInstitutionName = instDoc.data().name;
      }

      // Create Institution if Admin
      if (role === 'admin') {
        const instRef = doc(collection(db, 'institutions'));
        institutionId = instRef.id;
        const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        await setDoc(instRef, {
          id: institutionId,
          name: institutionName,
          adminId: firebaseUser.uid,
          joinCode,
          createdAt: serverTimestamp()
        });
      }

      // Update profile name
      if (displayName !== firebaseUser.displayName) {
        await updateProfile(firebaseUser, { displayName });
      }

      // Create User Profile in Firestore
      const profileData: UserProfile = {
        uid: firebaseUser.uid,
        email: email.toLowerCase().trim(),
        displayName,
        role,
        institutionId,
        institutionName: resolvedInstitutionName,
        createdAt: null,
      };

      if (role === 'student' && rollNumber) {
        profileData.rollNumber = rollNumber;
        profileData.studentName = displayName;
      }

      await setDoc(doc(db, 'users', firebaseUser.uid), {
        ...profileData,
        createdAt: serverTimestamp()
      });

      // Link any pre-created student memberships
      if (role === 'student') {
        await linkMemberships(email, firebaseUser.uid, displayName, rollNumber);
      }

      // Refresh profile state
      await fetchProfile(firebaseUser.uid);
      return { error: null };
    } catch (error) {
      console.error('Onboarding Error:', error);
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      try {
        await signInWithPopup(auth, provider);
      } catch (error: any) {
        if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
          await signInWithRedirect(auth, provider);
        } else {
          throw error;
        }
      }
      return { error: null };
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      return { error };
    }
  };

  const updateUserProfile = async (displayName: string) => {
    if (auth.currentUser) {
      try {
        await updateProfile(auth.currentUser, { displayName });
        
        // Also update Firestore users document if it exists
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          await updateDoc(userRef, { displayName });
        }
        
        setUser({ ...auth.currentUser });
        await fetchProfile(auth.currentUser.uid);
        return { error: null };
      } catch (error) {
        return { error };
      }
    } else {
      return { error: new Error('No user is currently signed in') };
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      profileLoading, 
      signUp, 
      completeOnboarding, 
      signIn, 
      signInWithGoogle, 
      updateUserProfile, 
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
