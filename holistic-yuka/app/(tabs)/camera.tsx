// app/(tabs)/camera.tsx
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

export default function CameraScreen() {
  const router = useRouter();

  useEffect(() => {
    // Immediately redirect to the main scan screen and trigger scan
    router.replace('/(tabs)/scan');
  }, []);

  // This component won't actually render anything visible
  return <View />;
}