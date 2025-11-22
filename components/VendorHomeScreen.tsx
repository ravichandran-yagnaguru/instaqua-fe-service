
import { db } from '@/firebaseConfig';
import DateTimePicker from '@react-native-community/datetimepicker';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import { Button, Platform, StyleSheet, Switch, Text, View } from 'react-native';
const Slider = require('@react-native-community/slider').default;


// Helper for time formatting
const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
// Helper to extract hour/minute from Date
const getTimeObj = (date: Date) => ({ hour: date.getHours(), minute: date.getMinutes() });
// Helper to create Date from hour/minute (today's date)
const dateFromTimeObj = (t: { hour: number, minute: number } | undefined, fallback: Date) => {
  if (t && typeof t.hour === 'number' && typeof t.minute === 'number') {
    const d = new Date();
    d.setHours(t.hour, t.minute, 0, 0);
    return d;
  }
  return fallback;
};

export default function VendorHomeScreen({ userId }: { userId: string }) {
  const [isOnline, setIsOnline] = useState(false);
  const [inventoryCount, setInventoryCount] = useState(0);
  // Store as Date objects for picker
  const [activeHours, setActiveHours] = useState<{ start: Date; end: Date }>({ start: new Date(), end: new Date() });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [sliderValue, setSliderValue] = useState(1);

  // Subscribe to user document
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'users', userId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setIsOnline(!!data.isOnline);
        setInventoryCount(data.inventoryCount ?? 0);
        // Only support {hour, minute} object
        setActiveHours({
          start: dateFromTimeObj(data.activeHours?.start, new Date(0, 0, 0, 9, 0)), // default 9:00
          end: dateFromTimeObj(data.activeHours?.end, new Date(0, 0, 0, 18, 0)),   // default 18:00
        });
        setSliderValue(data.serviceRadiusKm ?? 1);
      }
    });
    return () => unsub();
  }, [userId]);

  // Update Firestore helpers
  const updateUser = useCallback((fields: any) => {
    return updateDoc(doc(db, 'users', userId), fields);
  }, [userId]);

  // Status Card
  const onToggleOnline = async (value: boolean) => {
    setIsOnline(value);
    await updateUser({ isOnline: value });
  };

  // Inventory Card
  const changeInventory = async (delta: number) => {
    const newCount = inventoryCount + delta;
    setInventoryCount(newCount);
    await updateUser({ inventoryCount: newCount });
  };

  // Settings Card: Time pickers
  const onChangeTime = async (type: 'start' | 'end', event: any, selectedDate?: Date) => {
    if (event.type === 'set' && selectedDate) {
      const newActiveHours = { ...activeHours, [type]: selectedDate };
      setActiveHours(newActiveHours);
      // Save only hour/minute to Firestore (standard format)
      await updateUser({
        activeHours: {
          start: getTimeObj(newActiveHours.start),
          end: getTimeObj(newActiveHours.end),
        },
      });
    }
    setShowStartPicker(false);
    setShowEndPicker(false);
  };

  // Settings Card: Slider
  const onSliderChange = (value: number) => {
    setSliderValue(value);
  };
  const onSliderComplete = async () => {
    await updateUser({ serviceRadiusKm: sliderValue });
  };

  return (
    <View style={styles.container}>
      {/* Status Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Status</Text>
        <View style={styles.row}>
          <Text>Online</Text>
          <Switch value={isOnline} onValueChange={onToggleOnline} />
        </View>
      </View>

      {/* Inventory Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Inventory</Text>
        <View style={styles.row}>
          <Button title="-" onPress={() => changeInventory(-1)} />
          <Text style={styles.inventoryCount}>{inventoryCount}</Text>
          <Button title="+" onPress={() => changeInventory(1)} />
        </View>
      </View>

      {/* Settings Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Settings</Text>
        <View style={styles.row}>
          <Text>Active Start:</Text>
          <Button title={formatTime(activeHours.start)} onPress={() => setShowStartPicker(true)} />
        </View>
        <View style={styles.row}>
          <Text>Active End:</Text>
          <Button title={formatTime(activeHours.end)} onPress={() => setShowEndPicker(true)} />
        </View>
        {showStartPicker && (
          <DateTimePicker
            value={activeHours.start}
            mode="time"
            is24Hour={true}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(e, d) => onChangeTime('start', e, d)}
          />
        )}
        {showEndPicker && (
          <DateTimePicker
            value={activeHours.end}
            mode="time"
            is24Hour={true}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(e, d) => onChangeTime('end', e, d)}
          />
        )}
        <View style={styles.row}>
          <Text>Service Radius: {sliderValue} km</Text>
        </View>
        <Slider
          style={{ width: 200, height: 40 }}
          minimumValue={1}
          maximumValue={20}
          step={1}
          value={sliderValue}
          onValueChange={onSliderChange}
          onSlidingComplete={onSliderComplete}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  inventoryCount: {
    fontSize: 20,
    marginHorizontal: 16,
  },
});
