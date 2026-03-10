import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
// import messaging from '@react-native-firebase/messaging';
import { Alert, Platform } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';

// Configure your backend API base URL
// Android emulator uses 10.0.2.2 to reach host machine's localhost
// iOS simulator uses localhost
// Physical device: use your computer's actual IP address
const API_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:3000',
  ios: 'http://localhost:3000',
  default: 'http://localhost:3000',
});

// Request notification permission
async function requestUserPermission() {
  /*
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    console.log('Notification permission granted:', authStatus);
    return true;
  }
  console.log('Notification permission denied');
  return false;
  */
  return false;
}

// Get FCM token and register with backend
async function registerFCMToken(userId: string, role: 'driver' | 'parent') {
  /*
  try {
    const token = await messaging().getToken();
    if (token) {
      console.log('FCM Token:', token);

      // Register token with your backend
      const response = await fetch(`${API_BASE_URL}/api/register-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          role,
          fcmToken: token,
        }),
      });

      if (response.ok) {
        console.log('FCM token registered successfully');
      } else {
        console.error('Failed to register FCM token:', await response.text());
      }

      return token;
    }
  } catch (error) {
    console.log('Error getting FCM token:', error);
  }
  */
  return null;
}

export const unstable_settings = {
  initialRouteName: 'RoleSelectionScreen',
};

export default function RootLayout() {
  console.log("RootLayout mounting...");
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Initialize Firebase messaging - DISABLED FOR EXPO GO COMPATIBILITY
    /*
    const initializeMessaging = async () => {
      const hasPermission = await requestUserPermission();
      if (hasPermission) {
        // TODO: Replace with actual user ID and role from your auth system
        // await registerFCMToken('user123', 'driver');
      }
    };

    initializeMessaging();

    // Handle foreground messages
    const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
      console.log('Foreground message received:', remoteMessage);

      // Show alert for foreground notifications
      Alert.alert(
        remoteMessage.notification?.title || 'Notification',
        remoteMessage.notification?.body || '',
        [{ text: 'OK' }]
      );
    });

    // Handle background/quit state messages
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('Background message received:', remoteMessage);
    });

    // Handle token refresh
    const unsubscribeTokenRefresh = messaging().onTokenRefresh(async newToken => {
      console.log('FCM Token refreshed:', newToken);
      // TODO: Update token on your backend
      // await fetch(`${API_BASE_URL}/api/register-token`, { ... });
    });

    return () => {
      unsubscribeForeground();
      unsubscribeTokenRefresh();
    };
    */
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="RoleSelectionScreen" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="Driver" options={{ headerShown: false }} />
          <Stack.Screen name="Parent" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
