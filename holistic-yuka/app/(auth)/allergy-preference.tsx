import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../supabase/supabaseConfig'
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
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const router = useRouter()
  const { diet } = useLocalSearchParams<{ diet: string }>()

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
    console.log('🚫 AllergyPreference: Diet from previous page:', diet)
    
    if (!user) {
      console.error('🚫 AllergyPreference: No user found')
      Alert.alert('Error', 'No user found')
      return
    }

    setLoading(true)
    
    try {
      // Prepare the values for database
      const dietValue = diet === 'null' || !diet ? null : diet.split(',')
      const allergiesValue = selectedAllergies.length > 0 ? selectedAllergies : null
      
      console.log('🚫 AllergyPreference: Saving to database:', { 
        userId: user.id, 
        diet: dietValue, 
        allergies: allergiesValue 
      })
      
      // Single database update with both diet and allergies
      const { error } = await supabase
        .from('profiles')
        .update({
          diet: dietValue,
          allergies: allergiesValue
        })
        .eq('id', user.id)

      if (error) {
        console.error('🚫 AllergyPreference: Database error:', error)
        Alert.alert('Error', 'Failed to save preferences')
        return
      }

      console.log('✅ AllergyPreference: Preferences saved successfully')
      console.log('🔄 AllergyPreference: Marking onboarding as complete...')
      
      // Mark onboarding as complete
      await setOnboardingComplete()
      
      console.log('🚀 AllergyPreference: Navigating to scan page')
      router.replace('/(tabs)/scan')
      
    } catch (error) {
      console.error('🚫 AllergyPreference: Error in handleNext:', error)
      Alert.alert('Error', 'Something went wrong')
    } finally {
      setLoading(false)
    }
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
          <TouchableOpacity 
            style={[styles.nextButton, loading && styles.buttonDisabled]} 
            onPress={handleNext}
            disabled={loading}
          >
            <Text style={styles.nextButtonText}>
              {loading ? 'Saving...' : 'Complete Setup'}
            </Text>
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
  buttonDisabled: {
    opacity: 0.6,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
})