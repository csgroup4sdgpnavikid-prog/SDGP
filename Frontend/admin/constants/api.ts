import Constants from 'expo-constants';

function getApiBaseUrl(): string {
  if (__DEV__) {
    // SDK 46+ → expoConfig.hostUri; tunnel/legacy mode → manifest.debuggerHost
    // Both contain the Metro bundler address, e.g. "192.168.1.5:8081"
    const hostUri =
      Constants.expoConfig?.hostUri ??
      (Constants.manifest as any)?.debuggerHost;

    if (hostUri) {
      const host = hostUri.split(':')[0]; // "192.168.1.5:8081" → "192.168.1.5"
      return `http://${host}:3001`;
    }

    // Android Studio emulator only: 10.0.2.2 is Android's alias for the host PC's localhost.
    // "localhost" here would mean the phone itself — not the dev machine.
    return 'http://10.0.2.2:3001';
  }
  // Production: set EXPO_PUBLIC_BACKEND_URL in .env
  return process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:3001';
}

export const API_BASE_URL = getApiBaseUrl();
