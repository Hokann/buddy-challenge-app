// app/_layout.tsx
import { Slot, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuth } from "./hooks/useAuth";
import { hasCompletedOnboarding } from "./utils/onboarding";

export default function RootLayout() {
  const { user, initializing } = useAuth();
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkOnboarding = async () => {
      if (user) {
        console.log('🔍 Layout: Checking onboarding status for user:', user.email)
        const completed = await hasCompletedOnboarding();
        console.log('📊 Layout: Onboarding complete status:', completed)
        setOnboardingComplete(completed);
      } else {
        console.log('🔍 Layout: No user, setting onboarding complete to null')
        setOnboardingComplete(null);
      }
    };
    
    checkOnboarding();
  }, [user]);

  useEffect(() => {
    console.log('🔄 Layout: Navigation useEffect triggered:', {
      initializing,
      user: user ? user.email : 'None',
      onboardingComplete
    });

    if (initializing || (user && onboardingComplete === null)) {
      console.log('⏳ Layout: Still loading, skipping navigation');
      return; // Don't do anything while initializing
    }

    if (user) {
      console.log('👤 Layout: User is authenticated:', user.email)
      if (onboardingComplete) {
        // User has completed onboarding, go to main app
        console.log('✅ Layout: User has completed onboarding')
        console.log('🚀 Layout: Redirecting authenticated user to scan')
        router.replace('/(tabs)/scan');
      } else {
        console.log('❌ Layout: User has NOT completed onboarding')
        console.log('🚀 Layout: Redirecting user to diet preference to start onboarding')
        router.replace('/(auth)/diet-preference')
      }
    } else {
      // User is not signed in, show welcome page
      console.log('🚪 Layout: No user authenticated')
      console.log('🚀 Layout: Redirecting unauthenticated user to welcome')
      router.replace('/welcome');
    }
  }, [user, initializing, onboardingComplete, router]);

  // Show loading screen while initializing
  if (initializing || (user && onboardingComplete === null)) {
    console.log('🔄 Layout: Showing loading screen - initializing:', initializing, 'onboardingComplete:', onboardingComplete);
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: '#F9FAFB' }}>
        <ActivityIndicator size="large" color="#3FA300" />
      </View>
    );
  }

  // Render the current route
  return (
    <SafeAreaProvider>
      <Slot />
    </SafeAreaProvider>
  );
}