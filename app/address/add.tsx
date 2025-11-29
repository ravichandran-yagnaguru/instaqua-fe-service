import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import type { LocationObjectCoords } from 'expo-location';
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
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [coordinates, setCoordinates] = useState<LocationObjectCoords | null>(null);
  const [locating, setLocating] = useState(false);

  const handleUseCurrentLocation = async () => {
    try {
      setLocating(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required.');
        setLocating(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      setCoordinates(location.coords);
      const result = await Location.reverseGeocodeAsync(location.coords);
      if (result && result[0]) {
        setStreetOrHouse(result[0]);
        setCity(result[0].city || result[0].subregion || '');
        setPostalCode(result[0].postalCode || '');
        setLandmark(result[0].district || '');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not fetch location.');
    } finally {
      setLocating(false);
    }
  };

  // Helper to set house/road from geocode result
  const setStreetOrHouse = (geo: any) => {
    // Try to split house/road if possible
    if (geo.street && geo.name && geo.street !== geo.name) {
      setHouse(geo.name);
      setRoad(geo.street);
    } else if (geo.street) {
      setRoad(geo.street);
      setHouse('');
    } else if (geo.name) {
      setHouse(geo.name);
      setRoad('');
    }
  };

  const saveAddress = async () => {
    if (!label.trim()) {
      Alert.alert("Required", "Please enter a label for this address (e.g., Home, Work)");
      return;
    }
    if (!house || !road || !postalCode || !city) {
      Alert.alert("Required", "Please fill all required fields");
      return;
    }
    // Only check that postalCode is not empty (allow alphanumeric, global)
    if (!auth.currentUser) return;

    setLoading(true);
    try {
      // Build fullAddress as per format
      let fullAddress = `${house}, ${road}`;
      if (landmark) fullAddress += `, Near ${landmark}`;
      fullAddress += `, ${city} - ${postalCode}`;

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
        coordinates: coordinates && typeof coordinates.latitude === 'number' && typeof coordinates.longitude === 'number'
          ? { latitude: coordinates.latitude, longitude: coordinates.longitude }
          : { latitude: 26.6406, longitude: -81.8723 },
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
        <TouchableOpacity
          style={styles.useLocationBtn}
          onPress={handleUseCurrentLocation}
          disabled={locating}
        >
          {locating ? (
            <ActivityIndicator color="#007AFF" />
          ) : (
            <Text style={styles.useLocationBtnText}>📍 Use Current Location</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.label}>Label (e.g. Home, Work)</Text>
        <TextInput style={styles.input} value={label} onChangeText={setLabel} placeholder="Label" />

        <Text style={styles.label}>House No / Building Name</Text>
        <TextInput style={styles.input} value={house} onChangeText={setHouse} placeholder="e.g. 104, Galaxy Apts" />

        <Text style={styles.label}>Street Address / Area</Text>
        <TextInput style={styles.input} value={road} onChangeText={setRoad} placeholder="e.g. 123 Main St, Sector 5" />

        <Text style={styles.label}>Landmark (Optional)</Text>
        <TextInput style={styles.input} value={landmark} onChangeText={setLandmark} placeholder="Near SBI Bank" />

        <Text style={styles.label}>Zip / Postal Code</Text>
        <TextInput style={styles.input} value={postalCode} onChangeText={setPostalCode} placeholder="e.g. 560001 or SW1A 1AA" autoCapitalize="characters" keyboardType="default" />

        <Text style={styles.label}>City / District</Text>
        <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="e.g. Bangalore or London" />

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
    useLocationBtn: {
      backgroundColor: '#e3f0ff',
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
      marginBottom: 10,
    },
    useLocationBtnText: {
      color: '#007AFF',
      fontWeight: 'bold',
      fontSize: 15,
    },
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