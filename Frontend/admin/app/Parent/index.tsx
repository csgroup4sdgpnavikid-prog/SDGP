import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import MapView, { Marker } from "react-native-maps";

export default function HomeScreen() {
  //Added driver call function(phone number static for now)
  const driverPhoneNumber = "+94702920962";

  const handleCallDriver = () => {
    Linking.openURL(`tel:${driverPhoneNumber}`).catch(() =>
      console.log("Unable to open dialer")
    );
  };

  const router = useRouter();
  const [showMap, setShowMap] = useState(false);

  // ✅ Static van location (no animation)
  const vanLocation = {
    latitude: 6.9271,
    longitude: 79.8612,
  };

  const now = new Date();
  const hour = now.getHours();
  const greeting = () => {
    if (hour >= 17) return "Good Evening";
    if (hour >= 12) return "Good Afternoon";
    return "Good Morning";
  };

  const todayDate = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 20 }}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()}!</Text>
            <Text style={styles.name}>Amana</Text>
            <Text style={styles.date}>{todayDate}</Text>
          </View>

          <TouchableOpacity
            style={styles.routeButton}
            onPress={() => router.push("/Parent")}
          >
            <Text style={styles.routeButtonText}>Select the Route</Text>
          </TouchableOpacity>
        </View>

        {/* Van Card */}
        <View style={styles.vanCard}>
          <Text style={styles.vanTitle}>🚐 Van is on the way!</Text>
          <View style={styles.vanRow}>
            <Text style={styles.vanLabel}>Estimated arrival</Text>
            <View style={styles.vanTimeBadge}>
              <Text style={styles.vanTimeText}>—</Text>
            </View>
          </View>

          {/* Live Tracking Button */}
          <TouchableOpacity
            style={styles.liveButton}
            onPress={() => setShowMap(!showMap)}
          >
            <Text style={styles.liveButtonText}>
              📍 {showMap ? "Hide Live Tracking" : "Show Live Tracking"}
            </Text>
          </TouchableOpacity>

          {/* Live tracking active badge*/}
          {showMap && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>Live Tracking Active</Text>
            </View>
          )}

          {/* Map */}
          {showMap && (
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: vanLocation.latitude,
                longitude: vanLocation.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
            >
              <Marker coordinate={vanLocation}>
                <View style={{ backgroundColor: "#1a237e", borderRadius: 20, padding: 6 }}>
                  <Ionicons name="bus" size={24} color="#fff" />
                </View>
              </Marker>
            </MapView>
          )}

          {/* Route Progress Timeline */}
          <View style={styles.timelineContainer}>
            <Text style={styles.timelineTitle}>Route Progress</Text>
            <View style={styles.timelineRow}>
              {/* School */}
              <View style={styles.timelineStep}>
                <View style={[styles.timelineDot, styles.completedDot]} />
                <Text style={styles.timelineLabel}>School</Text>
              </View>

              {/* Connector */}
              <View style={styles.timelineConnector} />

              {/* Home */}
              <View style={styles.timelineStep}>
                <View style={[styles.timelineDot, styles.pendingDot]} />
                <Text style={styles.timelineLabel}>Home</Text>
              </View>
            </View>
          </View>

          {/* Call Driver Button */}
          <TouchableOpacity
            accessibilityLabel="Call the van driver"
            style={styles.callButton}
            onPress={handleCallDriver}
          >
            <Text style={styles.callButtonText}>📞 Call Driver</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: -70,
  },
  greeting: { fontSize: 18, color: "#374151" },
  name: { fontSize: 28, fontWeight: "bold", color: "#000" },
  date: { fontSize: 14, color: "#666" },
  routeButton: {
    backgroundColor: "#fff3a0",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#000",
  },
  routeButtonText: { fontWeight: "600", color: "#000", fontSize: 14 },
  vanCard: {
    backgroundColor: "#FFF8CC",
    marginTop: 30,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5D98A",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  vanTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },
  vanRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
  },
  vanLabel: { fontSize: 14, color: "#555" },
  vanTimeBadge: {
    backgroundColor: "#DCFCE7",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  vanMarker: {
    width: 40,
    height: 40,
  },
  vanTimeText: { color: "#166534", fontWeight: "600", fontSize: 13 },
  liveButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 20,
  },
  liveButtonText: { color: "#fff", fontWeight: "600" },
  map: {
    width: "100%",
    height: 400,
    marginTop: 20,
    borderRadius: 12,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    marginTop: 10,
    backgroundColor: "#ECFDF5",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#34D399",
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
    marginRight: 8,
  },
  liveBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#065F46",
  },
  callButton: {
    marginTop: 20,
    backgroundColor: "#60A5FA",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  callButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },

  // Timeline styles
  timelineContainer: {
    marginTop: 20,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
    color: "#1F2937",
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  timelineStep: {
    alignItems: "center",
    flex: 1,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginBottom: 4,
  },
  completedDot: {
    backgroundColor: "#22C55E",
  },
  pendingDot: {
    backgroundColor: "#D1D5DB",
  },
  timelineLabel: {
    fontSize: 12,
    color: "#555",
  },
  timelineConnector: {
    height: 2,
    backgroundColor: "#A3A3A3",
    flex: 1,
  },
});