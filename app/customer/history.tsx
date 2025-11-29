
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import CustomerOrderHistory from '@/components/CustomerOrderHistory';
import AppHeader from '@/components/AppHeader';

export default function OrderHistoryScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <Stack.Screen options={{ headerShown: false }} />
      <AppHeader showBackButton={true} title="Order History" />
      <View style={{ flex: 1 }}>
        <CustomerOrderHistory />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    zIndex: 100,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  content: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' },

  card: {
    backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  vendorRow: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  vendorName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  orderItem: { fontSize: 12, color: '#666' },
  
  statusBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  items: {
    color: '#555',
    fontSize: 14,
  },
  total: {
    marginTop: 6,
    fontWeight: 'bold',
    color: '#007AFF',
    fontSize: 15,
  },
  date: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#888', fontSize: 16 },
});