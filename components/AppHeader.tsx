
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { auth } from '../firebaseConfig';
import { signOut } from 'firebase/auth';

interface AppHeaderProps {
  showBackButton?: boolean;
  title?: string;
  subtitle?: string;
}

const AppHeader: React.FC<AppHeaderProps> = ({ showBackButton = false, title, subtitle }) => {
  const router = useRouter();
  const user = auth.currentUser;

  // Derive name from email
  const name = user?.email ? user.email.split('@')[0] : 'User';



  const handleBack = () => router.back();
  const handleProfile = () => router.push('/customer/profile');
  const handleLogout = async () => {
    await signOut(auth);
    router.replace('/auth/login');
  };

  return (
    <View style={styles.container}>
      {/* Top Row */}
      <View style={styles.topRow}>
        <View style={styles.leftRow}>
          {showBackButton && (
            <TouchableOpacity onPress={handleBack} style={{ marginRight: 10 }}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          )}
          <Text style={styles.brand}>Instaqua</Text>
        </View>
        <View style={styles.rightRow}>
          <TouchableOpacity onPress={handleProfile} style={styles.iconCircle}>
            <Ionicons name="person" size={20} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.iconCircle}>
            <Ionicons name="exit-outline" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>
      {/* Middle Row: Greeting */}
      <Text style={styles.greeting}>{title || `Hi, ${name}`}</Text>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#007AFF',
    paddingTop: Platform.OS === 'android' ? 60 : 60,
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brand: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
    letterSpacing: 0.5,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  iconCircle: {
    backgroundColor: '#fff',
    borderRadius: 999,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 0,
    marginRight: 0,
    marginHorizontal: 7.5,
  },
  greeting: {
    marginTop: 20,
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 24,
  },
  addressRow: {
    marginTop: 16,
  },
  addressLabel: {
    color: '#fff',
    opacity: 0.8,
    fontSize: 12,
    marginBottom: 2,
  },
  addressText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default AppHeader;
