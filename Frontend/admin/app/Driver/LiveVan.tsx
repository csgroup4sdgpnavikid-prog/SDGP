// LiveVan.tsx — Fixed: direct Firebase write + reverse geocoding place name
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import { db } from "../../backend/firebaseConfig";

// ─── Config ───────────────────────────────────────────────────────────────────
const DRIVER_ID = "van1";

const INITIAL_REGION: Region = {
  latitude: 7.8731,
  longitude: 80.7718,
  latitudeDelta: 0.5,
  longitudeDelta: 0.5,
};      

// ─── Types ────────────────────────────────────────────────────────────────────
interface VanLocation {
  latitude: number;
  longitude: number;
}

// ─── Reverse Geocode using OpenStreetMap (free, no API key) ───────────────────
async function getPlaceName(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      {
        headers: {
          // Required by Nominatim usage policy
          "User-Agent": "NaviKidVanTracker/1.0",
        },
      }
    );
    if (!res.ok) return "Unknown location";
    const data = await res.json();

    // Build a short readable name: suburb/town/city
    const a = data.address ?? {};
    const place =
      a.suburb ?? a.village ?? a.town ?? a.city_district ?? a.city ?? a.county ?? "";
    const district = a.state_district ?? a.state ?? "";
    if (place && district) return `${place}, ${district}`;
    if (place) return place;
    if (district) return district;
    return data.display_name?.split(",")[0] ?? "Unknown location";
  } catch {
    return "Location unavailable";
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function LiveVan() {
  const [location, setLocation] = useState<VanLocation | null>(null);
  const [placeName, setPlaceName] = useState<string>("Locating...");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("—");
  const [updating, setUpdating] = useState(false);

  const locationRef = useRef<VanLocation | null>(null);
  const mapRef = useRef<MapView>(null);

  // ─── Firebase Real-Time Listener ────────────────────────────────────────────
  useEffect(() => {
    const docRef = doc(db, "locationRecords", DRIVER_ID);

    const unsubscribe = onSnapshot(
      docRef,
      async (snapshot) => {
        if (!snapshot.exists()) {
          setError("No location data found for van1.");
          setLoading(false);
          return;
        }

        const data = snapshot.data();

        if (typeof data.latitude !== "number" || typeof data.longitude !== "number") {
          setError("Invalid coordinates — check field types are 'number' in Firebase.");
          setLoading(false);
          return;
        }

        const newCoords: VanLocation = {
          latitude: data.latitude,
          longitude: data.longitude,
        };

        locationRef.current = newCoords;
        setLocation({ ...newCoords });
        setError(null);
        setLoading(false);
        setLastUpdated(new Date().toLocaleTimeString());

        // ✅ Reverse geocode — get human-readable place name
        setPlaceName("Locating...");
        const name = await getPlaceName(newCoords.latitude, newCoords.longitude);
        setPlaceName(name);

        // Animate map to follow van
        mapRef.current?.animateToRegion(
          { ...newCoords, latitudeDelta: 0.01, longitudeDelta: 0.01 },
          800
        );
      },
      (err) => {
        console.error("Firebase error:", err);
        setError("Connection lost. Check your internet.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // ─── Center Map ───────────────────────────────────────────────────────────────
  const centerOnVan = useCallback(() => {
    const coords = locationRef.current;
    if (!coords) return;
    mapRef.current?.animateToRegion(
      { ...coords, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      600
    );
  }, []);

  // ─── ✅ Update Location — writes DIRECTLY to Firebase (no Express server needed)
  // This eliminates network failures caused by wrong IP / HTTP blocked on Android
  const pushLocationUpdate = useCallback(async () => {
    setUpdating(true);
    try {
      const base = locationRef.current ?? { latitude: 7.8731, longitude: 80.7718 };

      // Simulate small GPS movement for testing
      // 🔁 In production: replace with real GPS coords from expo-location
      const newLat = parseFloat((base.latitude + (Math.random() - 0.5) * 0.002).toFixed(6));
      const newLng = parseFloat((base.longitude + (Math.random() - 0.5) * 0.002).toFixed(6));

      // ✅ Write directly to Firestore — bypasses Express server entirely
      // No IP config, no HTTP, no Android cleartext issues
      const docRef = doc(db, "locationRecords", DRIVER_ID);
      await setDoc(
        docRef,
        {
          latitude: newLat,
          longitude: newLng,
          updatedAt: new Date(),
          driverId: DRIVER_ID,
        },
        { merge: true }
      );

      // onSnapshot will automatically fire → map + status bar update instantly

    } catch (err: any) {
      setError(`Update failed: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  }, []);

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={INITIAL_REGION}
        showsCompass
        zoomEnabled
        scrollEnabled
      >
        {location && (
          <Marker
            coordinate={location}
            title={`🚐 ${DRIVER_ID}`}
            description={placeName}
            pinColor="#FF4444"
          />
        )}
      </MapView>

      {/* Loading */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Connecting to van tracker...</Text>
        </View>
      )}

      {/* Error */}
      {error && !loading && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {/* ✅ Status bar with coordinates + place name */}
      {!loading && !error && location && (
        <View style={styles.statusBar}>
          {/* Live indicator */}
          <View style={styles.statusRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
            <Text style={styles.timestampText}>  •  {lastUpdated}</Text>
          </View>

          {/* Coordinates */}
          <Text style={styles.coordText}>
            {location.latitude.toFixed(6)},{"  "}{location.longitude.toFixed(6)}
          </Text>

          {/* ✅ Place name from reverse geocoding */}
          <Text style={styles.placeText}>📍 {placeName}</Text>
        </View>
      )}

      {/* Buttons */}
      <View style={styles.buttonRow}>
        {location && (
          <TouchableOpacity style={styles.centerButton} onPress={centerOnVan}>
            <Text style={styles.buttonText}>🗺 Center</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.updateButton, updating && styles.buttonDisabled]}
          onPress={pushLocationUpdate}
          disabled={updating}
        >
          {updating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>📡 Update Location</Text>
          )}
        </TouchableOpacity>
      </View>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1, width: "100%", height: "100%" },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.85)",
    zIndex: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { fontSize: 14, color: "#374151", marginTop: 10 },

  errorBanner: {
    position: "absolute",
    top: 16, left: 16, right: 16,
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    zIndex: 10,
  },
  errorText: { color: "#B91C1C", fontSize: 13, textAlign: "center" },

  statusBar: {
    position: "absolute",
    top: 16, left: 16, right: 16,
    backgroundColor: "rgba(0,0,0,0.78)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    zIndex: 10,
    gap: 4,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  liveDot: {
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
    marginRight: 6,
  },
  liveText: {
    color: "#22C55E",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  timestampText: {
    color: "#9CA3AF",
    fontSize: 11,
  },
  coordText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    marginBottom: 2,
  },
  // ✅ Place name style
  placeText: {
    color: "#93C5FD",
    fontSize: 13,
    fontWeight: "500",
  },

  buttonRow: {
    position: "absolute",
    bottom: 32,
    left: 16, right: 16,
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    zIndex: 10,
  },
  centerButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    elevation: 5,
  },
  updateButton: {
    backgroundColor: "#16A34A",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    elevation: 5,
    minWidth: 160,
    alignItems: "center",
  },
  buttonDisabled: { backgroundColor: "#6B7280" },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
