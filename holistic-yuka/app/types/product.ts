export interface Product {
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  categories?: string;
  categories_en?: string;
  nutriments?: {
    [key: string]: number | string;
  };
  ingredients_text?: string;
  ingredients_text_en?: string;
  nova_group?: number;
  nutriscore_grade?: string;
  ecoscore_grade?: string;
  image_url?: string;
  image_front_url?: string;
  countries_en?: string;
  manufacturing_places_en?: string;
}

export interface ProductResponse {
  status: number;
  product?: Product;
  status_verbose?: string;
}

export interface BarcodeData {
  data: string;
  type: string;
}