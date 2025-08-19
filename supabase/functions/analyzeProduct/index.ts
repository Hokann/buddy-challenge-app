import { createClient } from 'npm:@supabase/supabase-js@2'
import { analyzeDiet } from './analyze-diet.ts';
import { analyzeAllergens } from './analyze-allergens.ts';

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
    const allergenAnalysis = await analyzeAllergens(
      allergens,
      ingredientsText
    );
    
    const dietAnalysis = await analyzeDiet(
      dietPreferences,
      ingredientsText
    )

    // Return the response
    return new Response(JSON.stringify({
      success: true,
      userId: userId,
      product_name: product.product_name_en || product.product_name,
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