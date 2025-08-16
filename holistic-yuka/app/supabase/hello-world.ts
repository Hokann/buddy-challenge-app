import { supabase } from './supabaseConfig'

export const helloWorldFunction = async (name?: string) => {
  try {
    console.log('Calling hello-world function with name:', name)
    
    const { data, error } = await supabase.functions.invoke('hello-world', {
      body: { name }
    })

    if (error) {
      console.error('Hello world function error:', error)
      return { success: false, error: error.message }
    }

    console.log('Hello world function response:', data)
    return { success: true, data }
    
  } catch (err) {
    console.error('Network error calling hello-world function:', err)
    return { success: false, error: 'Network error' }
  }
}