import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
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
  DISPATCHED: { backgroundColor: "#fb8c00", color: "#fff" },
  DELIVERED: { backgroundColor: "#43a047", color: "#fff" },
  CANCELLED: { backgroundColor: "#e53935", color: "#fff" },
};

const CustomerOrderHistory: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, "orders"),
      where("customer.uid", "==", auth.currentUser.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return unsub;
  }, [auth.currentUser]);

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

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      {orders.map((order) => (
        <View key={order.id} style={styles.card}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.date}>{formatDate(order.createdAt)}</Text>
            <Text style={styles.vendor}>{order.vendor?.businessName || 'Vendor'}</Text>
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
            <Text style={styles.total}>${order.pricing?.totalAmount || 0}</Text>
            <View style={[styles.statusChip, statusStyles[order.status] || {}]}>
              <Text style={{ color: (statusStyles[order.status]?.color || '#fff'), fontWeight: 'bold', fontSize: 12 }}>
                {order.status}
              </Text>
            </View>
          </View>
        </View>
      ))}
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
