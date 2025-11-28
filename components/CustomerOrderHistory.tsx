import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity } from "react-native";
import { doc, updateDoc, addDoc, collection } from "firebase/firestore";
import { query, where, orderBy, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";

// Accepts Firestore Timestamp, ISO string, or Date
function formatDate(createdAt: any) {
  let date: Date;
  if (!createdAt) return '';
  if (typeof createdAt === 'string') {
    date = new Date(createdAt);
  } else if (createdAt.toDate) {
    date = createdAt.toDate();
  } else {
    date = new Date(createdAt);
  }
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const statusStyles: Record<string, any> = {
  CREATED: { backgroundColor: "#2196F3", color: "#fff" },
  ACCEPTED: { backgroundColor: "#1976D2", color: "#fff" },
  DISPATCHED: { backgroundColor: "#fb8c00", color: "#fff" },
  DELIVERED: { backgroundColor: "#43a047", color: "#fff" },
  CANCELLED: { backgroundColor: "#e53935", color: "#fff" },
};

const CustomerOrderHistory: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(
          collection(db, "orders"),
          where("customer.uid", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const unsubSnapshot = onSnapshot(
          q,
          (snap) => {
            setOrders(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
          },
          (err) => {
            console.error("Firestore Error:", err);
            Alert.alert("Data Error", err.message);
            setLoading(false);
          }
        );
        return () => unsubSnapshot();
      } else {
        setLoading(false);
      }
    });
    return () => unsubAuth();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}><Text>Loading...</Text></View>
    );
  }

  if (!orders.length) {
    return (
      <View style={styles.center}><Text style={{ color: '#888', fontSize: 16 }}>No orders yet</Text></View>
    );
  }

  // Cancel order
  const handleCancel = async (orderId: string) => {
    try {
      await updateDoc(doc(db, "orders", orderId), { status: "CANCELLED" });
      Alert.alert("Order Cancelled", "Your order has been cancelled.");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to cancel order.");
    }
  };

  // Reorder
  const handleReorder = async (order: any) => {
    try {
      Alert.alert(
        "Reorder Confirmation",
        `Reorder the same items from ${order.vendor?.businessName || 'Vendor'}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Reorder",
            onPress: async () => {
              // Ensure vendor is never undefined
              let vendor = order.vendor;
              if (!vendor) {
                vendor = order.vendorName ? { businessName: order.vendorName } : (order.vendorId ? { businessName: 'Vendor', id: order.vendorId } : { businessName: 'Vendor' });
              }
              // Always set customer to current user
              const customer = auth.currentUser ? { uid: auth.currentUser.uid } : order.customer;
              // Ensure pricing is never undefined
              let pricing = order.pricing;
              if (!pricing) {
                // Try to recalculate from items
                const totalAmount = Array.isArray(order.items)
                  ? order.items.reduce((sum: number, item: any) => sum + ((item.price || 0) * (item.quantity || 1)), 0)
                  : 0;
                pricing = { totalAmount };
              }
              await addDoc(collection(db, "orders"), {
                vendorId: order.vendorId,
                vendor,
                customer,
                items: order.items,
                status: "CREATED",
                pricing,
                createdAt: new Date().toISOString(),
              });
              Alert.alert("Order Placed", "Your reorder has been placed!");
            },
          },
        ]
      );
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to reorder.");
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      {orders.map((order) => {
        const canCancel = order.status === 'CREATED' || order.status === 'ACCEPTED';
        const canReorder = order.status === 'CANCELLED' || order.status === 'DELIVERED';
        return (
          <View key={order.id} style={styles.card}>
            {/* Header */}
            <View style={styles.headerRow}>
              <Text style={styles.date}>{formatDate(order.createdAt)}</Text>
              <Text style={styles.vendor}>{order.vendor?.businessName || order.vendorName || 'Vendor'}</Text>
            </View>
            {/* Items */}
            <View style={{ marginVertical: 8 }}>
              {order.items?.map((item: any, idx: number) => (
                <Text key={idx} style={styles.itemText}>
                  {item.name} x {item.quantity}
                </Text>
              ))}
            </View>
            {/* Footer */}
            <View style={styles.footerRow}>
              <Text style={styles.total}>
                ₹{order.pricing?.totalAmount ?? order.totalAmount ?? 0}
              </Text>
              <View style={[styles.statusChip, statusStyles[order.status] || {}]}>
                <Text style={{ color: (statusStyles[order.status]?.color || '#fff'), fontWeight: 'bold', fontSize: 12 }}>
                  {order.status}
                </Text>
              </View>
            </View>
            {/* Actions */}
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              {canCancel && (
                <TouchableOpacity
                  style={{ backgroundColor: '#e53935', padding: 8, borderRadius: 8, marginRight: 8 }}
                  onPress={() => handleCancel(order.id)}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>
              )}
              {canReorder && (
                <TouchableOpacity
                  style={{ backgroundColor: '#2196F3', padding: 8, borderRadius: 8 }}
                  onPress={() => handleReorder(order)}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Reorder</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  date: {
    color: '#888',
    fontSize: 13,
  },
  vendor: {
    fontWeight: 'bold',
    fontSize: 15,
    color: '#2196F3',
  },
  itemText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  total: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#222',
  },
  statusChip: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
});

export default CustomerOrderHistory;
