import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebaseConfig";
import { doc, getDoc, collection, getDocs, onSnapshot } from "firebase/firestore";
import { Italic } from "lucide-react-native";

interface Child {
  id: string;
  name: string;
  school: string;
  grade: string;
  isAbsent: boolean;
}

interface VanStatus {
  isActive: boolean;
  lat?: number;
  lng?: number;
  lastUpdated?: any;
}

interface ParentData {
  name: string;
  assignedDriverId: string | null;
}

interface DriverData {
  name: string;
  phone: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [parentData, setParentData] = useState<ParentData | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [vanStatus, setVanStatus] = useState<VanStatus>({ isActive: false });
  const [driverData, setDriverData] = useState<DriverData | null>(null);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour >= 17 ? "Good Evening" : hour >= 12 ? "Good Afternoon" : "Good Morning";
  const todayDate = now.toLocaleDateString("en-US", {
    weekday: "long", month: "short", day: "numeric", year: "numeric",
  });

  useEffect(() => {
    if (!user) return;
    let unsubLocation: (() => void) | null = null;

    const loadData = async () => {
      try {
        // Load parent document
        const parentSnap = await getDoc(doc(db, "parents", user.uid));
        if (!parentSnap.exists()) return;

        const pData = parentSnap.data() as ParentData;
        setParentData(pData);

        // Load children from subcollection
        const childrenSnap = await getDocs(
          collection(db, "parents", user.uid, "children")
        );
        setChildren(
          childrenSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }))
        );

        // Load driver info + subscribe to van location
        if (pData.assignedDriverId) {
          const driverSnap = await getDoc(doc(db, "drivers", pData.assignedDriverId));
          if (driverSnap.exists()) {
            setDriverData(driverSnap.data() as DriverData);
          }

          // Real-time van location subscription
          unsubLocation = onSnapshot(
            doc(db, "locationRecords", pData.assignedDriverId),
            (snap: any) => {
              if (snap.exists()) {
                setVanStatus(snap.data());
              } else {
                setVanStatus({ isActive: false });
              }
            }
          );
        }
      } catch (err) {
        console.error("Error loading parent home data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    return () => {
      if (unsubLocation) unsubLocation();
    };
  }, [user]);

  const handleCallDriver = () => {
    if (driverData?.phone) {
      Linking.openURL(`tel:${driverData.phone}`).catch(() =>
        console.log("Unable to open dialer")
      );
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: "#6B7280" }}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting}!</Text>
          <Text style={styles.name}>{parentData?.name || "Parent"}</Text>
          <Text style={styles.date}>{todayDate}</Text>
        </View>
      </View>

      {/* Van Status Card */}
      <View style={styles.vanCard}>
        <View style={styles.vanCardHeader}>
          <Text style={styles.vanTitle}>🚐 Van Status</Text>
          <View style={[styles.statusBadge, vanStatus.isActive ? styles.activeBadge : styles.offlineBadge]}>
            <View style={[styles.statusDot, vanStatus.isActive ? styles.activeDot : styles.offlineDot]} />
            <Text style={[styles.statusText, vanStatus.isActive ? styles.activeText : styles.offlineText]}>
              {vanStatus.isActive ? "On Trip" : "Offline"}
            </Text>
          </View>
        </View>

        {vanStatus.isActive ? (
          <Text style={styles.vanSubtext}>Van is currently on a trip</Text>
        ) : (
          <Text style={styles.vanSubtext}>Van is not currently active</Text>
        )}

        <View style={styles.vanActions}>
          <TouchableOpacity
            style={styles.liveButton}
            onPress={() => router.push("/Parent/LiveVanLocation")}
          >
            <Ionicons name="navigate-outline" size={16} color="#fff" />
            <Text style={styles.liveButtonText}>Live Track</Text>
          </TouchableOpacity>

          {driverData && (
            <TouchableOpacity style={styles.callButton} onPress={handleCallDriver}>
              <Ionicons name="call-outline" size={16} color="#000" />
              <Text style={styles.callButtonText}>Call Driver</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Children Today */}
      {children.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Children</Text>
          {children.map((child) => (
            <View key={child.id} style={styles.childCard}>
              <View style={styles.childInfo}>
                <Text style={styles.childName}>{child.name}</Text>
                <Text style={styles.childSchool}>{child.school}</Text>
              </View>
              <View style={[styles.attendanceBadge, child.isAbsent ? styles.absentBadge : styles.presentBadge]}>
                <Text style={[styles.attendanceText, child.isAbsent ? styles.absentText : styles.presentText]}>
                  {child.isAbsent ? "Absent" : "Present"}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/Parent/your_child")}
          >
            <Ionicons name="calendar-outline" size={28} color="#3b82f6" />
            <Text style={styles.actionLabel}>Report Absence</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/Parent/ParentAlert")}
          >
            <Ionicons name="notifications-outline" size={28} color="#F59E0B" />
            <Text style={styles.actionLabel}>Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/Parent/PaymentStatus")}
          >
            <Ionicons name="card-outline" size={28} color="#10B981" />
            <Text style={styles.actionLabel}>Payment Status</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/Parent/RateDriver")}
          >
            <Ionicons name="star-outline" size={28} color="#8B5CF6" />
            <Text style={styles.actionLabel}>Rate Driver</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f4f8",
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  greeting: { fontSize: 16, color: "#64748b" },
  name: { fontSize: 24, fontWeight: "bold", color: "#0f172a" , fontStyle:"italic"},
  date: { fontSize: 13, color: "#94a3b8", marginTop: 2 },
  vanCard: {
    backgroundColor: "#5AA9E6", 
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 10,
    elevation: 3,
  },
  vanCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  vanTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 5,
  },
  activeBadge: { backgroundColor: "#dcfce7", borderWidth: 1, borderColor: "#34D399" },
  offlineBadge: { backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "#e2e8f0" },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  activeDot: { backgroundColor: "#22c55e" },
  offlineDot: { backgroundColor: "#94a3b8" },
  statusText: { fontSize: 12, fontWeight: "600" },
  activeText: { color: "#065F46" },
  offlineText: { color: "#64748b" },
  vanSubtext: { fontSize: 13, color: "#64748b", marginBottom: 12 },
  vanActions: { flexDirection: "row", gap: 10 },
  liveButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#3b82f6",
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  liveButtonText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  callButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#f0f4f8",
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  callButtonText: { color: "#0f172a", fontWeight: "600", fontSize: 13 },

  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 10,
  },

  childCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 6,
    elevation: 2,
  },
  childInfo: { flex: 1 },
  childName: { fontSize: 15, fontWeight: "600", color: "#0f172a" },
  childSchool: { fontSize: 12, color: "#64748b", marginTop: 2 },
  attendanceBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  presentBadge: { backgroundColor: "#dcfce7" },
  absentBadge: { backgroundColor: "#fee2e2" },
  attendanceText: { fontSize: 12, fontWeight: "600" },
  presentText: { color: "#065F46" },
  absentText: { color: "#991B1B" },

  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  actionCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 6,
    elevation: 2,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
    textAlign: "center",
  },
});
