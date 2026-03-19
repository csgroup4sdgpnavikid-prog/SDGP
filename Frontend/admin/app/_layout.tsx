import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { API_BASE_URL } from '../constants/api';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db } from '../firebaseConfig';

import { useColorScheme } from '@/hooks/use-color-scheme';

// Show notifications while app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerExpoPushToken(userId: string, role: 'driver' | 'parent') {
  if (!Device.isDevice) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    // token format: "ExponentPushToken[...]" — used by navikid-backend & backend

    const collection = role === 'driver' ? 'drivers' : 'parents';
    await updateDoc(doc(db, collection, userId), {
      expoPushToken: token,
      tokenUpdatedAt: new Date().toISOString(),
    });
    console.log('✅ Expo push token saved:', token);

    // Keep token fresh if Expo rotates it
    Notifications.addPushTokenListener(async (newToken) => {
      await updateDoc(doc(db, collection, userId), {
        expoPushToken: newToken.data,
        tokenUpdatedAt: new Date().toISOString(),
      });
    });
  } catch (e) {
    console.warn('Push token registration failed:', e);
  }
}

export const unstable_settings = {
  initialRouteName: 'RoleSelectionScreen',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // When a user logs in, register their Expo push token to Firestore
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, 'drivers', user.uid));
        const role: 'driver' | 'parent' = snap.exists() ? 'driver' : 'parent';
        await registerExpoPushToken(user.uid, role);
      } catch {
        // If lookup fails assume parent
        await registerExpoPushToken(user.uid, 'parent');
      }
    });
    return () => unsub();
  }, []);

  // ── Dev-mode backend connectivity check ────────────────────────────────────
  // Runs once on launch. Shows a clear Alert (with fix steps) if the backend
  // is unreachable, so connection problems are caught immediately.
  useEffect(() => {
    if (!__DEV__) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    fetch(`${API_BASE_URL}/api/health`, { signal: controller.signal })
      .then((res) => {
        clearTimeout(timer);
        if (res.ok) {
          console.log(`[NaviKid] ✅ Backend reachable at ${API_BASE_URL}`);
        } else {
          console.warn(`[NaviKid] Backend returned ${res.status} at ${API_BASE_URL}`);
        }
      })
      .catch(() => {
        clearTimeout(timer);
        Alert.alert(
          'Backend Unreachable',
          `Could not reach the NaviKid server at:\n${API_BASE_URL}\n\n` +
            'Steps to fix:\n' +
            '1. Start the backend — cd backend && node server.js\n' +
            '2. Allow Node.js through Windows Firewall on port 3001\n' +
            '3. Make sure your phone and PC are on the same Wi-Fi\n\n' +
            'Quick test: open your phone browser and go to:\n' +
            `${API_BASE_URL}/api/health`,
        );
      });

    return () => { clearTimeout(timer); controller.abort(); };
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
