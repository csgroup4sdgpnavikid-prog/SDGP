import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  doc,
  getDocs,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { db, auth } from "../../firebaseConfig";
import RatingCard from "../../components/RatingCard";
import RatingDropdown from "../../components/RatingDropdown";
import StarRating from "../../components/StarRating";
import {
  fetchRatings,
  fetchRoutes,
  fetchDriversByRoute,
  submitRating,
  canRateDriver,
} from "../../services/ratingApi";
import { Driver, Rating, Route } from "../../types";

export default function RateDriverScreen() {
  const parentId = auth.currentUser?.uid ?? null;

  // ── Find Your Driver state ─────────────────────────────────────────
  const [routes, setRoutes] = useState<Route[]>([]);
  const [routesLoading, setRoutesLoading] = useState(true);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [routeDrivers, setRouteDrivers] = useState<Driver[]>([]);
  const [driversLoading, setDriversLoading] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);

  // ── Inline rating state (per driver) ──────────────────────────────
  const [ratingOpenId, setRatingOpenId] = useState<string | null>(null);
  const [driverStars, setDriverStars] = useState<Record<string, number>>({});
const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [cooldownMap, setCooldownMap] = useState<Record<string, string>>({});

  // ── Rating history state ───────────────────────────────────────────
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [filter, setFilter] = useState("");
  const [ratingsLoading, setRatingsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ratingsError, setRatingsError] = useState<string | null>(null);

  // Load routes on mount
  useEffect(() => {
    fetchRoutes()
      .then(setRoutes)
      .catch(() => {})
      .finally(() => setRoutesLoading(false));
  }, []);

  // Load drivers when a route is selected
  useEffect(() => {
    if (!selectedRouteId) {
      setRouteDrivers([]);
      return;
    }
    setDriversLoading(true);
    fetchDriversByRoute(selectedRouteId)
      .then(setRouteDrivers)
      .catch(() => setRouteDrivers([]))
      .finally(() => setDriversLoading(false));
  }, [selectedRouteId]);

  // Load rating history
  const loadRatings = useCallback(
    async (isRefresh = false) => {
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
    },
    [filter]
  );

  useEffect(() => {
    loadRatings();
  }, [loadRatings]);

  // ── Assign driver to all parent's children ────────────────────────
  const handleAssignDriver = (driver: Driver) => {
    if (!parentId) {
      Alert.alert("Not logged in", "Please log in first.");
      return;
    }
    Alert.alert(
      "Confirm Driver",
      `Assign ${driver.name} as your driver?\n\nAll your children will be registered under this driver.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Assign",
          onPress: async () => {
            setAssigning(driver.id);
            try {
              await updateDoc(doc(db, "parents", parentId), {
                assignedDriverId: driver.id,
              });
              await updateDoc(doc(db, "drivers", driver.id), {
                associatedParentIds: arrayUnion(parentId),
              });
              const childrenSnap = await getDocs(
                collection(db, "parents", parentId, "children")
              );
              await Promise.all(
                childrenSnap.docs.map((c) =>
                  updateDoc(c.ref, { driverId: driver.id })
                )
              );
              Alert.alert(
                "Driver Assigned",
                `Your children are now registered with ${driver.name}.`
              );
            } catch {
              Alert.alert("Error", "Assignment failed. Please try again.");
            } finally {
              setAssigning(null);
            }
          },
        },
      ]
    );
  };

  // ── Toggle inline rating panel ────────────────────────────────────
  const toggleRatingPanel = async (driver: Driver) => {
    if (!parentId) {
      Alert.alert("Not logged in", "Please log in first.");
      return;
    }
    // Close if already open
    if (ratingOpenId === driver.id) {
      setRatingOpenId(null);
      return;
    }
    setRatingOpenId(driver.id);
    // Check cooldown
    try {
      const result = await canRateDriver(parentId, driver.id);
      if (!result.canRate) {
        setCooldownMap((prev) => ({ ...prev, [driver.id]: result.message }));
      } else {
        // Clear any stale cooldown message
        setCooldownMap((prev) => {
          const next = { ...prev };
          delete next[driver.id];
          return next;
        });
      }
    } catch {
      // Ignore cooldown check failure — let them try
    }
  };

  // ── Submit inline rating ──────────────────────────────────────────
  const handleSubmitRating = async (driver: Driver) => {
    const stars = driverStars[driver.id] ?? 0;
    if (!parentId) return Alert.alert("Not logged in");
    if (stars === 0) return Alert.alert("No Rating", "Please tap a star to rate the driver.");

    setSubmittingId(driver.id);
    try {
      await submitRating({
        parentId,
        driverId: driver.id,
        driverName: driver.name,
        rating: stars,
      });
      // Clear inputs and close panel
      setDriverStars((prev) => {
        const next = { ...prev };
        delete next[driver.id];
        return next;
      });
      setRatingOpenId(null);
      // Refresh driver list (updated averages) and history
      if (selectedRouteId) {
        fetchDriversByRoute(selectedRouteId).then(setRouteDrivers).catch(() => {});
      }
      loadRatings();
      Alert.alert("Thank You!", "Your rating has been submitted.");
    } catch {
      Alert.alert("Error", "Could not submit rating. Please try again.");
    } finally {
      setSubmittingId(null);
    }
  };

  const avgOverall =
    ratings.length > 0
      ? (ratings.reduce((s, r) => s + (r.overall ?? 0), 0) / ratings.length).toFixed(1)
      : null;

  const selectedRoute = routes.find((r) => r.id === selectedRouteId);

  const starLabels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <View style={styles.pageHeader}>
        <Ionicons name="map" size={20} color="#fff" />
        <Text style={styles.pageTitle}>Find Your Driver</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadRatings(true)}
            colors={["#3b82f6"]}
            tintColor="#3b82f6"
          />
        }
      >
        {/* ── SECTION 1: SELECT ROUTE ── */}
        <SectionHeader icon="navigate" title="Select Your Route" />

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Available Routes</Text>
          {routesLoading ? (
            <ActivityIndicator color="#3b82f6" style={{ marginVertical: 16 }} />
          ) : routes.length === 0 ? (
            <View style={styles.emptySmall}>
              <Ionicons name="map-outline" size={32} color="#ccc" />
              <Text style={styles.emptySmallText}>
                No routes available yet.{"\n"}Contact your administrator.
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.routeGrid}>
              {routes.map((route) => {
                const isSelected = selectedRouteId === route.id;
                return (
                  <TouchableOpacity
                    key={route.id}
                    onPress={() => setSelectedRouteId(isSelected ? null : route.id)}
                    style={[styles.routeCard, isSelected && styles.routeCardSelected]}
                  >
                    <Ionicons
                      name="map-outline"
                      size={20}
                      color={isSelected ? "#fff" : "#3b82f6"}
                    />
                    <Text style={[styles.routeCardName, isSelected && styles.routeCardNameSelected]}>
                      {route.name}
                    </Text>
                    <Text style={[styles.routeCardArea, isSelected && styles.routeCardAreaSelected]}>
                      {route.area}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* ── SECTION 2: DRIVERS ON SELECTED ROUTE ── */}
        {selectedRouteId && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>
              Drivers on {selectedRoute?.name ?? "Route"} — sorted by rating
            </Text>
            {driversLoading ? (
              <ActivityIndicator color="#3b82f6" style={{ marginVertical: 16 }} />
            ) : routeDrivers.length === 0 ? (
              <View style={styles.emptySmall}>
                <Ionicons name="person-outline" size={32} color="#ccc" />
                <Text style={styles.emptySmallText}>
                  No drivers assigned to this route yet.
                </Text>
              </View>
            ) : (
              routeDrivers.map((driver, index) => {
                const hasRating =
                  driver.averageRating &&
                  typeof driver.averageRating.overall === "number";
                const isAssigning = assigning === driver.id;
                const isRatingOpen = ratingOpenId === driver.id;
                const isSubmitting = submittingId === driver.id;
                const cooldown = cooldownMap[driver.id];
                const currentStars = driverStars[driver.id] ?? 0;

                return (
                  <View key={driver.id} style={styles.driverBlock}>
                    {/* ── Driver info row ── */}
                    <View style={styles.driverCard}>
                      <View style={styles.rankBadge}>
                        <Text style={styles.rankText}>{index + 1}</Text>
                      </View>

                      <View style={styles.driverInfo}>
                        <Text style={styles.driverName}>{driver.name}</Text>
                        {driver.vanNumber ? (
                          <View style={styles.driverRow}>
                            <Ionicons name="bus-outline" size={12} color="#64748b" />
                            <Text style={styles.driverDetail}>{"  "}Van: {driver.vanNumber}</Text>
                          </View>
                        ) : null}
                        {hasRating ? (
                          <View style={styles.driverRow}>
                            <StarRating
                              rating={driver.averageRating!.overall}
                              size={13}
                              readonly
                            />
                            <Text style={styles.ratingText}>
                              {"  "}{driver.averageRating!.overall.toFixed(1)}
                              {"  "}
                              <Text style={styles.ratingCount}>
                                ({driver.averageRating!.totalRatings ?? 0} ratings)
                              </Text>
                            </Text>
                          </View>
                        ) : (
                          <Text style={styles.noRatingText}>Not yet rated</Text>
                        )}
                      </View>

                      {/* Action buttons */}
                      <View style={styles.actionBtns}>
                        <TouchableOpacity
                          onPress={() => handleAssignDriver(driver)}
                          disabled={!!assigning}
                          style={[styles.assignBtn, !!assigning && styles.btnOff]}
                        >
                          {isAssigning ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.assignBtnText}>Select</Text>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => toggleRatingPanel(driver)}
                          style={[styles.rateBtn, isRatingOpen && styles.rateBtnActive]}
                        >
                          <Ionicons
                            name={isRatingOpen ? "chevron-up" : "star-outline"}
                            size={14}
                            color={isRatingOpen ? "#3b82f6" : "#3b82f6"}
                          />
                          <Text style={[styles.rateBtnText, isRatingOpen && styles.rateBtnTextActive]}>
                            Rate
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* ── Inline rating panel ── */}
                    {isRatingOpen && (
                      <View style={styles.ratingPanel}>
                        {cooldown ? (
                          <View style={styles.cooldownBanner}>
                            <Ionicons name="time-outline" size={15} color="#3b82f6" />
                            <Text style={styles.cooldownText}> {cooldown}</Text>
                          </View>
                        ) : (
                          <>
                            <Text style={styles.panelLabel}>Tap to rate</Text>
                            <View style={styles.starsRow}>
                              <StarRating
                                rating={currentStars}
                                size={30}
                                onRate={(s) =>
                                  setDriverStars((prev) => ({ ...prev, [driver.id]: s }))
                                }
                              />
                              {currentStars > 0 && (
                                <Text style={styles.starLabel}>
                                  {starLabels[currentStars]}
                                </Text>
                              )}
                            </View>

<TouchableOpacity
                              onPress={() => handleSubmitRating(driver)}
                              disabled={currentStars === 0 || isSubmitting}
                              style={[
                                styles.submitBtn,
                                (currentStars === 0 || isSubmitting) && styles.btnOff,
                              ]}
                            >
                              {isSubmitting ? (
                                <ActivityIndicator color="#fff" />
                              ) : (
                                <View style={styles.submitInner}>
                                  <Ionicons name="checkmark-circle" size={16} color="#fff" />
                                  <Text style={styles.submitText}>Submit Rating</Text>
                                </View>
                              )}
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ── SECTION 3: RATING HISTORY ── */}
        <View style={styles.divider} />
        <SectionHeader icon="list" title="Rating History" />

        {!ratingsLoading && ratings.length > 0 && (
          <View style={styles.statsBar}>
            <StatItem number={String(ratings.length)} label="Total Ratings" />
            {avgOverall && (
              <StatItem number={`${avgOverall} \u2b50`} label="Avg Rating" />
            )}
          </View>
        )}

        <RatingDropdown
          selectedValue={filter}
          onChange={setFilter}
          label="Filter by Stars"
        />

        {ratingsLoading ? (
          <ActivityIndicator color="#3b82f6" style={{ marginVertical: 24 }} />
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

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionHeader({ icon, title }: { icon: any; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={16} color="#3b82f6" />
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

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f0f4f8" },

  pageHeader: {
    backgroundColor: "#0f172a",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pageTitle: { fontSize: 18, fontWeight: "700", color: "#fff", marginLeft: 10 },

  scroll: { padding: 14, paddingBottom: 48 },

  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#3b82f6", marginLeft: 7 },

  divider: { height: 1, backgroundColor: "#e2e8f0", marginVertical: 24 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
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
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },

  // Route grid
  routeGrid: { flexDirection: "row", gap: 10, paddingVertical: 4 },
  routeCard: {
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    width: 130,
    backgroundColor: "#ffffff",
  },
  routeCardSelected: { backgroundColor: "#3b82f6", borderColor: "#3b82f6" },
  routeCardName: { fontSize: 14, fontWeight: "700", color: "#3b82f6", marginTop: 6, textAlign: "center" },
  routeCardNameSelected: { color: "#fff" },
  routeCardArea: { fontSize: 11, color: "#64748b", marginTop: 3, textAlign: "center" },
  routeCardAreaSelected: { color: "#dbeafe" },

  // Driver block (card + panel)
  driverBlock: {
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    marginBottom: 2,
  },
  driverCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 10,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rankText: { fontSize: 13, fontWeight: "700", color: "#3b82f6" },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 14, fontWeight: "700", color: "#0f172a", marginBottom: 3 },
  driverRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  driverDetail: { fontSize: 12, color: "#64748b" },
  ratingText: { fontSize: 12, color: "#334155", fontWeight: "600" },
  ratingCount: { fontSize: 11, color: "#94a3b8", fontWeight: "400" },
  noRatingText: { fontSize: 11, color: "#94a3b8", marginTop: 2 },

  // Action buttons (Assign + Rate)
  actionBtns: { flexDirection: "column", gap: 6, alignItems: "flex-end" },
  assignBtn: {
    backgroundColor: "#3b82f6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    minWidth: 62,
    alignItems: "center",
  },
  assignBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  rateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 62,
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  rateBtnActive: { backgroundColor: "#dbeafe", borderColor: "#3b82f6" },
  rateBtnText: { fontSize: 12, fontWeight: "700", color: "#3b82f6" },
  rateBtnTextActive: { color: "#3b82f6" },
  btnOff: { backgroundColor: "#9CA3AF", borderColor: "#9CA3AF" },

  // Inline rating panel
  ratingPanel: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  panelLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  starsRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  starLabel: { fontSize: 13, fontWeight: "600", color: "#3b82f6", marginLeft: 8 },
  submitBtn: {
    backgroundColor: "#3b82f6",
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  submitInner: { flexDirection: "row", alignItems: "center", gap: 6 },
  submitText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  // Cooldown banner
  cooldownBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    borderRadius: 8,
    padding: 10,
  },
  cooldownText: { fontSize: 13, color: "#f59e0b", flex: 1, flexWrap: "wrap" },

  // Empty states
  emptySmall: { alignItems: "center", paddingVertical: 20 },
  emptySmallText: { color: "#94a3b8", fontSize: 13, marginTop: 8, textAlign: "center", lineHeight: 20 },

  // Stats bar
  statsBar: {
    flexDirection: "row",
    backgroundColor: "#0f172a",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    justifyContent: "space-around",
  },
  stat: { alignItems: "center" },
  statNum: { fontSize: 20, fontWeight: "800", color: "#fff" },
  statLbl: { fontSize: 11, color: "#94a3b8", marginTop: 2 },

  empty: { alignItems: "center", paddingVertical: 32 },
  emptyText: { color: "#94a3b8", fontSize: 14, marginTop: 10, textAlign: "center" },
  retryBtn: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  retryText: { color: "#fff", fontWeight: "600" },
});
