// app/(tabs)/scanHistory.tsx
import React, { useState, useCallback } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { HealthAnalysis } from '../components/HealthAnalysis';
import { ProductDisplay } from '../components/ProductDisplay';
import { ScanListItem } from '../components/ScanListItem';
import { useScanHistory, ScanHistoryItem } from '../hooks/useScanHistory';
import { formatDate } from '../utils/dateUtils';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/supabaseConfig';

export default function ScanHistoryScreen() {
  const [selectedScan, setSelectedScan] = useState<ScanHistoryItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const { scanHistory, loading, clearHistory, removeScanFromHistory, refreshHistory } = useScanHistory();
  const { user } = useAuth();

  // Log when tab gains focus
  useFocusEffect(
    useCallback(() => {
      console.log('scanHistory page');
      // Fetch scans from Supabase if user is logged in
       if (user) {
                 console.log('Fetching scans from Supabase for user:', user.id);
                 supabase
                   .from('scan_history')
                   .select('*')
                   .eq('user_id', user.id)
                   .order('scanned_at', { ascending: false })
                   .then(({ data, error }) => {
                     if (error) {
                       console.error('Error fetching scans:', error);
                     } else {
                       console.log('Fetched', data?.length || 0, 'scans from Supabase');
                     }
                   });
               }
             }, [user])
  );

  const openScanDetail = (scan: ScanHistoryItem) => {
    setSelectedScan(scan);
    setShowDetailModal(true);
  };

  const closeModal = () => {
    setShowDetailModal(false);
    setSelectedScan(null);
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to clear all scan history? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive', 
          onPress: clearHistory 
        }
      ]
    );
  };

  const handleRemoveScan = (scanId: string) => {
    Alert.alert(
      'Remove Scan',
      'Remove this scan from your history?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive', 
          onPress: () => removeScanFromHistory(scanId) 
        }
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      console.log('Pull to refresh: Calling refreshHistory...');
      await refreshHistory();
      console.log('Pull to refresh: RefreshHistory completed');
    } finally {
      setRefreshing(false);
    }
  };

  const renderScanItem = ({ item }: { item: ScanHistoryItem }) => (
    <ScanListItem
      item={item}
      onPress={openScanDetail}
      onRemove={handleRemoveScan}
    />
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#026A3D" />
        <Text style={styles.loadingText}>Loading scan history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Scan History</Text>
        <Text style={styles.subtitle}>
          {scanHistory.length} scanned product{scanHistory.length !== 1 ? 's' : ''}
          {user && ' • Cloud synced'}
        </Text>
        
        {scanHistory.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={handleClearHistory}
          >
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* History List */}
      {scanHistory.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#026A3D']}
              tintColor="#026A3D"
            />
          }
        >
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No scans yet</Text>
          <Text style={styles.emptySubtitle}>
            Your scanned products will appear here{user ? ' and sync across devices' : ''}
          </Text>
        </ScrollView>
      ) : (
        <FlatList
          data={scanHistory}
          renderItem={renderScanItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#026A3D']}
              tintColor="#026A3D"
            />
          }
        />
      )}

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedScan?.product?.product_name_en || 
               selectedScan?.product?.product_name || 
               'Product Details'}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {selectedScan && (
              <>
                <ProductDisplay product={selectedScan.product} showRawJson={false} />
                <HealthAnalysis analysis={selectedScan.analysis} loading={false} />
                
                <View style={styles.scanMetadata}>
                  <Text style={styles.metadataTitle}>Scan Information</Text>
                  <Text style={styles.metadataText}>
                    Barcode: {selectedScan.barcode}
                  </Text>
                  <Text style={styles.metadataText}>
                    Scanned: {formatDate(selectedScan.timestamp)}
                  </Text>
                  {user && (
                    <Text style={styles.metadataText}>
                      Status: Cloud synced ☁️
                    </Text>
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#026A3D',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  clearButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  clearButtonText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  scanItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  productBrand: {
    fontSize: 14,
    color: '#6B7280',
  },
  scoreContainer: {
    alignItems: 'center',
    minWidth: 50,
  },
  scoreText: {
    fontSize: 20,
    fontWeight: '700',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  scanItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  barcodeText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'monospace',
  },
  timestampText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
    marginRight: 16,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6B7280',
  },
  modalContent: {
    flex: 1,
  },
  scanMetadata: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    margin: 24,
    marginTop: 0,
  },
  metadataTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  metadataText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
});