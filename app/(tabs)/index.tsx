import { Image, StyleSheet, Platform, Button, Alert } from 'react-native';
import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

// 1. Import DB
import { db } from '@/firebaseConfig'; 
import { collection, getDocs } from 'firebase/firestore';

export default function HomeScreen() {

  // 2. Add Test Logic
  const testConnection = async () => {
    try {
      // Attempt to read a dummy collection
      await getDocs(collection(db, "test_connection"));
      console.log("Connection Successful!");
      Alert.alert("Success", "Connected to Firebase!");
    } catch (error: any) {
      console.error("Connection Error:", error);
      Alert.alert("Error", error.message);
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome to Instaqua!</ThemedText>
        <HelloWave />
      </ThemedView>

      {/* 3. Add the Button */}
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 1: Connectivity</ThemedText>
        <Button title="Ping Firebase" onPress={testConnection} />
      </ThemedView>

    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});