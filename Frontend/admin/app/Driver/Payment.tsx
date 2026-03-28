import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckSquare, Square, DollarSign } from "lucide-react-native";
import {
    collection,
    query,
    where,
    getDocs,
    getDoc,
    doc,
    setDoc,
    updateDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../../firebaseConfig";

// ─── Types ─────────────────────────────────────────────────────────────────

interface PaymentItem {
    id: string;           // parent doc ID
    paymentDocId: string; // "{parentId}_{YYYY-MM}"
    childName: string;
    parentName: string;
    parentToken: string;
    amount: number;
    status: "paid" | "pending";
    paidAt: string | null;
}

type FilterType = "all" | "paid" | "pending";

const PAYMENT_AMOUNT = 3000; // LKR — adjust as needed

// ─── Component ─────────────────────────────────────────────────────────────

export default function Payment() {
    const insets = useSafeAreaInsets();
    const [payments, setPayments] = useState<PaymentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFilter, setSelectedFilter] = useState<FilterType>("all");
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [pendingPayment, setPendingPayment] = useState<PaymentItem | null>(null);
    const [isSending, setIsSending] = useState(false);

    const month = new Date().toISOString().slice(0, 7); // "YYYY-MM"

    useEffect(() => { loadPayments(); }, []);

    // ── Load parents + existing payment status from Firestore ───────────────
    async function loadPayments() {
        setLoading(true);
        try {
            const auth = getAuth();
            const currentUser = auth.currentUser;
            if (!currentUser) { setLoading(false); return; }

            const driverId = currentUser.uid;

            // Get driver name for payment records
            const driverSnap = await getDoc(doc(db, "drivers", driverId));
            const driverName: string = driverSnap.exists() ? (driverSnap.data().name || "Driver") : "Driver";

            // Query parents assigned to this driver
            const q = query(collection(db, "parents"), where("assignedDriverId", "==", driverId));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                setPayments([]);
                setLoading(false);
                return;
            }

            const items: PaymentItem[] = [];

            for (const parentDoc of snapshot.docs) {
                const data = parentDoc.data();
                const parentId = parentDoc.id;
                const paymentDocId = `${parentId}_${month}`;

                // Get child name from subcollection
                let childName = "Unknown Child";
                try {
                    const childrenSnap = await getDocs(
                        collection(db, "parents", parentId, "children")
                    );
                    if (!childrenSnap.empty) {
                        childName = childrenSnap.docs[0].data().name || childName;
                    }
                } catch (_) {}

                // Check if a payment record already exists for this month
                const paySnap = await getDoc(doc(db, "payments", paymentDocId));

                let status: "paid" | "pending" = "pending";
                let paidAt: string | null = null;

                if (paySnap.exists()) {
                    status = paySnap.data().status || "pending";
                    paidAt = paySnap.data().paidAt || null;
                } else {
                    // Create a "pending" record so admin can see all parents
                    await setDoc(doc(db, "payments", paymentDocId), {
                        paymentId: paymentDocId,
                        parentId,
                        parentName: data.name || "Unknown",
                        driverId,
                        driverName,
                        childName,
                        amount: PAYMENT_AMOUNT,
                        status: "pending",
                        month,
                        paidAt: null,
                        confirmedBy: null,
                        notificationSent: false,
                        createdAt: new Date().toISOString(),
                    });
                }

                items.push({
                    id: parentId,
                    paymentDocId,
                    childName,
                    parentName: data.name || "Unknown Parent",
                    parentToken: data.expoPushToken || "",
                    amount: PAYMENT_AMOUNT,
                    status,
                    paidAt,
                });
            }

            setPayments(items);
        } catch (error) {
            console.error("Error loading payments:", error);
        } finally {
            setLoading(false);
        }
    }

    // ── Checkbox pressed ────────────────────────────────────────────────────
    const handleCheckboxPress = (item: PaymentItem) => {
        if (item.status === "paid") {
            // Revert to pending — update state and Firestore
            setPayments((prev) =>
                prev.map((p) =>
                    p.id === item.id ? { ...p, status: "pending", paidAt: null } : p
                )
            );
            updateDoc(doc(db, "payments", item.paymentDocId), {
                status: "pending",
                paidAt: null,
                notificationSent: false,
            }).catch((e) => console.error("Revert payment error:", e));
            return;
        }

        // Mark as paid optimistically, then show confirmation modal
        setPayments((prev) =>
            prev.map((p) =>
                p.id === item.id
                    ? { ...p, status: "paid", paidAt: new Date().toISOString() }
                    : p
            )
        );
        setPendingPayment({ ...item, status: "paid", paidAt: new Date().toISOString() });
        setShowConfirmation(true);
    };

    // ── Confirm: write to Firestore + send push notification ────────────────
    const handleConfirm = async () => {
        if (!pendingPayment) return;
        setIsSending(true);

        const auth = getAuth();
        const driverId = auth.currentUser?.uid || "";
        const paidAt = new Date().toISOString();

        try {
            // 1. Persist to Firestore
            await updateDoc(doc(db, "payments", pendingPayment.paymentDocId), {
                status: "paid",
                paidAt,
                confirmedBy: driverId,
                notificationSent: false,
            });

            // 2. Send Expo push notification to parent
            const token = pendingPayment.parentToken;
            if (token && token.startsWith("ExponentPushToken")) {
                const message = {
                    to: token,
                    sound: "default",
                    title: "Payment Received",
                    body: `Payment of LKR ${pendingPayment.amount.toLocaleString()} for ${pendingPayment.childName} has been confirmed. Thank you!`,
                    priority: "high",
                    data: { type: "payment_confirmation" },
                };

                await fetch("https://exp.host/--/api/v2/push/send", {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(message),
                });

                // Mark notification sent
                await updateDoc(doc(db, "payments", pendingPayment.paymentDocId), {
                    notificationSent: true,
                });
            }

            // Update local state with confirmed paidAt
            setPayments((prev) =>
                prev.map((p) =>
                    p.id === pendingPayment.id ? { ...p, paidAt } : p
                )
            );
        } catch (error) {
            console.error("Failed to confirm payment:", error);
        } finally {
            setIsSending(false);
            setShowConfirmation(false);
            setPendingPayment(null);
        }
    };

    // ── Cancel: revert to pending ────────────────────────────────────────────
    const handleCancel = () => {
        if (pendingPayment) {
            setPayments((prev) =>
                prev.map((p) =>
                    p.id === pendingPayment.id
                        ? { ...p, status: "pending", paidAt: null }
                        : p
                )
            );
        }
        setShowConfirmation(false);
        setPendingPayment(null);
    };

    const filteredPayments = payments.filter((p) => {
        if (selectedFilter === "paid")    return p.status === "paid";
        if (selectedFilter === "pending") return p.status === "pending";
        return true;
    });

    const totalPaid   = payments.filter((p) => p.status === "paid").length;
    const totalAmount = payments.reduce((sum, p) => (p.status === "paid" ? sum + p.amount : sum), 0);
    const outstanding = payments.reduce((sum, p) => (p.status === "pending" ? sum + p.amount : sum), 0);

    return (
        <View style={{ flex: 1, backgroundColor: "#f0f4f8" }}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={{
                backgroundColor: "#fff",
                paddingTop: insets.top + 20,
                paddingHorizontal: 20,
                paddingBottom: 16,
                borderBottomWidth: 1,
                borderBottomColor: "#e2e8f0",
            }}>
                <Text style={{ fontSize: 24, fontWeight: "bold", color: "#0f172a" }}>Payments</Text>
                <Text style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
                    {month} · {totalPaid}/{payments.length} paid
                </Text>
            </View>

            {/* Loading */}
            {loading && (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text style={{ color: "#64748b", marginTop: 12 }}>Loading payments…</Text>
                </View>
            )}

            {!loading && (
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
                >
                    {/* Summary Cards */}
                    <View style={{ padding: 20 }}>
                        <View style={{ flexDirection: "row", marginBottom: 12, gap: 12 }}>
                            <View style={{ flex: 1, backgroundColor: "#fff", padding: 16, borderRadius: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: {width: 0, height: 2}, shadowRadius: 10, elevation: 3 }}>
                                <Text style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Collected</Text>
                                <Text style={{ fontSize: 22, fontWeight: "bold", color: "#10B981" }}>
                                    LKR {totalAmount.toLocaleString()}
                                </Text>
                            </View>
                            <View style={{ flex: 1, backgroundColor: "#fff", padding: 16, borderRadius: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: {width: 0, height: 2}, shadowRadius: 10, elevation: 3 }}>
                                <Text style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Outstanding</Text>
                                <Text style={{ fontSize: 22, fontWeight: "bold", color: "#EF4444" }}>
                                    LKR {outstanding.toLocaleString()}
                                </Text>
                            </View>
                        </View>

                        <View style={{ backgroundColor: "#fff", padding: 14, borderRadius: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: {width: 0, height: 2}, shadowRadius: 10, elevation: 3, marginBottom: 16 }}>
                            <Text style={{ fontSize: 13, color: "#64748b" }}>
                                Students paid: <Text style={{ fontWeight: "700", color: "#0f172a" }}>{totalPaid} / {payments.length}</Text>
                            </Text>
                        </View>

                        {/* Filter Buttons */}
                        <View style={{ flexDirection: "row", gap: 8 }}>
                            {[{ key: "all", label: "All" }, { key: "paid", label: "Paid" }, { key: "pending", label: "Unpaid" }].map((filter) => (
                                <TouchableOpacity
                                    key={filter.key}
                                    onPress={() => setSelectedFilter(filter.key as FilterType)}
                                    style={{
                                        backgroundColor: selectedFilter === filter.key ? "#3b82f6" : "#e2e8f0",
                                        paddingHorizontal: 18,
                                        paddingVertical: 9,
                                        borderRadius: 8,
                                    }}
                                >
                                    <Text style={{
                                        color: selectedFilter === filter.key ? "#fff" : "#64748b",
                                        fontWeight: "600",
                                        fontSize: 14,
                                    }}>
                                        {filter.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Payments List */}
                    <View style={{ paddingHorizontal: 20 }}>
                        {filteredPayments.length === 0 && (
                            <View style={{ backgroundColor: "#fff", padding: 40, borderRadius: 14, alignItems: "center", shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: {width: 0, height: 2}, shadowRadius: 10, elevation: 3 }}>
                                <DollarSign size={40} color="#64748b" />
                                <Text style={{ fontSize: 15, color: "#64748b", marginTop: 12, textAlign: "center" }}>
                                    No payments found
                                </Text>
                            </View>
                        )}

                        {filteredPayments.map((item) => (
                            <View
                                key={item.id}
                                style={{
                                    backgroundColor: "#fff",
                                    padding: 16,
                                    borderRadius: 14,
                                    marginBottom: 12,
                                    shadowColor: '#000',
                                    shadowOpacity: 0.06,
                                    shadowOffset: {width: 0, height: 2},
                                    shadowRadius: 10,
                                    elevation: 3,
                                    flexDirection: "row",
                                    alignItems: "center",
                                }}
                            >
                                {/* Checkbox */}
                                <TouchableOpacity
                                    onPress={() => handleCheckboxPress(item)}
                                    style={{ marginRight: 12 }}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    {item.status === "paid"
                                        ? <CheckSquare size={24} color="#3b82f6" />
                                        : <Square size={24} color="#94a3b8" />
                                    }
                                </TouchableOpacity>

                                {/* Avatar */}
                                <View style={{
                                    width: 46, height: 46, borderRadius: 23,
                                    backgroundColor: item.status === "paid" ? "#DCFCE7" : "#e2e8f0",
                                    justifyContent: "center", alignItems: "center", marginRight: 12,
                                }}>
                                    <Text style={{ fontSize: 18, fontWeight: "bold", color: "#64748b" }}>
                                        {item.childName.charAt(0).toUpperCase()}
                                    </Text>
                                </View>

                                {/* Info */}
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 15, fontWeight: "600", color: "#0f172a" }}>
                                        {item.childName}
                                    </Text>
                                    <Text style={{ fontSize: 13, color: "#64748b" }}>
                                        {item.parentName}
                                    </Text>
                                    {item.paidAt && (
                                        <Text style={{ fontSize: 11, color: "#10B981", marginTop: 1 }}>
                                            Paid {new Date(item.paidAt).toLocaleDateString()}
                                        </Text>
                                    )}
                                </View>

                                {/* Amount + status */}
                                <View style={{ alignItems: "flex-end" }}>
                                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#0f172a" }}>
                                        LKR {item.amount.toLocaleString()}
                                    </Text>
                                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                                        <View style={{
                                            width: 7, height: 7, borderRadius: 4,
                                            backgroundColor: item.status === "paid" ? "#10B981" : "#F59E0B",
                                            marginRight: 5,
                                        }} />
                                        <Text style={{ fontSize: 12, color: "#64748b" }}>
                                            {item.status === "paid" ? "Paid" : "Pending"}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                </ScrollView>
            )}

            {/* Confirmation Modal */}
            <Modal visible={showConfirmation} transparent animationType="fade" onRequestClose={handleCancel}>
                <View style={{
                    flex: 1,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: 20,
                }}>
                    <View style={{
                        backgroundColor: "#fff",
                        borderRadius: 16,
                        padding: 24,
                        width: "100%",
                        maxWidth: 400,
                        elevation: 5,
                    }}>
                        <Text style={{ fontSize: 20, fontWeight: "bold", color: "#0f172a", marginBottom: 8 }}>
                            Confirm Payment
                        </Text>
                        <Text style={{ fontSize: 15, color: "#64748b", marginBottom: 20 }}>
                            Mark LKR {pendingPayment?.amount.toLocaleString()} received from{" "}
                            <Text style={{ fontWeight: "600", color: "#0f172a" }}>{pendingPayment?.parentName}</Text>
                            {" "}for {pendingPayment?.childName}?{"\n\n"}
                            A push notification will be sent to the parent.
                        </Text>
                        <View style={{ flexDirection: "row", gap: 10 }}>
                            <TouchableOpacity
                                onPress={handleCancel}
                                disabled={isSending}
                                style={{
                                    flex: 1,
                                    backgroundColor: "#f8fafc",
                                    paddingVertical: 12,
                                    borderRadius: 8,
                                    alignItems: "center",
                                }}
                            >
                                <Text style={{ fontSize: 15, fontWeight: "600", color: "#64748b" }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleConfirm}
                                disabled={isSending}
                                style={{
                                    flex: 1,
                                    backgroundColor: isSending ? "#93C5FD" : "#3b82f6",
                                    paddingVertical: 12,
                                    borderRadius: 8,
                                    alignItems: "center",
                                }}
                            >
                                <Text style={{ fontSize: 15, fontWeight: "600", color: "#fff" }}>
                                    {isSending ? "Saving…" : "Confirm"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
