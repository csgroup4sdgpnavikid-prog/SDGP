import { AlertTriangle, CheckCircle2, Phone, Search, User } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    FlatList,
    Linking,
    RefreshControl,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { getStudents, Student } from "./studentService";

// ─── Student card ─────────────────────────────────────────────────────────────

function StudentCard({ item }: { item: Student }) {
    const isAbsent = item.status === "Absent";
    const statusColor = isAbsent ? "#EF4444" : "#22C55E";
    const badgeBg = statusColor + "20";

    const callParent = () => {
        if (item.parentPhone) {
            Linking.openURL(`tel:${item.parentPhone}`);
        }
    };

    return (
        <View style={styles.card}>
            <View style={styles.avatarContainer}>
                <User color="#374151" size={28} />
            </View>

            <View style={styles.infoContainer}>
                <Text style={styles.nameText}>{item.name}</Text>
                <Text style={styles.subText}>
                    {item.grade ? `${item.grade} · ` : ""}{item.school}
                </Text>
                <Text style={styles.subText}>Parent: {item.parentName || "—"}</Text>
            </View>

            <View style={styles.statusSection}>
                <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
                    <View style={[styles.dot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusText, { color: statusColor }]}>
                        {item.status}
                    </Text>
                </View>
                {isAbsent ? (
                    <AlertTriangle color="#EF4444" size={20} style={{ marginTop: 4 }} />
                ) : (
                    <CheckCircle2 color="#22C55E" size={20} style={{ marginTop: 4 }} />
                )}
                {item.parentPhone ? (
                    <TouchableOpacity onPress={callParent} style={{ marginTop: 4 }}>
                        <Phone color="#6B7280" size={18} />
                    </TouchableOpacity>
                ) : null}
            </View>
        </View>
    );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function StudentsScreen() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchData = async () => {
        try {
            const data = await getStudents();
            setStudents(data);
        } catch (err) {
            console.error("Failed to load students:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const filtered = students
        .filter((s) => s.name?.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => {
            if (a.status === "Absent" && b.status !== "Absent") return -1;
            if (a.status !== "Absent" && b.status === "Absent") return 1;
            return a.name.localeCompare(b.name);
        });

    const presentCount = students.filter((s) => s.status !== "Absent").length;
    const absentCount  = students.filter((s) => s.status === "Absent").length;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Students</Text>
                <Text style={styles.headerSub}>Today · {new Date().toLocaleDateString()}</Text>
            </View>

            <View style={styles.content}>
                {/* Summary */}
                <View style={styles.summaryRow}>
                    <View style={[styles.summaryCard, { backgroundColor: "#DCFCE7" }]}>
                        <CheckCircle2 color="#22C55E" size={20} />
                        <Text style={[styles.summaryCount, { color: "#22C55E" }]}>{presentCount}</Text>
                        <Text style={styles.summaryLabel}>Present</Text>
                    </View>
                    <View style={[styles.summaryCard, { backgroundColor: "#FEE2E2" }]}>
                        <AlertTriangle color="#EF4444" size={20} />
                        <Text style={[styles.summaryCount, { color: "#EF4444" }]}>{absentCount}</Text>
                        <Text style={styles.summaryLabel}>Absent</Text>
                    </View>
                </View>

                {/* Search */}
                <View style={styles.searchSection}>
                    <Search color="#94A3B8" size={20} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by student name…"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {/* List */}
                {loading ? (
                    <Text style={styles.emptyText}>Loading students…</Text>
                ) : (
                    <FlatList
                        data={filtered}
                        renderItem={({ item }) => <StudentCard item={item} />}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ paddingBottom: 100 }}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={() => { setRefreshing(true); fetchData(); }}
                            />
                        }
                        ListEmptyComponent={
                            <Text style={styles.emptyText}>
                                {students.length === 0
                                    ? "No students assigned yet.\nParents need to add children in the app."
                                    : "No matching students."}
                            </Text>
                        }
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container:    { flex: 1, backgroundColor: "#f0f4f8" },
    header:       { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
    headerTitle:  { fontSize: 24, fontWeight: "800", color: "#0f172a" },
    headerSub:    { fontSize: 13, color: "#64748b", marginTop: 2 },
    content:      { flex: 1, backgroundColor: "#1e293b", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16 },
    summaryRow:   { flexDirection: "row", justifyContent: "space-between", marginTop: 16, gap: 12 },
    summaryCard:  { flex: 1, flexDirection: "row", alignItems: "center", borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, gap: 8 },
    summaryCount: { fontSize: 18, fontWeight: "800" },
    summaryLabel: { fontSize: 13, fontWeight: "600", color: "#334155" },
    searchSection:{ flexDirection: "row", backgroundColor: "#ffffff", borderRadius: 10, alignItems: "center", paddingHorizontal: 15, marginVertical: 12, height: 48, borderWidth: 1, borderColor: "#e2e8f0" },
    searchInput:  { flex: 1, marginLeft: 10, fontSize: 14 },
    card:         { backgroundColor: "#ffffff", borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.04, shadowOffset: { width: 0, height: 1 }, shadowRadius: 6, elevation: 2 },
    avatarContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#dbeafe", justifyContent: "center", alignItems: "center" },
    infoContainer:{ flex: 1, marginLeft: 12 },
    nameText:     { fontSize: 15, fontWeight: "700", color: "#0f172a" },
    subText:      { fontSize: 12, color: "#64748b", marginTop: 2 },
    statusSection:{ alignItems: "flex-end" },
    statusBadge:  { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
    dot:          { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
    statusText:   { fontSize: 10, fontWeight: "700" },
    emptyText:    { textAlign: "center", marginTop: 40, color: "#94a3b8", fontSize: 15, lineHeight: 24 },
});
