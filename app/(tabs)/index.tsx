
import { Colors } from '@/constants/Colors';
import { db, auth } from '@/firebaseConfig';
import { signOut } from 'firebase/auth';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { collection, endAt, getDocs, orderBy, query, startAt, where, addDoc, setDoc, doc, writeBatch } from 'firebase/firestore';
import * as geofire from 'geofire-common';
import React, { useEffect, useState } from 'react';
import { useAddress } from '@/contexts/AddressContext';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, RefreshControl } from 'react-native';
import AppHeader from '@/components/AppHeader';

  // Helper to get vendor closing time (robust)
  const getCloseTime = (vendor: any) => {
    try {
      const end = vendor.activeHours?.end;
      if (!end) return '10:00 PM';
      let date;
      if (typeof end === 'object' && end !== null && 'seconds' in end) {
        date = new Date(end.seconds * 1000);
      } else if (typeof end === 'string' || typeof end === 'number') {
        date = new Date(end);
      } else {
        return '10:00 PM';
      }
      if (isNaN(date.getTime())) return '10:00 PM';
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '10:00 PM';
    }
  };


export default function HomeScreen() {
  const router = useRouter();
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { selectedAddress } = useAddress();

  // Pull-to-refresh handler: get current location and reload vendors
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setRefreshing(false);
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      await fetchNearbyVendors(location.coords.latitude, location.coords.longitude);
    })();
  }, []);

  const fetchNearbyVendors = async (lat: number, lng: number) => {
    try {
      // geofire expects [lat, lng] as Geopoint (tuple of two numbers)
      const center: [number, number] = [lat, lng];
      const radiusInKm = 50;
      const bounds = geofire.geohashQueryBounds(center, radiusInKm * 1000);
      const promises = [];

      for (const b of bounds) {
        const q = query(
          collection(db, "users"),
          where("role", "==", "vendor"),
          where("isOnline", "==", true), // Only Online
          orderBy("location.geohash"),
          startAt(b[0]),
          endAt(b[1])
        );
        promises.push(getDocs(q));
      }

      const snapshots = await Promise.all(promises);
      const matchingVendors: any[] = [];

      for (const snap of snapshots) {
        for (const doc of snap.docs) {
          const data = doc.data();
          
          // --- FIX 1: FILTER GHOST VENDORS ---
          if (!data.businessName || data.businessName.trim() === "") continue;

          const vLat = data.location.coordinates.latitude;
          const vLng = data.location.coordinates.longitude;
          // geofire.distanceBetween expects Geopoint (tuple of two numbers)
          const distanceInKm = geofire.distanceBetween([vLat, vLng] as [number, number], center);

          if (distanceInKm <= radiusInKm) {
            matchingVendors.push({
              id: doc.id,
              ...data,
              distance: distanceInKm,
            });
          }
        }
      }
      // Sort by distance
      matchingVendors.sort((a, b) => a.distance - b.distance);
      setVendors(matchingVendors);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // --- FIX 2: QUICK ORDER LOGIC ---
  const handleQuickOrder = () => {
    if (!selectedAddress) {
      Alert.alert("No Address", "Please select a delivery location");
      return;
    }
    if (vendors.length > 0) {
      // Automatically pick the first (nearest) vendor
      const nearest = vendors[0];
      router.push({ pathname: '/vendor/[id]', params: { id: nearest.id } });
    } else {
      Alert.alert("No Vendors", "We couldn't find any vendors nearby.");
    }
  };




  // Re-fetch vendors when selectedAddress changes
  useEffect(() => {
    if (selectedAddress && selectedAddress.coordinates) {
      fetchNearbyVendors(selectedAddress.coordinates.latitude, selectedAddress.coordinates.longitude);
    }
  }, [selectedAddress]);

  return (
    <View style={styles.container}>
      <AppHeader />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Quick Order Button */}
        <TouchableOpacity style={styles.quickOrderCard} onPress={handleQuickOrder}>
          <View style={styles.quickOrderIcon}>
            <MaterialIcons name="flash-on" size={32} color="white" />
          </View>
          <View>
            <Text style={styles.quickOrderText}>Quick Order</Text>
            <Text style={{color:'rgba(255,255,255,0.8)', fontSize: 12}}>
              From nearest store
            </Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Nearest Vendors</Text>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} />
        ) : (
          vendors.map((vendor) => (
            <TouchableOpacity 
              key={vendor.id} 
              style={styles.vendorCard}
              onPress={() => router.push({ pathname: '/vendor/[id]', params: { id: vendor.id } })}
            >
              <View style={styles.vendorLogoPlaceholder}>
                <Text style={{fontSize: 24}}>💧</Text>
              </View>
              
              <View style={styles.vendorInfo}>
                <View style={styles.vendorHeaderRow}>
                  <Text style={styles.vendorName}>{vendor.businessName}</Text>
                  <Text style={styles.vendorDistance}>{vendor.distance ? vendor.distance.toFixed(1) + ' km' : '...'}</Text>
                </View>
                
                <View style={styles.vendorDetailsRow}>
                  <Text style={styles.vendorMeta}>Open • Closes {getCloseTime(vendor)}</Text>
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color="#FFD700" />
                    <Text style={styles.ratingText}>{vendor.rating || "New"}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Developer Tools Section */}
        <View style={styles.devZoneStrict}>
          <Text style={styles.devZoneTitleStrict}>Developer Zone</Text>
          <TouchableOpacity
            style={styles.devBtnStrict}
            onPress={seedDatabase}
          >
            <Text style={styles.devBtnTextStrict}>RESET & SEED DATABASE</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>

  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    backgroundColor: '#007AFF', 
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  headerIcons: { flexDirection: 'row', gap: 15 },
  iconButton: { padding: 4 },
  headerWelcome: { marginTop: 20 },
  welcomeTitle: { fontSize: 28, fontWeight: 'bold', color: 'white' },
  welcomeSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.9)', marginTop: 5 },
  addAddressPill: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  addAddressPillText: {
    color: '#007AFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  scrollContent: { padding: 20 },
  quickOrderCard: {
    backgroundColor: '#0056D2', 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 25,
    marginTop: -10,
    shadowColor: '#000', shadowOffset: {width:0, height:4}, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5
  },
  quickOrderIcon: { marginRight: 10 },
  quickOrderText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  vendorCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2
  },
  vendorLogoPlaceholder: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: '#E3F2FD',
    justifyContent: 'center', alignItems: 'center', marginRight: 16
  },
  vendorInfo: { flex: 1 },
  vendorHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  vendorName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  vendorDistance: { fontSize: 12, color: '#666' },
  vendorDetailsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vendorMeta: { fontSize: 13, color: '#888' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontWeight: 'bold', fontSize: 12 },
  // Dev tools strict styles
  devZoneStrict: {
    backgroundColor: '#fff3e0',
    borderRadius: 14,
    padding: 24,
    marginTop: 40,
    marginBottom: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffe0b2',
  },
  devZoneTitleStrict: {
    color: '#ff9800',
    fontWeight: 'bold',
    fontSize: 20,
    marginBottom: 18,
    letterSpacing: 1,
  },
  devBtnStrict: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginVertical: 8,
    borderWidth: 2,
    borderColor: 'red',
    shadowColor: '#ff9800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  devBtnTextStrict: {
    color: 'red',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1,
  },
});

// --- STRICT SCHEMA SEEDING FUNCTION ---

async function seedDatabase() {
  try {
    // 1. Center point: Fort Myers
    const center = [26.6406, -81.8723];
    const vendors = [
      {
        uid: 'vendor_1',
        businessName: 'A-One Water Supply',
        offset: [0, 0],
      },
      {
        uid: 'vendor_2',
        businessName: 'Aqua Pure Enterprises',
        offset: [0.01, 0.01],
      },
      {
        uid: 'vendor_3',
        businessName: 'Blue Wave Distributors',
        offset: [-0.015, -0.015],
      },
    ];
    const batch = writeBatch(db);
    for (const v of vendors) {
      const lat = center[0] + v.offset[0];
      const lng = center[1] + v.offset[1];
      const geohash = geofire.geohashForLocation([lat, lng]);
      const vendorDoc = {
        uid: v.uid,
        role: 'vendor',
        businessName: v.businessName,
        isOnline: true,
        rating: 5,
        inventoryCount: 3,
        serviceRadiusKm: 15,
        activeHours: {
          start: new Date(2025, 0, 1, 8, 0, 0),
          end: new Date(2025, 0, 1, 22, 0, 0),
        },
        location: {
          geohash,
          coordinates: { latitude: lat, longitude: lng },
        },
      };
      const vendorRef = doc(db, 'users', v.uid);
      batch.set(vendorRef, vendorDoc);
    }
      await batch.commit();

      // Add products for each vendor
      const productSets = [
        [
          { name: 'Bisleri', size: '20L Can', price: 40, inStock: true },
          { name: 'Aquafina', size: '20L Can', price: 38, inStock: true },
          { name: 'Kinley', size: '20L Can', price: 36, inStock: true },
        ],
        [
          { name: 'Bisleri', size: '20L Can', price: 42, inStock: true },
          { name: 'Aquasure', size: '20L Can', price: 39, inStock: true },
          { name: 'Himalayan', size: '20L Can', price: 50, inStock: true },
        ],
        [
          { name: 'Bisleri', size: '20L Can', price: 41, inStock: true },
          { name: 'Aquafina', size: '20L Can', price: 37, inStock: true },
          { name: 'Kingfisher', size: '20L Can', price: 35, inStock: true },
        ],
      ];
      for (let i = 0; i < vendors.length; i++) {
        const vendorId = vendors[i].uid;
        const products = productSets[i];
        for (const p of products) {
          await addDoc(collection(db, 'users', vendorId, 'products'), p);
        }
      }
      Alert.alert('Database Seeded!', 'Vendors and products have been created.');
    } catch (e) {
      Alert.alert('Seeding Failed', (e as any)?.message || String(e));
    }
  }