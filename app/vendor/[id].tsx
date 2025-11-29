
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator, RefreshControl } from 'react-native';
import Toast from 'react-native-toast-message';
import AppHeader from '@/components/AppHeader';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { doc, getDoc, collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { useAddress } from '../../contexts/AddressContext';
import { db, auth } from '../../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons';

// TypeScript types
type Vendor = {
	businessName: string;
	address?: string;
	photoURL?: string;
};

type Product = {
	id: string;
	name: string;
	price: number;
	image?: string;
};

type Cart = { [productId: string]: number };



// --- Blue Brand Theme ---
const BLUE = '#2563eb';
const TEAL = '#00897B';
const WHITE = '#fff';
const SHADOW = {
	shadowColor: '#000',
	shadowOffset: { width: 0, height: 2 },
	shadowOpacity: 0.1,
	shadowRadius: 4,
	elevation: 3,
};

const DUMMY_PRODUCTS = [
  { name: '20L Water Can', price: 40, image: 'https://cdn-icons-png.flaticon.com/512/1046/1046857.png' },
  { name: 'Bubble Top', price: 60, image: 'https://cdn-icons-png.flaticon.com/512/1046/1046857.png' },
  { name: 'Dispenser', price: 500, image: 'https://cdn-icons-png.flaticon.com/512/1046/1046857.png' },
];


export default function VendorShop() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [cart, setCart] = useState<Cart>({});
  const [placingOrder, setPlacingOrder] = useState<boolean>(false);
  const { selectedAddress, setAddress } = useAddress();
  const [refreshing, setRefreshing] = useState(false);

  // Auto-select address if none is selected
  useEffect(() => {
    const autoSelectAddress = async () => {
      if (!selectedAddress && auth.currentUser) {
        const uid = auth.currentUser.uid;
        const addressesSnap = await getDocs(collection(db, `users/${uid}/addresses`));
        const addresses = addressesSnap.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            label: data.label || '',
            fullAddress: data.fullAddress || data.address || '',
            coordinates: data.coordinates || { latitude: 0, longitude: 0 },
            isDefault: !!data.isDefault,
          };
        });
        if (addresses.length === 1) {
          setAddress(addresses[0]);
        } else if (addresses.length > 1) {
          const def = addresses.find(a => a.isDefault);
          if (def) {
            setAddress(def);
          } else {
            setAddress(addresses[0]);
          }
        }
        // If no addresses, do nothing
      }
    };
    autoSelectAddress();
  }, [selectedAddress, setAddress]);

  useEffect(() => {
    fetchData();
  }, [id]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchData().finally(() => setRefreshing(false));
  }, [id]);

  async function fetchData() {
    setLoading(true);
    try {
      // Fetch vendor
      if (!id || typeof id !== 'string') throw new Error('Invalid vendor id');
      const vendorSnap = await getDoc(doc(db, 'users', id));
      setVendor(vendorSnap.exists() ? (vendorSnap.data() as Vendor) : null);
      // Fetch products
      const prodSnap = await getDocs(collection(db, 'users', id, 'products'));
      const prodList: Product[] = prodSnap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Product, 'id'>) }));
      setProducts(prodList);
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load vendor or products.' });
    }
    setLoading(false);
  }

  function addToCart(pid: string) {
    setCart(prev => ({ ...prev, [pid]: (prev[pid] || 0) + 1 }));
  }

  function removeFromCart(pid: string) {
    setCart(prev => {
      const qty = (prev[pid] || 0) - 1;
      if (qty <= 0) {
        const { [pid]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [pid]: qty };
    });
  }

  async function seedProducts() {
    try {
      if (!id || typeof id !== 'string') throw new Error('Invalid vendor id');
      for (const prod of DUMMY_PRODUCTS) {
        await addDoc(collection(db, 'users', id, 'products'), prod);
      }
      fetchData();
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to seed products.' });
    }
  }

  function getCartItems() {
    return Object.entries(cart).map(([pid, qty]) => {
      const prod = products.find((p) => p.id === pid);
      return prod ? { ...prod, quantity: qty } : null;
    }).filter(Boolean) as (Product & { quantity: number })[];
  }

  function getTotalPrice() {
    return getCartItems().reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  async function handlePlaceOrder() {
    if (!auth.currentUser) {
      router.push('/auth/login');
      return;
    }
    if (!selectedAddress) {
      Toast.show({ type: 'error', text1: 'No Address', text2: 'Please select a delivery location before placing an order.' });
      return;
    }
    setPlacingOrder(true);
    try {
      const items = getCartItems();
      const totalAmount = getTotalPrice();
      await addDoc(collection(db, 'orders'), {
        vendorId: id,
        vendor: vendor ? { businessName: vendor.businessName } : {},
        customer: { uid: auth.currentUser.uid },
        items,
        status: 'CREATED',
        pricing: { totalAmount },
        createdAt: new Date().toISOString(),
        deliveryLocation: {
          address: selectedAddress.fullAddress,
          coordinates: selectedAddress.coordinates,
        },
      });
      setCart({});
      Toast.show({ type: 'success', text1: 'Order Placed', text2: 'Your order has been placed successfully!' });
      setTimeout(() => router.push('/customer/history'), 500);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to place order.' });
    }
    setPlacingOrder(false);
  }

  // UI
  return (
    <View style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
      <Stack.Screen options={{ headerShown: false }} />
      <AppHeader showBackButton={true} />

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={BLUE} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Vendor Card */}
          {vendor && (
            <View style={styles.vendorCard}>
              <View style={styles.logoContainer}>
                <Text style={{ fontSize: 30 }}>💧</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.vendorName}>{vendor.businessName}</Text>
                <Text style={styles.vendorDesc}>{vendor.address || 'No address provided.'}</Text>
              </View>
            </View>
          )}

          {/* Product List */}
          <Text style={styles.sectionTitle}>Products</Text>
          {products.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 32 }}>
              <Text style={{ color: '#888', marginBottom: 16 }}>No products found.</Text>
              <TouchableOpacity style={styles.seedBtn} onPress={seedProducts}>
                <Ionicons name="add-circle" size={20} color={WHITE} />
                <Text style={{ color: WHITE, marginLeft: 8, fontWeight: 'bold' }}>Seed Products</Text>
              </TouchableOpacity>
            </View>
          ) : (
            products.map(prod => (
              <View key={prod.id} style={styles.productCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>{prod.name}</Text>
                  <Text style={styles.productPrice}>₹{prod.price}</Text>
                </View>
                <View style={styles.cartActions}>
                  <TouchableOpacity onPress={() => removeFromCart(prod.id)} disabled={!cart[prod.id]} style={styles.cartBtn}>
                    <Ionicons name="remove-circle" size={24} color={cart[prod.id] ? BLUE : '#ccc'} />
                  </TouchableOpacity>
                  <Text style={styles.cartQty}>{cart[prod.id] || 0}</Text>
                  <TouchableOpacity onPress={() => addToCart(prod.id)} style={styles.cartBtn}>
                    <Ionicons name="add-circle" size={24} color={BLUE} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Cart Footer */}
      {Object.keys(cart).length > 0 && (
        <View style={styles.cartFooter}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cartFooterText}>
              {Object.values(cart).reduce((a, b) => a + b, 0)} item(s) | ₹{getTotalPrice()}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.placeOrderBtn}
            onPress={handlePlaceOrder}
            disabled={placingOrder || !selectedAddress}
          >
            {placingOrder ? (
              <ActivityIndicator color={WHITE} />
            ) : !selectedAddress ? (
              <Text style={{ color: WHITE, fontWeight: 'bold', fontSize: 16 }}>Select Address</Text>
            ) : (
              <Text style={{ color: WHITE, fontWeight: 'bold', fontSize: 16 }}>Place Order</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
	header: {
		backgroundColor: BLUE,
		flexDirection: 'row',
		alignItems: 'center',
		paddingTop: 48,
		paddingBottom: 20,
		paddingHorizontal: 16,
		borderBottomLeftRadius: 18,
		borderBottomRightRadius: 18,
		zIndex: 100,
		elevation: 5,
		...SHADOW,
	},
	backBtn: {
		marginRight: 16,
		padding: 4,
	},
	headerTitle: {
		color: WHITE,
		fontSize: 20,
		fontWeight: 'bold',
		flex: 1,
	},
	vendorCard: {
		backgroundColor: WHITE,
		borderRadius: 14,
		flexDirection: 'row',
		alignItems: 'center',
		padding: 16,
		marginBottom: 20,
		...SHADOW,
	},
	logoContainer: {
		width: 60,
		height: 60,
		borderRadius: 30,
		marginRight: 16,
		backgroundColor: '#E3F2FD',
		justifyContent: 'center',
		alignItems: 'center',
	},
	vendorName: {
		fontSize: 18,
		fontWeight: 'bold',
		color: BLUE,
	},
	vendorDesc: {
		color: '#555',
		marginTop: 4,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		color: BLUE,
		marginBottom: 10,
	},
	productCard: {
		backgroundColor: WHITE,
		borderRadius: 12,
		flexDirection: 'row',
		alignItems: 'center',
		padding: 14,
		marginBottom: 14,
		...SHADOW,
	},
	productIcon: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: TEAL,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
	},
	productName: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#222',
	},
	productPrice: {
		color: BLUE,
		fontWeight: 'bold',
		marginTop: 4,
	},
	cartActions: {
		flexDirection: 'row',
		alignItems: 'center',
		marginLeft: 10,
	},
	cartBtn: {
		padding: 2,
	},
	cartQty: {
		minWidth: 24,
		textAlign: 'center',
		fontWeight: 'bold',
		fontSize: 16,
		color: BLUE,
	},
	seedBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: BLUE,
		paddingHorizontal: 18,
		paddingVertical: 10,
		borderRadius: 8,
		...SHADOW,
	},
	cartFooter: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: WHITE,
		flexDirection: 'row',
		alignItems: 'center',
		padding: 16,
		borderTopLeftRadius: 18,
		borderTopRightRadius: 18,
		...SHADOW,
	},
	cartFooterText: {
		fontWeight: 'bold',
		color: BLUE,
		fontSize: 16,
	},
	placeOrderBtn: {
		backgroundColor: BLUE,
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 8,
		...SHADOW,
	},
});
