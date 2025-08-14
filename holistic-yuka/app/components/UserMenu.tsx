import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface UserMenuProps {
  onProfilePress: () => void;
  onHistoryPress: () => void;
}

export function UserMenu({ onProfilePress, onHistoryPress }: UserMenuProps) {
  const [isVisible, setIsVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  const showMenu = () => {
    setIsVisible(true);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 20,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideMenu = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => setIsVisible(false));
  };

  const handleProfilePress = () => {
    hideMenu();
    setTimeout(() => {
      onProfilePress();
    }, 200);
  };

  const handleHistoryPress = () => {
    hideMenu();
    setTimeout(() => {
      onHistoryPress();
    }, 200);
  };

  return (
    <View>
      <TouchableOpacity style={styles.userAvatar} onPress={showMenu}>
        <Ionicons name="person" size={24} color="#026A3D" />
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent
        animationType="none"
        onRequestClose={hideMenu}
      >
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1} 
          onPress={hideMenu}
        >
          <Animated.View 
            style={[
              styles.menuContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <View style={styles.menuHeader}>
              <View style={styles.menuAvatar}>
                <Ionicons name="person" size={32} color="#026A3D" />
              </View>
              <View style={styles.menuHeaderText}>
                <Text style={styles.menuTitle}>Menu</Text>
                <Text style={styles.menuSubtitle}>Choose an option</Text>
              </View>
            </View>

            <View style={styles.menuOptions}>
              <TouchableOpacity style={styles.menuOption} onPress={handleProfilePress}>
                <View style={styles.optionIconContainer}>
                  <Ionicons name="person-outline" size={24} color="#026A3D" />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Profile</Text>
                  <Text style={styles.optionSubtitle}>View your account details</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <View style={styles.optionSeparator} />

              <TouchableOpacity style={styles.menuOption} onPress={handleHistoryPress}>
                <View style={styles.optionIconContainer}>
                  <Ionicons name="time-outline" size={24} color="#026A3D" />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>History</Text>
                  <Text style={styles.optionSubtitle}>View your scan history</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E7F5E7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E7F5E7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuHeaderText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  menuOptions: {
    padding: 8,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  optionSeparator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
    marginVertical: 4,
  },
});