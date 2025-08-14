// app/welcome.tsx
import { useRouter } from 'expo-router';
import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function Welcome() {
  const router = useRouter();

  const handleCreateAccount = () => {
    router.push('/(auth)/sign-up');
  };

  const handleSignIn = () => {
    router.push('/(auth)/sign-in');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appName}>Holsty</Text>
        <Text style={styles.tagline}>See the whole picture</Text>
      </View>

      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.heroIllustration}>
          <Text style={styles.phoneIcon}>📱</Text>
          <Text style={styles.scanIcon}>🔍</Text>
          <Text style={styles.productIcon}>📦</Text>
        </View>
        
        <Text style={styles.heroTitle}>Welcome to Holsty</Text>
        <Text style={styles.heroDescription}>
          Discover what's really in your food with AI-powered scanning and personalized health insights.
        </Text>
      </View>

      {/* CTA Buttons */}
      <View style={styles.ctaSection}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleCreateAccount}>
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>

      </View>

      {/* Progress Indicator */}
      <View style={styles.progressSection}>
        <View style={styles.progressDots}>
          <View style={[styles.dot, styles.activeDot]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
        <Text style={styles.progressText}>1 of 4</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: '#026A3D',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 80,
    flex: 1,
    justifyContent: 'center',
  },
  heroIllustration: {
    width: 200,
    height: 160,
    backgroundColor: '#E7F5E7',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    flexDirection: 'row',
    position: 'relative',
  },
  phoneIcon: {
    fontSize: 60,
    marginRight: 10,
  },
  scanIcon: {
    fontSize: 30,
    position: 'absolute',
    top: 20,
    right: 30,
  },
  productIcon: {
    fontSize: 40,
    marginLeft: 10,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 16,
  },
  heroDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  ctaSection: {
    marginTop: 'auto',
  },
  primaryButton: {
    backgroundColor: '#026A3D',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  progressSection: {
    alignItems: 'center',
    marginTop: 24,
  },
  progressDots: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#026A3D',
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
});