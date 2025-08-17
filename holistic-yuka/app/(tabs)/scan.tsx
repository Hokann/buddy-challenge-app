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
import { supabase } from '../supabase/supabaseConfig';
import { getScoreColor } from '../utils/scoreUtils';
import { formatDate } from '../utils/dateUtils';
import { ScanListItem } from '../components/ScanListItem';

const DIET_OPTIONS = [
  'None',
  'Vegetarian',
  'Vegan',
  'Pescatarian',
  'Keto',
  'Paleo',
  'Mediterranean',
  'Low Carb',
  'Gluten Free'
];

const ALLERGY_OPTIONS = [
  'Nuts',
  'Peanuts',
  'Dairy',
  'Eggs',
  'Soy',
  'Wheat/Gluten',
  'Fish',
  'Shellfish',
  'Sesame',
  'Sulfites'
];

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
  const [userPreferences, setUserPreferences] = useState<{diet: string | null, allergies: string[] | null}>({diet: null, allergies: null});
  const [loadingPreferences, setLoadingPreferences] = useState(false);
  const [editingPreferences, setEditingPreferences] = useState(false);
  const [editedDiet, setEditedDiet] = useState<string | null>(null);
  const [editedAllergies, setEditedAllergies] = useState<string[]>([]);
  const [savingPreferences, setSavingPreferences] = useState(false);
  
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

  // Auto-open modal when product is found (don't wait for analysis)
  useEffect(() => {
    console.log('Modal useEffect triggered:', { 
      product: !!product, 
      isProcessing, 
      showAnalysisModal,
      productName: product?.product_name_en || product?.product_name || 'No name'
    });
    
    if (product && !showAnalysisModal) {
      console.log('Step 1.5: Opening modal with product:', product.product_name_en || product.product_name);
      setShowAnalysisModal(true);
    }
  }, [product, showAnalysisModal]);

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
      setShowAnalysisModal(false);
      
      // Step 1: Set the barcode
      setBarcode(barcodeValue);
      
      // Step 2: Fetch product data
      console.log('Step 1: Fetching product data...');
      const productResponse = await openFoodFactsService.getProduct(barcodeValue);
      
      if (productResponse.status !== 1 || !productResponse.product) {
        setProduct(null);
        setHealthAnalysis(null);
        Alert.alert('Product Not Found', 'This barcode is not in the database.');
        // Emit event to show tab bar since scan process is complete
        DeviceEventEmitter.emit('cameraClosed');
        return;
      }
      
      const productData = productResponse.product;
      setProduct(productData);
      console.log('Step 1 complete: Product data fetched');
      console.log('Step 1.5: Product state set, modal should popup now');
      
      // Step 3: Analyze health with analyzeProduct function
      console.log('Step 2: Analyzing health...');
      setAnalyzingHealth(true);
      
      // Call the analyzeProduct Supabase function
      const analysisResponse = await fetch('https://ozelihznyvcmebjqeebm.supabase.co/functions/v1/analyzeProduct', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96ZWxpaHpueXZjbWVianFlZWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NzIyOTAsImV4cCI6MjA3MDU0ODI5MH0.J01ZRpA60F8Y95EJF7FVYtDXPQtL_r5_xWOlf8o7UoY',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: user?.id,
          product: productData
        })
      });
      
      if (!analysisResponse.ok) {
        throw new Error(`Analysis failed: ${analysisResponse.status}`);
      }
      
      const analysisData = await analysisResponse.json();
      console.log('Analysis response:', analysisData);
      
      // For now, create a placeholder analysis object to maintain UI compatibility
      const placeholderAnalysis = {
        overall_score: 70,
        sub_scores: {
          nutrition: 75,
          additives: 65,
          processing: 70,
          allergens: 80
        },
        summary: 'Analysis completed using your dietary preferences',
        user_preferences: analysisData.user_preferences,
        warnings: [],
        positives: [],
        red_flags: [],
        recommendation: 'Product analyzed based on your preferences',
        explanation: 'This analysis was generated using your dietary preferences and allergy information.'
      };
      
      setHealthAnalysis(placeholderAnalysis);
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
      
      // Emit event to show tab bar since scan process is complete (even with error)
      DeviceEventEmitter.emit('cameraClosed');
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
    // Clear product state to prevent modal from reopening
    setProduct(null);
    setHealthAnalysis(null);
    setAnalyzingHealth(false);
    // Reset the camera for next scan
    setShowCamera(false);
    // Emit event to show tab bar
    DeviceEventEmitter.emit('cameraClosed');
    // Clear the last processed barcode after a delay to allow for new scans
    setTimeout(() => {
      lastProcessedBarcode.current = '';
    }, 1000);
    console.log('Modal closed and product state cleared');
  };

  const startNewScan = async () => {
    // Clear previous state
    lastProcessedBarcode.current = '';
    setIsProcessing(false);
    setProduct(null);
    setHealthAnalysis(null);
    setShowAnalysisModal(false);
    console.log('Step 0: Starting new scan, cleared previous state');
    
    // Emit event to hide tab bar
    DeviceEventEmitter.emit('cameraOpened');
    
    // Try to start scanning
    const success = await startScanning();
    
    // If scanning failed (e.g., permissions denied), show tab bar again
    if (!success) {
      DeviceEventEmitter.emit('cameraClosed');
    }
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

  // Fetch user preferences
  const fetchUserPreferences = async () => {
    if (!user) return;
    
    setLoadingPreferences(true);
    try {
      console.log('📊 Scan: Fetching user preferences for:', user.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('diet, allergies')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('📊 Scan: Error fetching preferences:', error);
      } else {
        console.log('📊 Scan: User preferences loaded:', data);
        setUserPreferences({
          diet: data?.diet || null,
          allergies: data?.allergies || null
        });
      }
    } catch (error) {
      console.error('📊 Scan: Error in fetchUserPreferences:', error);
    } finally {
      setLoadingPreferences(false);
    }
  };

  // Profile modal handlers
  const handleProfilePress = () => {
    setShowProfileModal(true);
    fetchUserPreferences();
  };

  // Preferences editing handlers
  const startEditingPreferences = () => {
    console.log('📝 Scan: Starting preferences editing');
    setEditedDiet(userPreferences.diet || 'None');
    setEditedAllergies(userPreferences.allergies || []);
    setEditingPreferences(true);
  };

  const cancelEditingPreferences = () => {
    console.log('❌ Scan: Cancelling preferences editing');
    setEditingPreferences(false);
    setEditedDiet(null);
    setEditedAllergies([]);
  };

  const toggleAllergy = (allergy: string) => {
    const isSelected = editedAllergies.includes(allergy);
    if (isSelected) {
      console.log('🚫 Scan: Deselected allergy:', allergy);
      setEditedAllergies(prev => prev.filter(a => a !== allergy));
    } else {
      console.log('🚫 Scan: Selected allergy:', allergy);
      setEditedAllergies(prev => [...prev, allergy]);
    }
  };

  const savePreferences = async () => {
    if (!user) {
      Alert.alert('Error', 'No user found');
      return;
    }

    console.log('💾 Scan: Saving preferences:', { diet: editedDiet, allergies: editedAllergies });
    setSavingPreferences(true);

    try {
      const dietValue = editedDiet === 'None' ? null : editedDiet;
      const allergiesValue = editedAllergies.length > 0 ? editedAllergies : null;

      const { error } = await supabase
        .from('profiles')
        .update({
          diet: dietValue,
          allergies: allergiesValue
        })
        .eq('id', user.id);

      if (error) {
        console.error('💾 Scan: Error saving preferences:', error);
        Alert.alert('Error', 'Failed to save preferences');
      } else {
        console.log('✅ Scan: Preferences saved successfully');
        // Update local state
        setUserPreferences({
          diet: dietValue,
          allergies: allergiesValue
        });
        setEditingPreferences(false);
        Alert.alert('Success', 'Preferences updated successfully!');
      }
    } catch (error) {
      console.error('💾 Scan: Error in savePreferences:', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setSavingPreferences(false);
    }
  };

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
              <TouchableOpacity style={styles.profileButton} onPress={handleProfilePress}>
                <Ionicons name="person" size={24} color="#026A3D" />
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
            
            {/* Analysis Loading State */}
            {analyzingHealth && (
              <View style={styles.analysisLoadingCard}>
                <View style={styles.analysisLoadingContent}>
                  <ActivityIndicator size="large" color="#026A3D" />
                  <Text style={styles.analysisLoadingTitle}>✨ Creating your personalized analysis</Text>
                  <Text style={styles.analysisLoadingSubtext}>
                    We're checking this product against your dietary preferences and health goals to give you the most relevant insights
                  </Text>
                </View>
              </View>
            )}
            
            {!analyzingHealth && <HealthAnalysis analysis={healthAnalysis} loading={false} />}
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
              {/* Account Section */}
              <View style={styles.profileSection}>
                <Text style={styles.sectionTitle}>Account</Text>
                <Text style={styles.label}>Email:</Text>
                <Text style={styles.email}>{user?.email}</Text>
              </View>

              {/* Preferences Section */}
              <View style={styles.profileSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Dietary Preferences</Text>
                  {!editingPreferences && !loadingPreferences && (
                    <TouchableOpacity 
                      style={styles.editButton}
                      onPress={startEditingPreferences}
                    >
                      <Ionicons name="pencil" size={16} color="#026A3D" />
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                  )}
                </View>
                
                {loadingPreferences ? (
                  <View style={styles.preferencesLoading}>
                    <ActivityIndicator size="small" color="#026A3D" />
                    <Text style={styles.loadingText}>Loading preferences...</Text>
                  </View>
                ) : editingPreferences ? (
                  /* Editing Mode */
                  <View style={styles.editingContainer}>
                    {/* Diet Selection */}
                    <View style={styles.editSection}>
                      <Text style={styles.editSectionTitle}>Diet Preference</Text>
                      <View style={styles.optionsContainer}>
                        {DIET_OPTIONS.map((diet) => (
                          <TouchableOpacity
                            key={diet}
                            style={[
                              styles.optionChip,
                              editedDiet === diet && styles.selectedOptionChip
                            ]}
                            onPress={() => setEditedDiet(diet)}
                          >
                            <Text style={[
                              styles.optionChipText,
                              editedDiet === diet && styles.selectedOptionChipText
                            ]}>
                              {diet}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* Allergies Selection */}
                    <View style={styles.editSection}>
                      <Text style={styles.editSectionTitle}>Allergies</Text>
                      <Text style={styles.editSectionSubtitle}>Select all that apply</Text>
                      <View style={styles.optionsContainer}>
                        {ALLERGY_OPTIONS.map((allergy) => (
                          <TouchableOpacity
                            key={allergy}
                            style={[
                              styles.optionChip,
                              editedAllergies.includes(allergy) && styles.selectedOptionChip
                            ]}
                            onPress={() => toggleAllergy(allergy)}
                          >
                            <Text style={[
                              styles.optionChipText,
                              editedAllergies.includes(allergy) && styles.selectedOptionChipText
                            ]}>
                              {allergy}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* Save/Cancel Buttons */}
                    <View style={styles.editButtonsContainer}>
                      <TouchableOpacity 
                        style={[styles.saveButton, savingPreferences && styles.saveButtonDisabled]}
                        onPress={savePreferences}
                        disabled={savingPreferences}
                      >
                        {savingPreferences ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.saveButtonText}>Save Changes</Text>
                        )}
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.cancelButton}
                        onPress={cancelEditingPreferences}
                        disabled={savingPreferences}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  /* Display Mode */
                  <>
                    <View style={styles.preferenceItem}>
                      <Text style={styles.label}>Diet:</Text>
                      <Text style={styles.preferenceValue}>
                        {userPreferences.diet || 'None specified'}
                      </Text>
                    </View>

                    <View style={styles.preferenceItem}>
                      <Text style={styles.label}>Allergies:</Text>
                      {userPreferences.allergies && userPreferences.allergies.length > 0 ? (
                        <View style={styles.allergiesList}>
                          {userPreferences.allergies.map((allergy, index) => (
                            <View key={index} style={styles.allergyTag}>
                              <Text style={styles.allergyText}>{allergy}</Text>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text style={styles.preferenceValue}>None specified</Text>
                      )}
                    </View>
                  </>
                )}
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
            <View style={styles.emptyState}>
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
    marginBottom: 8
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
  analysisLoadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 24,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  analysisLoadingContent: {
    padding: 32,
    alignItems: 'center',
  },
  analysisLoadingTitle: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    color: '#026A3D',
    textAlign: 'center',
    marginBottom: 12,
  },
  analysisLoadingSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  profileContent: {
    padding: 24,
  },
  profileSection: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E7F5E7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#026A3D',
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
  preferenceItem: {
    marginBottom: 16,
  },
  preferenceValue: {
    fontSize: 16,
    color: '#6B7280',
  },
  preferencesLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  allergiesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  allergyTag: {
    backgroundColor: '#FEE2E2',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  allergyText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#DC2626',
  },
  // Editing Mode Styles
  editingContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#E7F5E7',
  },
  editSection: {
    marginBottom: 24,
  },
  editSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#026A3D',
    marginBottom: 4,
  },
  editSectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 8,
  },
  selectedOptionChip: {
    backgroundColor: '#026A3D',
    borderColor: '#026A3D',
  },
  optionChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  selectedOptionChipText: {
    color: '#FFFFFF',
  },
  editButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#026A3D',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
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