import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

const DIET_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Keto',
  'Dairy Free',
  'Gluten Free',
  'Pescatarian',
  'Paleo',
  'Mediterranean',
  'Low Carb'
]

export default function DietPreference() {
  const [selectedDiets, setSelectedDiets] = useState<string[]>([])
  const router = useRouter()

  const toggleDiet = (diet: string) => {
    setSelectedDiets(prev => {
      if (prev.includes(diet)) {
        console.log('🥗 DietPreference: Deselected diet:', diet)
        return prev.filter(d => d !== diet)
      } else {
        console.log('🥗 DietPreference: Selected diet:', diet)
        return [...prev, diet]
      }
    })
  }

  const handleNext = () => {
    console.log('🥗 DietPreference: Next button pressed')
    console.log('🥗 DietPreference: Selected diets:', selectedDiets)
    console.log('🚀 DietPreference: Navigating to allergy preference')
    // Pass the selected diets to the allergy page via URL params
    const dietParam = selectedDiets.length > 0 ? selectedDiets.join(',') : 'null'
    router.push(`/(auth)/allergy-preference?diet=${encodeURIComponent(dietParam)}`)
  }

  console.log('🥗 DietPreference: Component rendered')

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Diet Preferences</Text>
        <Text style={styles.subtitle}>Choose all dietary preferences that apply to you</Text>
        
        <View style={styles.optionsContainer}>
          {DIET_OPTIONS.map((diet) => (
            <TouchableOpacity
              key={diet}
              style={[
                styles.option,
                selectedDiets.includes(diet) && styles.selectedOption
              ]}
              onPress={() => toggleDiet(diet)}
            >
              <Text style={[
                styles.optionText,
                selectedDiets.includes(diet) && styles.selectedOptionText
              ]}>
                {diet}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {selectedDiets.length > 0 && (
          <View style={styles.selectionSummary}>
            <Text style={styles.summaryText}>
              Selected: {selectedDiets.join(', ')}
            </Text>
          </View>
        )}

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
  selectionSummary: {
    backgroundColor: '#E7F5E7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryText: {
    fontSize: 14,
    color: '#026A3D',
    fontWeight: '500',
    textAlign: 'center',
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