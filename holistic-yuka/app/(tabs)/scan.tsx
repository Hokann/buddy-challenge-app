// app/(tabs)/scan.tsx
import React, { useEffect, useRef, useState } from 'react';
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
  RefreshControl,
  DeviceEventEmitter
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { HealthAnalysis } from '../components/HealthAnalysis';
import { ProductDisplay } from '../components/ProductDisplay';
import { useBarcode } from '../hooks/useBarcode';
import { useScanHistory, ScanHistoryItem } from '../hooks/useScanHistory';
import { useAuth } from '../hooks/useAuth';
import { openFoodFactsService } from '../services/openFoodFacts';
import { geminiAIService } from '../services/geminiAI';
import { supabase } from '../supabaseConfig';
import { getScoreColor } from '../utils/scoreUtils';
import { formatDate } from '../utils/dateUtils';
import { ScanListItem } from '../components/ScanListItem';

export default function ScanScreen() {
  const router = useRouter();
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedScan, setSelectedScan] = useState<ScanHistoryItem | null>(null);
  const [showHistoryDetailModal, setShowHistoryDetailModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  
  // Keep track of the last processed barcode to prevent duplicates
  const lastProcessedBarcode = useRef<string>('');
  
  const {
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

  // Listen for scan trigger from tab bar
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('triggerScan', () => {
      startNewScan();
    });

    return () => subscription.remove();
  }, []);

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
    // Emit event to show tab bar
    DeviceEventEmitter.emit('cameraClosed');
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
    // Emit event to hide tab bar
    DeviceEventEmitter.emit('cameraOpened');
  };

  const toggleFlash = () => {
    setFlashEnabled(!flashEnabled);
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

  const renderScanItem = ({ item }: { item: ScanHistoryItem }) => (
    <ScanListItem
      item={item}
      onPress={openScanDetail}
      onRemove={handleRemoveScan}
    />
  );

  if (showCamera) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={styles.fullScreenCameraContainer}>
          {/* Camera Header */}
          <SafeAreaView style={styles.cameraHeader}>
            <TouchableOpacity 
              style={styles.cameraBackButton}
              onPress={() => {
                setShowCamera(false);
                lastProcessedBarcode.current = '';
                setIsProcessing(false);
                // Emit event to show tab bar
                DeviceEventEmitter.emit('cameraClosed');
              }}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </SafeAreaView>

          {/* Camera Content */}
          <View style={styles.cameraContent}>
            {/* Title Section */}
            <View style={styles.cameraTitleSection}>
              <Text style={styles.cameraTitle}>Scan a Product</Text>
            </View>

            {/* Scanner Area */}
            <View style={styles.scannerArea}>
              <BarcodeScanner
                onBarcodeScanned={handleScanComplete}
                scanned={scanned || isProcessing}
                hideCancel={true}
                flashEnabled={flashEnabled}
              />
              
              {/* Scan Frame Overlay */}
              <View style={styles.scanFrameOverlay}>
                {/* Corner Frame Indicators */}
                <View style={styles.scanCorners}>
                  {/* Top Left */}
                  <View style={[styles.corner, styles.topLeft]} />
                  {/* Top Right */}
                  <View style={[styles.corner, styles.topRight]} />
                  {/* Bottom Left */}
                  <View style={[styles.corner, styles.bottomLeft]} />
                  {/* Bottom Right */}
                  <View style={[styles.corner, styles.bottomRight]} />
                </View>
                
                
              </View>
            </View>

            {/* Flash Button */}
            <View style={styles.cameraControls}>
              <TouchableOpacity 
                style={[styles.flashButton, flashEnabled && styles.flashButtonActive]}
                onPress={toggleFlash}
              >
                <Ionicons 
                  name={flashEnabled ? "flash" : "flash-off"} 
                  size={24} 
                  color={flashEnabled ? "#000000" : "#FFFFFF"} 
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Fixed Header */}
      <View style={styles.fixedHeader}>
        <SafeAreaView style={styles.headerSafeArea}>
          <View style={styles.headerContent}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Text style={styles.logo}>Holsty</Text>
            </View>
            
            {/* Right side actions */}
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/(tabs)/profile')}>
                <Ionicons name="person" size={24} color="#026A3D" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingsButton} onPress={handleHistoryPress}>
                <Ionicons name="settings-outline" size={24} color="#026A3D" />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* Scrollable Content */}
      <ScrollView 
        style={styles.scrollableContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <View style={styles.mainContent}>
        {/* Central Hero Section with Large Scan Button */}
        <View style={styles.heroSection}>
          <View style={styles.scanButtonWrapper}>
            <TouchableOpacity 
              style={[styles.mainScanButton, (loading || isProcessing) && styles.scanButtonDisabled]}
              onPress={startNewScan}
              disabled={loading || isProcessing}
              activeOpacity={0.8}
            >
              <View style={styles.scanButtonContent}>
                {loading || isProcessing ? (
                  <ActivityIndicator size={60} color="#026A3D" />
                ) : (
                  <View style={styles.barcodeIconWrapper}>
                    <Ionicons name="barcode-outline" size={80} color="#026A3D" />
                    <View style={styles.scanLineAnimation} />
                  </View>
                )}
              </View>
            </TouchableOpacity>
            
            {/* Animated pulse rings */}
            <View style={styles.pulseRing1} />
            <View style={styles.pulseRing2} />
          </View>
          
          <Text style={styles.scanLabel}>
            {loading || isProcessing ? 'Processing...' : 'Tap to scan a product'}
          </Text>
          
          <Text style={styles.scanSubtitle}>
            Point your camera at any barcode to get instant health insights
          </Text>
        </View>

        {/* Recent Scans Section */}
        <View style={styles.recentScansSection}>
          <View style={styles.recentScansHeader}>
            <Text style={styles.recentScansTitle}>Recent Scans</Text>
            <TouchableOpacity onPress={handleHistoryPress}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {scanHistory.length > 0 ? (
            <ScrollView 
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentScansScroll}
            >
              {scanHistory.slice(0, 5).map((scan, index) => (
                <TouchableOpacity
                  key={scan.id}
                  style={styles.recentScanCard}
                  onPress={() => openScanDetail(scan)}
                >
                  <View style={styles.productImagePlaceholder}>
                    <Ionicons name="cube-outline" size={32} color="#9CA3AF" />
                  </View>
                  <Text style={styles.productName} numberOfLines={2}>
                    {scan.product?.product_name_en || scan.product?.product_name || 'Unknown Product'}
                  </Text>
                  <View style={[styles.warningLevel, { backgroundColor: getScoreColor(scan.analysis?.overall_score || 50) }]}>
                    <Text style={styles.warningLevelText}>
                      {scan.analysis?.overall_score ? Math.round(scan.analysis.overall_score) : '?'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyRecentScans}>
              <Ionicons name="scan-outline" size={48} color="#E5E7EB" />
              <Text style={styles.emptyRecentText}>No recent scans</Text>
            </View>
          )}
        </View>

        {/* Manual Input Field */}
        {showManualInput && (
          <View style={styles.manualInputContainer}>
            <View style={styles.manualInputHeader}>
              <Ionicons name="keypad-outline" size={24} color="#026A3D" />
              <Text style={styles.manualInputTitle}>Manual Entry</Text>
            </View>
            <TextInput
              style={styles.manualInput}
              placeholder="Enter barcode number"
              placeholderTextColor="#9CA3AF"
              value={manualBarcode}
              onChangeText={setManualBarcode}
              keyboardType="numeric"
              editable={!loading && !isProcessing}
              autoFocus
            />
            <Text style={styles.manualInputHelp}>
              Example: 5449000131805
            </Text>
            <View style={styles.manualInputButtons}>
              <TouchableOpacity 
                style={[styles.manualSubmitButton, (!manualBarcode.trim() || loading || isProcessing) && styles.buttonDisabled]}
                onPress={handleManualSubmit}
                disabled={!manualBarcode.trim() || loading || isProcessing}
              >
                {loading || isProcessing ? (
                  <ActivityIndicator size={16} color="#FFFFFF" />
                ) : (
                  <Ionicons name="search" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                )}
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

        {/* Enhanced Loading State */}
        {(loading || analyzingHealth || isProcessing) && (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingCard}>
              <View style={styles.loadingIconContainer}>
                <ActivityIndicator size={40} color="#026A3D" />
              </View>
              <View style={styles.loadingTextContainer}>
                <Text style={styles.loadingTitle}>
                  {loading || isProcessing ? 'Fetching Product Data' : 'Analyzing Health Impact'}
                </Text>
                <Text style={styles.loadingSubtitle}>
                  {loading || isProcessing ? 
                    'Getting product information from our database...' : 
                    'Our AI is analyzing nutritional content and health impact...'
                  }
                </Text>
                <View style={styles.loadingProgress}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, (loading || isProcessing) ? styles.progressStep1 : styles.progressStep2]} />
                  </View>
                  <Text style={styles.progressText}>
                    {loading || isProcessing ? 'Step 1 of 2' : 'Step 2 of 2'}
                  </Text>
                </View>
              </View>
            </View>
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 100,
  },
  headerSafeArea: {
    paddingTop: 16,
    paddingBottom: 64,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  scrollableContent: {
    flex: 1,
  },
  logoContainer: {
    flex: 1,
  },
  logo: {
    fontSize: 24,
    fontWeight: '700',
    color: '#026A3D',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E7F5E7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenCameraContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    zIndex: 1000,
  },
  cameraHeader: {
    paddingTop: 8,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  cameraBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  cameraTitleSection: {
    alignItems: 'center',
    marginBottom: 60,
    marginTop: 40,
  },
  cameraTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  scannerArea: {
    flex: 1,
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 40,
  },
  scanFrameOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  scanCorners: {
    width: 300,
    height: 220,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#FFFFFF',
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 8,
  },
  cameraControls: {
    alignItems: 'flex-end',
    marginBottom: 40,
  },
  flashButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  flashButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderColor: 'rgba(255, 255, 255, 1)',
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 128,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 24,
    marginTop: 16,
  },
  scanButtonWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  mainScanButton: {
    width: 144,
    height: 144,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
    zIndex: 10,
    borderWidth: 4,
    borderColor: '#026A3D',
  },
  pulseRing1: {
    position: 'absolute',
    width: 184,
    height: 184,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: 'rgba(2, 106, 61, 0.2)',
    backgroundColor: 'rgba(2, 106, 61, 0.05)',
  },
  pulseRing2: {
    position: 'absolute',
    width: 224,
    height: 224,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(2, 106, 61, 0.1)',
    backgroundColor: 'rgba(2, 106, 61, 0.02)',
  },
  barcodeIconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  scanSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#6B7280',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 24,
  },
  scanLineAnimation: {
    position: 'absolute',
    top: '50%',
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: '#026A3D',
    opacity: 0.8,
  },
  scanButtonDisabled: {
    backgroundColor: '#6B7280',
    shadowOpacity: 0.1,
  },
  scanButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentScansSection: {
    marginBottom: 24,
    marginTop: -48,
  },
  recentScansHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  recentScansTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#026A3D',
  },
  recentScansScroll: {
    paddingLeft: 8,
  },
  recentScanCard: {
    width: 120,
    marginRight: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  productImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  productName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 16,
    minHeight: 32,
  },
  warningLevel: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    minWidth: 32,
    alignItems: 'center',
  },
  warningLevelText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyRecentScans: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyRecentText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 16,
  },
  manualInputContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  manualInputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  manualInputTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  manualInput: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  manualInputHelp: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  manualInputButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  manualSubmitButton: {
    flex: 1,
    backgroundColor: '#026A3D',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  manualSubmitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  manualCancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  manualCancelText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    marginBottom: 24,
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  loadingIconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingTextContainer: {
    alignItems: 'center',
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  loadingProgress: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#026A3D',
    borderRadius: 3,
  },
  progressStep1: {
    width: '50%',
  },
  progressStep2: {
    width: '100%',
  },
  progressText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
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
    maxWidth: '80%',
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
  profileContent: {
    padding: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
    marginTop: 16,
  },
  email: {
    fontSize: 16,
    color: '#6B7280',
  },
  userId: {
    fontSize: 14,
    color: '#9CA3AF',
    fontFamily: 'monospace',
  },
  signOutButton: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 32,
  },
  signOutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  historySubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
  },
  clearButtonText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  listContainer: {
    padding: 16,
  },
  scanMetadata: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
  },
});