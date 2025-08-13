// types/product.ts
export interface BarcodeData {
  data: string;
  type: string;
}

export interface Nutriments {
  energy?: number;
  energy_100g?: number;
  fat?: number;
  fat_100g?: number;
  saturated_fat?: number;
  saturated_fat_100g?: number;
  carbohydrates?: number;
  carbohydrates_100g?: number;
  sugars?: number;
  sugars_100g?: number;
  fiber?: number;
  fiber_100g?: number;
  proteins?: number;
  proteins_100g?: number;
  salt?: number;
  salt_100g?: number;
  sodium?: number;
  sodium_100g?: number;
  [key: string]: number | undefined;
}

export interface Product {
  id?: string;
  code?: string;
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  categories?: string;
  categories_en?: string;
  nutriscore_grade?: string;
  nova_group?: number;
  nutriments?: Nutriments;
  ingredients_text?: string;
  ingredients_text_en?: string;
  image_url?: string;
  image_front_url?: string;
  [key: string]: any;
}