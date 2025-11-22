import { db } from "@/firebaseConfig";
import {
    collection,
    doc,
    onSnapshot,
    query,
    updateDoc,
    where,
} from "firebase/firestore";
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert,
    Button,
    FlatList,
    Linking, Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const TABS = [
  { key: "new", label: "New Requests" },
  { key: "ongoing", label: "Ongoing" },
];

export default function VendorOrderManager({
  vendorUid,
}: {
  vendorUid: string;
}) {
  const [tab, setTab] = useState<"new" | "ongoing">("new");
  const [newOrders, setNewOrders] = useState<any[]>([]);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);

  const openMaps = (latitude: number, longitude: number, label: string) => {
    const scheme = Platform.select({
      ios: "maps:0,0?q=",
      android: "geo:0,0?q=",
    });
    const latLng = `${latitude},${longitude}`;
    const labelEncoded = encodeURIComponent(label);

    let url = Platform.select({
      ios: `${scheme}${labelEncoded}@${latLng}`,
      android: `${scheme}${latLng}(${labelEncoded})`,
    });

    if (url) {
      Linking.openURL(url).catch((err) => {
        console.error("Error opening maps:", err);
        Alert.alert("Error", "Could not open map app.");
      });
    }
  };

  // Real-time listeners
  useEffect(() => {
    const qNew = query(
      collection(db, "orders"),
      where("vendor.uid", "==", vendorUid),
      where("status", "==", "CREATED")
    );
    const unsubNew = onSnapshot(qNew, (snap) => {
      setNewOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const qActive = query(
      collection(db, "orders"),
      where("vendor.uid", "==", vendorUid),
      where("status", "in", ["ACCEPTED", "DISPATCHED"])
    );
    const unsubActive = onSnapshot(qActive, (snap) => {
      setActiveOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => {
      unsubNew();
      unsubActive();
    };
  }, [vendorUid]);

  // Actions
  const updateOrderStatus = useCallback(
    async (orderId: string, status: string) => {
      await updateDoc(doc(db, "orders", orderId), { status });
    },
    []
  );

  // UI
  const renderNewOrder = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.customer?.name || "Customer"}</Text>
      <Text>Items: {item.items?.map((i: any) => i.name).join(", ")}</Text>
      <Text>Total: ₹{item.totalPrice}</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.button, styles.green]}
          onPress={() => updateOrderStatus(item.id, "ACCEPTED")}
        >
          <Text style={styles.buttonText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.red]}
          onPress={() => updateOrderStatus(item.id, "CANCELLED")}
        >
          <Text style={styles.buttonText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderActiveOrder = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Text style={styles.title}>
        Delivery: {item.deliveryAddress || "N/A"}
      </Text>
      <Text>Phone: {item.customer?.phone || "N/A"}</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.button, styles.green]}
          onPress={() => Linking.openURL(`tel:${item.customer?.phone}`)}
        >
          <Text style={styles.buttonText}>Call Customer</Text>
        </TouchableOpacity>
      </View>
      {item.status === "ACCEPTED" && (
        <TouchableOpacity
          style={[styles.button, styles.green]}
          onPress={() => updateOrderStatus(item.id, "DISPATCHED")}
        >
          <Text style={styles.buttonText}>Dispatch Order</Text>
          <Button
            title="📍 Navigate"
            onPress={() => {
              const coords = item.deliveryLocation?.coordinates;
              if (coords) {
                openMaps(
                  coords.latitude,
                  coords.longitude,
                  "Customer Location"
                );
              } else {
                Alert.alert("Error", "No location data for this order.");
              }
            }}
          />
        </TouchableOpacity>
      )}
      {item.status === "DISPATCHED" && (
        <TouchableOpacity
          style={[styles.button, styles.green]}
          onPress={() => updateOrderStatus(item.id, "DELIVERED")}
        >
          <Text style={styles.buttonText}>Mark Delivered</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Tab Buttons */}
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabButton, tab === t.key && styles.tabButtonActive]}
            onPress={() => setTab(t.key as "new" | "ongoing")}
          >
            <Text style={tab === t.key ? styles.tabTextActive : styles.tabText}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* List */}
      {tab === "new" ? (
        <FlatList
          data={newOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderNewOrder}
          ListEmptyComponent={
            <Text style={styles.empty}>No new requests.</Text>
          }
        />
      ) : (
        <FlatList
          data={activeOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderActiveOrder}
          ListEmptyComponent={
            <Text style={styles.empty}>No ongoing orders.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  tabs: {
    flexDirection: "row",
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    padding: 12,
    backgroundColor: "#eee",
    alignItems: "center",
    borderRadius: 6,
    marginHorizontal: 2,
  },
  tabButtonActive: {
    backgroundColor: "#0a7ea4",
  },
  tabText: {
    color: "#333",
    fontWeight: "bold",
  },
  tabTextActive: {
    color: "#fff",
    fontWeight: "bold",
  },
  card: {
    backgroundColor: "#f2f2f2",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 4,
  },
  button: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
    marginHorizontal: 4,
  },
  green: {
    backgroundColor: "#4CAF50",
  },
  red: {
    backgroundColor: "#F44336",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  empty: {
    textAlign: "center",
    color: "#888",
    marginTop: 32,
  },
});
