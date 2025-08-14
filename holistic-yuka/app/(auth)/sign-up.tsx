// (auth)/signup.tsx
import { Link, useRouter } from 'expo-router'
import React, { useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native'
import { useAuth } from '../hooks/useAuth'
import { clearOnboardingStatus } from '../utils/onboarding'

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { signUp, loading } = useAuth()
  const router = useRouter()

  const handleSignUp = async () => {
    console.log('📝 SignUp: handleSignUp called with:', { email, passwordLength: password.length })
    
    if (!email || !password) {
      console.log('❌ SignUp: Missing email or password')
      Alert.alert('Error', 'Please fill in all fields')
      return
    }

    if (password.length < 6) {
      console.log('❌ SignUp: Password too short')
      Alert.alert('Error', 'Password must be at least 6 characters')
      return
    }

    console.log('🔄 SignUp: Calling signUp service...')
    const result = await signUp(email, password)
    
    if (result.error) {
      console.log('❌ SignUp: Error from signUp service:', result.error)
      Alert.alert('Sign Up Error', result.error)
    } else {
      console.log('✅ SignUp: Account created successfully!')
      console.log('🔄 SignUp: Clearing onboarding status...')
      // Clear any existing onboarding status for new user
      await clearOnboardingStatus()
      console.log('⏸️ SignUp: Onboarding cleared, letting layout handle navigation')
      // Don't manually navigate - let the layout handle it after auth state changes
    }
  }

  const handleBack = () => {
    console.log('⬅️ SignUp: Back button pressed')
    router.back()
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
    {/* Back Button */}
    <TouchableOpacity style={styles.backButton} onPress={handleBack}>
      <Text style={styles.backButtonText}>← Back</Text>
    </TouchableOpacity>

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* Header */}
        <Text style={styles.title}>Holsty</Text>
        <Text style={styles.subtitle}>Create an account today</Text>
        
        {/* Form */}
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Password (min 6 characters)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleSignUp}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </Text>
        </TouchableOpacity>

        {/* Footer */}
        <Text style={styles.footerText}>
          Already have an account?{' '}
          <Link href="/(auth)/sign-in" asChild>
            <Text style={styles.link}>Sign In</Text>
          </Link>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
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
  backButton: {
    padding: 8,
    marginTop: 50,
    marginLeft: 5
  },
  backButtonText: {
    fontSize: 16,
    color: '#026A3D',
    fontWeight: '500',
  },
  title: {
    fontSize: 38,
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
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 20,
    color: '#374151',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  button: {
    backgroundColor: '#026A3D',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 30,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footerText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 30,
  },
  link: {
    color: '#026A3D',
    fontWeight: '600',
  },
})