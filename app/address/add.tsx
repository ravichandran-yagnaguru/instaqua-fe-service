import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, writeBatch, getDocs, doc } from 'firebase/firestore';
import { db, auth } from '@/firebaseConfig';

export default function AddAddressScreen() {
    const [label, setLabel] = useState('');
    const [isDefault, setIsDefault] = useState(false);
  const router = useRouter();
  const [house, setHouse] = useState('');
  const [road, setRoad] = useState('');
  const [landmark, setLandmark] = useState('');
  const [pincode, setPincode] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);

  const saveAddress = async () => {
    if (!label.trim()) {
      Alert.alert("Required", "Please enter a label for this address (e.g., Home, Work)");
      return;
    }
    if (!house || !road || !pincode || !city) {
      Alert.alert("Required", "Please fill all required fields");
      return;
    }
    if (!/^[0-9]{6}$/.test(pincode)) {
      Alert.alert("Invalid Pincode", "Please enter a valid 6-digit pincode");
      return;
    }
    if (!auth.currentUser) return;

    setLoading(true);
    try {
      // Build fullAddress as per format
      let fullAddress = `${house}, ${road}`;
      if (landmark) fullAddress += `, Near ${landmark}`;
      fullAddress += `, ${city} - ${pincode}`;

      const uid = auth.currentUser.uid;
      const addressesRef = collection(db, `users/${uid}/addresses`);
      const snap = await getDocs(addressesRef);
      let autoDefault = false;
      if (snap.size === 0) {
        autoDefault = true;
      }

      // If set as default, unset others first
      let finalIsDefault = isDefault;
      if (autoDefault) finalIsDefault = true;
      if (finalIsDefault) {
        const batch = writeBatch(db);
        snap.forEach(docSnap => {
          const ref = doc(db, `users/${uid}/addresses/${docSnap.id}`);
          batch.update(ref, { isDefault: false });
        });
        await batch.commit();
      }

      await addDoc(addressesRef, {
        label: label.trim(),
        fullAddress,
        isDefault: finalIsDefault,
        createdAt: new Date().toISOString(),
        coordinates: { latitude: 26.6406, longitude: -81.8723 }
      });
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Add Address</Text>
        <View style={{width: 24}} />
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Label (e.g. Home, Work)</Text>
        <TextInput style={styles.input} value={label} onChangeText={setLabel} placeholder="Label" />

        <Text style={styles.label}>House No / Building Name</Text>
        <TextInput style={styles.input} value={house} onChangeText={setHouse} placeholder="e.g. 104, Galaxy Apts" />

        <Text style={styles.label}>Road / Area / Colony</Text>
        <TextInput style={styles.input} value={road} onChangeText={setRoad} placeholder="e.g. MG Road, Sector 5" />

        <Text style={styles.label}>Landmark (Optional)</Text>
        <TextInput style={styles.input} value={landmark} onChangeText={setLandmark} placeholder="Near SBI Bank" />

        <Text style={styles.label}>Pincode</Text>
        <TextInput style={styles.input} value={pincode} onChangeText={setPincode} placeholder="e.g. 560001" keyboardType="numeric" maxLength={6} />

        <Text style={styles.label}>City</Text>
        <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="e.g. Bangalore" />

        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setIsDefault(v => !v)}
        >
          <Ionicons
            name={isDefault ? 'checkbox' : 'square-outline'}
            size={22}
            color={isDefault ? '#007AFF' : '#888'}
            style={{ marginRight: 8 }}
          />
          <Text style={{ color: '#333', fontSize: 15 }}>Set as Default Address</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.btn, loading && {opacity: 0.7}]} 
          onPress={saveAddress}
          disabled={loading}
        >
          <Text style={styles.btnText}>{loading ? "Saving..." : "Save Address"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white', padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30, marginTop: 40 },
  title: { fontSize: 18, fontWeight: 'bold' },
  form: { gap: 15 },
  label: { color: '#666', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 10 },
  btn: { backgroundColor: '#007AFF', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
});