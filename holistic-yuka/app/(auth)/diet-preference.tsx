import { useRouter } from 'expo-router'
import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function DietPreference() {
  const router = useRouter()

  const handleNext = () => {
    console.log('Diet preference: Next button pressed')
    router.push('/(auth)/allergy-preference')
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Diet Preference</Text>
      <Text style={styles.subtitle}>Choose your dietary preference</Text>
      
      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextButtonText}>Next</Text>
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