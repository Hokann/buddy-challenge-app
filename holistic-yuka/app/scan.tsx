// app/scan.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Alert, 
  Modal, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View,
  SafeAreaView,
  StatusBar,
  FlatList,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BarcodeScanner } from './components/BarcodeScanner';
import { HealthAnalysis } from './components/HealthAnalysis';
import { ProductDisplay } from './components/ProductDisplay';
import { UserMenu } from './components/UserMenu';
import { useBarcode } from './hooks/useBarcode';
import { useScanHistory, ScanHistoryItem } from './hooks/useScanHistory';
import { useAuth } from './hooks/useAuth';
import { openFoodFactsService } from './services/openFoodFacts';
import { geminiAIService } from './services/geminiAI';
import { supabase } from './supabaseConfig';

export default function ScanScreen() {
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedScan, setSelectedScan] = useState<ScanHistoryItem | null>(null);
  const [showHistoryDetailModal, setShowHistoryDetailModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Keep track of the last processed barcode to prevent duplicates
  const lastProcessedBarcode = useRef<string>('');
  
  const {
    barcode,
    product,
    healthAnalysis,
    loading,
    analyzingHealth,
    showCamera,
    scanned,
    setBarcode,
    setProduct,
    setHealthAnalysis,
    setAnalyzingHealth,
    startScanning,
    setShowCamera,
  } = useBarcode();

  const { addScanToHistory, scanHistory, loading: historyLoading, clearHistory, removeScanFromHistory, refreshHistory } = useScanHistory();
  const { user, signOut } = useAuth();

  // Auto-open modal when analysis is complete
  useEffect(() => {
    if (product && healthAnalysis && !analyzingHealth && !isProcessing) {
      setShowAnalysisModal(true);
    }
  }, [product, healthAnalysis, analyzingHealth, isProcessing]);

  // Complete scan process: scan → fetch product → analyze → save to history
  const processCompleteScan = async (barcodeValue: string) => {
    console.log('Starting complete scan process for:', barcodeValue);
    
    try {
      // Reset states before starting
      setProduct(null);
      setHealthAnalysis(null);
      setAnalyzingHealth(false);
      
      // Step 1: Set the barcode
      setBarcode(barcodeValue);
      
      // Step 2: Fetch product data
      console.log('Step 1: Fetching product data...');
      const productResponse = await openFoodFactsService.getProduct(barcodeValue);
      
      if (productResponse.status !== 1 || !productResponse.product) {
        setProduct(null);
        setHealthAnalysis(null);
        Alert.alert('Product Not Found', 'This barcode is not in the database.');
        return;
      }
      
      const productData = productResponse.product;
      setProduct(productData);
      console.log('Step 1 complete: Product data fetched');
      
      // Step 3: Analyze health
      console.log('Step 2: Analyzing health...');
      setAnalyzingHealth(true);
      const analysisData = await geminiAIService.analyzeProductHealth(productData);
      setHealthAnalysis(analysisData);
      setAnalyzingHealth(false);
      console.log('Step 2 complete: Health analysis done');
      
      // Step 4: Save to history
      console.log('Step 3: Saving to history...');
      await saveCompletedScanToHistory(barcodeValue, productData, analysisData);
      console.log('Step 3 complete: Saved to history');
      
      console.log('Complete scan process finished successfully');
      
    } catch (error) {
      console.error('Error in complete scan process:', error);
      
      // Reset all states on error
      setAnalyzingHealth(false);
      setProduct(null);
      setHealthAnalysis(null);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      if (errorMessage.includes('Rate limit')) {
        Alert.alert('Rate Limit Exceeded', 'Too many requests. Please wait a moment before trying again.');
      } else if (errorMessage.includes('API key')) {
        Alert.alert('Configuration Error', 'Gemini API key not configured. Please check your setup.');
      } else {
        Alert.alert('Error', `Failed to process scan: ${errorMessage}`);
      }
    }
  };

  // Enhanced barcode handler that prevents duplicates
  const handleScanComplete = async (data: any) => {
    const scannedBarcode = data.data;
    
    // Prevent duplicate processing of the same barcode
    if (isProcessing || scannedBarcode === lastProcessedBarcode.current) {
      console.log('Ignoring duplicate scan:', scannedBarcode);
      return;
    }
    
    console.log('Processing new scan:', scannedBarcode);
    setIsProcessing(true);
    lastProcessedBarcode.current = scannedBarcode;
    setShowCamera(false);
    
    try {
      await processCompleteScan(scannedBarcode);
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper function to save completed scan to history
  const saveCompletedScanToHistory = async (barcodeValue: string, productData: any, analysisData: any) => {
    console.log('Saving completed scan to history:', barcodeValue);
    await addScanToHistory({
      id: `${barcodeValue}-${Date.now()}`,
      barcode: barcodeValue,
      product: productData,
      analysis: analysisData,
      timestamp: new Date(),
    });
  };

  const handleManualSubmit = async () => {
    if (!manualBarcode.trim()) {
      Alert.alert('Error', 'Please enter a barcode');
      return;
    }
    
    // Prevent duplicate processing
    if (isProcessing || manualBarcode === lastProcessedBarcode.current) {
      return;
    }
    
    setIsProcessing(true);
    lastProcessedBarcode.current = manualBarcode;
    const barcodeToProcess = manualBarcode;
    
    try {
      setShowManualInput(false);
      setManualBarcode('');
      await processCompleteScan(barcodeToProcess);
    } finally {
      setIsProcessing(false);
    }
  };

  const closeModal = () => {
    setShowAnalysisModal(false);
    // Reset the camera for next scan
    setShowCamera(false);
    // Clear the last processed barcode after a delay to allow for new scans
    setTimeout(() => {
      lastProcessedBarcode.current = '';
    }, 1000);
  };

  const startNewScan = () => {
    // Clear previous state
    lastProcessedBarcode.current = '';
    setIsProcessing(false);
    startScanning();
  };

  const handleProfilePress = () => {
    setShowProfileModal(true);
  };

  const handleHistoryPress = () => {
    setShowHistoryModal(true);
    // Fetch fresh data when opening history
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
  };

  // Profile modal handlers
  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            console.log('Starting sign out...');
            await signOut();
            console.log('Sign out completed');
          }
        },
      ]
    );
  };

  // History modal handlers
  const openScanDetail = (scan: ScanHistoryItem) => {
    setSelectedScan(scan);
    setShowHistoryDetailModal(true);
  };

  const closeHistoryDetailModal = () => {
    setShowHistoryDetailModal(false);
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

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#34C759';
    if (score >= 60) return '#FF9500';
    return '#FF3B30';
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderScanItem = ({ item }: { item: ScanHistoryItem }) => (
    <TouchableOpacity 
      style={styles.scanItem}
      onPress={() => openScanDetail(item)}
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
        onPress={() => handleRemoveScan(item.id)}
      >
        <Text style={styles.removeButtonText}>×</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (showCamera) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#026A3D" />
        <View style={styles.scannerContainer}>
          <BarcodeScanner
            onBarcodeScanned={handleScanComplete}
            onCancel={() => {
              setShowCamera(false);
              lastProcessedBarcode.current = '';
              setIsProcessing(false);
            }}
            scanned={scanned || isProcessing}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.userSection}>
            <View style={styles.userInfo}>
              <Text style={styles.greeting}>Hello!</Text>
              <Text style={styles.userName}>Welcome to Holsty</Text>
            </View>
            <UserMenu 
              onProfilePress={handleProfilePress}
              onHistoryPress={handleHistoryPress}
            />
          </View>
        </View>
      </View>

      <View style={styles.mainContent}>
        {/* Main Scan Button */}
        <View style={styles.scanSection}>
          <Text style={styles.sectionTitle}>Scan Product</Text>
          <Text style={styles.sectionSubtitle}>
            Scan barcodes to get instant health insights
          </Text>
          
          <TouchableOpacity 
            style={styles.scanButton}
            onPress={startNewScan}
            disabled={loading || isProcessing}
          >
            <View style={styles.scanButtonContent}>
              <View style={styles.scanIconContainer}>
                <Ionicons name="camera" size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.scanButtonText}>
                {loading || isProcessing ? 'Processing...' : 'Start Scanning'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setShowManualInput(!showManualInput)}
              disabled={loading || isProcessing}
            >
              <Ionicons name="qr-code" size={24} color="#026A3D" />
              <Text style={styles.actionButtonText}>Manual Input</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleHistoryPress}
            >
              <Ionicons name="time" size={24} color="#026A3D" />
              <Text style={styles.actionButtonText}>Recent Scans</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Manual Input Field */}
        {showManualInput && (
          <View style={styles.manualInputContainer}>
            <TextInput
              style={styles.manualInput}
              placeholder="Enter barcode (e.g., 5449000131805)"
              value={manualBarcode}
              onChangeText={setManualBarcode}
              keyboardType="numeric"
              editable={!loading && !isProcessing}
            />
            <View style={styles.manualInputButtons}>
              <TouchableOpacity 
                style={styles.manualSubmitButton}
                onPress={handleManualSubmit}
                disabled={loading || isProcessing}
              >
                <Text style={styles.manualSubmitText}>
                  {loading || isProcessing ? 'Analyzing...' : 'Analyze Product'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.manualCancelButton}
                onPress={() => {
                  setShowManualInput(false);
                  setManualBarcode('');
                }}
                disabled={loading || isProcessing}
              >
                <Text style={styles.manualCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Loading State */}
        {(loading || analyzingHealth || isProcessing) && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>
              {loading || isProcessing ? '🔍 Fetching product data...' : '🤖 Analyzing health impact...'}
            </Text>
          </View>
        )}

        {/* Quick Results Preview */}
        {product && !showAnalysisModal && !loading && !analyzingHealth && !isProcessing && (
          <TouchableOpacity 
            style={styles.resultsPreview}
            onPress={() => setShowAnalysisModal(true)}
          >
            <Text style={styles.previewTitle}>📦 Product Found</Text>
            <Text style={styles.previewProduct}>
              {product.product_name_en || product.product_name || 'Unknown Product'}
            </Text>
            <Text style={styles.previewAction}>Tap to view full analysis →</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Analysis Modal */}
      <Modal
        visible={showAnalysisModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Product Analysis</Text>
            <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {product && <ProductDisplay product={product} showRawJson={false} />}
            <HealthAnalysis analysis={healthAnalysis} loading={analyzingHealth} />
          </ScrollView>
        </View>
      </Modal>

      {/* Profile Modal */}
      <Modal
        visible={showProfileModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Profile</Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowProfileModal(false)}>
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.profileContent}>
              <View style={styles.userInfo}>
                <Text style={styles.label}>Email:</Text>
                <Text style={styles.email}>{user?.email}</Text>
                <Text style={styles.label}>User ID:</Text>
                <Text style={styles.userId}>{user?.id}</Text>
              </View>

              <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                <Text style={styles.signOutButtonText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* History Modal */}
      <Modal
        visible={showHistoryModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Scan History</Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowHistoryModal(false)}>
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.historyHeader}>
            <Text style={styles.historySubtitle}>
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

          {historyLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#026A3D" />
              <Text style={styles.loadingText}>Loading scan history...</Text>
            </View>
          ) : scanHistory.length === 0 ? (
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
        </View>
      </Modal>

      {/* History Detail Modal */}
      <Modal
        visible={showHistoryDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeHistoryDetailModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedScan?.product?.product_name_en || 
               selectedScan?.product?.product_name || 
               'Product Details'}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={closeHistoryDetailModal}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  userName: {
    fontSize: 14,
    color: '#6B7280',
  },
  scannerContainer: {
    flex: 1,
    margin: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  scanSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 20,
  },
  scanButton: {
    backgroundColor: '#026A3D',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  scanButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanIconContainer: {
    marginRight: 12,
  },
  scanButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  quickActions: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  actionButton: {
    alignItems: 'center',
    padding: 16,
    minWidth: 100,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginTop: 8,
  },
  manualInputContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  manualInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  manualInputButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  manualSubmitButton: {
    flex: 1,
    backgroundColor: '#026A3D',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  manualSubmitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  manualCancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  manualCancelText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  resultsPreview: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#026A3D',
    marginBottom: 8,
  },
  previewProduct: {
    fontSize: 16,
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  previewAction: {
    fontSize: 14,
    color: '#6B7280',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
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
  placeholderContent: {
    padding: 40,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});