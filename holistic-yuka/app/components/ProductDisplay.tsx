import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Product } from '../types/product';

interface ProductDisplayProps {
  product: Product | null;
  showRawJson?: boolean;
}

export const ProductDisplay: React.FC<ProductDisplayProps> = ({ 
  product, 
  showRawJson = true 
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

  // Formatted display - clean product info
  return (
    <View style={styles.productInfoContainer}>
      <Text style={styles.productName}>
        {product.product_name_en || product.product_name || 'Unknown Product'}
      </Text>
      
      {product.brands && (
        <Text style={styles.info}>🏢 {product.brands}</Text>
      )}
      
      {product.categories_en && (
        <Text style={styles.info}>📁 {product.categories_en}</Text>
      )}
      
      <View style={styles.badgeContainer}>
        {product.nutriscore_grade && (
          <View style={[styles.badge, styles.nutriscoreBadge]}>
            <Text style={styles.badgeText}>
              Nutri-Score: {product.nutriscore_grade.toUpperCase()}
            </Text>
          </View>
        )}
        
        {product.nova_group && (
          <View style={[styles.badge, styles.novaBadge]}>
            <Text style={styles.badgeText}>
              NOVA: {product.nova_group}
            </Text>
          </View>
        )}
      </View>
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
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  productInfoContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  info: {
    fontSize: 16,
    marginBottom: 6,
    color: '#666',
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  nutriscoreBadge: {
    backgroundColor: '#E3F2FD',
  },
  novaBadge: {
    backgroundColor: '#FFF3E0',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
});