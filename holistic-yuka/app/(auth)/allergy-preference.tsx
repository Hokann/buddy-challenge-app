import { useRouter } from 'expo-router'
import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { setOnboardingComplete } from '../utils/onboarding'

export default function AllergyPreference() {
  const router = useRouter()

  const handleNext = async () => {
    console.log('Allergy preference: Complete Setup button pressed')
    // Mark onboarding as complete
    await setOnboardingComplete()
    router.replace('/(tabs)/scan')
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Allergy Preference</Text>
      <Text style={styles.subtitle}>Select your allergies</Text>
      
      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextButtonText}>Complete Setup</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#026A3D',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 40,
    textAlign: 'center',
  },
  nextButton: {
    backgroundColor: '#026A3D',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
})