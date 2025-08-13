// app/(tabs)/scan.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { HealthAnalysis } from '../components/HealthAnalysis';
import { ProductDisplay } from '../components/ProductDisplay';
import { useBarcode } from '../hooks/useBarcode';
import { useScanHistory } from '../hooks/useScanHistory';

export default function ScanScreen() {
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
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
    fetchProductData,
    handleBarcodeScanned,
    startScanning,
    setShowCamera,
  } = useBarcode();

  const { addScanToHistory, scanHistory } = useScanHistory();

  // Auto-open modal when analysis is complete
  useEffect(() => {
    if (product && healthAnalysis && !analyzingHealth && !isProcessing) {
      setShowAnalysisModal(true);
    }
  }, [product, healthAnalysis, analyzingHealth, isProcessing]);

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
    
    try {
      await handleBarcodeScanned(data);
    } finally {
      setIsProcessing(false);
    }
  };

  // Save to history when we have both product and analysis (only once)
  useEffect(() => {
    if (product && healthAnalysis && barcode && !isProcessing) {
      // Check if this exact scan is already in history to prevent duplicates
      const existingInHistory = scanHistory.some(item => 
        item.barcode === barcode && 
        item.product?.code === product.code
      );
      
      if (!existingInHistory) {
        console.log('Saving to history:', barcode);
        addScanToHistory({
          id: `${barcode}-${Date.now()}`,
          barcode: barcode,
          product,
          analysis: healthAnalysis,
          timestamp: new Date(),
        });
      }
    }
  }, [product, healthAnalysis, barcode, isProcessing]);

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
    
    try {
      setBarcode(manualBarcode);
      setShowManualInput(false);
      await fetchProductData();
      setManualBarcode('');
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Holsty Scanner</Text>
        <Text style={styles.subtitle}>Scan any product to get health insights</Text>
      </View>

      {showCamera ? (
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
      ) : (
        <View style={styles.mainContent}>
          {/* Main Scan Button */}
          <TouchableOpacity 
            style={styles.scanButton}
            onPress={startNewScan}
            disabled={loading || isProcessing}
          >
            <View style={styles.scanButtonInner}>
              <Text style={styles.scanIcon}>📷</Text>
              <Text style={styles.scanButtonText}>
                {loading || isProcessing ? 'Processing...' : 'Tap to Scan Product'}
              </Text>
              <Text style={styles.scanButtonSubtext}>
                Point camera at barcode
              </Text>
            </View>
          </TouchableOpacity>

          {/* Manual Input Option */}
          <TouchableOpacity 
            style={styles.manualInputTrigger}
            onPress={() => setShowManualInput(!showManualInput)}
            disabled={loading || isProcessing}
          >
            <Text style={styles.manualInputText}>
              Have a barcode number? Enter it manually
            </Text>
          </TouchableOpacity>

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
      )}

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
            <ProductDisplay product={product} showRawJson={false} />
            <HealthAnalysis analysis={healthAnalysis} loading={analyzingHealth} />
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
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 30,
    alignItems: 'center',
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
    textAlign: 'center',
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
    justifyContent: 'center',
  },
  scanButton: {
    backgroundColor: '#026A3D',
    borderRadius: 20,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  scanButtonInner: {
    paddingVertical: 40,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  scanIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  scanButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  scanButtonSubtext: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  manualInputTrigger: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 20,
  },
  manualInputText: {
    fontSize: 16,
    color: '#026A3D',
    textDecorationLine: 'underline',
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
});