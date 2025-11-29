import { auth, db } from '@/firebaseConfig';
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, onSnapshot, orderBy, query, writeBatch, doc, updateDoc, deleteDoc, where, getDocs } from 'firebase/firestore';
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert
} from "react-native";
import AppHeader from '@/components/AppHeader';
import { useAddress } from '../../contexts/AddressContext';

export default function AddressSelectionScreen() {
    // Set Default Address
    const handleSetDefault = async (id: string) => {
      if (!auth.currentUser) return;
      const uid = auth.currentUser.uid;
      const batch = writeBatch(db);
      const addressesRef = collection(db, `users/${uid}/addresses`);
      const snap = await getDocs(addressesRef);
      snap.forEach(docSnap => {
        const ref = doc(db, `users/${uid}/addresses/${docSnap.id}`);
        batch.update(ref, { isDefault: docSnap.id === id });
      });
      await batch.commit();
    };

    // Delete Address
    const handleDelete = async (id: string) => {
      Alert.alert(
        'Delete Address',
        'Are you sure you want to delete this address?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete', style: 'destructive', onPress: async () => {
              if (!auth.currentUser) return;
              const uid = auth.currentUser.uid;
              await deleteDoc(doc(db, `users/${uid}/addresses/${id}`));
            }
          }
        ]
      );
    };
  const router = useRouter();
  const { setAddress, selectedAddress } = useAddress();
  const [addresses, setAddresses] = useState<any[]>([]);
  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, `users/${auth.currentUser.uid}/addresses`),
      orderBy('label', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAddresses(list);
    });
    return () => unsub();
  }, [auth.currentUser]);

  const getIcon = (type: string) => {
    switch (type) {
      case "home":
        return "home";
      case "work":
        return "briefcase";
      default:
        return "location"; // default icon
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader showBackButton={true} title="Select Address" />

      {/* --- MAP PLACEHOLDER --- */}
      <View style={styles.mapPlaceholder}>
        <View style={styles.mapMarker}>
          <Ionicons name="location" size={40} color="#007AFF" />
        </View>
        <Text style={{ color: "#999" }}>Map View Placeholder</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Select a delivery address</Text>

        {addresses.length === 0 ? (
          <Text style={{ color: '#888', textAlign: 'center', marginTop: 30 }}>No saved addresses found</Text>
        ) : (
          addresses.map((addr) => (
            <TouchableOpacity
              key={addr.id}
              onPress={() => {
                setAddress(addr);
                router.back();
              }}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.addressCard,
                  selectedAddress?.id === addr.id && styles.selectedCard,
                ]}
              >
                <View style={styles.iconContainer}>
                  <Ionicons
                    name={getIcon(addr.type) as any}
                    size={24}
                    color="#007AFF"
                  />
                </View>
                <View style={styles.addressInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                    <Text style={styles.addressLabel}>{addr.label}</Text>
                    {addr.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>Default</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.addressText}>{addr.fullAddress || addr.address}</Text>
                  {!addr.isDefault && (
                    <TouchableOpacity onPress={() => handleSetDefault(addr.id)}>
                      <Text style={styles.setDefaultText}>Set Default</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {selectedAddress?.id === addr.id ? (
                    <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                  ) : (
                    <Ionicons name="ellipse-outline" size={24} color="#ccc" />
                  )}
                  <TouchableOpacity onPress={() => handleDelete(addr.id)} style={{ marginLeft: 10 }}>
                    <Ionicons name="trash" size={22} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* --- FOOTER BUTTON --- */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/address/add")} // <--- LINK TO NEW FORM
        >
          <Text style={styles.addButtonText}>Add New Address</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  header: {
    backgroundColor: "#007AFF",
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: { padding: 5 },
  headerTitle: { color: "white", fontSize: 18, fontWeight: "bold" },

  mapPlaceholder: {
    height: 180,
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#ccc",
  },
  mapMarker: { marginBottom: 10 },

  content: { flex: 1, padding: 20 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },

  addressCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "transparent",
  },
  selectedCard: { borderColor: "#007AFF" },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  addressInfo: { flex: 1 },
  addressLabel: { fontSize: 16, fontWeight: "bold", color: "#333" },
  addressText: { fontSize: 13, color: "#666", marginTop: 2 },
  defaultBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  defaultBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  setDefaultText: {
    color: '#007AFF',
    fontSize: 13,
    marginTop: 6,
    fontWeight: 'bold',
  },
  radioContainer: { paddingLeft: 10 },

  footer: {
    padding: 20,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderColor: "#eee",
  },
  addButton: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  addButtonText: { color: "white", fontSize: 16, fontWeight: "bold" },
});
