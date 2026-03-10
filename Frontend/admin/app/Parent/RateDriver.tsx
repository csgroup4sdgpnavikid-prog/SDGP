import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import StarRating from "../../components/StarRating";
import RatingCard from "../../components/RatingCard";
import RatingDropdown from "../../components/RatingDropdown";
import { fetchDrivers, submitRating, fetchRatings, canRateDriver } from "../../services/ratingApi";
import { auth } from "../../firebaseConfig";
import { Driver, Rating } from "../../types";

export default function RateDriverScreen() {
  // ── Rate Driver state ─────────────────────────────────────────────
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [rating, setRating] = useState(0);          // single 1–5 star score
  const [comment, setComment] = useState("");
  const [driversLoading, setDriversLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cooldownMsg, setCooldownMsg] = useState<string | null>(null);
  const [cooldownChecking, setCooldownChecking] = useState(false);

  // ── Rating history state ──────────────────────────────────────────
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [filter, setFilter] = useState("");
  const [ratingsLoading, setRatingsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ratingsError, setRatingsError] = useState<string | null>(null);

  const parentId = auth.currentUser?.uid ?? null;

  // Load drivers on mount
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchDrivers();
        setDrivers(data);
      } catch {
        Alert.alert("Error", "Failed to load drivers.");
      } finally {
        setDriversLoading(false);
      }
    })();
  }, []);

  // Reset form + check cooldown when driver picker changes
  useEffect(() => {
    const driver = drivers.find((d) => d.id === selectedId) ?? null;
    setSelectedDriver(driver);
    setRating(0);
    setComment("");
    setCooldownMsg(null);

    if (driver && parentId) {
      setCooldownChecking(true);
      canRateDriver(parentId, driver.id)
        .then((result) => { if (!result.canRate) setCooldownMsg(result.message); })
        .catch(() => {})
        .finally(() => setCooldownChecking(false));
    }
  }, [selectedId, drivers, parentId]);

  // Load rating history
  const loadRatings = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setRatingsLoading(true);
      setRatingsError(null);
      const data = await fetchRatings(filter ? { stars: filter } : undefined);
      setRatings(data);
    } catch {
      setRatingsError("Failed to load ratings.");
    } finally {
      setRatingsLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => { loadRatings(); }, [loadRatings]);

  const handleSubmit = async () => {
    if (!parentId) return Alert.alert("Not logged in", "Please log in first.");
    if (!selectedId) return Alert.alert("Select Driver", "Please select a driver.");
    if (rating === 0) return Alert.alert("No Rating", "Please tap a star to rate the driver.");
    if (!selectedDriver) return;

    try {
      setSubmitting(true);
      await submitRating({
        parentId,
        driverId: selectedId,
        driverName: selectedDriver.name,
        rating,
        comment: comment.trim() || undefined,
      });
      Alert.alert("Thank You!", "Your rating has been submitted.", [
        { text: "OK", onPress: () => loadRatings() },
      ]);
      setRating(0);
      setComment("");
      setSelectedId("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to submit.";
      Alert.alert("Error", message);
    } finally {
      setSubmitting(false);
    }
  };

  // Average across history list
  const avgOverall =
    ratings.length > 0
      ? (ratings.reduce((s, r) => s + (r.overall ?? 0), 0) / ratings.length).toFixed(1)
      : null;

  const submitDisabled =
    !selectedId || rating === 0 || submitting || !!cooldownMsg || cooldownChecking;

  const starLabels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>

      {/* Header */}
      <View style={styles.pageHeader}>
        <Ionicons name="star" size={20} color="#fff" />
        <Text style={styles.pageTitle}>Rate Your Driver</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadRatings(true)}
            colors={["#1a237e"]}
            tintColor="#1a237e"
          />
        }
      >

        {/* ── SECTION 1: RATE ── */}
        <SectionHeader icon="star" title="Rate a Driver" />

        {/* Driver picker */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Select Driver</Text>
          {driversLoading ? (
            <ActivityIndicator color="#1a237e" style={{ marginVertical: 16 }} />
          ) : (
            <View style={styles.pickerBox}>
              <Picker
                selectedValue={selectedId}
                onValueChange={(v) => setSelectedId(String(v))}
                style={styles.picker}
                dropdownIconColor="#1a237e"
              >
                <Picker.Item label="— Select a driver —" value="" />
                {drivers.map((d) => (
                  <Picker.Item
                    key={d.id}
                    label={`${d.name}${d.vanNumber ? `  (${d.vanNumber})` : ""}`}
                    value={d.id}
                  />
                ))}
              </Picker>
            </View>
          )}

          {/* Driver mini-profile */}
          {selectedDriver && (
            <View style={styles.profile}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={26} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.profileName}>{selectedDriver.name}</Text>
                {selectedDriver.vanNumber ? (
                  <View style={styles.profileRow}>
                    <Ionicons name="bus-outline" size={13} color="#555" />
                    <Text style={styles.profileDetail}>  Van: {selectedDriver.vanNumber}</Text>
                  </View>
                ) : null}
                {selectedDriver.route ? (
                  <View style={styles.profileRow}>
                    <Ionicons name="navigate-outline" size={13} color="#555" />
                    <Text style={styles.profileDetail}>  {selectedDriver.route}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          )}

          {/* Cooldown warning */}
          {cooldownChecking && (
            <ActivityIndicator size="small" color="#1a237e" style={{ marginTop: 10 }} />
          )}
          {cooldownMsg && (
            <View style={styles.cooldownBanner}>
              <Ionicons name="time-outline" size={16} color="#b45309" />
              <Text style={styles.cooldownText}> {cooldownMsg}</Text>
            </View>
          )}
        </View>

        {/* Single star rating */}
        {selectedDriver && !cooldownMsg && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Your Rating</Text>
            <View style={styles.starCenter}>
              <StarRating rating={rating} size={38} onRate={setRating} />
              {rating > 0 && (
                <Text style={styles.starLabel}>{starLabels[rating]}</Text>
              )}
            </View>
          </View>
        )}

        {/* Comment */}
        {selectedDriver && !cooldownMsg && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Comment (Optional)</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Share your experience..."
              placeholderTextColor="#bbb"
              multiline
              numberOfLines={3}
              value={comment}
              onChangeText={setComment}
              maxLength={300}
            />
            <Text style={styles.charCount}>{comment.length}/300</Text>
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, submitDisabled && styles.submitBtnOff]}
          onPress={handleSubmit}
          disabled={submitDisabled}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.submitInner}>
              <Ionicons name="checkmark-circle" size={19} color="#fff" />
              <Text style={styles.submitText}>Submit Rating</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* ── SECTION 2: HISTORY ── */}
        <View style={styles.divider} />
        <SectionHeader icon="list" title="Rating History" />

        {/* Stats bar */}
        {!ratingsLoading && ratings.length > 0 && (
          <View style={styles.statsBar}>
            <StatItem number={String(ratings.length)} label="Total Ratings" />
            {avgOverall && <StatItem number={`${avgOverall} ⭐`} label="Avg Rating" />}
          </View>
        )}

        {/* Filter */}
        <RatingDropdown
          selectedValue={filter}
          onChange={setFilter}
          label="Filter by Stars"
        />

        {/* List */}
        {ratingsLoading ? (
          <ActivityIndicator color="#1a237e" style={{ marginVertical: 24 }} />
        ) : ratingsError ? (
          <View style={styles.empty}>
            <Ionicons name="cloud-offline-outline" size={44} color="#ccc" />
            <Text style={styles.emptyText}>{ratingsError}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => loadRatings()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : ratings.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="star-outline" size={44} color="#ccc" />
            <Text style={styles.emptyText}>No ratings yet.</Text>
          </View>
        ) : (
          ratings.map((item, index) => (
            <RatingCard key={item.id ?? String(index)} item={item} />
          ))
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ icon, title }: { icon: any; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={16} color="#1a237e" />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function StatItem({ number, label }: { number: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statNum}>{number}</Text>
      <Text style={styles.statLbl}>{label}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f0f4ff" },

  pageHeader: {
    backgroundColor: "#1a237e",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pageTitle: { fontSize: 18, fontWeight: "700", color: "#fff", marginLeft: 10 },

  scroll: { padding: 14, paddingBottom: 48 },

  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1a237e", marginLeft: 7 },

  divider: { height: 1, backgroundColor: "#dde2f0", marginVertical: 24 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  pickerBox: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, overflow: "hidden" },
  picker: { height: Platform.OS === "ios" ? 140 : 50, color: "#333" },

  profile: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    backgroundColor: "#f0f4ff",
    borderRadius: 10,
    padding: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1a237e",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  profileName: { fontSize: 15, fontWeight: "700", color: "#1a237e", marginBottom: 3 },
  profileRow: { flexDirection: "row", alignItems: "center", marginVertical: 1 },
  profileDetail: { fontSize: 12, color: "#555" },

  cooldownBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  cooldownText: { fontSize: 13, color: "#b45309", flex: 1, flexWrap: "wrap" },

  starCenter: { alignItems: "center", paddingVertical: 10 },
  starLabel: { marginTop: 8, fontSize: 15, fontWeight: "600", color: "#1a237e" },

  commentInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: "#333",
    textAlignVertical: "top",
    minHeight: 72,
  },
  charCount: { textAlign: "right", fontSize: 10, color: "#bbb", marginTop: 3 },

  submitBtn: {
    backgroundColor: "#1a237e",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 4,
  },
  submitBtnOff: { backgroundColor: "#9fa8da" },
  submitInner: { flexDirection: "row", alignItems: "center" },
  submitText: { color: "#fff", fontSize: 15, fontWeight: "700", marginLeft: 7 },

  statsBar: {
    flexDirection: "row",
    backgroundColor: "#1a237e",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    justifyContent: "space-around",
  },
  stat: { alignItems: "center" },
  statNum: { fontSize: 20, fontWeight: "800", color: "#fff" },
  statLbl: { fontSize: 11, color: "#aad4f5", marginTop: 2 },

  empty: { alignItems: "center", paddingVertical: 32 },
  emptyText: { color: "#999", fontSize: 14, marginTop: 10, textAlign: "center" },
  retryBtn: {
    backgroundColor: "#1a237e",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  retryText: { color: "#fff", fontWeight: "600" },
});
