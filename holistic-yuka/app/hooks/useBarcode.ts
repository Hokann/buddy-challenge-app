import { Camera } from 'expo-camera';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { geminiAIService } from '../services/geminiAI';
import { openFoodFactsService } from '../services/openFoodFacts';
import { HealthAnalysis } from '../types/healthAnalysis';
import { BarcodeData, Product } from '../types/product';

export const useBarcode = () => {
  const [barcode, setBarcode] = useState('');
  const [product, setProduct] = useState<Product | null>(null);
  const [healthAnalysis, setHealthAnalysis] = useState<HealthAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzingHealth, setAnalyzingHealth] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getCameraPermissions();
  }, []);

  const fetchProductData = async (barcodeValue?: string) => {
    const barcodeToUse = barcodeValue || barcode;
    
    if (!barcodeToUse.trim()) {
      Alert.alert('Error', 'Please enter a barcode');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await openFoodFactsService.getProduct(barcodeToUse);
      
      if (response.status === 1 && response.product) {
        setProduct(response.product);
        // Automatically analyze health after getting product data
        await analyzeProductHealth(response.product);
      } else {
        setProduct(null);
        setHealthAnalysis(null);
        setError('Product not found in database');
        Alert.alert('Product Not Found', 'This barcode is not in the database.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const analyzeProductHealth = async (productData: Product) => {
    if (analyzingHealth) {
      console.log('Analysis already in progress, skipping...');
      return;
    }

    setAnalyzingHealth(true);
    try {
      const analysis = await geminiAIService.analyzeProductHealth(productData);
      setHealthAnalysis(analysis);
    } catch (error) {
      console.error('Error analyzing product health:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      if (errorMessage.includes('Rate limit')) {
        Alert.alert(
          'Rate Limit Exceeded', 
          'Too many requests. Please wait a moment before trying again.'
        );
      } else if (errorMessage.includes('API key')) {
        Alert.alert(
          'Configuration Error', 
          'Gemini API key not configured. Please check your setup.'
        );
      } else {
        Alert.alert(
          'Analysis Error', 
          `Failed to analyze product health: ${errorMessage}`
        );
      }
    } finally {
      setAnalyzingHealth(false);
    }
  };

  const handleBarcodeScanned = ({ data }: BarcodeData) => {
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

  const clearData = () => {
    setProduct(null);
    setHealthAnalysis(null);
    setBarcode('');
    setError(null);
  };

  return {
    // State
    barcode,
    product,
    healthAnalysis,
    loading,
    analyzingHealth,
    hasPermission,
    showCamera,
    scanned,
    error,
    
    // Actions
    setBarcode,
    setProduct,
    setHealthAnalysis,
    setAnalyzingHealth,
    fetchProductData,
    analyzeProductHealth,
    handleBarcodeScanned,
    startScanning,
    setShowCamera,
    clearData,
  };
};