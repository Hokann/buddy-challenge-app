// app/(tabs)/scan.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BarcodeInput } from '../components/BarcodeInput';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { HealthAnalysis } from '../components/HealthAnalysis';
import { ProductDisplay } from '../components/ProductDisplay';
import { useBarcode } from '../hooks/useBarcode';

export default function ScanScreen() {
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Holistly</Text>
      
      {showCamera ? (
        <BarcodeScanner
          onBarcodeScanned={handleBarcodeScanned}
          onCancel={() => setShowCamera(false)}
          scanned={scanned}
        />
      ) : (
        <>
          <BarcodeInput
            barcode={barcode}
            onBarcodeChange={setBarcode}
            onManualFetch={() => fetchProductData()}
            onScanPress={startScanning}
            loading={loading}
          />
          
          <ProductDisplay product={product} showRawJson={false} />
          
          <HealthAnalysis analysis={healthAnalysis} loading={analyzingHealth} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#F9FAFB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#026A3D',
  },
});