import Constants from 'expo-constants';

// ── GCP Production backend URL ────────────────────────────────────────────────
// This is the canonical production URL. It is used whenever EXPO_PUBLIC_BACKEND_URL
// is not set (e.g. EAS cloud builds that don't inject local .env files).
const PRODUCTION_URL = 'https://navikid-api-997311667098.asia-south1.run.app';

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

  // Production APK:
  // EXPO_PUBLIC_BACKEND_URL is only available if it was injected via EAS Secrets or
  // eas.json env block at build time. If missing, fall back to the hardcoded GCP URL.
  return process.env.EXPO_PUBLIC_BACKEND_URL ?? PRODUCTION_URL;
}

export const API_BASE_URL = getApiBaseUrl();
