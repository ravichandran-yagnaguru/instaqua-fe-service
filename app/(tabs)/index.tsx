import { useEffect, useState } from "react";
import {
  View,
  Text,
  Button,
  ScrollView,
  TouchableOpacity,
  Alert,
  Pressable,
  StyleSheet,
  Image,
} from "react-native";
import {
  collection,
  addDoc,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  startAt,
  endAt,
  onSnapshot,
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import * as geofire from "geofire-common";

// Local Imports
import { db, auth } from "@/firebaseConfig";
import AddressManager from "@/components/AddressManager";
import VendorHomeScreen from "@/components/VendorHomeScreen";
import VendorOrderManager from "@/components/VendorOrderManager";
import CheckoutModal from "@/components/CheckoutModal";
import CustomerOrderHistory from "@/components/CustomerOrderHistory";

export default function HomeScreen() {
  // --- STATE ---
  const [nearbyVendors, setNearbyVendors] = useState<any[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [orderStatus, setOrderStatus] = useState<string>("");
  const [isVendorMode, setIsVendorMode] = useState(false);
  const [vendorTab, setVendorTab] = useState<"home" | "orders">("home");
  const [currentAddress, setCurrentAddress] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);

  // We'll simulate being "vendor_test_1"
  const currentVendorId = "vendor_test_1";

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
      Alert.alert(
        "Success",
        "User Created & Saved to DB! You can now use location."
      );
    } catch (error: any) {
      console.error("Sign Up Error:", error);
      Alert.alert("Error", error.message);
    }
  };

  // --- EFFECTS ---

  // 1. Auto-Search: When address changes, find vendors automatically
  useEffect(() => {
    if (currentAddress) {
      findVendors();
    }
  }, [currentAddress]);

  // 2. Reset Vendor Tab on exit
  useEffect(() => {
    if (!isVendorMode) {
      setVendorTab("home");
    }
  }, [isVendorMode]);

  // 3. Real-time Order Listener
  useEffect(() => {
    if (!activeOrderId) return;
    const orderRef = doc(db, "orders", activeOrderId);
    const unsubscribe = onSnapshot(orderRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setOrderStatus(data.status);
      }
    });
    return () => unsubscribe();
  }, [activeOrderId]);

  // --- LOGIC ---

  const findVendors = async () => {
    try {
      if (!currentAddress) return;

      const center = [
        currentAddress.coordinates.latitude,
        currentAddress.coordinates.longitude,
      ];
      const radiusInKm = 50;
      const bounds = geofire.geohashQueryBounds(center, radiusInKm * 1000);
      const promises = [];

      for (const b of bounds) {
        const q = query(
          collection(db, "users"),
          where("role", "==", "vendor"),
          where("isOnline", "==", true),
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
          const lat = doc.data().location.coordinates.latitude;
          const lng = doc.data().location.coordinates.longitude;
          const distanceInKm = geofire.distanceBetween([lat, lng], center);

          if (distanceInKm <= radiusInKm) {
            matchingVendors.push({
              id: doc.id,
              ...doc.data(),
              distance: distanceInKm,
            });
          }
        }
      }
      matchingVendors.sort((a, b) => a.distance - b.distance);
      setNearbyVendors(matchingVendors);
    } catch (error: any) {
      console.error("Discovery Error:", error);
      // Don't alert on every auto-search failure, just log it
    }
  };

  const placeOrder = async (orderDetails: {
    quantity: number;
    itemTotal: number;
    deliveryFee: number;
    grandTotal: number;
  }) => {
    try {
      if (!auth.currentUser) {
        Alert.alert("Error", "You must be logged in to order!");
        return;
      }
      if (!selectedVendor) {
        Alert.alert("Error", "No vendor selected!");
        return;
      }

      const orderPayload = {
        customer: {
          uid: auth.currentUser.uid,
          phoneNumber: "+15550000000",
        },
        vendor: {
          uid: selectedVendor.id,
          businessName: selectedVendor.businessName,
          location: selectedVendor.location,
        },
        status: "CREATED",
        items: [
          {
            productId: "can_20L",
            name: "20L Water Can",
            quantity: orderDetails.quantity,
            pricePerUnit: 40,
          },
        ],
        pricing: {
          itemTotal: orderDetails.itemTotal,
          deliveryFee: orderDetails.deliveryFee,
          totalAmount: orderDetails.grandTotal,
        },
        deliveryLocation: {
          coordinates: {
            latitude: currentAddress?.coordinates.latitude || 26.6406,
            longitude: currentAddress?.coordinates.longitude || -81.8723,
          },
          address: currentAddress?.fullAddress || "Unknown",
        },
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, "orders"), orderPayload);
      setActiveOrderId(docRef.id);
      setSelectedVendor(null);
      Alert.alert("Success", `Order placed!`);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  // --- DEBUG FUNCTIONS (Hidden in UI) ---
  const seedDatabase = async () => {
    try {
      const center = [26.6406, -81.8723];
      const vendors = [
        { name: "AquaPure Supplies", offset: [0, 0] },
        { name: "Blue Wave Water", offset: [0.01, 0.01] },
        { name: "Hydra Point", offset: [-0.02, -0.02] },
      ];

      for (let i = 0; i < vendors.length; i++) {
        const v = vendors[i];
        const lat = center[0] + (v.offset[0] as number);
        const lng = center[1] + (v.offset[1] as number);
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
            coordinates: { latitude: lat, longitude: lng },
          },
          phoneNumber: "+15550009999",
          createdAt: new Date().toISOString(),
        });
      }
      Alert.alert("Success", "3 Dummy Vendors added!");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  // --- RENDER: VENDOR MODE ---
  if (isVendorMode) {
    return (
      <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
        {/* 1. FIXED HEADER (Increased Safe Area Padding) */}
        <View
          style={{
            paddingTop: 60, // Increased from 50 to clear status bar
            paddingBottom: 15,
            paddingHorizontal: 20,
            backgroundColor: "white",
            borderBottomWidth: 1,
            borderColor: "#e0e0e0",
            flexDirection: "row",
            alignItems: "center",
            // Shadow for depth
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: 4,
          }}
        >
          <TouchableOpacity
            onPress={() => setIsVendorMode(false)}
            style={{
              backgroundColor: "#ffebee", // Light red background
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 8,
              marginRight: 15,
            }}
          >
            <Text
              style={{ color: "#d32f2f", fontWeight: "bold", fontSize: 14 }}
            >
              ← Exit
            </Text>
          </TouchableOpacity>

          <Text style={{ fontSize: 18, fontWeight: "bold", color: "#333" }}>
            {vendorTab === "home" ? "My Shop" : "Order Manager"}
          </Text>
        </View>

        {/* 2. CONTENT AREA */}
        <View style={{ flex: 1 }}>
          {vendorTab === "home" ? (
            <VendorHomeScreen userId={currentVendorId} />
          ) : (
            <VendorOrderManager vendorUid={currentVendorId} />
          )}
        </View>

        {/* 3. BOTTOM NAVIGATION BAR */}
        <View
          style={{
            flexDirection: "row",
            backgroundColor: "white",
            borderTopWidth: 1,
            borderColor: "#ddd",
            paddingBottom: 30,
            paddingTop: 15,
          }}
        >
          <Pressable
            onPress={() => setVendorTab("home")}
            style={{ flex: 1, alignItems: "center" }}
          >
            <Text style={{ fontSize: 24 }}>🏠</Text>
            <Text
              style={{
                color: vendorTab === "home" ? "#2196F3" : "#888",
                fontWeight: "bold",
                fontSize: 12,
                marginTop: 4,
              }}
            >
              Dashboard
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setVendorTab("orders")}
            style={{ flex: 1, alignItems: "center" }}
          >
            <Text style={{ fontSize: 24 }}>📋</Text>
            <Text
              style={{
                color: vendorTab === "orders" ? "#2196F3" : "#888",
                fontWeight: "bold",
                fontSize: 12,
                marginTop: 4,
              }}
            >
              Orders
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // --- RENDER: ORDER HISTORY ---
  if (showHistory) {
    return (
      <View style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
        {/* Simple Header with Back Button */}
        <View
          style={{
            paddingTop: 60,
            paddingBottom: 15,
            paddingHorizontal: 20,
            backgroundColor: "white",
            borderBottomWidth: 1,
            borderColor: "#eee",
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Button title="← Back" onPress={() => setShowHistory(false)} />
          <Text style={{ fontSize: 20, fontWeight: "bold", marginLeft: 20 }}>
            My Orders
          </Text>
        </View>

        {/* The Component Copilot built */}
        <View style={{ flex: 1, padding: 20 }}>
          <CustomerOrderHistory />
        </View>
      </View>
    );
  }

  // --- RENDER: CUSTOMER HOME ---
  return (
    <View style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
      {/* 1. CUSTOM HEADER */}
      <View
        style={{
          paddingTop: 60,
          paddingBottom: 20,
          paddingHorizontal: 20,
          backgroundColor: "white",
          borderBottomWidth: 1,
          borderColor: "#eee",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View>
          <Text
            style={{
              color: "#888",
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Delivering to
          </Text>
          <TouchableOpacity
            onPress={() => setCurrentAddress(null)} // Clicking title allows reseletion
            disabled={!currentAddress}
            style={{ flexDirection: "row", alignItems: "center", marginTop: 5 }}
          >
            <Text
              style={{ fontSize: 22, fontWeight: "bold", color: "#2196F3" }}
            >
              📍
            </Text>
            <Text
              style={{ fontSize: 18, fontWeight: "bold", marginLeft: 5 }}
              numberOfLines={1}
            >
              {currentAddress ? currentAddress.label : "Select Location ▾"}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={() => setShowHistory(true)}
          style={{
            backgroundColor: "#e3f2fd",
            padding: 10,
            borderRadius: 20,
          }}
        >
          <Text style={{ fontSize: 20 }}>📄</Text>
        </TouchableOpacity>
      </View>

      {/* 2. MAIN CONTENT SCROLL */}
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* A. ADDRESS SELECTION (Shown if no address active) */}
        {!currentAddress && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 16, marginBottom: 10, color: "#555" }}>
              Please select a saved address or add a new one:
            </Text>
            <AddressManager
              selectedAddressId={currentAddress?.id}
              onSelectAddress={setCurrentAddress}
            />
          </View>
        )}

        {/* B. VENDOR LIST (Shown if address active) */}
        {currentAddress && (
          <>
            {/* Live Order Status Box */}
            {activeOrderId && (
              <View
                style={{
                  marginBottom: 20,
                  padding: 15,
                  backgroundColor: "#212121",
                  borderRadius: 10,
                  borderLeftWidth: 5,
                  borderLeftColor: "#00e676",
                }}
              >
                <Text
                  style={{ color: "#00e676", fontWeight: "bold", fontSize: 16 }}
                >
                  LIVE STATUS: {orderStatus || "CONNECTING..."}
                </Text>
                <Text style={{ color: "white", fontSize: 12, marginTop: 5 }}>
                  Order #{activeOrderId.slice(0, 6)}
                </Text>
              </View>
            )}

            <Text
              style={{
                fontSize: 20,
                fontWeight: "bold",
                marginBottom: 15,
                color: "#333",
              }}
            >
              Nearby Suppliers
            </Text>

            {nearbyVendors.length === 0 ? (
              <View style={{ padding: 40, alignItems: "center" }}>
                <Text style={{ color: "#888", marginBottom: 10 }}>
                  No vendors found nearby.
                </Text>
                <Button title="Retry Search" onPress={findVendors} />
              </View>
            ) : (
              nearbyVendors.map((vendor) => (
                <View
                  key={vendor.id}
                  style={{
                    backgroundColor: "white",
                    borderRadius: 15,
                    padding: 15,
                    marginBottom: 15,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3, // Android Shadow
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 18,
                          fontWeight: "bold",
                          color: "#333",
                        }}
                      >
                        {vendor.businessName}
                      </Text>
                      <Text style={{ color: "#666", marginTop: 4 }}>
                        {vendor.distance.toFixed(1)} km away • ⭐{" "}
                        {vendor.rating || "New"}
                      </Text>
                      <Text
                        style={{
                          color: vendor.inventoryCount > 0 ? "green" : "red",
                          marginTop: 4,
                          fontSize: 12,
                          fontWeight: "600",
                        }}
                      >
                        {vendor.inventoryCount > 0
                          ? `✓ In Stock (${vendor.inventoryCount} cans)`
                          : "❌ Out of Stock"}
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: "#e3f2fd",
                        width: 50,
                        height: 50,
                        borderRadius: 25,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ fontSize: 24 }}>💧</Text>
                    </View>
                  </View>

                  <View
                    style={{
                      marginTop: 15,
                      borderTopWidth: 1,
                      borderColor: "#eee",
                      paddingTop: 15,
                    }}
                  >
                    <Button
                      title="Order"
                      onPress={() => setSelectedVendor(vendor)}
                      color={vendor.inventoryCount > 0 ? "#2196F3" : "#ccc"}
                      disabled={vendor.inventoryCount <= 0}
                    />
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {/* C. DEBUG TOOLS (Collapsed at bottom) */}
        <View
          style={{
            marginTop: 50,
            padding: 20,
            backgroundColor: "#fff3e0",
            borderRadius: 10,
          }}
        >
          <Text
            style={{ color: "#e65100", fontWeight: "bold", marginBottom: 10 }}
          >
            🛠 Developer Zone
          </Text>
          <Button
            title="Simulate Sign Up (Log In)"
            color="#ef6c00"
            onPress={testSignUp}
          />
          <View style={{ height: 10 }} />
          <Button
            title="Switch to Vendor Mode"
            color="#ef6c00"
            onPress={() => setIsVendorMode(true)}
          />
          <View style={{ height: 10 }} />
          <Button
            title="Seed Dummy Vendors"
            color="#ff9800"
            onPress={seedDatabase}
          />
        </View>
      </ScrollView>
      {/* Checkout Modal Integration */}
      <CheckoutModal
        isVisible={!!selectedVendor}
        vendor={selectedVendor}
        userLocation={currentAddress?.coordinates}
        onClose={() => setSelectedVendor(null)}
        onConfirm={placeOrder}
      />
    </View>
  );
}
