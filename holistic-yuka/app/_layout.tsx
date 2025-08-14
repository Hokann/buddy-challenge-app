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
        const completed = await hasCompletedOnboarding();
        setOnboardingComplete(completed);
      }
    };
    
    checkOnboarding();
  }, [user]);

  useEffect(() => {
    console.log('Layout useEffect triggered:', {
      initializing,
      user: user ? user.email : 'None',
      onboardingComplete
    });

    if (initializing || (user && onboardingComplete === null)) {
      console.log('Layout: Still loading, skipping navigation');
      return; // Don't do anything while initializing
    }

    if (user) {
      if (onboardingComplete) {
        // User has completed onboarding, go to main app
        console.log('🚀 Layout: Redirecting authenticated user to scan (onboarding complete)');
        router.replace('/(tabs)/scan');
      }
      // If onboarding not complete, let manual navigation handle it
    } else {
      // User is not signed in, show welcome page
      console.log('🚀 Layout: Redirecting unauthenticated user to welcome');
      router.replace('/welcome');
    }
  }, [user, initializing, onboardingComplete, router]);

  // Show loading screen while initializing
  if (initializing) {
    console.log('Layout - Showing initialization loading screen');
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