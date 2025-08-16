import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Product } from '../types/product';

interface ProductDisplayProps {
  product: Product | null;
  showRawJson?: boolean;
}

export const ProductDisplay: React.FC<ProductDisplayProps> = ({ 
  product, 
  showRawJson = false 
}) => {
  if (!product) {
    return null; // Don't show anything if no product
  }

  if (showRawJson) {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}>JSON Response:</Text>
        <Text style={styles.jsonText}>
          {JSON.stringify({ product }, null, 2)}
        </Text>
      </ScrollView>
    );
  }

  const getNutriscoreColor = (grade: string) => {
    switch (grade?.toLowerCase()) {
      case 'a': return '#3FA300';
      case 'b': return '#85D996';
      case 'c': return '#FCD34D';
      case 'd': return '#FB923C';
      case 'e': return '#EF4444';
      default: return '#9CA3AF';
    }
  };

  const getNovaColor = (group: number) => {
    switch (group) {
      case 1: return '#3FA300';
      case 2: return '#85D996';
      case 3: return '#FCD34D';
      case 4: return '#EF4444';
      default: return '#9CA3AF';
    }
  };

  // Formatted display - clean product info
  return (
    <View style={styles.productCard}>
      {/* Product Header */}
      <View style={styles.productHeader}>
        {/* Product Image Placeholder */}
        <View style={styles.productImageContainer}>
          <View style={styles.productImage}>
            <Text style={styles.productImageIcon}>📦</Text>
          </View>
        </View>
        
        {/* Product Info */}
        <View style={styles.productInfo}>
          <Text style={styles.productName}>
            {product.product_name_en || product.product_name || 'Unknown Product'}
          </Text>
          
          {product.brands && (
            <Text style={styles.productBrand}>🏢 {product.brands}</Text>
          )}
          
          {product.categories_en && (
            <Text style={styles.productCategory}>📁 {product.categories_en}</Text>
          )}
        </View>
      </View>

      {/* Badges Section */}
      <View style={styles.badgesSection}>
        <Text style={styles.badgesTitle}>Quality Scores</Text>
        <View style={styles.badgeContainer}>
          {product.nutriscore_grade && (
            <View style={styles.badgeWrapper}>
              <View style={[
                styles.badge,
                { backgroundColor: getNutriscoreColor(product.nutriscore_grade) }
              ]}>
                <Text style={styles.badgeLabel}>Nutri-Score</Text>
                <Text style={styles.badgeValue}>
                  {product.nutriscore_grade.toUpperCase()}
                </Text>
              </View>
            </View>
          )}
          
          {product.nova_group && (
            <View style={styles.badgeWrapper}>
              <View style={[
                styles.badge,
                { backgroundColor: getNovaColor(product.nova_group) }
              ]}>
                <Text style={styles.badgeLabel}>NOVA</Text>
                <Text style={styles.badgeValue}>
                  {product.nova_group}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Nutrition Preview */}
      {product.nutriments && (
        <View style={styles.nutritionSection}>
          <Text style={styles.nutritionTitle}>Key Nutrition (per 100g)</Text>
          <View style={styles.nutritionGrid}>
            {product.nutriments.energy && (
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>
                  {Math.round(Number(product.nutriments.energy) * 0.239)} cal
                </Text>
                <Text style={styles.nutritionLabel}>Calories</Text>
              </View>
            )}
            {product.nutriments.sugars_100g && (
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>
                  {Math.round(Number(product.nutriments.sugars_100g))}g
                </Text>
                <Text style={styles.nutritionLabel}>Sugar</Text>
              </View>
            )}
            {product.nutriments.salt_100g && (
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>
                  {Math.round(Number(product.nutriments.salt_100g) * 10) / 10}g
                </Text>
                <Text style={styles.nutritionLabel}>Salt</Text>
              </View>
            )}
            {product.nutriments.fat_100g && (
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>
                  {Math.round(Number(product.nutriments.fat_100g))}g
                </Text>
                <Text style={styles.nutritionLabel}>Fat</Text>
              </View>
            )}
            {product.nutriments.proteins_100g && (
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>
                  {Math.round(Number(product.nutriments.proteins_100g))}g
                </Text>
                <Text style={styles.nutritionLabel}>Protein</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  jsonText: {
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 20,
  },
  productImageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  productImage: {
    width: 64,
    height: 64,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  productImageIcon: {
    fontSize: 24,
  },
  productInfo: {
    flex: 1,
    gap: 4,
  },
  productName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    lineHeight: 26,
    marginBottom: 8,
  },
  productBrand: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  badgesSection: {
    marginBottom: 20,
  },
  badgesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  badgeWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  badge: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderRadius: 12,
  },
  badgeLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  badgeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nutritionSection: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 20,
  },
  nutritionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  nutritionItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
});