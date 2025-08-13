// hooks/useScanHistory.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { HealthAnalysis } from '../types/healthAnalysis';
import { Product } from '../types/product';

export interface ScanHistoryItem {
  id: string;
  barcode: string;
  product: Product;
  analysis: HealthAnalysis;
  timestamp: Date;
}

const SCAN_HISTORY_KEY = 'holsty_scan_history';

export const useScanHistory = () => {
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load history from storage on hook initialization
  useEffect(() => {
    loadScanHistory();
  }, []);

  const loadScanHistory = async () => {
    try {
      const storedHistory = await AsyncStorage.getItem(SCAN_HISTORY_KEY);
      if (storedHistory) {
        const parsedHistory = JSON.parse(storedHistory);
        // Convert timestamp strings back to Date objects
        const historyWithDates = parsedHistory.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
        setScanHistory(historyWithDates);
      }
    } catch (error) {
      console.error('Error loading scan history:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveScanHistory = async (history: ScanHistoryItem[]) => {
    try {
      await AsyncStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Error saving scan history:', error);
    }
  };

  const addScanToHistory = async (scanItem: ScanHistoryItem) => {
    try {
      const updatedHistory = [scanItem, ...scanHistory];
      // Keep only the most recent 100 scans to prevent storage bloat
      const trimmedHistory = updatedHistory.slice(0, 100);
      
      setScanHistory(trimmedHistory);
      await saveScanHistory(trimmedHistory);
    } catch (error) {
      console.error('Error adding scan to history:', error);
    }
  };

  const removeScanFromHistory = async (scanId: string) => {
    try {
      const updatedHistory = scanHistory.filter(item => item.id !== scanId);
      setScanHistory(updatedHistory);
      await saveScanHistory(updatedHistory);
    } catch (error) {
      console.error('Error removing scan from history:', error);
    }
  };

  const clearHistory = async () => {
    try {
      setScanHistory([]);
      await AsyncStorage.removeItem(SCAN_HISTORY_KEY);
    } catch (error) {
      console.error('Error clearing scan history:', error);
    }
  };

  const getScanById = (id: string): ScanHistoryItem | undefined => {
    return scanHistory.find(item => item.id === id);
  };

  const getRecentScans = (count: number = 5): ScanHistoryItem[] => {
    return scanHistory.slice(0, count);
  };

  const searchHistory = (query: string): ScanHistoryItem[] => {
    const lowercaseQuery = query.toLowerCase();
    return scanHistory.filter(item => 
      item.product?.product_name_en?.toLowerCase().includes(lowercaseQuery) ||
      item.product?.product_name?.toLowerCase().includes(lowercaseQuery) ||
      item.product?.brands?.toLowerCase().includes(lowercaseQuery) ||
      item.barcode.includes(query)
    );
  };

  return {
    scanHistory,
    loading,
    addScanToHistory,
    removeScanFromHistory,
    clearHistory,
    getScanById,
    getRecentScans,
    searchHistory,
  };
};