#!/usr/bin/env python3
"""
OpenFoodFacts Random Products Fetcher

Fetches N random English products from OpenFoodFacts and logs the API responses.
"""

import requests
import json
import time
import logging
from typing import List, Dict, Any
import argparse

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class RandomProductsFetcher:
    def __init__(self):
        self.base_url = "https://world.openfoodfacts.org/cgi/search.pl"
        self.random_url = "https://world.openfoodfacts.org/api/v0/product"
        self.rate_limit_delay = 0.1
        
    def fetch_random_products(self, count: int = 10) -> List[Dict[str, Any]]:
        """
        Fetch random English products from OpenFoodFacts.
        Uses search with random page numbers to simulate randomness.
        """
        products = []
        attempts = 0
        max_attempts = count * 3  # Allow more attempts to get desired count
        
        logger.info(f"Fetching {count} random English products...")
        
        while len(products) < count and attempts < max_attempts:
            try:
                # Use random page numbers to get variety
                import random
                page = random.randint(1, 1000)
                
                params = {
                    'search_terms': '',
                    'page': page,
                    'page_size': 20,
                    'json': 1,
                    'fields': 'code,product_name,product_name_en,ingredients_text,ingredients_text_en,brands,categories,nutriscore_grade,nova_group'
                }
                
                logger.info(f"Fetching from page {page} (attempt {attempts + 1}/{max_attempts})")
                
                response = requests.get(self.base_url, params=params, timeout=30)
                response.raise_for_status()
                
                # Log the raw API response
                logger.info(f"API Response Status: {response.status_code}")
                logger.info(f"API Response Headers: {dict(response.headers)}")
                
                data = response.json()
                page_products = data.get('products', [])
                
                logger.info(f"Raw API Response: {json.dumps(data, indent=2)}")
                
                # Filter for English products
                for product in page_products:
                    if len(products) >= count:
                        break
                        
                    # Check if product has English content
                    has_english = (
                        product.get('product_name_en') or 
                        product.get('ingredients_text_en') or
                        (product.get('product_name', '').replace(' ', '').isalpha())
                    )
                    
                    if has_english:
                        products.append(product)
                        logger.info(f"Added product {len(products)}: {product.get('product_name_en', product.get('product_name', 'Unknown'))}")
                
                attempts += 1
                time.sleep(self.rate_limit_delay)
                
            except requests.exceptions.RequestException as e:
                logger.error(f"Error fetching products: {e}")
                attempts += 1
                time.sleep(1)  # Wait longer on error
                continue
            except ValueError as e:
                logger.error(f"Error parsing JSON: {e}")
                attempts += 1
                continue
        
        logger.info(f"Successfully fetched {len(products)} products out of {count} requested")
        return products[:count]  # Return exactly the requested count
    
    def log_product_details(self, products: List[Dict[str, Any]]) -> None:
        """Log detailed information about each product."""
        for i, product in enumerate(products, 1):
            logger.info(f"Full product data: {json.dumps(product, indent=2)}")
    
    def save_products_json(self, products: List[Dict[str, Any]], filename: str = 'random_products.json') -> None:
        """Save products to JSON file."""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(products, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Saved {len(products)} products to {filename}")
    
    def fetch_and_log(self, count: int = 10, save_file: bool = True) -> List[Dict[str, Any]]:
        """Main method to fetch random products and log responses."""
        try:
            products = self.fetch_random_products(count)
            
            if products:
                self.log_product_details(products)
                
                if save_file:
                    self.save_products_json(products)
                
                logger.info(f"\n=== SUMMARY ===")
                logger.info(f"Total products fetched: {len(products)}")
                logger.info(f"Products with English names: {sum(1 for p in products if p.get('product_name_en'))}")
                logger.info(f"Products with English ingredients: {sum(1 for p in products if p.get('ingredients_text_en'))}")
            else:
                logger.warning("No products were fetched")
            
            return products
            
        except Exception as e:
            logger.error(f"Error in fetch_and_log: {e}")
            return []

def main():
    """Main function with command line arguments."""
    parser = argparse.ArgumentParser(description='Fetch random OpenFoodFacts products')
    parser.add_argument('-n', '--count', type=int, default=5, 
                       help='Number of random products to fetch (default: 5)')
    parser.add_argument('--no-save', action='store_true', 
                       help='Do not save products to JSON file')
    
    args = parser.parse_args()
    
    fetcher = RandomProductsFetcher()
    
    logger.info("Starting random products fetcher...")
    products = fetcher.fetch_and_log(count=args.count, save_file=not args.no_save)
    
    if products:
        logger.info("Fetch completed successfully!")
    else:
        logger.error("No products were fetched")

if __name__ == "__main__":
    main()