import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { setOnboardingComplete } from '../utils/onboarding'

const ALLERGY_OPTIONS = [
  'Nuts',
  'Peanuts', 
  'Dairy',
  'Eggs',
  'Soy',
  'Wheat/Gluten',
  'Fish',
  'Shellfish',
  'Sesame',
  'Sulfites'
]

export default function AllergyPreference() {
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([])
  const router = useRouter()

  const toggleAllergy = (allergy: string) => {
    const isSelected = selectedAllergies.includes(allergy)
    if (isSelected) {
      console.log('🚫 AllergyPreference: Deselected allergy:', allergy)
      setSelectedAllergies(prev => prev.filter(a => a !== allergy))
    } else {
      console.log('🚫 AllergyPreference: Selected allergy:', allergy)
      setSelectedAllergies(prev => [...prev, allergy])
    }
  }

  const handleNext = async () => {
    console.log('🚫 AllergyPreference: Complete Setup button pressed')
    console.log('🚫 AllergyPreference: Selected allergies:', selectedAllergies)
    // TODO: Save to Supabase when ready
    console.log('🔄 AllergyPreference: Marking onboarding as complete...')
    // Mark onboarding as complete
    await setOnboardingComplete()
    console.log('🚀 AllergyPreference: Navigating to scan page')
    router.replace('/(tabs)/scan')
  }

  console.log('🚫 AllergyPreference: Component rendered')

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Allergy Preferences</Text>
        <Text style={styles.subtitle}>Select all allergies that apply to you</Text>
        
        <View style={styles.optionsContainer}>
          {ALLERGY_OPTIONS.map((allergy) => (
            <TouchableOpacity
              key={allergy}
              style={[
                styles.option,
                selectedAllergies.includes(allergy) && styles.selectedOption
              ]}
              onPress={() => toggleAllergy(allergy)}
            >
              <Text style={[
                styles.optionText,
                selectedAllergies.includes(allergy) && styles.selectedOptionText
              ]}>
                {allergy}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Complete Setup</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )
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
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#026A3D',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 40,
  },
  option: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  selectedOption: {
    backgroundColor: '#026A3D',
    borderColor: '#026A3D',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  selectedOptionText: {
    color: '#FFFFFF',
  },
  buttonContainer: {
    marginTop: 20,
  },
  nextButton: {
    backgroundColor: '#026A3D',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
})