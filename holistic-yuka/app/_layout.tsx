// app/_layout.tsx
import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "./hooks/useAuth";

export default function RootLayout() {
  const { user, initializing } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return; // Don't do anything while initializing

    const inAuthGroup = segments[0] === '(auth)';

    console.log('Layout useEffect - Current segments:', segments);
    console.log('Layout useEffect - User:', user ? `${user.email}` : 'None');
    console.log('Layout useEffect - In auth group:', inAuthGroup);

    if (user && inAuthGroup) {
      // User is signed in but in auth group, redirect to main app
      console.log('🚀 Redirecting authenticated user to scan');
      router.replace('/(tabs)/scan');
    } else if (!user && !inAuthGroup) {
      // User is not signed in but not in auth group, redirect to sign-in
      console.log('🚀 Redirecting unauthenticated user to sign-in');
      router.replace('/(auth)/sign-in');
    }
  }, [user, initializing, segments, router]);

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
  return <Slot />;
}