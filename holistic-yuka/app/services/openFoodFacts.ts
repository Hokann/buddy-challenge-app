import { ProductResponse } from '../types/product';

const BASE_URL = 'https://world.openfoodfacts.org/api/v0';

const FIELDS = [
  'product_name',
  'product_name_en',
  'brands',
  'categories',
  'categories_en',
  'nutriments',
  'ingredients_text',
  'ingredients_text_en',
  'nova_group',
  'nutriscore_grade',
  'ecoscore_grade',
  'image_url',
  'image_front_url',
  'countries_en',
  'manufacturing_places_en',
  'allergens_en',
  'additives_tags',
  'energy_kcal_100g',
  'labels_en',
  'serving_size'
].join(',');

export const openFoodFactsService = {
  async getProduct(barcode: string): Promise<ProductResponse> {
    try {
      const url = `${BASE_URL}/product/${barcode.trim()}.json?fields=${FIELDS}&lc=en`;
      console.log('Fetching from:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API Request Failed with status: ${response.status}`);
      }
      
      const data: ProductResponse = await response.json();
      console.log('API Response:', data);
      
      return data;
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  }
};