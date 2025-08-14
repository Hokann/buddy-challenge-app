// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { DeviceEventEmitter } from 'react-native';

function CustomTabBarButton({ children, onPress }: any) {
  return (
    <TouchableOpacity
      style={styles.customTabButton}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.scanButtonContainer}>
        {children}
      </View>
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  const router = useRouter();
  const [isCameraVisible, setIsCameraVisible] = useState(false);

  useEffect(() => {
    const showCameraListener = DeviceEventEmitter.addListener('cameraOpened', () => {
      setIsCameraVisible(true);
    });
    
    const hideCameraListener = DeviceEventEmitter.addListener('cameraClosed', () => {
      setIsCameraVisible(false);
    });

    return () => {
      showCameraListener.remove();
      hideCameraListener.remove();
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#026A3D',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: isCameraVisible ? { display: 'none' } : {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          borderTopWidth: 1,
          height: 88,
          paddingBottom: 24,
          paddingTop: 16,
          paddingHorizontal: 24,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.cameraIconWrapper}>
              <Ionicons name="barcode-outline" size={32} color="#FFFFFF" />
            </View>
          ),
          tabBarButton: (props) => <CustomTabBarButton {...props} />,
          tabBarLabelStyle: { display: 'none' },
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            // Navigate to scan screen and emit scan trigger event
            router.push('/(tabs)/scan');
            setTimeout(() => {
              DeviceEventEmitter.emit('triggerScan');
            }, 100);
          },
        }}
      />
      <Tabs.Screen
        name="scanHistory"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null, // Hide from tab bar
          title: 'Profile',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  customTabButton: {
    top: -16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanButtonContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#026A3D',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#026A3D',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    position: 'relative',
  },
  cameraIconWrapper: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -16 }, { translateY: -16 }],
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
});