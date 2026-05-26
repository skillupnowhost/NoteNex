import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CampusUser } from '../types';
import { getSavedUser, loginWithEmail, registerWithEmail, logout as signOutUser, updateUserPhoto } from './auth';

interface AuthContextProps {
  user: CampusUser | null;
  loading: boolean;
  signIn: (email: string, password: string, department: string, year: string) => Promise<CampusUser>;
  signUp: (email: string, password: string, department: string, year: string, securityLevel?: string, studentName?: string, collegeName?: string, boardOrUniversity?: string, studentId?: string) => Promise<CampusUser>;
  signOut: () => Promise<void>;
  updatePhotoURL: (photoURL: string | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CampusUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const saved = await getSavedUser();
        setUser(saved);
      } catch (error) {
        console.error('Failed to load saved user:', error);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  const signIn = useCallback(async (email: string, password: string, department: string, year: string) => {
    const signedIn = await loginWithEmail(email, password, department, year);
    setUser(signedIn);
    return signedIn;
  }, []);

  const signUp = useCallback(async (email: string, password: string, department: string, year: string, securityLevel?: string, studentName?: string, collegeName?: string, boardOrUniversity?: string, studentId?: string) => {
    const signedUp = await registerWithEmail(email, password, department, year, securityLevel, studentName, collegeName, boardOrUniversity, studentId);
    setUser(signedUp);
    return signedUp;
  }, []);

  const signOut = useCallback(async () => {
    await signOutUser();
    setUser(null);
  }, []);

  const updatePhotoURL = useCallback(async (photoURL: string | null) => {
    if (!user) return;
    await updateUserPhoto(user.uid, photoURL);
    setUser(prev => prev ? { ...prev, photoURL: photoURL ?? undefined } : prev);
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      loading,
      signIn,
      signUp,
      signOut,
      updatePhotoURL,
    }),
    [user, loading, signIn, signUp, signOut, updatePhotoURL]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
