#!/usr/bin/env python3
"""
OpenFoodFacts TSV Ingredient Extractor

Extracts clean English ingredients from TSV file, including content in parentheses.
"""

import csv
import re
from typing import Dict, List
from collections import Counter
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class TSVIngredientsExtractor:
    def __init__(self):
        self.ingredient_counts: Counter = Counter()
        self.processed_count = 0
        
    def extract_ingredients_with_parentheses(self, ingredients_text: str) -> List[str]:
        """Extract individual ingredients including content in parentheses."""
        if not ingredients_text:
            return []
        
        # First, extract content from parentheses and add to main text
        parentheses_content = re.findall(r'\(([^)]+)\)', ingredients_text)
        
        # Remove parentheses but keep the content
        text_without_parens = re.sub(r'\([^)]*\)', '', ingredients_text)
        
        # Combine main text with parentheses content
        all_text = text_without_parens
        for content in parentheses_content:
            all_text += ', ' + content
        
        # Split by common separators (comma, semicolon, etc.)
        ingredients = re.split(r'[,;]', all_text)
        
        clean_ingredients = []
        for ingredient in ingredients:
            # Clean up the text - keep only letters and spaces
            cleaned = re.sub(r'[^a-zA-Z\s]', '', ingredient)
            
            # Remove extra whitespace and convert to lowercase
            cleaned = ' '.join(cleaned.split()).lower().strip()
            
            # Only keep if it's a reasonable ingredient (not empty, not too short)
            if cleaned and len(cleaned) >= 3:
                # Split multi-word ingredients and add individual words too
                words = cleaned.split()
                if len(words) > 1:
                    clean_ingredients.append(cleaned)  # Keep full phrase
                    # Also add individual meaningful words
                    for word in words:
                        if len(word) >= 3:
                            clean_ingredients.append(word)
                else:
                    clean_ingredients.append(cleaned)
        
        return clean_ingredients
    
    def process_tsv_file(self, filename: str, max_rows: int = None) -> None:
        """Process TSV file and count ingredient frequencies."""
        logger.info(f"Processing TSV file: {filename}")
        
        try:
            with open(filename, 'r', encoding='utf-8') as file:
                # Create CSV reader for TSV (tab-separated)
                reader = csv.DictReader(file, delimiter='\t')
                
                for row_num, row in enumerate(reader, 1):
                    if max_rows and row_num > max_rows:
                        logger.info(f"Reached maximum rows limit: {max_rows}")
                        break
                    
                    # Check if product is from USA
                    countries = row.get('countries_en', '') or ''
                    countries = countries.lower()
                    if 'united states' not in countries and 'usa' not in countries:
                        continue
                    
                    # Get ingredients text from the row (prefer English)
                    ingredients_text = row.get('ingredients_text_en', '') or row.get('ingredients_text', '')
                    
                    if ingredients_text:
                        ingredients = self.extract_ingredients_with_parentheses(ingredients_text)
                        # Count each ingredient occurrence
                        for ingredient in ingredients:
                            self.ingredient_counts[ingredient] += 1
                        self.processed_count += 1
                    
                    # Log progress every 50000 rows
                    if row_num % 50000 == 0:
                        logger.info(f"Processed {row_num} rows, found {len(self.ingredient_counts)} unique ingredients, {self.processed_count} USA products")
                        
        except FileNotFoundError:
            logger.error(f"File {filename} not found")
        except Exception as e:
            logger.error(f"Error processing file: {e}")
    
    def filter_common_words(self) -> None:
        """Remove very common words that aren't actual ingredients."""
        common_words = {
            'and', 'or', 'the', 'of', 'in', 'with', 'from', 'by', 'for', 'on', 'at', 'to', 'as',
            'may', 'contain', 'contains', 'including', 'made', 'using', 'added', 'per', 'each',
            'less', 'than', 'more', 'some', 'other', 'also', 'natural', 'artificial', 'flavor',
            'flavoring', 'flavour', 'flavouring', 'extract', 'powder', 'dried', 'fresh'
        }
        
        # Remove common words and very short ingredients
        original_count = len(self.ingredient_counts)
        for word in common_words:
            if word in self.ingredient_counts:
                del self.ingredient_counts[word]
        
        # Remove very short ingredients
        to_remove = [ingredient for ingredient in self.ingredient_counts if len(ingredient) < 3]
        for ingredient in to_remove:
            del self.ingredient_counts[ingredient]
        
        logger.info(f"Filtered {original_count - len(self.ingredient_counts)} common/short words")
    
    def get_top_ingredients(self, count: int = 10000) -> List[tuple]:
        """Get the top N most common ingredients."""
        self.filter_common_words()
        return self.ingredient_counts.most_common(count)
    
    def save_to_csv(self, filename: str = 'top_ingredients.csv', count: int = 10000) -> None:
        """Save top ingredients with frequencies to CSV file."""
        top_ingredients = self.get_top_ingredients(count)
        
        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(['ingredient', 'frequency'])
            
            for ingredient, frequency in top_ingredients:
                writer.writerow([ingredient, frequency])
        
        logger.info(f"Saved top {len(top_ingredients)} ingredients to {filename}")
    
    def save_to_txt(self, filename: str = 'top_ingredients.txt', count: int = 10000) -> None:
        """Save top ingredients to text file."""
        top_ingredients = self.get_top_ingredients(count)
        
        with open(filename, 'w', encoding='utf-8') as txtfile:
            for ingredient, frequency in top_ingredients:
                txtfile.write(f"{ingredient}\n")
        
        logger.info(f"Saved top {len(top_ingredients)} ingredients to {filename}")
    
    def preview_results(self, count: int = 30) -> None:
        """Preview top N most common ingredients."""
        top_ingredients = self.get_top_ingredients(count)
        logger.info(f"Top {len(top_ingredients)} most common ingredients:")
        for ingredient, frequency in top_ingredients:
            print(f"  {ingredient} ({frequency} times)")

def main():
    """Main function."""
    extractor = TSVIngredientsExtractor()
    
    # Configuration
    TSV_FILENAME = 'en.openfoodfacts.org.products.tsv'
    TOP_COUNT = 10000
    
    try:
        # Process entire TSV file to count all ingredient frequencies
        extractor.process_tsv_file(TSV_FILENAME)
        
        # Preview results
        extractor.preview_results(50)
        
        # Save results
        extractor.save_to_csv('top_10000_usa_ingredients.csv', TOP_COUNT)
        extractor.save_to_txt('top_10000_usa_ingredients.txt', TOP_COUNT)
        
        logger.info("Extraction completed!")
        logger.info(f"Total USA products processed: {extractor.processed_count}")
        logger.info(f"Total unique ingredients found: {len(extractor.ingredient_counts)}")
        logger.info(f"Saved top {TOP_COUNT} most common USA ingredients")
        
    except KeyboardInterrupt:
        logger.info("Extraction interrupted by user")
        extractor.preview_results(20)
        
        if extractor.ingredient_counts:
            extractor.save_to_csv('top_ingredients_partial.csv', 5000)
            logger.info("Saved partial results")

if __name__ == "__main__":
    main()