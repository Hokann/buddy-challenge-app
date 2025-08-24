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

# Configure logging for JSON output
class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_record = {
            'timestamp': self.formatTime(record),
            'level': record.levelname,
            'message': record.getMessage(),
            'module': record.module
        }
        return json.dumps(log_record)

logger = logging.getLogger(__name__)
handler = logging.StreamHandler()
handler.setFormatter(JSONFormatter())
logger.addHandler(handler)
logger.setLevel(logging.INFO)

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
        
        fetch_start_info = {
            'action': 'fetch_start',
            'requested_count': count,
            'max_attempts': max_attempts
        }
        logger.info(json.dumps(fetch_start_info))
        
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
                    'fields': 'code,product_name,product_name_en,ingredients_text,ingredients_text_en,brands,categories,nutriscore_grade,nova_group,traces,traces_tags,allergens,allergens_tags,allergens_from_ingredients,allergens_from_user'
                }
                
                fetch_attempt_info = {
                    'action': 'fetch_attempt',
                    'page': page,
                    'attempt': attempts + 1,
                    'max_attempts': max_attempts
                }
                logger.info(json.dumps(fetch_attempt_info))
                
                response = requests.get(self.base_url, params=params, timeout=30)
                response.raise_for_status()
                
                # Log the raw API response
                api_response_data = {
                    'api_response_status': response.status_code,
                    'api_response_headers': dict(response.headers),
                    'page_number': page,
                    'attempt': attempts + 1
                }
                logger.info(json.dumps(api_response_data))
                
                data = response.json()
                page_products = data.get('products', [])
                
                raw_response_data = {
                    'raw_api_response': data,
                    'products_count': len(page_products)
                }
                logger.info(json.dumps(raw_response_data))
                
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
                        product_added_data = {
                            'action': 'product_added',
                            'product_number': len(products),
                            'product_name': product.get('product_name_en', product.get('product_name', 'Unknown')),
                            'product_code': product.get('code')
                        }
                        logger.info(json.dumps(product_added_data))
                
                attempts += 1
                time.sleep(self.rate_limit_delay)
                
            except requests.exceptions.RequestException as e:
                request_error = {
                    'action': 'request_error',
                    'error_message': str(e),
                    'error_type': type(e).__name__,
                    'attempt': attempts + 1
                }
                logger.error(json.dumps(request_error))
                attempts += 1
                time.sleep(1)  # Wait longer on error
                continue
            except ValueError as e:
                json_error = {
                    'action': 'json_parse_error',
                    'error_message': str(e),
                    'error_type': type(e).__name__,
                    'attempt': attempts + 1
                }
                logger.error(json.dumps(json_error))
                attempts += 1
                continue
        
        fetch_summary = {
            'action': 'fetch_completed',
            'products_fetched': len(products),
            'products_requested': count,
            'success': True
        }
        logger.info(json.dumps(fetch_summary))
        return products[:count]  # Return exactly the requested count
    
    def log_product_details(self, products: List[Dict[str, Any]]) -> None:
        """Log detailed information about each product."""
        for i, product in enumerate(products, 1):
            product_detail = {
                'action': 'product_detail',
                'product_index': i,
                'product_data': product
            }
            logger.info(json.dumps(product_detail))
    
    def reorder_product_fields(self, product: Dict[str, Any]) -> Dict[str, Any]:
        """Reorder product fields to place allergen fields after traces."""
        # Define the desired field order
        field_order = [
            'code', 'product_name', 'product_name_en', 'ingredients_text', 'ingredients_text_en',
            'brands', 'categories', 'nutriscore_grade', 'nova_group',
            'traces', 'traces_tags',
            'allergens', 'allergens_tags', 'allergens_from_ingredients', 'allergens_from_user'
        ]
        
        # Create ordered dictionary with fields in desired order
        ordered_product = {}
        
        # Add fields in specified order if they exist
        for field in field_order:
            if field in product:
                ordered_product[field] = product[field]
        
        # Add any remaining fields that weren't in our order list
        for key, value in product.items():
            if key not in ordered_product:
                ordered_product[key] = value
        
        return ordered_product

    def save_products_json(self, products: List[Dict[str, Any]], filename: str = 'random_products.json') -> None:
        """Save products to JSON file with reordered fields."""
        # Reorder fields in each product
        reordered_products = [self.reorder_product_fields(product) for product in products]
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(reordered_products, f, indent=2, ensure_ascii=False)
        
        save_info = {
            'action': 'file_saved',
            'products_count': len(products),
            'filename': filename
        }
        logger.info(json.dumps(save_info))
    
    def fetch_and_log(self, count: int = 10, save_file: bool = True) -> List[Dict[str, Any]]:
        """Main method to fetch random products and log responses."""
        try:
            products = self.fetch_random_products(count)
            
            if products:
                self.log_product_details(products)
                
                if save_file:
                    self.save_products_json(products)
                
                summary = {
                    'action': 'final_summary',
                    'total_products_fetched': len(products),
                    'products_with_english_names': sum(1 for p in products if p.get('product_name_en')),
                    'products_with_english_ingredients': sum(1 for p in products if p.get('ingredients_text_en'))
                }
                logger.info(json.dumps(summary))
            else:
                warning = {
                    'action': 'warning',
                    'message': 'No products were fetched'
                }
                logger.warning(json.dumps(warning))
            
            return products
            
        except Exception as e:
            error_info = {
                'action': 'error',
                'message': f"Error in fetch_and_log: {e}",
                'error_type': type(e).__name__
            }
            logger.error(json.dumps(error_info))
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
    
    start_info = {
        'action': 'start',
        'message': 'Starting random products fetcher',
        'requested_count': args.count,
        'save_file': not args.no_save
    }
    logger.info(json.dumps(start_info))
    
    products = fetcher.fetch_and_log(count=args.count, save_file=not args.no_save)
    
    if products:
        completion_info = {
            'action': 'completion',
            'message': 'Fetch completed successfully',
            'products_retrieved': len(products)
        }
        logger.info(json.dumps(completion_info))
    else:
        error_info = {
            'action': 'error',
            'message': 'No products were fetched'
        }
        logger.error(json.dumps(error_info))

if __name__ == "__main__":
    main()