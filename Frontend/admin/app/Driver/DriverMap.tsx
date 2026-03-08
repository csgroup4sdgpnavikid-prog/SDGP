import { StatusBar } from "expo-status-bar";
import {
    Bell,
    ChevronDown,
    ChevronUp,
    Navigation
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
    Alert,
    Linking,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Student {
  id: string;
  name: string;
  parentPhone: string; // used to send notification
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

// ─── Pre-allocated stop & student data ───────────────────────────────────────

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
      { id: "s1", name: "Emma Johnson", parentPhone: "+1-555-0101", status: "pending" },
      { id: "s2", name: "Lucas Brown", parentPhone: "+1-555-0102", status: "pending" },
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
      { id: "s3", name: "Sophia Davis", parentPhone: "+1-555-0103", status: "pending" },
      { id: "s4", name: "Mason Wilson", parentPhone: "+1-555-0104", status: "pending" },
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
      { id: "s5", name: "Olivia Miller", parentPhone: "+1-555-0105", status: "pending" },
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
      { id: "s6", name: "Noah Garcia", parentPhone: "+1-555-0106", status: "pending" },
      { id: "s7", name: "Ava Martinez", parentPhone: "+1-555-0107", status: "pending" },
    ],
  },
];

const school = {
  id: 99,
  name: "Washington Elementary",
  address: "100 School Ave",
  latitude: 37.79225,
  longitude: -122.4284,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function DriverMap() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const [activeTab, setActiveTab] = useState<RouteTab>("pickup");
  const [showStopsList, setShowStopsList] = useState(false);

  // Track per-student done state (keyed by studentId)
  const [doneStudents, setDoneStudents] = useState<Record<string, boolean>>({});

  // Stops ordered for current tab
  const orderedStops =
    activeTab === "pickup" ? allStops : [...allStops].reverse();

  // Total students
  const totalStudents = allStops.reduce((n, s) => n + s.students.length, 0);
  const doneCount = Object.values(doneStudents).filter(Boolean).length;

  // ── Navigate to a stop on the map ──────────────────────────────────────────
  const navigateToStop = (stop: Stop) => {
    // Focus map
    mapRef.current?.animateToRegion(
      {
        latitude: stop.latitude,
        longitude: stop.longitude,
        latitudeDelta: 0.004,
        longitudeDelta: 0.004,
      },
      800
    );

    // Also open native maps navigation
    const url = `https://maps.google.com/?daddr=${stop.latitude},${stop.longitude}&directionsmode=driving`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Navigation", `Navigating to ${stop.name}\n${stop.address}`);
    });
  };

  // ── Focus map only (no native maps) ───────────────────────────────────────
  const focusOnStop = (stop: Stop) => {
    mapRef.current?.animateToRegion(
      {
        latitude: stop.latitude,
        longitude: stop.longitude,
        latitudeDelta: 0.004,
        longitudeDelta: 0.004,
      },
      600
    );
    setShowStopsList(false);
  };

  // ── Send parent notification ───────────────────────────────────────────────
  const sendNotification = (student: Student, stop: Stop) => {
    const action = activeTab === "pickup" ? "picked up" : "dropped off";
    const timeLabel =
      activeTab === "pickup" ? stop.pickupTime : stop.dropoffTime;

    // In a real app: push notification via FCM/APNs or SMS
    console.log(
      `[Notification] → ${student.parentPhone}: ${student.name} was ${action} at ${stop.name} (${timeLabel})`
    );

    Alert.alert(
      "📲 Notification Sent",
      `${student.name}'s parent has been notified.\n\nStatus: ${student.name} was ${action} at ${stop.name}.`,
      [{ text: "OK" }]
    );
  };

  // ── Mark student as picked up / dropped off ───────────────────────────────
  const markStudentDone = (student: Student, stop: Stop) => {
    setDoneStudents((prev) => ({ ...prev, [student.id]: true }));
    sendNotification(student, stop);
  };

  // ── Fit map on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    setTimeout(() => {
      mapRef.current?.fitToCoordinates(
        allStops.map((s) => ({ latitude: s.latitude, longitude: s.longitude })),
        { edgePadding: { top: 120, right: 50, bottom: 320, left: 50 }, animated: true }
      );
    }, 500);
  }, []);

  // ── Colours per tab ───────────────────────────────────────────────────────
  const tabColor = activeTab === "pickup" ? "#2563EB" : "#D97706";
  const tabBg = activeTab === "pickup" ? "#EFF6FF" : "#FFFBEB";
  const tabTextColor = activeTab === "pickup" ? "#1E3A8A" : "#92400E";

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
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 16,
          }}
        >
          <View>
            <Text style={{ fontSize: 22, fontWeight: "800", color: "#111827" }}>
              Van 1 · Driver Dashboard
            </Text>
            <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 2 }}>
              {totalStudents} students • {allStops.length} stops
            </Text>
          </View>
          {/* Progress badge */}
          <View
            style={{
              backgroundColor: tabBg,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: tabColor + "55",
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: tabColor }}>
              {doneCount}/{totalStudents} done
            </Text>
          </View>
        </View>

        {/* ── Tab Bar ───────────────────────────────────────────────────────── */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["pickup", "dropoff"] as RouteTab[]).map((tab) => {
            const active = activeTab === tab;
            const color = tab === "pickup" ? "#2563EB" : "#D97706";
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => {
                  setActiveTab(tab);
                  setDoneStudents({});
                }}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  alignItems: "center",
                  backgroundColor: active ? color : "#F3F4F6",
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    fontWeight: "700",
                    fontSize: 15,
                    color: active ? "#fff" : "#6B7280",
                  }}
                >
                  {tab === "pickup" ? "🏠 Pick Up" : "🏫 Drop Off"}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    color: active ? "#fff" : "#9CA3AF",
                    marginTop: 2,
                  }}
                >
                  {tab === "pickup"
                    ? "Homes → School"
                    : "School → Homes"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Map ────────────────────────────────────────────────────────────── */}
      <View style={{ flex: 1 }}>
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={{
            latitude: 37.79025,
            longitude: -122.4304,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          }}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass
          loadingEnabled
        >
          {/* Route line */}
          <Polyline
            coordinates={orderedStops.map((s) => ({
              latitude: s.latitude,
              longitude: s.longitude,
            }))}
            strokeColor={tabColor}
            strokeWidth={4}
            lineDashPattern={[6, 4]}
          />

          {/* Stop markers — tap to navigate */}
          {orderedStops.map((stop, index) => {
            const allDone = stop.students.every((s) => doneStudents[s.id]);
            const markerColor = allDone ? "#10B981" : tabColor;
            return (
              <Marker
                key={stop.id}
                coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
                title={stop.name}
                description={stop.address}
                onPress={() => navigateToStop(stop)}
              >
                <View style={{ alignItems: "center" }}>
                  <View
                    style={{
                      backgroundColor: markerColor,
                      paddingHorizontal: 10,
                      paddingVertical: 7,
                      borderRadius: 18,
                      borderWidth: 3,
                      borderColor: "#fff",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.3,
                      shadowRadius: 3,
                      elevation: 6,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {allDone ? (
                      <Text style={{ fontSize: 12 }}>✓</Text>
                    ) : (
                      <Text
                        style={{ color: "#fff", fontWeight: "bold", fontSize: 13 }}
                      >
                        {index + 1}
                      </Text>
                    )}
                  </View>
                  <View
                    style={{
                      width: 0,
                      height: 0,
                      borderLeftWidth: 6,
                      borderRightWidth: 6,
                      borderTopWidth: 8,
                      borderLeftColor: "transparent",
                      borderRightColor: "transparent",
                      borderTopColor: markerColor,
                    }}
                  />
                </View>
              </Marker>
            );
          })}

          {/* School marker */}
          <Marker
            coordinate={{ latitude: school.latitude, longitude: school.longitude }}
            title={school.name}
            description={school.address}
          >
            <View style={{ alignItems: "center" }}>
              <View
                style={{
                  backgroundColor: "#059669",
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                  borderRadius: 18,
                  borderWidth: 3,
                  borderColor: "#fff",
                  elevation: 6,
                }}
              >
                <Text style={{ fontSize: 14 }}>🏫</Text>
              </View>
              <View
                style={{
                  width: 0,
                  height: 0,
                  borderLeftWidth: 6,
                  borderRightWidth: 6,
                  borderTopWidth: 8,
                  borderLeftColor: "transparent",
                  borderRightColor: "transparent",
                  borderTopColor: "#059669",
                }}
              />
            </View>
          </Marker>
        </MapView>

        {/* ── Toggle list button ────────────────────────────────────────────── */}
        <TouchableOpacity
          onPress={() => setShowStopsList(!showStopsList)}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: 12,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 5,
          }}
        >
          {showStopsList ? (
            <ChevronDown size={22} color={tabColor} />
          ) : (
            <ChevronUp size={22} color={tabColor} />
          )}
        </TouchableOpacity>
      </View>

      {/* ── Stops Panel ────────────────────────────────────────────────────── */}
      {showStopsList && (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "#fff",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: "60%",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 0.15,
            shadowRadius: 10,
            elevation: 12,
          }}
        >
          {/* Drag handle */}
          <View
            style={{ paddingTop: 12, paddingBottom: 4, alignItems: "center" }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: "#D1D5DB",
                borderRadius: 2,
              }}
            />
          </View>

          {/* Panel header */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: "#F3F4F6",
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827" }}>
              {activeTab === "pickup" ? "🏠 Pick Up Stops" : "🏫 Drop Off Stops"}
            </Text>
            <Text style={{ fontSize: 13, color: "#6B7280" }}>
              Tap stop → Navigate
            </Text>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: insets.bottom + 24,
            }}
          >
            {orderedStops.map((stop, index) => {
              const allDone = stop.students.every((s) => doneStudents[s.id]);
              const time =
                activeTab === "pickup" ? stop.pickupTime : stop.dropoffTime;

              return (
                <View
                  key={stop.id}
                  style={{
                    backgroundColor: allDone ? "#F0FDF4" : "#F9FAFB",
                    borderRadius: 14,
                    marginBottom: 12,
                    borderLeftWidth: 4,
                    borderLeftColor: allDone ? "#10B981" : tabColor,
                    overflow: "hidden",
                  }}
                >
                  {/* Stop header — tap to navigate */}
                  <TouchableOpacity
                    onPress={() => navigateToStop(stop)}
                    style={{
                      padding: 14,
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          marginBottom: 4,
                        }}
                      >
                        <View
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            backgroundColor: allDone ? "#10B981" : tabColor,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            style={{
                              color: "#fff",
                              fontSize: 11,
                              fontWeight: "700",
                            }}
                          >
                            {allDone ? "✓" : index + 1}
                          </Text>
                        </View>
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "700",
                            color: "#111827",
                          }}
                        >
                          {stop.name}
                        </Text>
                      </View>
                      <Text
                        style={{ fontSize: 13, color: "#6B7280", marginLeft: 28 }}
                      >
                        {stop.address}
                      </Text>
                    </View>

                    {/* Navigate button */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        backgroundColor: tabColor + "18",
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                      }}
                    >
                      <Navigation size={13} color={tabColor} />
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "600",
                          color: tabColor,
                        }}
                      >
                        Go
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Students list */}
                  <View
                    style={{
                      paddingHorizontal: 14,
                      paddingBottom: 12,
                      gap: 6,
                    }}
                  >
                    {stop.students.map((student) => {
                      const done = !!doneStudents[student.id];
                      return (
                        <View
                          key={student.id}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            backgroundColor: done ? "#DCFCE7" : "#fff",
                            borderRadius: 10,
                            paddingVertical: 10,
                            paddingHorizontal: 12,
                            borderWidth: 1,
                            borderColor: done ? "#86EFAC" : "#E5E7EB",
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <View
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                                backgroundColor: done
                                  ? "#10B981"
                                  : tabColor + "22",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Text style={{ fontSize: 14 }}>
                                {done ? "✓" : "👦"}
                              </Text>
                            </View>
                            <View>
                              <Text
                                style={{
                                  fontSize: 14,
                                  fontWeight: "600",
                                  color: done ? "#065F46" : "#111827",
                                  textDecorationLine: done
                                    ? "line-through"
                                    : "none",
                                }}
                              >
                                {student.name}
                              </Text>
                              {done && (
                                <Text
                                  style={{ fontSize: 11, color: "#059669" }}
                                >
                                  Parent notified ✓
                                </Text>
                              )}
                            </View>
                          </View>

                          {/* Mark done + notify parent */}
                          {!done && (
                            <TouchableOpacity
                              onPress={() => markStudentDone(student, stop)}
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 5,
                                backgroundColor: tabColor,
                                paddingHorizontal: 12,
                                paddingVertical: 7,
                                borderRadius: 8,
                              }}
                            >
                              <Bell size={13} color="#fff" />
                              <Text
                                style={{
                                  color: "#fff",
                                  fontSize: 12,
                                  fontWeight: "700",
                                }}
                              >
                                {activeTab === "pickup"
                                  ? "Picked Up"
                                  : "Dropped Off"}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}
                  </View>

                  {/* Scheduled time */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      paddingHorizontal: 14,
                      paddingBottom: 10,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: "#9CA3AF" }}>
                      ⏰ Scheduled {time}
                    </Text>
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
