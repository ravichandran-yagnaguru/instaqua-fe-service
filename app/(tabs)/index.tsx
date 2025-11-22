// (Stray useEffect removed; only useEffect inside HomeScreen remains)
import { HelloWave } from "@/components/hello-wave";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  addDoc,
  endAt,
  onSnapshot,
  orderBy,
  query,
  startAt,
  where,
} from "firebase/firestore";
import * as geofire from "geofire-common";
import { useEffect, useState } from "react"; // To store the results
import {
  Alert,
  Button,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
// ... existing imports

// 1. Import DB
import VendorHomeScreen from "@/components/VendorHomeScreen";
import VendorOrderManager from "@/components/VendorOrderManager";
import { auth, db } from "@/firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, doc, getDocs, setDoc } from "firebase/firestore";


export default function HomeScreen() {
  const [nearbyVendors, setNearbyVendors] = useState<any[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<string>("");
  const [isVendorMode, setIsVendorMode] = useState(false);
  const [vendorTab, setVendorTab] = useState<'home' | 'orders'>('home');
  // We'll simulate being "vendor_test_1" (from our seed data)
  const currentVendorId = "vendor_test_1";

  // Ensure vendorTab is reset when exiting vendor mode
  useEffect(() => {
    if (!isVendorMode) {
      setVendorTab('home');
    }
  }, [isVendorMode]);

  // Minimal Vendor Dashboard Component

  const placeOrder = async (vendor: any) => {
    try {
      if (!auth.currentUser) {
        Alert.alert("Error", "You must be logged in to order!");
        return;
      }

      // 1. Construct the Order Object (MVP Schema)
      // We hardcode 2 cans for now to test the flow
      const orderPayload = {
        customer: {
          uid: auth.currentUser.uid,
          phoneNumber: "+15550000000", // In real app, fetch from profile
        },
        vendor: {
          uid: vendor.id, // The vendor we clicked on
          businessName: vendor.businessName,
          location: vendor.location,
        },
        status: "CREATED",
        items: [
          {
            productId: "can_20L",
            name: "20L Water Can",
            quantity: 2,
            pricePerUnit: 40,
          },
        ],
        pricing: {
          itemTotal: 80,
          deliveryFee: 0, // We will calculate this later
          totalAmount: 80,
        },
        deliveryLocation: {
          // In real app, this is the customer's chosen address
          // For MVP, we just use the center point we used for discovery
          coordinates: {
            latitude: 26.6406,
            longitude: -81.8723,
          },
        },
        createdAt: new Date().toISOString(),
      };

      // 2. Write to Firestore
      // "addDoc" automatically creates a unique Order ID
      const docRef = await addDoc(collection(db, "orders"), orderPayload);

      console.log("Order Placed! ID:", docRef.id);
      setActiveOrderId(docRef.id);
      Alert.alert("Success", `Order ${docRef.id.slice(0, 6)}... placed!`);
    } catch (error: any) {
      console.error("Order Error:", error);
      Alert.alert("Error", error.message);
    }
  };

  // 2. Add Test Logic
  const testConnection = async () => {
    try {
      // Attempt to read a dummy collection
      await getDocs(collection(db, "test_connection"));
      console.log("Connection Successful!");
      Alert.alert("Success", "Connected to Firebase!");
    } catch (error: any) {
      console.error("Connection Error:", error);
      Alert.alert("Error", error.message);
    }
  };

  const testSignUp = async () => {
    try {
      // 1. Create Auth User (Simulated)
      const dummyEmail = `testuser_${Date.now()}@instaqua.com`;
      const dummyPass = "password123";

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        dummyEmail,
        dummyPass
      );
      const user = userCredential.user;
      console.log("Auth Created:", user.uid);

      // 2. Create User Profile in Firestore
      // We use the same 'uid' from Auth to link them
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        role: "customer", // Default role
        email: dummyEmail,
        phoneNumber: "+15550000000", // Dummy phone for now
        createdAt: new Date().toISOString(),
        isOnline: true,
      });

      console.log("Firestore Profile Created!");
      Alert.alert("Success", "User Created & Saved to DB!");
    } catch (error: any) {
      console.error("Sign Up Error:", error);
      Alert.alert("Error", error.message);
    }
  };

  const seedDatabase = async () => {
    try {
      // Center point: Fort Myers, FL
      const center = [26.6406, -81.8723];

      // Create 3 Dummy Vendors
      const vendors = [
        { name: "AquaPure Supplies", offset: [0, 0] }, // Exact center
        { name: "Blue Wave Water", offset: [0.01, 0.01] }, // ~1.5km away
        { name: "Hydra Point", offset: [-0.02, -0.02] }, // ~3km away
      ];

      for (let i = 0; i < vendors.length; i++) {
        const v = vendors[i];
        // Calculate simple offset for lat/lng
        const lat = center[0] + (v.offset[0] as number);
        const lng = center[1] + (v.offset[1] as number);

        // CRITICAL: Generate Geohash
        const hash = geofire.geohashForLocation([lat, lng]);

        const vendorId = `vendor_test_${i + 1}`;

        await setDoc(doc(db, "users", vendorId), {
          uid: vendorId,
          role: "vendor",
          businessName: v.name,
          isOnline: true,
          isVerified: true,
          rating: 4.5,
          inventoryCount: 50,
          serviceRadiusKm: 10,
          activeHours: { start: "06:00", end: "22:00" },
          location: {
            geohash: hash,
            coordinates: {
              latitude: lat,
              longitude: lng,
            },
          },
          phoneNumber: "+15550009999",
          createdAt: new Date().toISOString(),
        });
      }

      console.log("Vendors Seeded!");
      Alert.alert("Success", "3 Dummy Vendors added to DB!");
    } catch (error: any) {
      console.error("Seeding Error:", error);
      Alert.alert("Error", error.message);
    }
  };

  const findVendors = async () => {
    try {
      // 1. Simulate Customer Location (Same as seeding center)
      const center = [26.6406, -81.8723];
      const radiusInKm = 50; // Large radius to ensure we find them for testing

      // 2. Get Geohash Bounds
      // This calculates the start/end hash strings for the search area
      const bounds = geofire.geohashQueryBounds(center, radiusInKm * 1000);
      const promises = [];

      // 3. Create a Query for each "Bound" (usually 4-9 queries)
      for (const b of bounds) {
        const q = query(
          collection(db, "users"),
          where("role", "==", "vendor"), // Only get vendors
          where("isOnline", "==", true), // Only online
          orderBy("location.geohash"), // Must order by geohash for range query
          startAt(b[0]),
          endAt(b[1])
        );
        promises.push(getDocs(q));
      }

      // 4. Execute all queries
      const snapshots = await Promise.all(promises);

      const matchingVendors: any[] = [];

      for (const snap of snapshots) {
        for (const doc of snap.docs) {
          const lat = doc.data().location.coordinates.latitude;
          const lng = doc.data().location.coordinates.longitude;

          // 5. Calculate Exact Distance (Filter false positives)
          const distanceInKm = geofire.distanceBetween([lat, lng], center);

          if (distanceInKm <= radiusInKm) {
            matchingVendors.push({
              id: doc.id,
              ...doc.data(),
              distance: distanceInKm, // Save this to display in UI
            });
          }
        }
      }

      // 6. Sort by nearest first
      matchingVendors.sort((a, b) => a.distance - b.distance);

      setNearbyVendors(matchingVendors);
      console.log("Found Vendors:", matchingVendors.length);
    } catch (error: any) {
      console.error("Discovery Error:", error);
      Alert.alert("Error", error.message);
    }
  };

  // Real-time Order Listener
  useEffect(() => {
    if (!activeOrderId) return;

    // Create a reference to the specific order document
    const orderRef = doc(db, "orders", activeOrderId);

    // "onSnapshot" fires every time the document changes in the DB
    const unsubscribe = onSnapshot(orderRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        console.log("Real-time Update:", data.status);
        setOrderStatus(data.status);
      }
    });

    // Cleanup listener when component unmounts or order changes
    return () => unsubscribe();
  }, [activeOrderId]);

  console.log(
    "Render Cycle - Active Order:",
    activeOrderId,
    "Status:",
    orderStatus
  );

  if (isVendorMode) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f5f5f5', paddingTop: 50 }}>
        {/* 1. TOP BAR: Back Button & Title */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 }}>
          <Button
            title="Exit"
            color="red"
            onPress={() => {
              setIsVendorMode(false);
            }}
          />
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginLeft: 20 }}>
            {vendorTab === 'home' ? 'My Shop' : 'Order Manager'}
          </Text>
        </View>

        {/* 2. CONTENT AREA: Swaps based on tab */}
        <View style={{ flex: 1 }}>
          {vendorTab === 'home' ? (
            <VendorHomeScreen userId={currentVendorId} /> 
          ) : (
            <VendorOrderManager vendorUid={currentVendorId} />
          )}
        </View>

        {/* 3. BOTTOM NAVIGATION BAR */}
        <View style={{ 
          flexDirection: 'row', 
          backgroundColor: 'white', 
          borderTopWidth: 1, 
          borderColor: '#ddd', 
          paddingBottom: 20, // For iPhone Home Indicator
          paddingTop: 10
        }}>
          <Pressable 
            onPress={() => setVendorTab('home')}
            style={{ flex: 1, alignItems: 'center' }}
          >
            <Text style={{ 
              color: vendorTab === 'home' ? '#2196F3' : '#888', 
              fontWeight: 'bold' 
            }}>
              🏠 Dashboard
            </Text>
          </Pressable>

          <Pressable 
            onPress={() => setVendorTab('orders')}
            style={{ flex: 1, alignItems: 'center' }}
          >
            <Text style={{ 
              color: vendorTab === 'orders' ? '#2196F3' : '#888', 
              fontWeight: 'bold' 
            }}>
              📋 Orders
            </Text>
          </Pressable>
        </View>

      </View>
    );
  }

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
      headerImage={
        <Image
          source={require("@/assets/images/partial-react-logo.png")}
          style={styles.reactLogo}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        {/* ... existing header ... */}
        <Button
          title="Dev: Switch to Vendor Mode"
          onPress={() => setIsVendorMode(true)}
        />
      </ThemedView>

      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome to Instaqua!</ThemedText>
        <HelloWave />
      </ThemedView>

      {/* 3. Add the Button */}
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 1: Connectivity</ThemedText>
        <Button title="Ping Firebase" onPress={testConnection} />
        <Button title="Step 2: Simulate Sign Up" onPress={testSignUp} />
        <Button title="Step 3: Seed Vendors" onPress={seedDatabase} />
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 4: Discovery</ThemedText>
        <Button title="Find Nearby Vendors" onPress={findVendors} />

        {activeOrderId && (
          <View
            style={{
              marginTop: 20,
              padding: 20,
              backgroundColor: "#000000", // PURE BLACK BACKGROUND
              borderWidth: 4,
              borderColor: "#00FF00", // BRIGHT GREEN BORDER
              borderRadius: 10,
            }}
          >
            <Text
              style={{
                color: "#00FF00", // BRIGHT GREEN TEXT
                fontSize: 24,
                fontWeight: "bold",
                textAlign: "center",
              }}
            >
              STATUS: {orderStatus || "WAITING..."}
            </Text>

            <Text
              style={{ color: "#FFFFFF", textAlign: "center", marginTop: 10 }}
            >
              Order ID: {activeOrderId}
            </Text>
          </View>
        )}

        {/* Render the List */}
        {nearbyVendors.map((vendor) => (
          <ThemedView
            key={vendor.id}
            style={{
              padding: 10,
              marginVertical: 5,
              backgroundColor: "#f0f0f0",
              borderRadius: 8,
            }}
          >
            <ThemedText type="defaultSemiBold">
              {vendor.businessName}
            </ThemedText>
            <ThemedText>{vendor.distance.toFixed(2)} km away</ThemedText>
            <ThemedText style={{ color: "green" }}>
              Stock: {vendor.inventoryCount} cans
            </ThemedText>
          </ThemedView>
        ))}
      </ThemedView>

      {/* Render the List */}
      {nearbyVendors.map((vendor) => (
        <ThemedView
          key={vendor.id}
          style={{
            padding: 15,
            marginVertical: 8,
            backgroundColor: "#e0e0e0", // Slightly darker to pop
            borderRadius: 8,
            gap: 5,
          }}
        >
          <ThemedText type="defaultSemiBold">{vendor.businessName}</ThemedText>
          <ThemedText>{vendor.distance.toFixed(2)} km away</ThemedText>

          {/* THE NEW ACTION BUTTON */}
          <Button
            title="Order 2 Cans ($80)"
            onPress={() => placeOrder(vendor)}
            color="#2196F3"
          />
        </ThemedView>
      ))}
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
});
