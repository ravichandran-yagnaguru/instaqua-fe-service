import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  endAt,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  startAt,
  where,
} from "firebase/firestore";
import * as geofire from "geofire-common";
import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";

// Local Imports
import AddressManager from "@/components/AddressManager";
import CheckoutModal from "@/components/CheckoutModal";
import { auth, db } from "@/firebaseConfig";

export default function HomeScreen() {
  // --- STATE ---
  const [nearbyVendors, setNearbyVendors] = useState<any[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [orderStatus, setOrderStatus] = useState<string>("");
  // Removed isVendorMode and vendorTab state
  const [currentAddress, setCurrentAddress] = useState<any>(null);
  // Removed showHistory state
  const router = useRouter();
  const [userRole, setUserRole] = useState<"customer" | "vendor">("customer");

  // We'll simulate being "vendor_test_1"
  // const currentVendorId = "vendor_test_1";

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
        role: "vendor", // Default role
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

  // Removed vendor tab reset effect

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

  useEffect(() => {
    if (auth.currentUser) {
      // Fetch the user's profile to see their role
      const fetchRole = async () => {
        const docSnap = await getDocs(
          query(
            collection(db, "users"),
            where("uid", "==", auth.currentUser?.uid)
          )
        );
        if (!docSnap.empty) {
          const userData = docSnap.docs[0].data();
          setUserRole(userData.role); // 'vendor' or 'customer'
        }
      };
      fetchRole();
    }
  }, [auth.currentUser]);

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
          onPress={() => router.push("/customer/history")}
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
                          ? `✓ In Stock`
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
            title="Go to Vendor Dashboard"
            onPress={() => router.push("/vendor/dashboard")}
            color="#ef6c00"
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
