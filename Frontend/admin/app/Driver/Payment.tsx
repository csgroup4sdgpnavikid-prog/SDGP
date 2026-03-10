import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckSquare, Square, DollarSign, Search } from "lucide-react-native";
import { collection, query, where, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../../firebaseConfig"; // adjust path if needed

interface PaymentItem {
  id: string;           // parent doc ID
  childName: string;
  parentName: string;
  parentToken: string;
  amount: number;
  route: string;
  childClass: string;
  status: "paid" | "pending";
  paidDate: string | null;
}

type FilterType = "all" | "paid" | "pending";

export default function Payment() {
  const insets = useSafeAreaInsets();
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("all");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<PaymentItem | null>(null);
  const [isSending, setIsSending] = useState(false);

  // ── Load children assigned to this driver from Firestore ─────────────
  useEffect(() => {
    loadPayments();
  }, []);

  async function loadPayments() {
    setLoading(true);
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        console.warn("No logged-in driver found");
        setLoading(false);
        return;
      }

      const driverId = currentUser.uid;
      console.log("Loading payments for driver:", driverId);

      // Query all parents assigned to this driver
      const q = query(collection(db, "parents"), where("assignedDriverId", "==", driverId));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        console.warn("No parents found for this driver");
        setPayments([]);
        setLoading(false);
        return;
      }

      const items: PaymentItem[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          childName: data.childName || "Unknown Child",
          parentName: data.name || "Unknown Parent",
          parentToken: data.expoPushToken || "",
          amount: 120.0, // fixed amount — update if you store this in Firestore
          route: data.childClass || "",
          childClass: data.childClass || "",
          status: "pending",
          paidDate: null,
        };
      });

      console.log(`✅ Loaded ${items.length} children for this driver`);
      setPayments(items);
    } catch (error) {
      console.error("Error loading payments:", error);
    } finally {
      setLoading(false);
    }
  }

  // ── Checkbox pressed ──────────────────────────────────────────────────
  const handleCheckboxPress = (item: PaymentItem) => {
    // If already paid, untick it (revert to pending)
    if (item.status === "paid") {
      setPayments((prev) =>
        prev.map((p) =>
          p.id === item.id
            ? { ...p, status: "pending" as const, paidDate: null }
            : p
        )
      );
      return;
    }

    // Instantly show as paid
    setPayments((prev) =>
      prev.map((p) =>
        p.id === item.id
          ? { ...p, status: "paid" as const, paidDate: new Date().toISOString() }
          : p
      )
    );

    setPendingPayment(item);
    setShowConfirmation(true);
  };

  // ── Confirm: send push notification to parent ─────────────────────────
  const handleConfirm = async () => {
    if (!pendingPayment) return;
    setIsSending(true);

    try {
      const token = pendingPayment.parentToken;

      if (!token || !token.startsWith("ExponentPushToken")) {
        console.warn(`⚠️ No valid token for parent: ${pendingPayment.parentName}`);
      } else {
        const message = {
          to: token,
          sound: "default",
          title: "✅ Payment Received",
          body: `Payment of $${pendingPayment.amount.toFixed(2)} for ${pendingPayment.childName} has been confirmed. Thank you!`,
          priority: "high",
          data: { type: "payment_confirmation" },
        };

        const res = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Accept-Encoding": "gzip, deflate",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(message),
        });

        const result = await res.json();
        console.log(`✅ Payment notification sent to ${pendingPayment.parentName}:`, JSON.stringify(result));
      }
    } catch (error) {
      console.error("Failed to send payment notification:", error);
    } finally {
      setIsSending(false);
      setShowConfirmation(false);
      setPendingPayment(null);
    }
  };

  // ── Cancel: revert to pending ─────────────────────────────────────────
  const handleCancel = () => {
    if (pendingPayment) {
      setPayments((prev) =>
        prev.map((p) =>
          p.id === pendingPayment.id
            ? { ...p, status: "pending" as const, paidDate: null }
            : p
        )
      );
    }
    setShowConfirmation(false);
    setPendingPayment(null);
  };

  const filteredPayments = payments.filter((p) => {
    if (selectedFilter === "paid") return p.status === "paid";
    if (selectedFilter === "pending") return p.status === "pending";
    return true;
  });

  const totalPaid = payments.filter((p) => p.status === "paid").length;
  const totalAmount = payments.reduce((sum, p) => (p.status === "paid" ? sum + p.amount : sum), 0);

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={{ backgroundColor: "#fff", paddingTop: insets.top + 20, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" }}>
        <Text style={{ fontSize: 24, fontWeight: "bold", color: "#111827" }}>Payments</Text>
        <Text style={{ fontSize: 16, color: "#6B7280", marginTop: 4 }}>
          {totalPaid}/{payments.length} paid
        </Text>
      </View>

      {/* Loading */}
      {loading && (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={{ color: "#6B7280", marginTop: 12 }}>Loading payments...</Text>
        </View>
      )}

      {!loading && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
          {/* Summary Cards */}
          <View style={{ padding: 20 }}>
            <View style={{ flexDirection: "row", marginBottom: 20 }}>
              <View style={{ flex: 1, backgroundColor: "#fff", padding: 16, borderRadius: 12, elevation: 1, marginRight: 12 }}>
                <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>Total Paid</Text>
                <Text style={{ fontSize: 24, fontWeight: "bold", color: "#111827" }}>${totalAmount.toFixed(0)}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: "#fff", padding: 16, borderRadius: 12, elevation: 1 }}>
                <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>Students Paid</Text>
                <Text style={{ fontSize: 24, fontWeight: "bold", color: "#111827" }}>{totalPaid} / {payments.length}</Text>
              </View>
            </View>

            <View style={{ backgroundColor: "#fff", padding: 16, borderRadius: 12, elevation: 1, marginBottom: 20 }}>
              <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>Outstanding Amount</Text>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: "#111827" }}>${((payments.length - totalPaid) * 120).toFixed(0)}</Text>
            </View>

            {/* Filter Buttons */}
            <View style={{ flexDirection: "row" }}>
              {[{ key: "all", label: "All" }, { key: "paid", label: "Paid" }, { key: "pending", label: "Unpaid" }].map((filter, index) => (
                <TouchableOpacity
                  key={filter.key}
                  onPress={() => setSelectedFilter(filter.key as FilterType)}
                  style={{
                    backgroundColor: selectedFilter === filter.key ? "#2563EB" : "#E5E7EB",
                    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginRight: index < 2 ? 8 : 0,
                  }}
                >
                  <Text style={{ color: selectedFilter === filter.key ? "#fff" : "#6B7280", fontWeight: "600", fontSize: 14 }}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Payments List */}
          <View style={{ paddingHorizontal: 20 }}>
            {filteredPayments.length === 0 && (
              <View style={{ backgroundColor: "#fff", padding: 40, borderRadius: 12, alignItems: "center" }}>
                <DollarSign size={40} color="#6B7280" />
                <Text style={{ fontSize: 16, color: "#6B7280", marginTop: 12, textAlign: "center" }}>
                  No payments found
                </Text>
              </View>
            )}

            {filteredPayments.map((item) => (
              <View key={item.id} style={{ backgroundColor: "#fff", padding: 16, borderRadius: 12, marginBottom: 12, elevation: 1, flexDirection: "row", alignItems: "center" }}>
                {/* Checkbox */}
                <TouchableOpacity onPress={() => handleCheckboxPress(item)} style={{ marginRight: 12 }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  {item.status === "paid" ? <CheckSquare size={24} color="#2563EB" /> : <Square size={24} color="#9CA3AF" />}
                </TouchableOpacity>

                {/* Avatar */}
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#E5E7EB", justifyContent: "center", alignItems: "center", marginRight: 12 }}>
                  <Text style={{ fontSize: 18, fontWeight: "bold", color: "#6B7280" }}>{item.childName.charAt(0).toUpperCase()}</Text>
                </View>

                {/* Info */}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: "600", color: "#111827" }}>{item.childName}</Text>
                  <Text style={{ fontSize: 13, color: "#6B7280" }}>Parent: {item.parentName}</Text>
                  {item.childClass !== "" && <Text style={{ fontSize: 13, color: "#9CA3AF" }}>Class: {item.route}</Text>}
                </View>

                {/* Status dot */}
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.status === "paid" ? "#10B981" : "#F59E0B", marginRight: 6 }} />
                  <Text style={{ fontSize: 14, color: "#6B7280" }}>{item.status === "paid" ? "Paid" : "Unpaid"}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Confirmation Modal */}
      <Modal visible={showConfirmation} transparent animationType="fade" onRequestClose={handleCancel}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 400, elevation: 5 }}>
            <Text style={{ fontSize: 20, fontWeight: "bold", color: "#111827", marginBottom: 12 }}>Payment Received</Text>
            <Text style={{ fontSize: 16, color: "#6B7280", marginBottom: 24 }}>
              Send payment confirmation to {pendingPayment?.parentName} for {pendingPayment?.childName}?
            </Text>
            <View style={{ flexDirection: "row" }}>
              <TouchableOpacity onPress={handleCancel} disabled={isSending} style={{ flex: 1, backgroundColor: "#F3F4F6", paddingVertical: 12, borderRadius: 8, alignItems: "center", marginRight: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: "600", color: "#6B7280" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirm} disabled={isSending} style={{ flex: 1, backgroundColor: isSending ? "#93C5FD" : "#2563EB", paddingVertical: 12, borderRadius: 8, alignItems: "center" }}>
                <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}>{isSending ? "Sending..." : "OK"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}