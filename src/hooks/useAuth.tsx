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
import { auth } from '@/integrations/firebase/client';

// Mock Guest User for No-Auth Mode
const GUEST_USER = {
  uid: 'guest_user_default',
  email: 'guest@attendancehub.in',
  displayName: 'Guest User',
  photoURL: null,
} as User;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  updateUserProfile: (displayName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(GUEST_USER); // Default to guest
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // If firebase user exists, use it. Otherwise, use guest user.
      setUser(firebaseUser || GUEST_USER);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        await updateProfile(userCredential.user, {
          displayName: displayName,
        });
      }
      return { error: null };
    } catch (error) {
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
    const currentUser = auth.currentUser || GUEST_USER;
    if (auth.currentUser) {
      try {
        await updateProfile(auth.currentUser, { displayName });
        setUser({ ...auth.currentUser });
        return { error: null };
      } catch (error) {
        return { error };
      }
    } else {
      // For guest, just update local state
      setUser({ ...GUEST_USER, displayName });
      return { error: null };
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(GUEST_USER); // Fallback to guest
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signInWithGoogle, updateUserProfile, signOut }}>
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
