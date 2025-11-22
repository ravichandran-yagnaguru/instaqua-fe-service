import * as Location from "expo-location";
import {
    addDoc,
    collection,
    onSnapshot,
    orderBy,
    query,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { auth, db } from "../firebaseConfig"; // Ensure path matches your file structure

interface AddressManagerProps {
  onSelectAddress: (address: any) => void;
  selectedAddressId: string;
}

export default function AddressManager({
  onSelectAddress,
  selectedAddressId,
}: AddressManagerProps) {
  const [status, requestPermission] = Location.useForegroundPermissions();
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 1. Listen to saved addresses
  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, `users/${auth.currentUser.uid}/addresses`),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const addresses = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSavedAddresses(addresses);
    });

    return unsubscribe;
  }, []);

  // 2. Get Current Location
  const handleGetCurrentLocation = async () => {
    if (!auth.currentUser) {
      setLoading(false);
      Alert.alert(
        'Login Required',
        'Please sign in via the Developer Zone to save addresses.'
      );
      return;
    }
    if (!status?.granted) {
      const permission = await requestPermission();
      if (!permission.granted) {
        setLoading(false);
        Alert.alert(
          "Permission needed",
          "Please allow location access to use this feature."
        );
        return;
      }
    }

    setLoading(true);
    try {
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // Reverse Geocode to get text address
      const reversed = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      const addressObj = reversed[0];
      const addressText = addressObj
        ? `${addressObj.street || ""} ${addressObj.name || ""}, ${addressObj.city || ""}`.trim()
        : "Unknown Location";

      // Save to Firestore
      const newAddr = {
        label: "Current Location",
        fullAddress: addressText,
        coordinates: { latitude, longitude },
        createdAt: new Date().toISOString(),
      };

      if (auth.currentUser) {
        const docRef = await addDoc(
          collection(db, `users/${auth.currentUser.uid}/addresses`),
          newAddr
        );
        // Auto-select the new address (with Firestore id)
        onSelectAddress({ ...newAddr, id: docRef.id });
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to get location.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 10 }}>
      {/* Header */}
      <Text style={{ fontSize: 13, color: '#888', marginBottom: 8, marginLeft: 2 }}>Saved Locations</Text>

      {/* Use Current Location Button */}
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#2196F3',
          borderRadius: 8,
          paddingVertical: 14,
          marginBottom: 18,
          opacity: loading ? 0.7 : 1,
        }}
        onPress={handleGetCurrentLocation}
        disabled={loading}
        activeOpacity={0.8}
      >
        <MaterialIcons name="my-location" size={22} color="#fff" style={{ marginRight: 8 }} />
        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
          {loading ? 'Getting Location...' : 'Use Current Location'}
        </Text>
        {loading && <ActivityIndicator size="small" color="#fff" style={{ marginLeft: 10 }} />}
      </TouchableOpacity>

      {/* Address List (Using Map instead of FlatList to avoid nesting errors) */}
      <View style={{ gap: 10 }}>
        {savedAddresses.map((item) => {
          const selected = selectedAddressId === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => onSelectAddress(item)}
              style={{
                padding: 15,
                borderWidth: 2,
                borderColor: selected ? '#2196F3' : '#ccc',
                backgroundColor: selected ? '#e3f2fd' : '#fff',
                borderRadius: 10,
                flexDirection: 'row',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOpacity: 0.04,
                shadowRadius: 2,
                shadowOffset: { width: 0, height: 1 },
              }}
              activeOpacity={0.85}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: 'bold', fontSize: 16 }}>
                  {item.label || 'Address'}
                </Text>
                <Text style={{ color: '#666', fontSize: 12 }} numberOfLines={1}>
                  {item.fullAddress}
                </Text>
              </View>
              {selected && (
                <MaterialIcons name="check" size={22} color="#2196F3" style={{ marginLeft: 8 }} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
