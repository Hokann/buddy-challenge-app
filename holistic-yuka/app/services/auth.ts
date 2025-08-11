// services/auth.ts
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

export interface AuthResult {
  user: FirebaseAuthTypes.User | null;
  error?: string;
}

// Get the auth instance
const authInstance = auth();

export const authService = {
  // Sign up with email and password
  async signUp(email: string, password: string): Promise<AuthResult> {
    try {
      const userCredential = await authInstance.createUserWithEmailAndPassword(email, password);
      return { user: userCredential.user };
    } catch (error: any) {
      return { user: null, error: error.message };
    }
  },

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      const userCredential = await authInstance.signInWithEmailAndPassword(email, password);
      return { user: userCredential.user };
    } catch (error: any) {
      return { user: null, error: error.message };
    }
  },

  // Sign out
  async signOut(): Promise<void> {
    try {
      await authInstance.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  },

  // Reset password
  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      await authInstance.sendPasswordResetEmail(email);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // Get current user
  getCurrentUser(): FirebaseAuthTypes.User | null {
    return authInstance.currentUser;
  },

  // Listen to auth state changes
  onAuthStateChanged(callback: (user: FirebaseAuthTypes.User | null) => void) {
    return authInstance.onAuthStateChanged(callback);
  }
};