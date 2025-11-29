
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import AppHeader from '@/components/AppHeader';
import { useRouter, Stack } from 'expo-router';
import { auth } from '../../firebaseConfig';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons';

const db = getFirestore();

export default function CustomerProfile() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [email, setEmail] = useState('');
  const [defaultAddress, setDefaultAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        // Redirect to login if not authenticated
        router.replace('/auth/login');
        return;
      }
      setUser(firebaseUser);
      setEmail(firebaseUser.email || '');
      // Fetch profile and address
      const fetchProfile = async () => {
        setLoading(true);
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          let profileName = '';
          if (userDoc.exists()) {
            profileName = userDoc.data().name || '';
          }
          setName(profileName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : ''));
          setOriginalName(profileName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : ''));
          // Fetch default address
          const addrQuery = query(
            collection(db, 'users', firebaseUser.uid, 'addresses'),
            where('isDefault', '==', true)
          );
          const addrSnap = await getDocs(addrQuery);
          if (!addrSnap.empty) {
            setDefaultAddress(addrSnap.docs[0].data().fullAddress || '');
          } else {
            setDefaultAddress('No default address set');
          }
        } catch {
          Alert.alert('Error', 'Failed to load profile.');
        } finally {
          setLoading(false);
        }
      };
      fetchProfile();
    });
    return () => unsubscribe();
  }, [router]);

  const handleSave = async () => {
    if (!user || name === originalName) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { name });
      setOriginalName(name);
      Alert.alert('Success', 'Profile updated!');
    } catch {
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.replace('/auth/login');
    } catch {
      Alert.alert('Error', 'Logout failed.');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}><ActivityIndicator size="large" color="#007AFF" /></View>
    );
  }
  // No need to render a not-logged-in message, as we redirect to login

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <AppHeader showBackButton={true} title="My Profile" />
        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
          />
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, styles.disabledInput]}
            value={email}
            editable={false}
            selectTextOnFocus={false}
          />
          <Text style={styles.label}>Default Address</Text>
          <Text style={styles.addressText}>{defaultAddress}</Text>
          <TouchableOpacity
            style={[styles.saveBtn, { opacity: name !== originalName ? 1 : 0.5 }]}
            onPress={handleSave}
            disabled={saving || name === originalName}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Profile'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/address/selection')}>
            <Text style={styles.actionBtnText}>Manage Addresses</Text>
          </TouchableOpacity>

        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#007AFF',
    height: 80,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: 16,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  form: {
    flex: 1,
    padding: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  disabledInput: {
    backgroundColor: '#f0f0f0',
    color: '#888',
  },
  addressText: {
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  saveBtn: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  actionBtn: {
    backgroundColor: '#FFFFFF',
    opacity: 1,
    borderColor: '#E0E0E0',
    borderWidth: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 0,
  },
  actionBtnText: {
    color: '#007AFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // historyBtn and historyBtnText removed; unified as actionBtn/actionBtnText
});
