import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { moderateScale, wp } from "../../constants/responsive";
import { collection, deleteDoc, doc, onSnapshot, query, where } from "firebase/firestore";
import { db, auth } from "../../firebaseConfig";

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  timestamp?: string;
  type?: string;
}

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const mergeAndSort = (existing: Notification[], incoming: Notification[], keyPrefix: string) => {
    const filtered = existing.filter((n) => !n.id.startsWith(keyPrefix));
    return [...filtered, ...incoming].sort((a, b) => {
      if (!a.timestamp || !b.timestamp) return 0;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  };

  useEffect(() => {
    if (!auth.currentUser) { setLoading(false); return; }
    const parentId = auth.currentUser.uid;

    // Real-time SOS / emergency alerts (all drivers broadcast)
    const sosUnsub = onSnapshot(
      collection(db, "emergencyAlerts"),
      (snapshot) => {
        const sosAlerts: Notification[] = snapshot.docs.map((doc) => {
          const d = doc.data();
          const ts = d.createdAt
            ? (typeof d.createdAt === "string" ? d.createdAt : d.createdAt.toDate?.().toISOString())
            : undefined;
          return {
            id: `sos-${doc.id}`,
            title: "🚨 Driver SOS Alert",
            message: d.message || d.type || "Emergency alert from your driver",
            read: false,
            timestamp: ts,
            type: "sos",
          };
        });
        setAlerts((prev) => mergeAndSort(prev, sosAlerts, "sos-"));
        setLoading(false);
      },
      (error) => { console.error("SOS listener error:", error); setLoading(false); }
    );

    // Push notification history for this parent
    const notifUnsub = onSnapshot(
      query(collection(db, "notifications"), where("recipientId", "==", parentId)),
      (snapshot) => {
        const notifs: Notification[] = snapshot.docs.map((doc) => {
          const d = doc.data();
          return {
            id: `notif-${doc.id}`,
            title: d.title || "Notification",
            message: d.body || "",
            read: false,
            timestamp: d.sentAt,
            type: d.type || "push",
          };
        });
        setAlerts((prev) => mergeAndSort(prev, notifs, "notif-"));
      }
    );

    return () => { sosUnsub(); notifUnsub(); };
  }, []);

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const allNotifications = alerts
    .filter((n) => !n.timestamp || new Date(n.timestamp).getTime() >= sevenDaysAgo)
    .map((n) => ({ ...n, read: readIds.has(n.id) }));

  const markAllAsRead = () => setReadIds(new Set(alerts.map((n) => n.id)));
  const markOneAsRead = (id: string) => setReadIds((prev) => new Set([...prev, id]));

  const deleteAll = () => {
    if (allNotifications.length === 0) return;
    Alert.alert("Delete All Notifications", "Are you sure you want to delete all notifications?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete All",
        style: "destructive",
        onPress: async () => {
          try {
            const deletions = alerts.map((n) => {
              if (n.id.startsWith("notif-")) {
                return deleteDoc(doc(db, "notifications", n.id.replace("notif-", "")));
              } else if (n.id.startsWith("sos-")) {
                return deleteDoc(doc(db, "emergencyAlerts", n.id.replace("sos-", "")));
              }
              return Promise.resolve();
            });
            await Promise.all(deletions);
            setAlerts([]);
            setReadIds(new Set());
          } catch (err) {
            console.error("Failed to delete notifications:", err);
            Alert.alert("Error", "Failed to delete some notifications.");
          }
        },
      },
    ]);
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
        <View style={{ flexDirection: "row", gap: 16 }}>
          <Text style={styles.markReadText} onPress={markAllAsRead}>Mark all as read</Text>
          <Text style={[styles.markReadText, { color: "#E53935" }]} onPress={deleteAll}>Delete All</Text>
        </View>
      </View>

      {/* Loading */}
      {loading && (
        <View style={{ alignItems: "center", marginTop: 20 }}>
          <ActivityIndicator size="small" color="#3b82f6" />
          <Text style={{ color: "#888", marginTop: 8, fontSize: 13 }}>Loading alerts...</Text>
        </View>
      )}

      {/* Alert list */}
      {!loading && allNotifications.length === 0 && (
        <View style={{ alignItems: "center", marginTop: 60 }}>
          <Ionicons name="notifications-off-outline" size={48} color="#ccc" />
          <Text style={{ color: "#aaa", marginTop: 12, fontSize: 14 }}>No notifications in the last 7 days</Text>
        </View>
      )}
      {!loading && allNotifications.length > 0 && (
        <ScrollView style={styles.alertList}>
          {allNotifications.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.alertBox}
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
  container: { flex: 1, backgroundColor: "#f0f4f8" },
  topBar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingHorizontal: wp(5), paddingTop: moderateScale(5), paddingBottom: moderateScale(1), backgroundColor: "#f0f4f8",
  },
  leftSection: { flexDirection: "column" },
  greeting: { fontSize: moderateScale(26), fontWeight: "bold", color: "#0f172a" },
  date: { fontSize: moderateScale(14), color: "#64748b", marginTop: moderateScale(4) },
  bellContainer: { position: "relative" },
  notificationDot: {
    position: "absolute", top: -2, right: -2,
    width: moderateScale(8), height: moderateScale(8), borderRadius: moderateScale(4), backgroundColor: "#ef4444",
  },
  markReadContainer: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: wp(5), marginTop: moderateScale(20),
  },
  alertTitle: { fontSize: moderateScale(20), fontWeight: "bold", color: "#0f172a" },
  unreadBadge: { fontSize: moderateScale(14), color: "#ef4444", fontWeight: "600" },
  markReadText: { fontSize: moderateScale(14), color: "#3b82f6" },
  alertList: { paddingHorizontal: wp(5), marginTop: moderateScale(10) },
  alertBox: {
    backgroundColor: "#ffffff", padding: moderateScale(14), borderRadius: moderateScale(14),
    marginBottom: moderateScale(10), flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderWidth: 1, borderColor: "#e2e8f0",
    shadowColor: "#000", shadowOpacity: 0.04, shadowOffset: { width: 0, height: 1 }, shadowRadius: 6, elevation: 2,
  },
  alertTitleText: { fontSize: moderateScale(16), color: "#0f172a" },
  alertMessage: { fontSize: moderateScale(13), color: "#ef4444", marginTop: moderateScale(4) },
  timestampText: { fontSize: moderateScale(11), color: "#94a3b8", marginTop: moderateScale(4) },
  unreadDot: { width: moderateScale(8), height: moderateScale(8), borderRadius: moderateScale(4), backgroundColor: "#3b82f6", marginLeft: moderateScale(8) },
});

