import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import CustomerOrderHistory from "@/components/CustomerOrderHistory";

const HistoryScreen: React.FC = () => {
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
      {/* Header */}
      <View
        style={{
          paddingTop: 60,
          paddingBottom: 18,
          paddingHorizontal: 20,
          backgroundColor: "white",
          borderBottomWidth: 1,
          borderColor: "#eee",
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            backgroundColor: "#e3f2fd",
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 8,
            marginRight: 15,
          }}
        >
          <Text style={{ color: "#2196F3", fontWeight: "bold", fontSize: 14 }}>
            ← Back
          </Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: "bold", color: "#333" }}>
          My Orders
        </Text>
      </View>
      {/* Content */}
      <View style={{ flex: 1, padding: 10 }}>
        <CustomerOrderHistory />
      </View>
    </View>
  );
};

export default HistoryScreen;
