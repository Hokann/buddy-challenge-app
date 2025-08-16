// Function signature for Gemini analysis (to be implemented)
import { createClient } from 'npm:@supabase/supabase-js@2'

async function sendToGemini(
  dietPreferences: string[],
  allergens: string[],
  ingredientsText: string
): Promise<{
  success: boolean;
  analysis?: any;
  error?: string;
}> {
  // Implementation will go here
  throw new Error('sendToGemini not implemented yet')
}

Deno.serve(async (req) => {
  try {
    // 1. Receive the OpenFoodFacts product JSON
    const requestData = await req.json();
    
    // Extract product and user_id from request
    const product = requestData.product || requestData;
    const userId = requestData.user_id;
    
    if (!userId) {
      throw new Error('user_id is required');
    }
    
    // Check if ingredients_text exists, use "none listed" as fallback
    const ingredientsText = product.ingredients_text_en || 
                           product.ingredients_text || 
                           "none listed";

    // 2. Fetch user preferences from Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? 'http://127.0.0.1:54321',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // ideally, want to use ANON key if possible
    );

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('diet, allergies')
      .eq('id', userId);

    if (profileError) {
      throw new Error(`Failed to fetch user profile: ${profileError.message}`);
    }

    if (!profiles || profiles.length === 0) {
      throw new Error(`No profile found for user: ${userId}`);
    }

    if (profiles.length > 1) {
      throw new Error(`Multiple profiles found for user: ${userId}`);
    }

    const profile = profiles[0];

    // Extract diet and allergens
    // Handle diet as either string or array for flexibility
    const dietPreferences = Array.isArray(profile.diet) 
      ? profile.diet 
      : (profile.diet ? [profile.diet] : []);
    const allergens = profile.allergies || [];

    // 3. Call sendToGemini function
    /*const analysisResult = await sendToGemini(
      dietPreferences,
      allergens,
      ingredientsText
    );*/

    // Return the response
    return new Response(JSON.stringify({
      success: true,
      product_name: product.product_name || product.product_name_en,
      user_preferences: {
        diet: dietPreferences,
        allergens: allergens
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to process product',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
// 101372bd-d678-4d37-a004-da061399d5a0


/*
curl -X POST http://localhost:54321/functions/v1/analyzeProduct \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "101372bd-d678-4d37-a004-da061399d5a0",
    "product": {
      "product_name": "Chocolate Chip Cookies",
      "product_name_en": "Chocolate Chip Cookies",
      "ingredients_text": "wheat flour, sugar, butter, chocolate chips (sugar, cocoa butter, milk powder), eggs",
      "ingredients_text_en": "wheat flour, sugar, butter, chocolate chips (sugar, cocoa butter, milk powder), eggs",
      "code": "1234567890",
      "brands": "Test Brand"
    }
  }'
  */

