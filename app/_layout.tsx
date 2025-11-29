

import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useSegments, Stack } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';


import Toast from 'react-native-toast-message';
import { AddressProvider } from '../contexts/AddressContext';


export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const inAuthGroup = segments[0] === 'auth';
      if (!user && !inAuthGroup) {
        router.replace('/auth/login');
      } else if (user && inAuthGroup) {
        router.replace('/(tabs)');
      }
    });
    return unsubscribe;
  }, [segments]);

  return (
    <AddressProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen name="_env-debug" options={{ title: 'Env Debug' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
      <Toast />
    </AddressProvider>
  );
}
