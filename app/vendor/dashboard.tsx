import React, { useState } from "react";
import { View, Text, TouchableOpacity, Pressable } from "react-native";
import { useRouter } from "expo-router";
import VendorHomeScreen from "@/components/VendorHomeScreen";
import VendorOrderManager from "@/components/VendorOrderManager";

const CURRENT_VENDOR_ID = "vendor_test_1";

const VendorDashboard: React.FC = () => {
  const [vendorTab, setVendorTab] = useState<"home" | "orders">("home");
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      {/* Header */}
      <View
        style={{
          paddingTop: 60,
          paddingBottom: 15,
          paddingHorizontal: 20,
          backgroundColor: "white",
          borderBottomWidth: 1,
          borderColor: "#e0e0e0",
          flexDirection: "row",
          alignItems: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 4,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            backgroundColor: "#ffebee",
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 8,
            marginRight: 15,
          }}
        >
          <Text style={{ color: "#d32f2f", fontWeight: "bold", fontSize: 14 }}>
            ← Back
          </Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: "bold", color: "#333" }}>
          {vendorTab === "home" ? "My Shop" : "Order Manager"}
        </Text>
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {vendorTab === "home" ? (
          <VendorHomeScreen userId={CURRENT_VENDOR_ID} />
        ) : (
          <VendorOrderManager vendorUid={CURRENT_VENDOR_ID} />
        )}
      </View>

      {/* Bottom Tab Bar */}
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
};

export default VendorDashboard;
