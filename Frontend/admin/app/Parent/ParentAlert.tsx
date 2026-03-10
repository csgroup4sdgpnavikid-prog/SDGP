import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebaseConfig"; // adjust path if needed

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  timestamp?: string;
  isLive?: boolean;
}

export default function AlertsScreen() {
  const [liveAlerts, setLiveAlerts] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Static default alerts
  const staticAlerts: Notification[] = [
    { id: "static-1", title: "Van Approaching!", message: "Van will arrive in 5 minutes.", read: false },
    { id: "static-2", title: "Payment Reminder", message: "Please complete this month's payment.", read: false },
    { id: "static-3", title: "Route Delay", message: "Delay due to heavy traffic.", read: true },
    { id: "static-4", title: "Mechanical issue", message: "Delay due to mechanical issue.", read: true },
  ];

  const [staticNotifs, setStaticNotifs] = useState<Notification[]>(staticAlerts);

  // ── Real-time Firestore listener (no orderBy = no index needed) ──────────
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "emergencyAlerts"), (snapshot) => {
      const alerts: Notification[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        title: `🚐 Driver Alert`,
        message: doc.data().message || "",
        read: false,
        timestamp: doc.data().timestamp,
        isLive: true,
      }));

      // Sort by timestamp descending (newest first) — done client side
      alerts.sort((a, b) => {
        if (!a.timestamp || !b.timestamp) return 0;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      setLiveAlerts(alerts);
      setLoading(false);
    }, (error) => {
      console.error("Firestore listener error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Combine: live alerts on top, static below
  const allNotifications = [...liveAlerts, ...staticNotifs];

  const markAllAsRead = () => {
    setLiveAlerts(liveAlerts.map((n) => ({ ...n, read: true })));
    setStaticNotifs(staticNotifs.map((n) => ({ ...n, read: true })));
  };

  const markOneAsRead = (id: string) => {
    setLiveAlerts(liveAlerts.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setStaticNotifs(staticNotifs.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const now = new Date();
  const hour = now.getHours();
  let greeting = "Good Morning";
  if (hour >= 12 && hour < 17) greeting = "Good Afternoon";
  else if (hour >= 17) greeting = "Good Evening";

  const todayDate = now.toLocaleDateString("en-US", {
    weekday: "long", month: "short", day: "numeric", year: "numeric",
  });

  const unreadCount = allNotifications.filter((n) => !n.read).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.topBar}>
        <View style={styles.leftSection}>
          <Text style={styles.greeting}>{greeting}!</Text>
          <Text style={styles.date}>{todayDate}</Text>
        </View>
        <View style={styles.bellContainer}>
          <Ionicons name="notifications-outline" size={26} color="#000" />
          {unreadCount > 0 && <View style={styles.notificationDot} />}
        </View>
      </View>

      {/* Title row */}
      <View style={styles.markReadContainer}>
        <Text style={styles.alertTitle}>
          Alerts{unreadCount > 0 ? <Text style={styles.unreadBadge}> · {unreadCount} new</Text> : null}
        </Text>
        <Text style={styles.markReadText} onPress={markAllAsRead}>Mark all as read</Text>
      </View>

      {/* Loading */}
      {loading && (
        <View style={{ alignItems: "center", marginTop: 20 }}>
          <ActivityIndicator size="small" color="#86c7ef" />
          <Text style={{ color: "#888", marginTop: 8, fontSize: 13 }}>Loading alerts...</Text>
        </View>
      )}

      {/* Alert list */}
      {!loading && (
        <ScrollView style={styles.alertList}>
          {allNotifications.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.alertBox, item.isLive && styles.liveAlertBox]}
              onPress={() => markOneAsRead(item.id)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.alertTitleText, { fontWeight: item.read ? "normal" : "bold" }]}>
                  {item.title}
                </Text>
                <Text style={styles.alertMessage}>{item.message}</Text>
                {item.timestamp && (
                  <Text style={styles.timestampText}>
                    {new Date(item.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    {" · "}
                    {new Date(item.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </Text>
                )}
              </View>
              {!item.read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  topBar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingHorizontal: 20, paddingTop: 5, paddingBottom: 1, backgroundColor: "#FFFFFF",
  },
  leftSection: { flexDirection: "column" },
  greeting: { fontSize: 26, fontWeight: "bold", color: "#000" },
  date: { fontSize: 14, color: "#888", marginTop: 4 },
  bellContainer: { position: "relative" },
  notificationDot: {
    position: "absolute", top: -2, right: -2,
    width: 8, height: 8, borderRadius: 4, backgroundColor: "red",
  },
  markReadContainer: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, marginTop: 20,
  },
  alertTitle: { fontSize: 20, fontWeight: "bold" },
  unreadBadge: { fontSize: 14, color: "#E53935", fontWeight: "600" },
  markReadText: { fontSize: 14, color: "#86c7ef" },
  alertList: { paddingHorizontal: 20, marginTop: 10 },
  alertBox: {
    backgroundColor: "#fbf1a1", padding: 14, borderRadius: 8,
    marginBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  liveAlertBox: {
    backgroundColor: "#fbf1a1",
  },
  alertTitleText: { fontSize: 16 },
  alertMessage: { fontSize: 13, color: "#D40F0F", marginTop: 4 },
  timestampText: { fontSize: 11, color: "#999", marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "red", marginLeft: 8 },
});

