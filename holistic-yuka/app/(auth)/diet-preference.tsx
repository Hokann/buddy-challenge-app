import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

const DIET_OPTIONS = [
  'None',
  'Vegetarian',
  'Vegan',
  'Pescatarian',
  'Keto',
  'Paleo',
  'Mediterranean',
  'Low Carb',
  'Gluten Free'
]

export default function DietPreference() {
  const [selectedDiet, setSelectedDiet] = useState<string | null>(null)
  const router = useRouter()

  const handleNext = () => {
    console.log('🥗 DietPreference: Next button pressed')
    console.log('🥗 DietPreference: Selected diet:', selectedDiet || 'None selected')
    console.log('🚀 DietPreference: Navigating to allergy preference')
    // Pass the selected diet to the allergy page via URL params
    const dietParam = selectedDiet === 'None' || !selectedDiet ? 'null' : selectedDiet
    router.push(`/(auth)/allergy-preference?diet=${encodeURIComponent(dietParam)}`)
  }

  console.log('🥗 DietPreference: Component rendered')

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Diet Preference</Text>
        <Text style={styles.subtitle}>Choose your dietary preference</Text>
        
        <View style={styles.optionsContainer}>
          {DIET_OPTIONS.map((diet) => (
            <TouchableOpacity
              key={diet}
              style={[
                styles.option,
                selectedDiet === diet && styles.selectedOption
              ]}
              onPress={() => {
                console.log('🥗 DietPreference: Selected diet option:', diet)
                setSelectedDiet(diet)
              }}
            >
              <Text style={[
                styles.optionText,
                selectedDiet === diet && styles.selectedOptionText
              ]}>
                {diet}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Next</Text>
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