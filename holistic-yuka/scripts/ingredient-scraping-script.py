#!/usr/bin/env python3
"""
OpenFoodFacts Clean English Ingredients Extractor

Extracts only clean English ingredients - letters only, no numbers, spaces, or special characters.
"""

import requests
import csv
import time
import re
from typing import Set, List
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class CleanIngredientsExtractor:
    def __init__(self):
        self.base_url = "https://world.openfoodfacts.org/cgi/search.pl"
        self.unique_ingredients: Set[str] = set()
        self.processed_count = 0
        self.rate_limit_delay = 0.1
        
    def is_english_word(self, word: str) -> bool:
        """Check if word appears to be English (basic heuristic)."""
        # Must contain only letters
        if not word.isalpha():
            return False
        
        # Must be at least 2 characters
        if len(word) < 2:
            return False
        
        # Skip if it looks like abbreviations or codes
        if word.isupper() and len(word) <= 4:
            return False
        
        # Basic English pattern - avoid words with too many consonants in a row
        consonants_in_row = 0
        for char in word.lower():
            if char not in 'aeiou':
                consonants_in_row += 1
                if consonants_in_row > 4:  # Likely not English
                    return False
            else:
                consonants_in_row = 0
        
        return True
    
    def clean_ingredient(self, ingredient: str) -> str:
        """Clean ingredient to letters only."""
        # Remove everything except letters and spaces
        cleaned = re.sub(r'[^a-zA-Z\s]', '', ingredient)
        
        # Remove extra whitespace and convert to lowercase
        cleaned = ' '.join(cleaned.split()).lower()
        
        return cleaned.strip()
    
    def extract_ingredients(self, ingredients_text: str) -> List[str]:
        """Extract individual ingredients from comma-separated text."""
        if not ingredients_text:
            return []
        
        # Split by commas to get individual ingredients
        ingredients = ingredients_text.split(',')
        
        clean_ingredients = []
        for ingredient in ingredients:
            # Remove anything in parentheses
            cleaned = re.sub(r'\([^)]*\)', '', ingredient)
            
            # Clean up the text - keep only letters and spaces
            cleaned = re.sub(r'[^a-zA-Z\s]', '', cleaned)
            
            # Remove extra whitespace and convert to lowercase
            cleaned = ' '.join(cleaned.split()).lower().strip()
            
            # Only keep if it's a reasonable ingredient (not empty, not too short)
            if cleaned and len(cleaned) >= 3:
                clean_ingredients.append(cleaned)
        
        return clean_ingredients
    
    def fetch_products_page(self, page: int = 1, page_size: int = 100) -> List[dict]:
        """Fetch a page of products from OpenFoodFacts."""
        params = {
            'search_terms': '',
            'page': page,
            'page_size': page_size,
            'json': 1,
            'fields': 'ingredients_text_en,product_name'  # Only English ingredients
        }
        
        try:
            response = requests.get(self.base_url, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()
            return data.get('products', [])
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching page {page}: {e}")
            return []
        except ValueError as e:
            logger.error(f"Error parsing JSON for page {page}: {e}")
            return []
    
    def process_product(self, product: dict) -> None:
        """Extract ingredients from a single product."""
        # Only use English ingredients
        ingredients_text = product.get('ingredients_text_en', '')
        product_name = product.get('product_name', 'Unknown Product')
        
        if ingredients_text:
            ingredients = self.extract_ingredients(ingredients_text)
            self.unique_ingredients.update(ingredients)
    
    def extract_all_ingredients(self, max_pages: int = None, max_products: int = None, target_ingredients: int = None) -> None:
        """Extract ingredients from all products."""
        page = 1
        consecutive_empty_pages = 0
        max_empty_pages = 5
        
        logger.info("Starting clean English ingredient extraction...")
        
        while True:
            if max_pages and page > max_pages:
                logger.info(f"Reached maximum pages limit: {max_pages}")
                break
            
            if max_products and self.processed_count >= max_products:
                logger.info(f"Reached maximum products limit: {max_products}")
                break
                
            if target_ingredients and len(self.unique_ingredients) >= target_ingredients:
                logger.info(f"Reached target ingredients: {len(self.unique_ingredients)}")
                break
            
            logger.info(f"Processing page {page}...")
            
            products = self.fetch_products_page(page)
            
            if not products:
                consecutive_empty_pages += 1
                if consecutive_empty_pages >= max_empty_pages:
                    logger.info("Too many consecutive empty pages, stopping...")
                    break
            else:
                consecutive_empty_pages = 0
                products_with_english = 0
                
                for product in products:
                    if product.get('ingredients_text_en'):
                        self.process_product(product)
                        products_with_english += 1
                    
                    self.processed_count += 1
                    if max_products and self.processed_count >= max_products:
                        break
                        
                    if target_ingredients and len(self.unique_ingredients) >= target_ingredients:
                        break
                
                if page % 10 == 0:  # Log every 10 pages
                    logger.info(f"Page {page} completed. Products with English ingredients: {products_with_english}")
                    logger.info(f"Total processed: {self.processed_count}, Unique ingredients: {len(self.unique_ingredients)}")
            
            page += 1
            time.sleep(self.rate_limit_delay)
    
    def filter_common_words(self) -> None:
        """Remove very common words that aren't actual ingredients."""
        common_words = {
            'and', 'or', 'the', 'of', 'in', 'with', 'from', 'by', 'for', 'on', 'at', 'to', 'as',
            'may', 'contain', 'contains', 'including', 'made', 'using', 'added', 
            'less', 'than', 'more', 'some', 'other', 'each', 'per', 'also'
        }
        
        # Remove common words and very short ingredients
        self.unique_ingredients = {
            ingredient for ingredient in self.unique_ingredients 
            if ingredient not in common_words and len(ingredient) >= 3
        }
    
    def save_to_csv(self, filename: str = 'clean_ingredients.csv') -> None:
        """Save clean ingredients to CSV file."""
        self.filter_common_words()
        sorted_ingredients = sorted(self.unique_ingredients)
        
        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(['ingredient'])
            
            for ingredient in sorted_ingredients:
                writer.writerow([ingredient])
        
        logger.info(f"Saved {len(sorted_ingredients)} clean ingredients to {filename}")
    
    def save_to_txt(self, filename: str = 'clean_ingredients.txt') -> None:
        """Save clean ingredients to text file."""
        self.filter_common_words()
        sorted_ingredients = sorted(self.unique_ingredients)
        
        with open(filename, 'w', encoding='utf-8') as txtfile:
            for ingredient in sorted_ingredients:
                txtfile.write(f"{ingredient}\n")
        
        logger.info(f"Saved {len(sorted_ingredients)} clean ingredients to {filename}")
    
    def preview_results(self, count: int = 20) -> None:
        """Preview first N ingredients found."""
        sample = sorted(list(self.unique_ingredients))[:count]
        logger.info(f"Sample of {len(sample)} ingredients found:")
        for ingredient in sample:
            print(f"  {ingredient}")

def main():
    """Main function."""
    extractor = CleanIngredientsExtractor()
    
    # Configuration for 10,000 unique ingredients
    TARGET_INGREDIENTS = 10000
    MAX_PAGES = 1000  # Allow more pages to reach target
    
    try:
        extractor.extract_all_ingredients(
            max_pages=MAX_PAGES,
            target_ingredients=TARGET_INGREDIENTS
        )
        
        # Preview results
        extractor.preview_results(30)
        
        # Save results
        extractor.save_to_csv('unique_ingredients.csv')
        extractor.save_to_txt('unique_ingredients.txt')
        
        logger.info("Extraction completed!")
        logger.info(f"Total products processed: {extractor.processed_count}")
        logger.info(f"Clean English ingredients found: {len(extractor.unique_ingredients)}")
        
    except KeyboardInterrupt:
        logger.info("Extraction interrupted by user")
        extractor.preview_results(20)
        
        if extractor.unique_ingredients:
            extractor.save_to_csv('clean_ingredients_partial.csv')
            logger.info("Saved partial results")

if __name__ == "__main__":
    main()