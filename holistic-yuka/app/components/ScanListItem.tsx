import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ScanHistoryItem } from '../hooks/useScanHistory';
import { getScoreColor } from '../utils/scoreUtils';
import { formatDate } from '../utils/dateUtils';

interface ScanListItemProps {
  item: ScanHistoryItem;
  onPress: (item: ScanHistoryItem) => void;
  onRemove: (itemId: string) => void;
}

export const ScanListItem: React.FC<ScanListItemProps> = ({ item, onPress, onRemove }) => (
  <TouchableOpacity 
    style={styles.scanItem}
    onPress={() => onPress(item)}
  >
    <View style={styles.scanItemHeader}>
      <View style={styles.productInfo}>
        <Text style={styles.productItemName} numberOfLines={2}>
          {item.product?.product_name_en || 
           item.product?.product_name || 
           'Unknown Product'}
        </Text>
        {item.product?.brands && (
          <Text style={styles.productBrandItem} numberOfLines={1}>
            {item.product.brands}
          </Text>
        )}
      </View>
      
      {item.analysis?.overall_score && (
        <View style={styles.scoreContainer}>
          <Text style={[
            styles.scoreText, 
            { color: getScoreColor(item.analysis.overall_score) }
          ]}>
            {item.analysis.overall_score}
          </Text>
          <Text style={styles.scoreLabel}>score</Text>
        </View>
      )}
    </View>
    
    <View style={styles.scanItemFooter}>
      <Text style={styles.barcodeText}>📊 {item.barcode}</Text>
      <Text style={styles.timestampText}>
        {formatDate(item.timestamp)}
      </Text>
    </View>
    
    <TouchableOpacity 
      style={styles.removeButton}
      onPress={() => onRemove(item.id)}
    >
      <Text style={styles.removeButtonText}>×</Text>
    </TouchableOpacity>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  scanItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  scanItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  productBrandItem: {
    fontSize: 14,
    color: '#6B7280',
  },
  scoreContainer: {
    alignItems: 'center',
    minWidth: 60,
  },
  scoreText: {
    fontSize: 20,
    fontWeight: '700',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  scanItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  barcodeText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'monospace',
  },
  timestampText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    fontSize: 16,
    color: '#DC2626',
    fontWeight: '600',
  },
});