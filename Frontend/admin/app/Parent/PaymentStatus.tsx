import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";

interface PaymentData {
    paymentId: string;
    parentName: string;
    driverName: string;
    childName: string;
    amount: number;
    status: "paid" | "pending";
    month: string;
    paidAt: string | null;
    notificationSent: boolean;
}

function formatMonth(yyyyMM: string): string {
    const [year, month] = yyyyMM.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleString("default", { month: "long", year: "numeric" });
}

export default function PaymentStatus() {
    const router = useRouter();
    const [payment, setPayment] = useState<PaymentData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const month = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const uid = auth.currentUser?.uid;
    const paymentDocId = uid ? `${uid}_${month}` : null;

    useEffect(() => {
        if (!paymentDocId) { setLoading(false); return; }

        // Real-time subscription — updates instantly when driver marks payment
        const unsub = onSnapshot(doc(db, "payments", paymentDocId), (snap) => {
            if (snap.exists()) {
                setPayment(snap.data() as PaymentData);
            } else {
                setPayment(null);
            }
            setLoading(false);
            setRefreshing(false);
        });

        return () => unsub();
    }, [paymentDocId]);

    const isPaid = payment?.status === "paid";

    return (
        <View style={styles.screen}>
            {/* Back button */}
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => setRefreshing(true)}
                    />
                }
            >
                <Text style={styles.title}>Payment Status</Text>
                <Text style={styles.subtitle}>{formatMonth(month)}</Text>

                {loading ? (
                    <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 60 }} />
                ) : payment === null ? (
                    <View style={styles.card}>
                        <View style={[styles.statusBadge, styles.badgePending]}>
                            <Ionicons name="time-outline" size={28} color="#D97706" />
                            <Text style={[styles.statusText, { color: "#D97706" }]}>
                                No Payment Record
                            </Text>
                        </View>
                        <Text style={styles.info}>
                            No payment record found for this month. Please contact your driver.
                        </Text>
                    </View>
                ) : (
                    <View style={styles.card}>
                        {/* Status badge */}
                        <View style={[styles.statusBadge, isPaid ? styles.badgePaid : styles.badgePending]}>
                            <Ionicons
                                name={isPaid ? "checkmark-circle" : "time-outline"}
                                size={32}
                                color={isPaid ? "#10B981" : "#D97706"}
                            />
                            <Text style={[styles.statusText, { color: isPaid ? "#10B981" : "#D97706" }]}>
                                {isPaid ? "Payment Received" : "Payment Pending"}
                            </Text>
                        </View>

                        {/* Amount */}
                        <View style={styles.amountRow}>
                            <Text style={styles.amountLabel}>Amount</Text>
                            <Text style={styles.amountValue}>
                                LKR {payment.amount?.toLocaleString() ?? "—"}
                            </Text>
                        </View>

                        <View style={styles.divider} />

                        {/* Details */}
                        <DetailRow label="Child" value={payment.childName} />
                        <DetailRow label="Driver" value={payment.driverName} />
                        <DetailRow label="Month" value={formatMonth(payment.month)} />
                        {isPaid && payment.paidAt && (
                            <DetailRow
                                label="Confirmed on"
                                value={new Date(payment.paidAt).toLocaleString()}
                                highlight
                            />
                        )}

                        {!isPaid && (
                            <Text style={styles.pendingNote}>
                                Your driver will confirm once payment is received in cash. You will be notified automatically.
                            </Text>
                        )}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

function DetailRow({
    label,
    value,
    highlight,
}: {
    label: string;
    value: string;
    highlight?: boolean;
}) {
    return (
        <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={[styles.detailValue, highlight && { color: "#10B981", fontWeight: "700" }]}>
                {value}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    screen:       { flex: 1, backgroundColor: "#f0f4f8" },
    backButton:   { padding: 16 },
    content:      { paddingHorizontal: 16, paddingBottom: 40 },
    title:        { fontSize: 24, fontWeight: "800", color: "#0f172a", marginTop: 4 },
    subtitle:     { fontSize: 15, color: "#64748b", marginBottom: 24 },
    card: {
        backgroundColor: "#ffffff",
        borderRadius: 14,
        padding: 20,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 10,
        elevation: 3,
    },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 14,
        marginBottom: 20,
    },
    badgePaid:    { backgroundColor: "#dcfce7" },
    badgePending: { backgroundColor: "#fef3c7" },
    statusText:   { fontSize: 18, fontWeight: "700" },
    amountRow:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
    amountLabel:  { fontSize: 15, color: "#64748b" },
    amountValue:  { fontSize: 22, fontWeight: "800", color: "#0f172a" },
    divider:      { height: 1, backgroundColor: "#e2e8f0", marginBottom: 16 },
    detailRow:    { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
    detailLabel:  { fontSize: 14, color: "#64748b" },
    detailValue:  { fontSize: 14, color: "#0f172a", fontWeight: "500", maxWidth: "60%", textAlign: "right" },
    pendingNote: {
        marginTop: 16,
        fontSize: 13,
        color: "#64748b",
        lineHeight: 20,
        textAlign: "center",
        backgroundColor: "#fef3c7",
        padding: 12,
        borderRadius: 10,
    },
    info:         { fontSize: 14, color: "#64748b", textAlign: "center", marginTop: 12 },
});
