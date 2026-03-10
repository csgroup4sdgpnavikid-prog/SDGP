/**
 * DriverMap.tsx  —  FRONTEND (React Native / Expo)
 *
 * Responsibilities:
 *  1. Show the map with route + stop markers
 *  2. Watch driver GPS → detect proximity to stops (300m radius)
 *  3. POST to backend when proximity fires or driver taps Picked Up / Dropped Off
 *  4. Swipe up/down to open/close the stops panel
 */

import * as Location from "expo-location";
import { StatusBar } from "expo-status-bar";
import { Bell, ChevronDown, ChevronUp, Navigation, Radio } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Linking,
  PanResponder,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Circle, Marker, Polyline } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Config ───────────────────────────────────────────────────────────────────

/** 🔧 Change this to your backend URL (local or deployed) */
const API_BASE = "http://localhost:4000";  // e.g. your machine's LAN IP

/** Proximity radius that triggers automatic parent notification */
const PROXIMITY_RADIUS_M = 300;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Student {
  id: string;
  name: string;
  parentPhone: string;
  parentExpoPushToken: string; // FCM / Expo push token for the parent's phone
  status: "pending" | "done";
}

interface Stop {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  students: Student[];
  pickupTime: string;
  dropoffTime: string;
}

type RouteTab = "pickup" | "dropoff";
type NotifyType = "proximity" | "confirmed";

// ─── Mock data (replace with API fetch in production) ─────────────────────────

const allStops: Stop[] = [
  {
    id: 1,
    name: "Maple Street",
    address: "123 Maple St",
    latitude: 37.78825,
    longitude: -122.4324,
    pickupTime: "7:15 AM",
    dropoffTime: "3:30 PM",
    students: [
      {
        id: "s1",
        name: "Emma Johnson",
        parentPhone: "+1-555-0101",
        parentExpoPushToken: "ExponentPushToken[PARENT_TOKEN_1]",
        status: "pending",
      },
      {
        id: "s2",
        name: "Lucas Brown",
        parentPhone: "+1-555-0102",
        parentExpoPushToken: "ExponentPushToken[PARENT_TOKEN_2]",
        status: "pending",
      },
    ],
  },
  {
    id: 2,
    name: "Oak Avenue",
    address: "456 Oak Ave",
    latitude: 37.78925,
    longitude: -122.4314,
    pickupTime: "7:22 AM",
    dropoffTime: "3:38 PM",
    students: [
      {
        id: "s3",
        name: "Sophia Davis",
        parentPhone: "+1-555-0103",
        parentExpoPushToken: "ExponentPushToken[PARENT_TOKEN_3]",
        status: "pending",
      },
      {
        id: "s4",
        name: "Mason Wilson",
        parentPhone: "+1-555-0104",
        parentExpoPushToken: "ExponentPushToken[PARENT_TOKEN_4]",
        status: "pending",
      },
    ],
  },
  {
    id: 3,
    name: "Pine Road",
    address: "789 Pine Rd",
    latitude: 37.79025,
    longitude: -122.4304,
    pickupTime: "7:30 AM",
    dropoffTime: "3:45 PM",
    students: [
      {
        id: "s5",
        name: "Olivia Miller",
        parentPhone: "+1-555-0105",
        parentExpoPushToken: "ExponentPushToken[PARENT_TOKEN_5]",
        status: "pending",
      },
    ],
  },
  {
    id: 4,
    name: "Elm Street",
    address: "321 Elm St",
    latitude: 37.79125,
    longitude: -122.4294,
    pickupTime: "7:38 AM",
    dropoffTime: "3:52 PM",
    students: [
      {
        id: "s6",
        name: "Noah Garcia",
        parentPhone: "+1-555-0106",
        parentExpoPushToken: "ExponentPushToken[PARENT_TOKEN_6]",
        status: "pending",
      },
      {
        id: "s7",
        name: "Ava Martinez",
        parentPhone: "+1-555-0107",
        parentExpoPushToken: "ExponentPushToken[PARENT_TOKEN_7]",
        status: "pending",
      },
    ],
  },
];

const school = {
  name: "Washington Elementary",
  address: "100 School Ave",
  latitude: 37.79225,
  longitude: -122.4284,
};

// ─── Haversine helper ─────────────────────────────────────────────────────────

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── API call ─────────────────────────────────────────────────────────────────

async function postNotification(payload: {
  type: NotifyType;
  routeTab: RouteTab;
  stopId: number;
  stopName: string;
  studentId: string;
  studentName: string;
  parentPhone: string;
  parentExpoPushToken: string;
  scheduledTime: string;
}) {
  try {
    const res = await fetch(`${API_BASE}/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    console.log("[API] notify response:", json);
    return json;
  } catch (err) {
    console.error("[API] notify failed:", err);
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DriverMap() {
  const insets = useSafeAreaInsets();
  const mapRef  = useRef<MapView>(null);

  const [activeTab,     setActiveTab]     = useState<RouteTab>("pickup");
  const [showStopsList, setShowStopsList] = useState(false);
  const [doneStudents,  setDoneStudents]  = useState<Record<string, boolean>>({});

  const proximityFiredRef = useRef<Set<number>>(new Set());
  const [driverCoords,    setDriverCoords]    = useState<{ latitude: number; longitude: number } | null>(null);
  const [proximityToast,  setProximityToast]  = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const orderedStops = activeTab === "pickup" ? allStops : [...allStops].reverse();
  const totalStudents = allStops.reduce((n, s) => n + s.students.length, 0);
  const doneCount = Object.values(doneStudents).filter(Boolean).length;

  // ── Toast ─────────────────────────────────────────────────────────────────
  const showToast = useCallback(
    (msg: string) => {
      setProximityToast(msg);
      Animated.sequence([
        Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(3500),
        Animated.timing(toastAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start(() => setProximityToast(null));
    },
    [toastAnim],
  );

  // ── Notify backend ────────────────────────────────────────────────────────
  const sendNotification = useCallback(
    async (student: Student, stop: Stop, type: NotifyType) => {
      const scheduledTime = activeTab === "pickup" ? stop.pickupTime : stop.dropoffTime;

      await postNotification({
        type,
        routeTab: activeTab,
        stopId: stop.id,
        stopName: stop.name,
        studentId: student.id,
        studentName: student.name,
        parentPhone: student.parentPhone,
        parentExpoPushToken: student.parentExpoPushToken,
        scheduledTime,
      });

      // Manual confirmation: show local alert to driver
      if (type === "confirmed") {
        const action = activeTab === "pickup" ? "picked up" : "dropped off";
        Alert.alert(
          "📲 Notification Sent",
          `${student.name}'s parent has been notified.\n\n${student.name} was ${action} at ${stop.name}.`,
          [{ text: "OK" }],
        );
      }
    },
    [activeTab],
  );

  // ── Mark done ─────────────────────────────────────────────────────────────
  const markStudentDone = useCallback(
    (student: Student, stop: Stop) => {
      setDoneStudents((prev) => ({ ...prev, [student.id]: true }));
      sendNotification(student, stop, "confirmed");
    },
    [sendNotification],
  );

  // ── Navigate ──────────────────────────────────────────────────────────────
  const navigateToStop = useCallback((stop: Stop) => {
    mapRef.current?.animateToRegion(
      { latitude: stop.latitude, longitude: stop.longitude, latitudeDelta: 0.004, longitudeDelta: 0.004 },
      800,
    );
    const url = `https://maps.google.com/?daddr=${stop.latitude},${stop.longitude}&directionsmode=driving`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Navigation", `Navigating to ${stop.name}\n${stop.address}`),
    );
  }, []);

  // ── Fit map on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    const id = setTimeout(() => {
      mapRef.current?.fitToCoordinates(
        allStops.map((s) => ({ latitude: s.latitude, longitude: s.longitude })),
        { edgePadding: { top: 120, right: 50, bottom: 320, left: 50 }, animated: true },
      );
    }, 500);
    return () => clearTimeout(id);
  }, []);

  // ── Proximity watcher ─────────────────────────────────────────────────────
  useEffect(() => {
    proximityFiredRef.current = new Set();
    let sub: Location.LocationSubscription | undefined;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location access is required for proximity notifications.");
        return;
      }

      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 20 },
        (loc) => {
          const { latitude, longitude } = loc.coords;
          setDriverCoords({ latitude, longitude });

          orderedStops.forEach((stop) => {
            if (proximityFiredRef.current.has(stop.id)) return;

            const dist = getDistanceMeters(latitude, longitude, stop.latitude, stop.longitude);
            if (dist <= PROXIMITY_RADIUS_M) {
              proximityFiredRef.current.add(stop.id);

              const pending = stop.students.filter((s) => !doneStudents[s.id]);
              pending.forEach((student) => sendNotification(student, stop, "proximity"));

              if (pending.length > 0) {
                const names = pending.map((s) => s.name.split(" ")[0]).join(", ");
                const action = activeTab === "pickup" ? "pickup" : "drop-off";
                showToast(`📍 Approaching ${stop.name} — ${names} parent${pending.length > 1 ? "s" : ""} notified for ${action}`);
              }
            }
          });
        },
      );
    })();

    return () => { sub?.remove(); };
  }, [activeTab]);

  // ── Swipe gesture ─────────────────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8,
      onPanResponderRelease: (_, g) => {
        if (g.dy < -30) setShowStopsList(true);
        if (g.dy >  30) setShowStopsList(false);
      },
    }),
  ).current;

  // ── Colors ────────────────────────────────────────────────────────────────
  const tabColor = activeTab === "pickup" ? "#2563EB" : "#D97706";
  const tabBg    = activeTab === "pickup" ? "#EFF6FF" : "#FFFBEB";

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: "#F3F4F6" }}>
      <StatusBar style="dark" />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View
        style={{
          backgroundColor: "#fff",
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 0,
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
          zIndex: 10,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <View>
            <Text style={{ fontSize: 22, fontWeight: "800", color: "#111827" }}>
              Van 1 · Driver Dashboard
            </Text>
            <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 2 }}>
              {totalStudents} students • {allStops.length} stops
            </Text>
          </View>

          <View style={{ alignItems: "flex-end", gap: 6 }}>
            <View style={{ backgroundColor: tabBg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: tabColor + "55" }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: tabColor }}>{doneCount}/{totalStudents} done</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#F0FDF4", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14, borderWidth: 1, borderColor: "#BBF7D0" }}>
              <Radio size={12} color="#10B981" />
              <Text style={{ fontSize: 11, fontWeight: "600", color: "#065F46" }}>Proximity ON • {PROXIMITY_RADIUS_M}m</Text>
            </View>
          </View>
        </View>

        {/* Tab Bar */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["pickup", "dropoff"] as RouteTab[]).map((tab) => {
            const active = activeTab === tab;
            const color  = tab === "pickup" ? "#2563EB" : "#D97706";
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => { setActiveTab(tab); setDoneStudents({}); }}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", backgroundColor: active ? color : "#F3F4F6", marginBottom: 12 }}
              >
                <Text style={{ fontWeight: "700", fontSize: 15, color: active ? "#fff" : "#6B7280" }}>
                  {tab === "pickup" ? "🏠 Pick Up" : "🏫 Drop Off"}
                </Text>
                <Text style={{ fontSize: 11, color: active ? "#fff" : "#9CA3AF", marginTop: 2 }}>
                  {tab === "pickup" ? "Homes → School" : "School → Homes"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Map ────────────────────────────────────────────────────────────── */}
      <View style={{ flex: 1 }} {...panResponder.panHandlers}>
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={{ latitude: 37.79025, longitude: -122.4304, latitudeDelta: 0.015, longitudeDelta: 0.015 }}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass
          loadingEnabled
        >
          <Polyline
            coordinates={orderedStops.map((s) => ({ latitude: s.latitude, longitude: s.longitude }))}
            strokeColor={tabColor}
            strokeWidth={4}
            lineDashPattern={[6, 4]}
          />

          {driverCoords && (
            <Circle
              center={driverCoords}
              radius={PROXIMITY_RADIUS_M}
              strokeColor={tabColor + "88"}
              fillColor={tabColor + "18"}
              strokeWidth={1.5}
            />
          )}

          {orderedStops.map((stop, index) => {
            const allDone     = stop.students.every((s) => doneStudents[s.id]);
            const markerColor = allDone ? "#10B981" : tabColor;
            return (
              <Marker key={stop.id} coordinate={{ latitude: stop.latitude, longitude: stop.longitude }} title={stop.name} description={stop.address} onPress={() => navigateToStop(stop)}>
                <View style={{ alignItems: "center" }}>
                  <View style={{ backgroundColor: markerColor, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 18, borderWidth: 3, borderColor: "#fff", elevation: 6, alignItems: "center" }}>
                    <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 13 }}>{allDone ? "✓" : index + 1}</Text>
                  </View>
                  <View style={{ width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: markerColor }} />
                </View>
              </Marker>
            );
          })}

          <Marker coordinate={{ latitude: school.latitude, longitude: school.longitude }} title={school.name} description={school.address}>
            <View style={{ alignItems: "center" }}>
              <View style={{ backgroundColor: "#059669", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 18, borderWidth: 3, borderColor: "#fff", elevation: 6 }}>
                <Text style={{ fontSize: 14 }}>🏫</Text>
              </View>
              <View style={{ width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: "#059669" }} />
            </View>
          </Marker>
        </MapView>

        {/* Toggle button */}
        <TouchableOpacity
          onPress={() => setShowStopsList(!showStopsList)}
          style={{ position: "absolute", top: 16, right: 16, backgroundColor: "#fff", borderRadius: 12, padding: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 5 }}
        >
          {showStopsList ? <ChevronDown size={22} color={tabColor} /> : <ChevronUp size={22} color={tabColor} />}
        </TouchableOpacity>

        {/* Swipe hint */}
        {!showStopsList && (
          <View
            style={{ position: "absolute", bottom: 20, alignSelf: "center", backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 6 }}
            pointerEvents="none"
          >
            <ChevronUp size={14} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>Swipe up for stops list</Text>
          </View>
        )}

        {/* Proximity toast */}
        {proximityToast && (
          <Animated.View
            style={{
              position: "absolute", top: 16, left: 16, right: 70,
              opacity: toastAnim,
              transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
              backgroundColor: "#1F2937", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
              elevation: 10, borderLeftWidth: 4, borderLeftColor: "#10B981",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600", lineHeight: 18 }}>{proximityToast}</Text>
          </Animated.View>
        )}
      </View>

      {/* ── Stops Panel ────────────────────────────────────────────────────── */}
      {showStopsList && (
        <View
          style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
            maxHeight: "60%", elevation: 12,
            shadowColor: "#000", shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.15, shadowRadius: 10,
          }}
        >
          <View {...panResponder.panHandlers} style={{ paddingTop: 12, paddingBottom: 4, alignItems: "center" }}>
            <View style={{ width: 40, height: 4, backgroundColor: "#D1D5DB", borderRadius: 2 }} />
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827" }}>
              {activeTab === "pickup" ? "🏠 Pick Up Stops" : "🏫 Drop Off Stops"}
            </Text>
            <Text style={{ fontSize: 13, color: "#6B7280" }}>Tap stop → Navigate</Text>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 24 }}>
            {orderedStops.map((stop, index) => {
              const allDone        = stop.students.every((s) => doneStudents[s.id]);
              const time           = activeTab === "pickup" ? stop.pickupTime : stop.dropoffTime;
              const proximityFired = proximityFiredRef.current.has(stop.id);

              return (
                <View
                  key={stop.id}
                  style={{ backgroundColor: allDone ? "#F0FDF4" : "#F9FAFB", borderRadius: 14, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: allDone ? "#10B981" : tabColor, overflow: "hidden" }}
                >
                  {proximityFired && !allDone && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#FEF3C7", paddingHorizontal: 12, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: "#FDE68A" }}>
                      <Radio size={11} color="#D97706" />
                      <Text style={{ fontSize: 11, fontWeight: "600", color: "#92400E" }}>Parents notified — driver approaching</Text>
                    </View>
                  )}

                  <TouchableOpacity onPress={() => navigateToStop(stop)} style={{ padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: allDone ? "#10B981" : tabColor, alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>{allDone ? "✓" : index + 1}</Text>
                        </View>
                        <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827" }}>{stop.name}</Text>
                      </View>
                      <Text style={{ fontSize: 13, color: "#6B7280", marginLeft: 28 }}>{stop.address}</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: tabColor + "18", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                      <Navigation size={13} color={tabColor} />
                      <Text style={{ fontSize: 12, fontWeight: "600", color: tabColor }}>Go</Text>
                    </View>
                  </TouchableOpacity>

                  <View style={{ paddingHorizontal: 14, paddingBottom: 12, gap: 6 }}>
                    {stop.students.map((student) => {
                      const done = !!doneStudents[student.id];
                      return (
                        <View
                          key={student.id}
                          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: done ? "#DCFCE7" : "#fff", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: done ? "#86EFAC" : "#E5E7EB" }}
                        >
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: done ? "#10B981" : tabColor + "22", alignItems: "center", justifyContent: "center" }}>
                              <Text style={{ fontSize: 14 }}>{done ? "✓" : "👦"}</Text>
                            </View>
                            <View>
                              <Text style={{ fontSize: 14, fontWeight: "600", color: done ? "#065F46" : "#111827", textDecorationLine: done ? "line-through" : "none" }}>
                                {student.name}
                              </Text>
                              {done && <Text style={{ fontSize: 11, color: "#059669" }}>Parent notified ✓</Text>}
                              {!done && proximityFired && <Text style={{ fontSize: 11, color: "#D97706" }}>📍 Proximity alert sent</Text>}
                            </View>
                          </View>
                          {!done && (
                            <TouchableOpacity
                              onPress={() => markStudentDone(student, stop)}
                              style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: tabColor, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 }}
                            >
                              <Bell size={13} color="#fff" />
                              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
                                {activeTab === "pickup" ? "Picked Up" : "Dropped Off"}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}
                  </View>

                  <View style={{ paddingHorizontal: 14, paddingBottom: 10 }}>
                    <Text style={{ fontSize: 12, color: "#9CA3AF" }}>⏰ Scheduled {time}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
