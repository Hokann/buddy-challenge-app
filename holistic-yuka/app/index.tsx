// app/index.tsx
import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from './hooks/useAuth';

export default function Index() {
  const { user, initializing } = useAuth();

  // Show loading while initializing
  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
        <ActivityIndicator size="large" color="#3FA300" />
      </View>
    );
  }

  // Redirect based on auth state
  if (user) {
    return <Redirect href="/(tabs)/scan" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}