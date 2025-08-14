// app/_layout.tsx
import { Slot, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuth } from "./hooks/useAuth";

export default function RootLayout() {
  const { user, initializing } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return; // Don't do anything while initializing

    console.log('Layout useEffect - User:', user ? `${user.email}` : 'None');

    if (user) {
      // User is signed in, redirect to main app
      console.log('🚀 Redirecting authenticated user to scan');
      router.replace('/(tabs)/scan');
    } else {
      // User is not signed in, show welcome page
      console.log('🚀 Redirecting unauthenticated user to welcome');
      router.replace('/welcome');
    }
  }, [user, initializing, router]);

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