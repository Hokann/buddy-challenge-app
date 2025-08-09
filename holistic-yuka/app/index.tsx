import { Camera, CameraView } from 'expo-camera';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function Index() {
  const [barcode, setBarcode] = useState('');
  const [jsonResponse, setJsonResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getCameraPermissions();
  }, []);

  const fetchProductData = async (barcodeValue: string | undefined) => {
    const barcodeToUse = barcodeValue || barcode;
    
    if (!barcodeToUse.trim()) {
      Alert.alert('Error', 'Please enter a barcode');
      return;
    }

    setLoading(true);
    try {
      const url = `https://world.openfoodfacts.org/api/v0/product/${barcodeToUse.trim()}.json?fields=product_name,product_name_en,brands,categories,categories_en,nutriments,ingredients_text,ingredients_text_en,nova_group,nutriscore_grade,ecoscore_grade,image_url,image_front_url,countries_en,manufacturing_places_en&lc=en`;
      console.log('Fetching from:', url);
      
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        console.log('API Response:', data);
        setJsonResponse(JSON.stringify(data, null, 2));
      } else {
        console.error('API Request Failed:', response.status);
        setJsonResponse(`API Request Failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    setScanned(true);
    setShowCamera(false);
    setBarcode(data);
    fetchProductData(data);
  };

  const startScanning = () => {
    if (hasPermission === null) {
      Alert.alert('Permission', 'Requesting camera permission...');
      return;
    }
    if (hasPermission === false) {
      Alert.alert('No Access', 'Camera permission denied');
      return;
    }
    setScanned(false);
    setShowCamera(true);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Open Food Facts API Test</Text>
      
      {showCamera ? (
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            barcodeScannerSettings={{
              barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39"],
            }}
            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          >
            <View style={styles.cameraOverlay}>
              <Text style={styles.cameraText}>
                {scanned ? 'Barcode scanned!' : 'Point camera at barcode'}
              </Text>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCamera(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </CameraView>
        </View>
      ) : (
        <>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter barcode (e.g., 5449000131805)"
              value={barcode}
              onChangeText={setBarcode}
              keyboardType="numeric"
            />
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.primaryButton]} 
                onPress={() => fetchProductData(barcode)}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Fetching...' : 'Get Product Data'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.secondaryButton]} 
                onPress={startScanning}
                disabled={loading}
              >
                <Text style={styles.buttonText}>📷 Scan Barcode</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.responseContainer}>
            <Text style={styles.responseTitle}>JSON Response:</Text>
            <Text style={styles.responseText}>
              {jsonResponse || 'No data yet. Enter a barcode manually or use camera to scan'}
            </Text>
          </ScrollView>
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
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 15,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cameraContainer: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 20,
    alignItems: 'center',
  },
  cameraText: {
    color: 'white',
    fontSize: 18,
    marginBottom: 15,
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  responseContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 15,
  },
  responseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  responseText: {
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
});