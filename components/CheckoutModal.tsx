import React, { useEffect, useState } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from "react-native";
// @ts-ignore
import { getDistance } from "geolib";

interface CheckoutModalProps {
  isVisible: boolean;
  vendor: { location: { coordinates: { latitude: number; longitude: number } } };
  userLocation: { latitude: number; longitude: number };
  onClose: () => void;
  onConfirm: (data: { quantity: number; itemTotal: number; deliveryFee: number; grandTotal: number }) => void;
}

const ITEM_UNIT_PRICE = 40;

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isVisible,
  vendor,
  userLocation,
  onClose,
  onConfirm,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [distance, setDistance] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [itemTotal, setItemTotal] = useState(ITEM_UNIT_PRICE);
  const [grandTotal, setGrandTotal] = useState(ITEM_UNIT_PRICE);

  useEffect(() => {
    if (!vendor?.location?.coordinates || !userLocation) return;
    const dist = getDistance(
      {
        latitude: vendor.location.coordinates.latitude,
        longitude: vendor.location.coordinates.longitude,
      },
      userLocation
    ) / 1000; // meters to km
    setDistance(dist);
    const itemTotalCalc = ITEM_UNIT_PRICE * quantity;
    let fee = 0;
    if (dist > 2) {
      fee = Math.ceil(dist - 2) * 5;
    }
    setDeliveryFee(fee);
    setItemTotal(itemTotalCalc);
    setGrandTotal(itemTotalCalc + fee);
  }, [vendor, userLocation, quantity]);

  const handleDecrement = () => {
    setQuantity((q) => (q > 1 ? q - 1 : 1));
  };
  const handleIncrement = () => {
    setQuantity((q) => q + 1);
  };

  const handleConfirm = () => {
    onConfirm({
      quantity,
      itemTotal,
      deliveryFee,
      grandTotal,
    });
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Checkout</Text>
          <Text style={styles.label}>Quantity</Text>
          <View style={styles.qtyRow}>
            <Pressable style={styles.qtyBtn} onPress={handleDecrement}>
              <Text style={styles.qtyBtnText}>-</Text>
            </Pressable>
            <Text style={styles.qtyValue}>{quantity}</Text>
            <Pressable style={styles.qtyBtn} onPress={handleIncrement}>
              <Text style={styles.qtyBtnText}>+</Text>
            </Pressable>
          </View>
          <Text style={styles.infoText}>Distance: {distance.toFixed(2)} km</Text>
          <Text style={[styles.infoText, deliveryFee > 0 ? styles.feeRed : styles.feeGreen]}>
            Delivery Fee: {deliveryFee > 0 ? `$${deliveryFee}` : 'FREE'}
          </Text>
          <Text style={styles.totalText}>Total: ${grandTotal}</Text>
          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
            <Text style={styles.confirmBtnText}>Confirm Order</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: 320,
    alignItems: 'center',
    elevation: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  label: {
    fontSize: 15,
    marginBottom: 6,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: {
    fontSize: 22,
    color: '#2196F3',
    fontWeight: 'bold',
  },
  qtyValue: {
    fontSize: 18,
    marginHorizontal: 18,
    minWidth: 24,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  feeRed: {
    color: '#e53935',
    fontWeight: 'bold',
  },
  feeGreen: {
    color: '#43a047',
    fontWeight: 'bold',
  },
  totalText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 12,
  },
  confirmBtn: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginBottom: 10,
    width: '100%',
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  closeBtn: {
    paddingVertical: 6,
    alignItems: 'center',
    width: '100%',
  },
  closeBtnText: {
    color: '#2196F3',
    fontWeight: 'bold',
    fontSize: 15,
  },
});

export default CheckoutModal;
