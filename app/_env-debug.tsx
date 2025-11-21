import Constants from 'expo-constants';
import { View, Text } from 'react-native';

export default function EnvDebug() {
  return (
    <View style={{ padding: 20 }}>
      <Text>FIREBASE_API_KEY: {String(Constants.expoConfig?.extra?.FIREBASE_API_KEY)}</Text>
      <Text>FIREBASE_AUTH_DOMAIN: {String(Constants.expoConfig?.extra?.FIREBASE_AUTH_DOMAIN)}</Text>
      <Text>FIREBASE_PROJECT_ID: {String(Constants.expoConfig?.extra?.FIREBASE_PROJECT_ID)}</Text>
      <Text>FIREBASE_STORAGE_BUCKET: {String(Constants.expoConfig?.extra?.FIREBASE_STORAGE_BUCKET)}</Text>
      <Text>FIREBASE_MESSAGING_SENDER_ID: {String(Constants.expoConfig?.extra?.FIREBASE_MESSAGING_SENDER_ID)}</Text>
      <Text>FIREBASE_APP_ID: {String(Constants.expoConfig?.extra?.FIREBASE_APP_ID)}</Text>
    </View>
  );
}
