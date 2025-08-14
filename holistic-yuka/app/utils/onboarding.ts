import AsyncStorage from '@react-native-async-storage/async-storage'

const ONBOARDING_KEY = 'hasCompletedOnboarding'

export const setOnboardingComplete = async () => {
  try {
    console.log('📝 Onboarding: Setting onboarding as complete...')
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true')
    console.log('✅ Onboarding: Successfully marked as complete')
  } catch (error) {
    console.error('❌ Onboarding: Error setting onboarding complete:', error)
  }
}

export const clearOnboardingStatus = async () => {
  try {
    console.log('🗑️ Onboarding: Clearing onboarding status...')
    await AsyncStorage.removeItem(ONBOARDING_KEY)
    console.log('✅ Onboarding: Status successfully cleared')
  } catch (error) {
    console.error('❌ Onboarding: Error clearing onboarding status:', error)
  }
}

export const hasCompletedOnboarding = async (): Promise<boolean> => {
  try {
    console.log('🔍 Onboarding: Checking completion status...')
    const value = await AsyncStorage.getItem(ONBOARDING_KEY)
    const completed = value === 'true'
    console.log('📊 Onboarding: Has completed onboarding:', completed, '(raw value:', value, ')')
    return completed
  } catch (error) {
    console.error('❌ Onboarding: Error checking onboarding status:', error)
    return false
  }
}