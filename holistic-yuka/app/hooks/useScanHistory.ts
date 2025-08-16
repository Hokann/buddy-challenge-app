// hooks/useScanHistory.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../supabase/supabaseConfig';
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
  const { user } = useAuth();

  // Load history when user changes
  useEffect(() => {
    if (user) {
      loadFromSupabase();
    } else {
      loadFromLocal();
    }
  }, [user]);

  // Load from Supabase (for logged-in users)
  const loadFromSupabase = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      console.log('Loading history from Supabase for user:', user.id);
      
      const { data, error } = await supabase
        .from('scan_history')
        .select('*')
        .eq('user_id', user.id)
        .order('scanned_at', { ascending: false });

      if (error) throw error;

      const formattedData = data.map(item => ({
        id: item.id,
        barcode: item.barcode,
        product: item.product_data,
        analysis: item.analysis_data,
        timestamp: new Date(item.scanned_at),
      }));

      console.log('Loaded', formattedData.length, 'scans from Supabase');
      setScanHistory(formattedData);
      
      // Also save to local storage as backup
      await AsyncStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(formattedData));
    } catch (error) {
      console.error('Error loading from Supabase:', error);
      // Fallback to local storage
      await loadFromLocal();
    } finally {
      setLoading(false);
    }
  };

  // Load from local storage (for offline/anonymous users)
  const loadFromLocal = async () => {
    try {
      setLoading(true);
      console.log('Loading history from local storage');
      
      const stored = await AsyncStorage.getItem(SCAN_HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const withDates = parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
        console.log('Loaded', withDates.length, 'scans from local storage');
        setScanHistory(withDates);
      } else {
        setScanHistory([]);
      }
    } catch (error) {
      console.error('Error loading from local:', error);
      setScanHistory([]);
    } finally {
      setLoading(false);
    }
  };

  // Add new scan
  const addScanToHistory = async (scanItem: ScanHistoryItem) => {
    try {
      console.log('Adding scan to history:', scanItem.barcode);
      
      // Save to local storage immediately for offline users
      if (!user) {
        console.log('No user logged in, saving locally only');
        const updated = [scanItem, ...scanHistory].slice(0, 100);
        setScanHistory(updated);
        await AsyncStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(updated));
        return;
      }
      
      // For logged-in users: Save to Supabase first, then reload
      console.log('Saving to Supabase for user:', user.id);
      const { error } = await supabase.from('scan_history').insert({
        user_id: user.id,
        barcode: scanItem.barcode,
        product_data: scanItem.product,
        analysis_data: scanItem.analysis,
        scanned_at: scanItem.timestamp.toISOString(),
      });
      
      if (error) {
        console.error('Supabase insert error:', error);
        // Fallback to local storage if Supabase fails
        const updated = [scanItem, ...scanHistory].slice(0, 100);
        setScanHistory(updated);
        await AsyncStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(updated));
      } else {
        console.log('Successfully saved to Supabase, reloading history...');
        // Reload from Supabase to get the latest data with proper UUIDs
        await loadFromSupabase();
      }
    } catch (error) {
      console.error('Error adding scan:', error);
      // Fallback to local storage on any error
      const updated = [scanItem, ...scanHistory].slice(0, 100);
      setScanHistory(updated);
      await AsyncStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(updated));
    }
  };

  // Remove scan
  const removeScanFromHistory = async (scanId: string) => {
    try {
      console.log('Removing scan:', scanId);
      
      if (user) {
        // Remove from Supabase first
        const { error } = await supabase
          .from('scan_history')
          .delete()
          .eq('id', scanId);
          
        if (error) {
          console.error('Error removing from Supabase:', error);
        } else {
          // Reload from Supabase to get updated list
          await loadFromSupabase();
          return;
        }
      }
      
      // Local removal (for non-logged users or if Supabase fails)
      const updated = scanHistory.filter(item => item.id !== scanId);
      setScanHistory(updated);
      await AsyncStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error removing scan:', error);
    }
  };

  // Clear all history
  const clearHistory = async () => {
    try {
      console.log('Clearing all history');
      
      if (user) {
        // Clear from Supabase first
        const { error } = await supabase
          .from('scan_history')
          .delete()
          .eq('user_id', user.id);
          
        if (error) {
          console.error('Error clearing Supabase history:', error);
        }
      }
      
      // Clear local storage and state
      setScanHistory([]);
      await AsyncStorage.removeItem(SCAN_HISTORY_KEY);
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };

  return {
    scanHistory,
    loading,
    addScanToHistory,
    removeScanFromHistory,
    clearHistory,
    refreshHistory: user ? loadFromSupabase : loadFromLocal,
  };
};