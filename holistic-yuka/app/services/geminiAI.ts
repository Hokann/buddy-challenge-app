import { HealthAnalysis } from '../types/healthAnalysis';
import { Product } from '../types/product';

const GEMINI_API_KEY = 'AIzaSyDyTRrlnwa9vlZTiEDDXJssA3QWlhEYLVY'; // TODO: Replace with your actual API key
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Response schema for structured JSON output
const HEALTH_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    overall_score: {
      type: "number",
      description: "Overall health score from 0-100"
    },
    sub_scores: {
      type: "object",
      properties: {
        nutrition: { type: "number", description: "Nutrition score 0-100" },
        additives: { type: "number", description: "Additives score 0-100" },
        oils: { type: "number", description: "Oils quality score 0-100" },
        toxins: { type: "number", description: "Toxins/contaminants score 0-100" },
        allergens: { type: "number", description: "Allergen safety score 0-100" }
      },
      required: ["nutrition", "additives", "oils", "toxins", "allergens"]
    },
    red_flags: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: { type: "string", description: "Category of the red flag" },
          issue: { type: "string", description: "Specific issue identified" },
          severity: { type: "string", enum: ["low", "medium", "high"] },
          explanation: { type: "string", description: "Why this is concerning" }
        },
        required: ["category", "issue", "severity", "explanation"]
      }
    },
    recommendation: {
      type: "string",
      description: "Overall recommendation for health-conscious consumers"
    },
    explanation: {
      type: "string",
      description: "Detailed explanation of the analysis and reasoning"
    }
  },
  required: ["overall_score", "sub_scores", "red_flags", "recommendation", "explanation"]
};

const HEALTH_ANALYSIS_PROMPT = `You are an expert product health analyzer. Given detailed JSON data for a food or consumable product, analyze it holistically from a health-conscious perspective, prioritizing natural, whole-food ingredients and avoiding harmful substances.

Your task is to:

1. **Evaluate Nutrition:**
   - Assess macronutrients (protein, carbs, fats) with attention to added sugars, saturated fat, fiber content, and nutrient density.
   - Identify any nutrient imbalances or red flags.

2. **Identify and flag additives:**
   - Detect artificial sweeteners, colors, preservatives, emulsifiers, stabilizers, and flavor enhancers.
   - Highlight additives known to be controversial or linked with negative health outcomes.

3. **Detect seed oils/vegetable oils:**
   - Identify any refined seed or vegetable oils (e.g., sunflower, soybean, canola, corn, cottonseed, grapeseed oils).
   - Flag these oils as undesirable based on current holistic health research.

4. **Scan for toxins and contaminants:**
   - Check for any data indicating heavy metals (lead, mercury, cadmium, arsenic).
   - Note any pesticides, mycotoxins, or other environmental contaminants if present.

5. **Evaluate allergen and safety risks:**
   - Identify declared allergens and common cross-contamination warnings.
   - Flag any substances contraindicated for sensitive groups (e.g., pregnant women).

6. **Data enrichment:**
   - Integrate any additional data fields that highlight product origin, organic certifications, processing level (e.g., ultra-processed), and sourcing ethics if available.

7. **Produce a detailed analysis with:**
   - A summary health score from 0 to 100 reflecting overall product healthfulness.
   - A breakdown of sub-scores for nutrition, additives, oils, toxins, allergens (each 0-100).
   - A list of all detected red flags and warnings with explanations.
   - An overall plain-language recommendation statement tailored for a health-conscious consumer.
   - A detailed explanation of the analysis and reasoning.

**Instructions:**
- Use a compassionate but clear tone.
- Prioritize transparency and explain the reasoning behind each flagged issue.
- Assume the user is informed but not an expert, so avoid jargon without explanation.
- If nutritional data is limited, work with what's available and note limitations.

**Product Data to Analyze:**`;

export const geminiAIService = {
  async analyzeProductHealth(product: Product): Promise<HealthAnalysis> {
    // Check if API key is set
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured. Please set your API key in services/geminiAI.ts');
    }

    try {
      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: `${HEALTH_ANALYSIS_PROMPT}\n\n${JSON.stringify(product, null, 2)}`
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: HEALTH_ANALYSIS_SCHEMA,
          temperature: 0.1, // Lower temperature for more consistent results
        }
      };

      console.log('Sending request to Gemini AI...');
      
      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
        }
        const errorText = await response.text();
        console.error('Gemini API Error Response:', errorText);
        throw new Error(`Gemini API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Gemini AI Response:', data);

      // Extract the generated content
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
        const generatedText = data.candidates[0].content.parts[0].text;
        console.log('Generated text:', generatedText);
        
        try {
          const healthAnalysis: HealthAnalysis = JSON.parse(generatedText);
          return healthAnalysis;
        } catch (parseError) {
          console.error('Error parsing JSON response:', parseError);
          console.error('Raw response text:', generatedText);
          throw new Error('Failed to parse AI response as JSON');
        }
      } else {
        console.error('Invalid response structure:', data);
        throw new Error('Invalid response format from Gemini AI');
      }

    } catch (error) {
      console.error('Error analyzing product health:', error);
      throw error;
    }
  }
};