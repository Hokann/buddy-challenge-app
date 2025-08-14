import AsyncStorage from '@react-native-async-storage/async-storage'

const ONBOARDING_KEY = 'hasCompletedOnboarding'

export const setOnboardingComplete = async () => {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true')
    console.log('Onboarding marked as complete')
  } catch (error) {
    console.error('Error setting onboarding complete:', error)
  }
}

export const hasCompletedOnboarding = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_KEY)
    const completed = value === 'true'
    console.log('Has completed onboarding:', completed)
    return completed
  } catch (error) {
    console.error('Error checking onboarding status:', error)
    return false
  }
}