// hooks/useAuth.ts
import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { useEffect, useState } from 'react';
import { authService } from '../services/auth';

export const useAuth = () => {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user) => {
      console.log('Auth state changed:', user ? `User: ${user.email}` : 'No user');
      setUser(user);
      if (initializing) setInitializing(false);
      setLoading(false);
    });

    return unsubscribe; // Cleanup subscription on unmount
  }, [initializing]);

  const signUp = async (email: string, password: string) => {
    setLoading(true);
    const result = await authService.signUp(email, password);
    setLoading(false);
    return result;
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const result = await authService.signIn(email, password);
    setLoading(false);
    return result;
  };

  const signOut = async () => {
    setLoading(true);
    console.log('useAuth: Starting sign out process...');
    await authService.signOut();
    console.log('useAuth: Sign out service call completed');
    setLoading(false);
  };

  const resetPassword = async (email: string) => {
    return await authService.resetPassword(email);
  };

  return {
    user,
    loading,
    initializing,
    signUp,
    signIn,
    signOut,
    resetPassword,
    isAuthenticated: !!user,
  };
};