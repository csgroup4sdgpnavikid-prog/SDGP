import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import {
    Bell,
    ChevronDown,
    ChevronUp,
    Navigation,
    Play,
    Square,
} from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Modal,
    PanResponder,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
    Linking,
    Platform,
} from "react-native";
import MapView, { Circle, Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    collection,
    doc,
    getDocs,
    getDoc,
    query,
    where,
    limit,
    setDoc,
    updateDoc,
    serverTimestamp,
} from "firebase/firestore";
import { getIdToken } from "firebase/auth";
import { db, auth } from "../../firebaseConfig";
import { API_BASE_URL } from "../../constants/api";
import { moderateScale, wp } from "../../constants/responsive";

async function getAuthHeaders(): Promise<Record<string, string>> {
    const token = auth.currentUser ? await getIdToken(auth.currentUser) : "";
    return { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Student {
    id: string;           // childId (Firestore doc ID)
    name: string;
    parentId: string;
    parentPhone: string;
    status: "pending" | "picked" | "dropped" | "skipped";
    notified: boolean;
}

interface Stop {
    id: string;           // childId
    stopIndex: number;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    students: Student[];
    school: string;
}

type RouteTab = "pickup" | "dropoff";

// ─── Haversine distance (metres) ─────────────────────────────────────────────

function getDistanceMeters(
    lat1: number, lng1: number,
    lat2: number, lng2: number,
): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Google Directions polyline decoder (no package needed) ──────────────────

function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
    const poly: { latitude: number; longitude: number }[] = [];
    let index = 0, lat = 0, lng = 0;
    while (index < encoded.length) {
        let b: number, shift = 0, result = 0;
        do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
        lat += (result & 1) ? ~(result >> 1) : (result >> 1);
        shift = 0; result = 0;
        do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
        lng += (result & 1) ? ~(result >> 1) : (result >> 1);
        poly.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return poly;
}

interface RouteStep {
    instruction: string;   // plain text (HTML stripped)
    distanceText: string;  // "200 m"
    lat: number;
    lng: number;
    maneuver: string;      // "turn-right", "turn-left", "straight", etc.
}

interface RouteLeg {
    polyline: { latitude: number; longitude: number }[];
    color: "#22C55E" | "#EAB308" | "#EF4444"; // green / yellow / red
    distanceText: string;
    durationText: string;
    stopName: string;
    steps: RouteStep[];
}

function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function getManeuverIcon(maneuver: string): string {
    if (maneuver.includes("right"))      return "↗";
    if (maneuver.includes("left"))       return "↖";
    if (maneuver.includes("uturn"))      return "↩";
    if (maneuver.includes("roundabout")) return "🔄";
    if (maneuver.includes("merge") || maneuver.includes("ramp")) return "↗";
    return "↑";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DriverMap() {
    const insets = useSafeAreaInsets();
    const mapRef = useRef<MapView>(null);
    const locationSubRef = useRef<Location.LocationSubscription | null>(null);

    const [activeTab, setActiveTab] = useState<RouteTab>("pickup");
    const [showStopsList, setShowStopsList] = useState(false);

    // Loaded from Firestore
    const [stops, setStops] = useState<Stop[]>([]);
    const [loadingStops, setLoadingStops] = useState(true);
    const [driverName, setDriverName] = useState("Driver");

    // Driver's current GPS position
    const [driverRegion, setDriverRegion] = useState<{
        latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number;
    } | null>(null);
    const [driverCoords, setDriverCoords] = useState<{ latitude: number; longitude: number } | null>(null);

    // Trip state
    const [tripActive, setTripActive] = useState(false);
    const [tripId, setTripId] = useState<string | null>(null);

    // Per-student done state (keyed by childId)
    const [doneStudents, setDoneStudents] = useState<Record<string, Student["status"]>>({});

    // Proximity alerts already sent (keyed by childId)
    const [notifiedStops, setNotifiedStops] = useState<Record<string, boolean>>({});

    // Child selection modal
    const [showChildSelector, setShowChildSelector] = useState(false);
    const [selectedChildIds, setSelectedChildIds] = useState<Set<string>>(new Set());

    // Proximity toast
    const [proximityToast, setProximityToast] = useState<string | null>(null);
    const toastAnim = useRef(new Animated.Value(0)).current;

    // Route legs (real road routing from Google Directions API)
    const [routeLegs, setRouteLegs] = useState<RouteLeg[]>([]);
    const [currentLegIndex, setCurrentLegIndex] = useState(0);
    const [routeFetching, setRouteFetching] = useState(false);

    // Driving navigation state
    const [driverHeading, setDriverHeading] = useState(0);
    const [driverSpeed, setDriverSpeed] = useState(0);       // m/s
    const [isNavigating, setIsNavigating] = useState(false); // camera-follow mode
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    // Refs mirror state so watchPositionAsync callback always sees current values (stale closure fix)
    const stopsRef = useRef<Stop[]>([]);
    const doneStudentsRef = useRef<Record<string, Student["status"]>>({});
    const notifiedStopsRef = useRef<Record<string, boolean>>({});
    const tripIdRef = useRef<string | null>(null);
    const currentLegIndexRef = useRef(0);
    const currentStepIndexRef = useRef(0);
    const isNavigatingRef = useRef(false);
    const driverHeadingRef = useRef(0);
    const routeLegsRef = useRef<RouteLeg[]>([]);
    const driverCoordsRef = useRef<{ latitude: number; longitude: number } | null>(null);
    const routeRefreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => { stopsRef.current = stops; }, [stops]);
    useEffect(() => { doneStudentsRef.current = doneStudents; }, [doneStudents]);
    useEffect(() => { notifiedStopsRef.current = notifiedStops; }, [notifiedStops]);
    useEffect(() => { tripIdRef.current = tripId; }, [tripId]);
    useEffect(() => { currentLegIndexRef.current = currentLegIndex; }, [currentLegIndex]);
    useEffect(() => { currentStepIndexRef.current = currentStepIndex; }, [currentStepIndex]);
    useEffect(() => { isNavigatingRef.current = isNavigating; }, [isNavigating]);
    useEffect(() => { routeLegsRef.current = routeLegs; }, [routeLegs]);
    useEffect(() => { driverCoordsRef.current = driverCoords; }, [driverCoords]);

    const orderedStops =
        activeTab === "pickup" ? stops : [...stops].reverse();

    const totalStudents = stops.reduce((n, s) => n + s.students.length, 0);
    const doneCount = Object.values(doneStudents).filter(
        (v) => v === "picked" || v === "dropped" || v === "skipped"
    ).length;

    // ── Proximity toast ───────────────────────────────────────────────────────
    const showToast = useCallback((msg: string) => {
        setProximityToast(msg);
        Animated.sequence([
            Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.delay(3500),
            Animated.timing(toastAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start(() => setProximityToast(null));
    }, [toastAnim]);

    // ── Swipe gesture for stop panel ──────────────────────────────────────────
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8,
            onPanResponderRelease: (_, g) => {
                if (g.dy < -30) setShowStopsList(true);
                if (g.dy >  30) setShowStopsList(false);
            },
        }),
    ).current;

    // ── Load stops from Firestore ─────────────────────────────────────────────
    useEffect(() => {
        const loadStops = async () => {
            try {
                const uid = auth.currentUser?.uid;
                if (!uid) return;

                const driverSnap = await getDoc(doc(db, "drivers", uid));
                if (!driverSnap.exists()) return;

                const driverData = driverSnap.data();
                setDriverName(driverData.name || "Driver");

                // Resume in-progress trip on restart
                if (driverData.activeTripId) {
                    const activeQ = query(
                        collection(db, "trips"),
                        where("driverId", "==", uid),
                        where("status", "==", "in_progress"),
                        limit(1)
                    );
                    const activeTripSnap = await getDocs(activeQ);
                    if (!activeTripSnap.empty) {
                        const activeTrip = activeTripSnap.docs[0].data();
                        setTripId(activeTrip.tripId);
                        setTripActive(true);

                        const resumedDone: Record<string, Student["status"]> = {};
                        (activeTrip.stops || []).forEach((s: any) => {
                            if (s.status && s.status !== "pending" && s.childId) {
                                resumedDone[s.childId] = s.status;
                            }
                        });
                        if (Object.keys(resumedDone).length > 0) {
                            setDoneStudents(resumedDone);
                        }
                    }
                }

                const parentIds: string[] = driverData.associatedParentIds || [];

                // Get driver's current GPS position
                let driverLat: number | null = null;
                let driverLng: number | null = null;
                try {
                    const { status } = await Location.requestForegroundPermissionsAsync();
                    if (status === "granted") {
                        const pos = await Location.getCurrentPositionAsync({
                            accuracy: Location.Accuracy.Balanced,
                        });
                        driverLat = pos.coords.latitude;
                        driverLng = pos.coords.longitude;
                        setDriverRegion({
                            latitude: driverLat,
                            longitude: driverLng,
                            latitudeDelta: 0.05,
                            longitudeDelta: 0.05,
                        });
                        setDriverCoords({ latitude: driverLat, longitude: driverLng });
                    }
                } catch {
                    // GPS unavailable
                }

                // Fetch all children subcollections in parallel
                const childrenSnaps = await Promise.all(
                    parentIds.map((pid) => getDocs(collection(db, "parents", pid, "children")))
                );

                // Check today's confirmed absences for all children
                const today = new Date().toISOString().split("T")[0];
                const allChildDocs: { childDoc: any; parentId: string }[] = [];
                for (let i = 0; i < parentIds.length; i++) {
                    for (const childDoc of childrenSnaps[i].docs) {
                        allChildDocs.push({ childDoc, parentId: parentIds[i] });
                    }
                }
                const absenceChecks = await Promise.all(
                    allChildDocs.map(({ childDoc }) =>
                        getDocs(query(
                            collection(db, "absences"),
                            where("childId", "==", childDoc.id),
                            where("date", "==", today),
                            where("status", "==", "confirmed"),
                        ))
                    )
                );

                const missingCoords: string[] = [];
                const loaded: Stop[] = [];
                for (let idx = 0; idx < allChildDocs.length; idx++) {
                    const { childDoc, parentId } = allChildDocs[idx];
                    const c = childDoc.data();
                    // Filter absences by trip type (pickup=morning, dropoff=evening)
                    const currentTripType = activeTab === "pickup" ? "morning" : "evening";
                    const isAbsentForTrip = absenceChecks[idx].docs.some((d: any) => {
                        const t = d.data().absenceType;
                        return t === "full_day"
                            || (t === "morning_only" && currentTripType === "morning")
                            || (t === "evening_only" && currentTripType === "evening");
                    });
                    if (isAbsentForTrip) continue;

                    const lat = c.homeAddress?.lat;
                    const lng = c.homeAddress?.lng;

                    if (!lat || !lng) {
                        missingCoords.push(c.name || childDoc.id);
                        continue;
                    }

                    loaded.push({
                        id: childDoc.id,
                        stopIndex: loaded.length,
                        name: c.name || "Stop",
                        address: c.homeAddress?.address || "Address not set",
                        latitude: lat,
                        longitude: lng,
                        school: c.school || "School",
                        students: [
                            {
                                id: childDoc.id,
                                name: c.name || "Student",
                                parentId,
                                parentPhone: c.parentPhone || "",
                                status: "pending",
                                notified: false,
                            },
                        ],
                    });
                }

                if (missingCoords.length > 0) {
                    Alert.alert(
                        "Missing Addresses",
                        `These children have no home address set and were skipped:\n${missingCoords.join(", ")}\n\nAsk their parents to update their address.`
                    );
                }

                setStops(loaded);

                if (loaded.length > 0) {
                    setTimeout(() => {
                        mapRef.current?.fitToCoordinates(
                            loaded.map((s) => ({ latitude: s.latitude, longitude: s.longitude })),
                            { edgePadding: { top: 120, right: 50, bottom: 320, left: 50 }, animated: true }
                        );
                    }, 500);
                }
            } catch (err) {
                console.error("Error loading stops:", err);
            } finally {
                setLoadingStops(false);
            }
        };
        loadStops();
    }, [activeTab]);

    // ── Google Directions real-road route fetch ───────────────────────────────
    const fetchRealRoute = async (driverLat: number, driverLng: number, stopsInOrder: Stop[]) => {
        if (stopsInOrder.length === 0) return;
        const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

        // Fallback: straight-line legs from driver → each stop (used when API key missing or API fails)
        const buildFallbackLegs = (fromLat: number, fromLng: number, stops: Stop[]): RouteLeg[] => {
            let prevLat = fromLat, prevLng = fromLng;
            return stops.map((stop) => {
                const leg: RouteLeg = {
                    polyline: [
                        { latitude: prevLat, longitude: prevLng },
                        { latitude: stop.latitude, longitude: stop.longitude },
                    ],
                    color: "#22C55E",
                    distanceText: "",
                    durationText: "",
                    stopName: stop.name,
                    steps: [],
                };
                prevLat = stop.latitude;
                prevLng = stop.longitude;
                return leg;
            });
        };

        if (!key) {
            console.warn('[DriverMap] EXPO_PUBLIC_GOOGLE_MAPS_API_KEY missing — using straight-line fallback');
            setRouteLegs(buildFallbackLegs(driverLat, driverLng, stopsInOrder));
            setCurrentLegIndex(0);
            return;
        }

        const origin = `${driverLat},${driverLng}`;
        const last = stopsInOrder[stopsInOrder.length - 1];
        const destination = `${last.latitude},${last.longitude}`;
        const midStops = stopsInOrder.slice(0, -1);
        const waypointsStr = midStops.length > 0
            ? `&waypoints=${midStops.map(s => `${s.latitude},${s.longitude}`).join('|')}`
            : '';

        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}${waypointsStr}&departure_time=now&traffic_model=best_guess&key=${key}`;

        setRouteFetching(true);
        try {
            const res = await fetch(url);
            const data = await res.json();
            if (data.status !== 'OK' || !data.routes?.[0]) {
                console.warn('[DriverMap] Directions API status:', data.status, data.error_message ?? '');
                // Fall back to straight lines so driver still sees something
                setRouteLegs(buildFallbackLegs(driverLat, driverLng, stopsInOrder));
                setCurrentLegIndex(0);
                return;
            }

            const legs: RouteLeg[] = data.routes[0].legs.map((leg: any, i: number) => {
                const allPoints: { latitude: number; longitude: number }[] = [];
                (leg.steps || []).forEach((step: any) => {
                    if (step.polyline?.points) {
                        allPoints.push(...decodePolyline(step.polyline.points));
                    }
                });
                const dur = leg.duration?.value ?? 0;
                const durT = leg.duration_in_traffic?.value ?? dur;
                const ratio = dur > 0 ? durT / dur : 1;
                const color: RouteLeg["color"] = ratio < 1.2 ? "#22C55E" : ratio < 1.5 ? "#EAB308" : "#EF4444";
                const steps: RouteStep[] = (leg.steps || []).map((step: any) => ({
                    instruction: stripHtml(step.html_instructions ?? ''),
                    distanceText: step.distance?.text ?? '',
                    lat: step.end_location?.lat ?? 0,
                    lng: step.end_location?.lng ?? 0,
                    maneuver: step.maneuver ?? 'straight',
                }));
                return {
                    polyline: allPoints,
                    color,
                    distanceText: leg.distance?.text ?? '',
                    durationText: (leg.duration_in_traffic ?? leg.duration)?.text ?? '',
                    stopName: stopsInOrder[i]?.name ?? '',
                    steps,
                };
            });

            setRouteLegs(legs);
            setCurrentLegIndex(0);
        } catch (e) {
            console.warn('[DriverMap] fetchRealRoute error:', e);
            // Still show straight-line fallback on network error
            setRouteLegs(buildFallbackLegs(driverLat, driverLng, stopsInOrder));
            setCurrentLegIndex(0);
        } finally {
            setRouteFetching(false);
        }
    };

    // ── Child selector ────────────────────────────────────────────────────────
    const openChildSelector = () => {
        if (stops.length === 0) {
            Alert.alert("No Students", "No students are assigned to this route yet.");
            return;
        }
        setSelectedChildIds(new Set(stops.map((s) => s.id)));
        setShowChildSelector(true);
    };

    const toggleChildSelection = (childId: string) => {
        setSelectedChildIds((prev) => {
            const next = new Set(prev);
            if (next.has(childId)) next.delete(childId);
            else next.add(childId);
            return next;
        });
    };

    const confirmChildSelection = async () => {
        setShowChildSelector(false);
        await handleStartTrip(Array.from(selectedChildIds));
    };

    // ── Start trip ────────────────────────────────────────────────────────────
    const handleStartTrip = async (selectedIds: string[]) => {
        try {
            const uid = auth.currentUser?.uid;
            if (!uid) return;

            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
                Alert.alert("Permission Required", "Location permission is needed to track your route.");
                return;
            }

            const res = await fetch(`${API_BASE_URL}/api/trips/start`, {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({ driverId: uid, selectedChildIds: selectedIds }),
            });
            const data = await res.json();
            let newTripId: string | null = null;

            if (!res.ok) {
                // If driver already has an active trip, resume it instead of failing
                if (data.error?.includes("already has an active trip") && data.tripId) {
                    newTripId = data.tripId;
                    Alert.alert("Trip Resumed", "You have an existing active trip. Resuming it now.");
                } else {
                    throw new Error(data.error || data.message || "Failed to start trip");
                }
            } else {
                newTripId = data.trip?.tripId || data.tripId || data.data?.tripId || null;
            }

            if (!newTripId) {
                throw new Error("Trip created but no trip ID returned");
            }
            setTripId(newTripId);
            setTripActive(true);

            // Get current position for route origin
            let startLat = driverCoords?.latitude ?? 0;
            let startLng = driverCoords?.longitude ?? 0;
            try {
                const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                startLat = pos.coords.latitude;
                startLng = pos.coords.longitude;
            } catch { /* use last known */ }

            // Fetch real road route from Google Directions
            const stopsForRoute = activeTab === "pickup" ? stopsRef.current : [...stopsRef.current].reverse();
            const selectedStops = stopsForRoute.filter(s => selectedIds.includes(s.id));
            fetchRealRoute(startLat, startLng, selectedStops.length > 0 ? selectedStops : stopsForRoute);

            const sub = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 10000,
                    distanceInterval: 10,
                },
                async (loc) => {
                    const { latitude, longitude } = loc.coords;
                    setDriverCoords({ latitude, longitude });

                    // Update heading and speed
                    const rawHeading = loc.coords.heading ?? -1;
                    const speed = loc.coords.speed ?? 0;
                    const heading = rawHeading >= 0 ? rawHeading : driverHeadingRef.current;
                    if (rawHeading >= 0) driverHeadingRef.current = heading;
                    setDriverHeading(heading);
                    setDriverSpeed(speed > 0 ? speed : 0);

                    await setDoc(doc(db, "locationRecords", uid), {
                        driverId: uid,
                        lat: latitude,
                        lng: longitude,
                        heading,
                        speed,
                        isActive: true,
                        tripId: newTripId,
                        lastUpdated: serverTimestamp(),
                    });

                    // Camera follow in navigation mode (Google Maps driving style)
                    if (isNavigatingRef.current && mapRef.current) {
                        mapRef.current.animateCamera(
                            { center: { latitude, longitude }, heading, pitch: 50, zoom: 17 },
                            { duration: 800 }
                        );
                    }

                    checkProximityForAllStops(latitude, longitude);

                    // Advance turn step when driver within 50m of next step's endpoint
                    const leg = routeLegsRef.current[currentLegIndexRef.current];
                    const nextStep = leg?.steps[currentStepIndexRef.current + 1];
                    if (nextStep) {
                        const distToStep = getDistanceMeters(latitude, longitude, nextStep.lat, nextStep.lng);
                        if (distToStep < 50) {
                            setCurrentStepIndex(prev => prev + 1);
                        }
                    }

                    // Auto-advance leg when driver arrives within 80m of current stop
                    const currentStop = stopsRef.current[currentLegIndexRef.current];
                    if (currentStop) {
                        const dist = getDistanceMeters(latitude, longitude, currentStop.latitude, currentStop.longitude);
                        if (dist < 80) {
                            const nextLegIdx = Math.min(currentLegIndexRef.current + 1, stopsRef.current.length - 1);
                            setCurrentLegIndex(nextLegIdx);
                            setCurrentStepIndex(0);
                            // Re-fetch blue route from current position for remaining stops
                            const remaining = stopsRef.current.slice(nextLegIdx);
                            if (remaining.length > 0) {
                                fetchRealRoute(latitude, longitude, remaining).then(() => {
                                    setCurrentLegIndex(0);
                                    setCurrentStepIndex(0);
                                });
                            }
                        }
                    }
                }
            );
            locationSubRef.current = sub;

            // Periodically re-fetch blue route from driver's current position (every 60s)
            routeRefreshIntervalRef.current = setInterval(async () => {
                const coords = driverCoordsRef.current;
                if (!coords) return;
                const remaining = stopsRef.current.slice(currentLegIndexRef.current);
                if (remaining.length === 0) return;
                await fetchRealRoute(coords.latitude, coords.longitude, remaining);
                setCurrentLegIndex(0);
                setCurrentStepIndex(0);
            }, 60_000);

            Alert.alert("Trip Started", "Parents have been notified that the van is on the way.");
        } catch (err: any) {
            console.error("Start trip error:", err);
            Alert.alert("Error", err.message || "Failed to start trip");
        }
    };

    // ── End trip ──────────────────────────────────────────────────────────────
    const handleEndTrip = async () => {
        Alert.alert("End Trip", "Are you sure you want to end the trip?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "End Trip",
                style: "destructive",
                onPress: async () => {
                    try {
                        const uid = auth.currentUser?.uid;
                        if (!uid) return;

                        locationSubRef.current?.remove();
                        locationSubRef.current = null;

                        if (routeRefreshIntervalRef.current) {
                            clearInterval(routeRefreshIntervalRef.current);
                            routeRefreshIntervalRef.current = null;
                        }

                        await updateDoc(doc(db, "locationRecords", uid), {
                            isActive: false,
                            tripId: null,
                        });

                        if (tripId) {
                            await fetch(`${API_BASE_URL}/api/trips/end`, {
                                method: "POST",
                                headers: await getAuthHeaders(),
                                body: JSON.stringify({ tripId, driverId: uid }),
                            });
                        }

                        setTripActive(false);
                        setTripId(null);
                        setDoneStudents({});
                        setDriverCoords(null);
                        setRouteLegs([]);
                        setCurrentLegIndex(0);
                        setCurrentStepIndex(0);
                        setIsNavigating(false);
                        setDriverHeading(0);
                        setDriverSpeed(0);
                        Alert.alert("Trip Ended", "The route has been completed.");
                    } catch (err: any) {
                        console.error("End trip error:", err);
                        Alert.alert("Error", err.message || "Failed to end trip");
                    }
                },
            },
        ]);
    };

    // ── Proximity check (500m) ────────────────────────────────────────────────
    const checkProximityForAllStops = (driverLat: number, driverLng: number) => {
        stopsRef.current.forEach((stop) => {
            if (notifiedStopsRef.current[stop.id]) return;
            const st = doneStudentsRef.current[stop.id];
            if (st && st !== "pending") return;

            const dist = getDistanceMeters(driverLat, driverLng, stop.latitude, stop.longitude);
            if (dist <= 500) {
                setNotifiedStops((prev) => ({ ...prev, [stop.id]: true }));

                showToast(`Approaching ${stop.name} — parent notified`);

                if (tripIdRef.current) {
                    getAuthHeaders().then(headers =>
                        fetch(`${API_BASE_URL}/api/trips/update-stop`, {
                            method: "POST",
                            headers,
                            body: JSON.stringify({
                                tripId: tripIdRef.current,
                                stopIndex: stop.stopIndex,
                                childId: stop.id,
                                status: "approaching",
                                driverId: auth.currentUser?.uid,
                            }),
                        })
                    ).catch((e) => console.warn("Proximity notify error:", e));
                }
            }
        });
    };

    // ── Mark student picked up / dropped off ──────────────────────────────────
    const markStudentDone = async (
        student: Student,
        stop: Stop,
        action: "picked" | "dropped",
    ) => {
        setDoneStudents((prev) => ({ ...prev, [student.id]: action }));

        try {
            if (!tripId) {
                Alert.alert("Not yet synced", "Start the trip first to sync with the server and notify parents.");
                return;
            }

            await fetch(`${API_BASE_URL}/api/trips/update-stop`, {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({
                    tripId,
                    stopIndex: stop.stopIndex,
                    childId: student.id,
                    status: action,
                    driverId: auth.currentUser?.uid,
                }),
            });
        } catch (err) {
            console.error("Update stop error:", err);
        }
    };

    // ── Navigate to stop — opens Google Maps for turn-by-turn navigation ──────
    const navigateToStop = (stop: Stop) => {
        const url = Platform.select({
            ios: `maps://app?daddr=${stop.latitude},${stop.longitude}`,
            android: `google.navigation:q=${stop.latitude},${stop.longitude}`,
        });
        if (url) {
            Linking.openURL(url).catch(() => {
                // Fallback to Google Maps web URL
                Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${stop.latitude},${stop.longitude}`);
            });
        }
    };

    // ── Cleanup on unmount ────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            locationSubRef.current?.remove();
            if (routeRefreshIntervalRef.current) clearInterval(routeRefreshIntervalRef.current);
            const uid = auth.currentUser?.uid;
            if (uid && tripIdRef.current) {
                updateDoc(doc(db, "locationRecords", uid), { isActive: false }).catch(() => {});
            }
        };
    }, []);

    // ── Re-fetch route when driver switches tabs (pickup ↔ dropoff) ──────────
    useEffect(() => {
        if (!tripActive || !driverCoords) return;
        // Clear refresh interval before re-fetching for the new tab direction
        if (routeRefreshIntervalRef.current) {
            clearInterval(routeRefreshIntervalRef.current);
            routeRefreshIntervalRef.current = null;
        }
        const reversed = activeTab === "dropoff" ? [...stopsRef.current].reverse() : stopsRef.current;
        setRouteLegs([]);
        setCurrentLegIndex(0);
        fetchRealRoute(driverCoords.latitude, driverCoords.longitude, reversed).finally(() => {
            if (routeRefreshIntervalRef.current) clearInterval(routeRefreshIntervalRef.current);
            routeRefreshIntervalRef.current = setInterval(async () => {
                const coords = driverCoordsRef.current;
                if (!coords) return;
                const remaining = stopsRef.current.slice(currentLegIndexRef.current);
                if (remaining.length > 0) {
                    await fetchRealRoute(coords.latitude, coords.longitude, remaining);
                }
            }, 60_000);
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const tabColor = activeTab === "pickup" ? "#2563EB" : "#D97706";
    const tabBg    = activeTab === "pickup" ? "#EFF6FF" : "#FFFBEB";

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <View style={{ flex: 1, backgroundColor: "#F3F4F6" }}>
            <StatusBar style="dark" />

            {/* ── Header ──────────────────────────────────────────────────────── */}
            <View
                style={{
                    backgroundColor: "#fff",
                    paddingTop: insets.top + moderateScale(16),
                    paddingHorizontal: wp(5),
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
                        marginBottom: moderateScale(12),
                    }}
                >
                    <View>
                        <Text style={{ fontSize: moderateScale(22), fontWeight: "800", color: "#111827" }}>
                            {driverName} · Dashboard
                        </Text>
                        <Text style={{ fontSize: moderateScale(14), color: "#6B7280", marginTop: moderateScale(2) }}>
                            {loadingStops
                                ? "Loading stops…"
                                : `${totalStudents} students • ${stops.length} stops`}
                        </Text>
                    </View>

                    {/* Progress badge */}
                    <View
                        style={{
                            backgroundColor: tabBg,
                            paddingHorizontal: moderateScale(12),
                            paddingVertical: moderateScale(6),
                            borderRadius: moderateScale(20),
                            borderWidth: 1,
                            borderColor: tabColor + "55",
                        }}
                    >
                        <Text style={{ fontSize: moderateScale(13), fontWeight: "700", color: tabColor }}>
                            {doneCount}/{totalStudents} done
                        </Text>
                    </View>
                </View>

                {/* Tab Bar */}
                <View style={{ flexDirection: "row", gap: 8 }}>
                    {(["pickup", "dropoff"] as RouteTab[]).map((tab) => {
                        const active = activeTab === tab;
                        const color = tab === "pickup" ? "#2563EB" : "#D97706";
                        return (
                            <TouchableOpacity
                                key={tab}
                                onPress={() => { setActiveTab(tab); setDoneStudents({}); }}
                                style={{
                                    flex: 1,
                                    paddingVertical: 10,
                                    borderRadius: 10,
                                    alignItems: "center",
                                    backgroundColor: active ? color : "#F3F4F6",
                                    marginBottom: 12,
                                }}
                            >
                                <Text style={{ fontWeight: "700", fontSize: 15, color: active ? "#fff" : "#6B7280" }}>
                                    {tab === "pickup" ? "🏠 Pick Up" : "🏫 Drop Off"}
                                </Text>
                                <Text style={{ fontSize: 11, color: active ? "#fff" : "#9CA3AF", marginTop: 2 }}>
                                    {tab === "pickup" ? "Homes → School" : "School → Homes"}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* ── Map ─────────────────────────────────────────────────────────── */}
            <View style={{ flex: 1 }} {...panResponder.panHandlers}>
                <MapView
                    ref={mapRef}
                    provider={PROVIDER_GOOGLE}
                    style={{ flex: 1 }}
                    {...(driverRegion ? { initialRegion: driverRegion } : {})}
                    showsMyLocationButton={false}
                    showsCompass={!isNavigating}
                    loadingEnabled
                >
                    {/* White outline border — Google Maps style */}
                    {routeLegs.map((leg, i) => (
                        <Polyline
                            key={`outline-${i}`}
                            coordinates={leg.polyline}
                            strokeColor="#FFFFFF"
                            strokeWidth={i === currentLegIndex ? 12 : 9}
                            zIndex={i === currentLegIndex ? 1 : 0}
                        />
                    ))}
                    {/* Solid blue route on top */}
                    {routeLegs.map((leg, i) => (
                        <Polyline
                            key={`leg-${i}`}
                            coordinates={leg.polyline}
                            strokeColor={i < currentLegIndex ? "#9CA3AF" : "#4285F4"}
                            strokeWidth={i === currentLegIndex ? 8 : 6}
                            zIndex={i === currentLegIndex ? 2 : 1}
                        />
                    ))}

                    {/* Live connector: driver position → start of active leg's polyline */}
                    {tripActive && driverCoords && routeLegs[currentLegIndex] && (() => {
                        const legPoints = routeLegs[currentLegIndex].polyline;
                        if (legPoints.length === 0) return null;
                        // Only draw connector if driver is more than ~20m from the leg start
                        const gapDist = getDistanceMeters(
                            driverCoords.latitude, driverCoords.longitude,
                            legPoints[0].latitude, legPoints[0].longitude
                        );
                        if (gapDist < 20) return null;
                        return (
                            <Polyline
                                key="live-connector"
                                coordinates={[driverCoords, legPoints[0]]}
                                strokeColor="#4285F4"
                                strokeWidth={4}
                                lineDashPattern={[6, 3]}
                                zIndex={3}
                            />
                        );
                    })()}

                    {/* Direct straight-line fallback: driver → each remaining stop (shown while routeLegs loading) */}
                    {tripActive && driverCoords && routeLegs.length === 0 && orderedStops.length > 0 && (
                        <Polyline
                            key="fallback-line"
                            coordinates={[
                                driverCoords,
                                ...orderedStops.map(s => ({ latitude: s.latitude, longitude: s.longitude })),
                            ]}
                            strokeColor="#4285F4"
                            strokeWidth={6}
                            zIndex={2}
                        />
                    )}

                    {/* 100m zone circle around each stop */}
                    {orderedStops.map((stop) => {
                        const isDoneZone = doneStudents[stop.id] === "picked" || doneStudents[stop.id] === "dropped";
                        return (
                            <Circle
                                key={`zone-${stop.id}`}
                                center={{ latitude: stop.latitude, longitude: stop.longitude }}
                                radius={100}
                                strokeColor={isDoneZone ? "#10B98155" : tabColor + "88"}
                                fillColor={isDoneZone ? "#10B98118" : tabColor + "18"}
                                strokeWidth={2}
                            />
                        );
                    })}

                    {/* 500m proximity circle around driver */}
                    {driverCoords && tripActive && (
                        <Circle
                            center={driverCoords}
                            radius={500}
                            strokeColor={tabColor + "88"}
                            fillColor={tabColor + "18"}
                            strokeWidth={1.5}
                        />
                    )}

                    {/* Custom driver van marker — rotates with heading */}
                    {driverCoords && (
                        <Marker
                            coordinate={driverCoords}
                            anchor={{ x: 0.5, y: 0.5 }}
                            flat
                            rotation={driverHeading}
                            tracksViewChanges={false}
                            zIndex={100}
                        >
                            <View style={{
                                width: moderateScale(44), height: moderateScale(44),
                                alignItems: "center", justifyContent: "center",
                            }}>
                                <View style={{
                                    backgroundColor: "#2563EB",
                                    borderRadius: moderateScale(22),
                                    width: moderateScale(40), height: moderateScale(40),
                                    alignItems: "center", justifyContent: "center",
                                    borderWidth: 3, borderColor: "#fff",
                                    shadowColor: "#000", elevation: 10,
                                    shadowOffset: { width: 0, height: 3 },
                                    shadowOpacity: 0.4, shadowRadius: 5,
                                }}>
                                    <Ionicons name="bus" size={moderateScale(22)} color="#fff" />
                                </View>
                            </View>
                        </Marker>
                    )}

                    {/* Stop markers */}
                    {orderedStops.map((stop, index) => {
                        const studentStatus = doneStudents[stop.id];
                        const isDone = studentStatus === "picked" || studentStatus === "dropped";
                        const isCurrentStop = tripActive && index === currentLegIndex;
                        const markerColor = isDone ? "#10B981" : tabColor;
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
                                            paddingHorizontal: isCurrentStop ? 13 : 10,
                                            paddingVertical: isCurrentStop ? 9 : 7,
                                            borderRadius: 18,
                                            borderWidth: isCurrentStop ? 4 : 3,
                                            borderColor: isCurrentStop ? "#FDE68A" : "#fff",
                                            shadowColor: "#000",
                                            shadowOffset: { width: 0, height: 2 },
                                            shadowOpacity: isCurrentStop ? 0.5 : 0.3,
                                            shadowRadius: isCurrentStop ? 6 : 3,
                                            elevation: isCurrentStop ? 10 : 6,
                                            alignItems: "center",
                                        }}
                                    >
                                        <Text style={{ color: "#fff", fontWeight: "bold", fontSize: isCurrentStop ? 15 : 13 }}>
                                            {isDone ? "✓" : index + 1}
                                        </Text>
                                    </View>
                                    <View
                                        style={{
                                            width: 0, height: 0,
                                            borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8,
                                            borderLeftColor: "transparent", borderRightColor: "transparent",
                                            borderTopColor: markerColor,
                                        }}
                                    />
                                    <Text style={{
                                        fontSize: 10, color: "#374151", fontWeight: "600",
                                        backgroundColor: "#ffffffcc", paddingHorizontal: 4,
                                        borderRadius: 4, marginTop: 2, textAlign: "center",
                                    }}>
                                        {stop.name}
                                    </Text>
                                </View>
                            </Marker>
                        );
                    })}
                </MapView>

                {/* Turn instruction banner — top of map, driving mode only */}
                {tripActive && isNavigating && (() => {
                    const step = routeLegs[currentLegIndex]?.steps?.[currentStepIndex];
                    if (!step) return null;
                    return (
                        <View style={{
                            position: "absolute", top: 12, left: 12, right: 12, zIndex: 20,
                            backgroundColor: "#1A1F36",
                            borderRadius: moderateScale(14),
                            flexDirection: "row",
                            alignItems: "center",
                            paddingHorizontal: moderateScale(14),
                            paddingVertical: moderateScale(12),
                            elevation: 10,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 3 },
                            shadowOpacity: 0.3,
                            shadowRadius: 6,
                        }}>
                            <Text style={{ fontSize: moderateScale(28), marginRight: moderateScale(12) }}>
                                {getManeuverIcon(step.maneuver)}
                            </Text>
                            <View style={{ flex: 1 }}>
                                <Text
                                    style={{ color: "#fff", fontSize: moderateScale(15), fontWeight: "800", lineHeight: 20 }}
                                    numberOfLines={2}
                                >
                                    {step.instruction || "Continue straight"}
                                </Text>
                                {step.distanceText ? (
                                    <Text style={{ color: "#93C5FD", fontSize: moderateScale(12), marginTop: 3 }}>
                                        {step.distanceText}
                                    </Text>
                                ) : null}
                            </View>
                        </View>
                    );
                })()}

                {/* Right-side controls: list toggle + navigation mode toggle */}
                <View style={{ position: "absolute", top: 16, right: 16, gap: 8 }}>
                    <TouchableOpacity
                        onPress={() => setShowStopsList(!showStopsList)}
                        style={{
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
                        {showStopsList
                            ? <ChevronDown size={22} color={tabColor} />
                            : <ChevronUp size={22} color={tabColor} />}
                    </TouchableOpacity>

                    {/* Navigation mode toggle — only when trip active */}
                    {tripActive && (
                        <TouchableOpacity
                            onPress={() => {
                                const next = !isNavigating;
                                setIsNavigating(next);
                                if (!next && stopsRef.current.length > 0) {
                                    // Exit: zoom back to overview of all stops
                                    setTimeout(() => {
                                        mapRef.current?.fitToCoordinates(
                                            stopsRef.current.map(s => ({ latitude: s.latitude, longitude: s.longitude })),
                                            { edgePadding: { top: 120, right: 50, bottom: 320, left: 50 }, animated: true }
                                        );
                                    }, 100);
                                }
                            }}
                            style={{
                                backgroundColor: isNavigating ? "#2563EB" : "#fff",
                                borderRadius: 12,
                                padding: 12,
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.15,
                                shadowRadius: 4,
                                elevation: 5,
                            }}
                        >
                            <Navigation size={22} color={isNavigating ? "#fff" : tabColor} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Speed chip — bottom-left of map */}
                {tripActive && driverSpeed > 0.5 && (
                    <View style={{
                        position: "absolute",
                        bottom: moderateScale(20),
                        left: moderateScale(16),
                        backgroundColor: "rgba(0,0,0,0.72)",
                        borderRadius: moderateScale(12),
                        paddingHorizontal: moderateScale(14),
                        paddingVertical: moderateScale(8),
                        alignItems: "center",
                        minWidth: moderateScale(60),
                        elevation: 6,
                    }}>
                        <Text style={{ color: "#fff", fontSize: moderateScale(22), fontWeight: "800", lineHeight: 26 }}>
                            {Math.round(driverSpeed * 3.6)}
                        </Text>
                        <Text style={{ color: "#9CA3AF", fontSize: moderateScale(10), fontWeight: "600" }}>km/h</Text>
                    </View>
                )}


                {/* Proximity toast */}
                {proximityToast !== null && (
                    <Animated.View
                        style={{
                            position: "absolute",
                            top: 16,
                            left: 16,
                            right: 70,
                            opacity: toastAnim,
                            transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
                            backgroundColor: "#1F2937",
                            borderRadius: 14,
                            paddingHorizontal: 16,
                            paddingVertical: 12,
                            elevation: 10,
                            borderLeftWidth: 4,
                            borderLeftColor: "#10B981",
                        }}
                    >
                        <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600", lineHeight: 18 }}>
                            {proximityToast}
                        </Text>
                    </Animated.View>
                )}
            </View>

            {/* ── Start / End Journey Button ───────────────────────────────────── */}
            {!showStopsList && (
                <View
                    style={{
                        backgroundColor: "#fff",
                        paddingHorizontal: wp(5),
                        paddingTop: moderateScale(10),
                        paddingBottom: insets.bottom + moderateScale(14),
                        borderTopWidth: 1,
                        borderTopColor: "#E5E7EB",
                    }}
                >
                    <TouchableOpacity
                        onPress={() => setShowStopsList(true)}
                        style={{ alignItems: "center", paddingBottom: moderateScale(8) }}
                    >
                        <View style={{ width: moderateScale(36), height: moderateScale(4), backgroundColor: "#D1D5DB", borderRadius: 2, marginBottom: moderateScale(6) }} />
                        <Text style={{ fontSize: moderateScale(12), color: "#9CA3AF", fontWeight: "600" }}>
                            {stops.length} stop{stops.length !== 1 ? "s" : ""} · tap to view
                        </Text>
                    </TouchableOpacity>

                    {/* Live navigation stats — visible when trip is active and route is loaded */}
                    {tripActive && routeLegs[currentLegIndex] && (
                        <View style={{ marginBottom: moderateScale(12) }}>
                            <Text style={{
                                fontSize: moderateScale(10), fontWeight: "700", color: "#9CA3AF",
                                letterSpacing: 1, marginBottom: moderateScale(8), textAlign: "center",
                            }}>
                                NEXT STOP — {routeLegs[currentLegIndex].stopName.toUpperCase()}
                            </Text>
                            <View style={{
                                flexDirection: "row", backgroundColor: "#F9FAFB",
                                borderRadius: moderateScale(12), overflow: "hidden",
                                borderWidth: 1, borderColor: "#E5E7EB",
                            }}>
                                <View style={{ flex: 1, alignItems: "center", paddingVertical: moderateScale(10) }}>
                                    <Text style={{ fontSize: moderateScale(16), fontWeight: "800", color: "#111827" }}>
                                        {routeLegs[currentLegIndex].distanceText || "—"}
                                    </Text>
                                    <Text style={{ fontSize: moderateScale(10), color: "#9CA3AF", marginTop: 2 }}>Distance</Text>
                                </View>
                                <View style={{ width: 1, backgroundColor: "#E5E7EB" }} />
                                <View style={{ flex: 1, alignItems: "center", paddingVertical: moderateScale(10) }}>
                                    <Text style={{ fontSize: moderateScale(16), fontWeight: "800", color: "#111827" }}>
                                        {routeLegs[currentLegIndex].durationText || "—"}
                                    </Text>
                                    <Text style={{ fontSize: moderateScale(10), color: "#9CA3AF", marginTop: 2 }}>ETA</Text>
                                </View>
                                <View style={{ width: 1, backgroundColor: "#E5E7EB" }} />
                                <View style={{ flex: 1, alignItems: "center", paddingVertical: moderateScale(10) }}>
                                    <Text style={{ fontSize: moderateScale(16), fontWeight: "800", color: tabColor }}>
                                        {orderedStops.length - currentLegIndex}
                                    </Text>
                                    <Text style={{ fontSize: moderateScale(10), color: "#9CA3AF", marginTop: 2 }}>Remaining</Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {tripActive && routeFetching && (
                        <Text style={{ textAlign: "center", fontSize: moderateScale(12), color: "#9CA3AF", marginBottom: moderateScale(8) }}>
                            Loading route…
                        </Text>
                    )}

                    {!tripActive ? (
                        <TouchableOpacity
                            onPress={openChildSelector}
                            style={{
                                backgroundColor: "#10B981",
                                borderRadius: moderateScale(14),
                                paddingVertical: moderateScale(16),
                                alignItems: "center",
                                flexDirection: "row",
                                justifyContent: "center",
                                gap: 10,
                                shadowColor: "#10B981",
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.35,
                                shadowRadius: 8,
                                elevation: 6,
                            }}
                        >
                            <Play size={22} color="#fff" fill="#fff" />
                            <Text style={{ color: "#fff", fontWeight: "800", fontSize: moderateScale(17) }}>
                                Start Journey
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            onPress={handleEndTrip}
                            style={{
                                backgroundColor: "#EF4444",
                                borderRadius: moderateScale(14),
                                paddingVertical: moderateScale(16),
                                alignItems: "center",
                                flexDirection: "row",
                                justifyContent: "center",
                                gap: 10,
                                shadowColor: "#EF4444",
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.35,
                                shadowRadius: 8,
                                elevation: 6,
                            }}
                        >
                            <Square size={22} color="#fff" fill="#fff" />
                            <Text style={{ color: "#fff", fontWeight: "800", fontSize: moderateScale(17) }}>
                                End Journey
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* ── Stops Panel ─────────────────────────────────────────────────── */}
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
                        {...panResponder.panHandlers}
                        style={{ paddingTop: moderateScale(12), paddingBottom: moderateScale(4), alignItems: "center" }}
                    >
                        <View style={{ width: moderateScale(40), height: moderateScale(4), backgroundColor: "#D1D5DB", borderRadius: 2 }} />
                    </View>

                    {/* Panel header */}
                    <View
                        style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            paddingHorizontal: wp(5),
                            paddingVertical: moderateScale(12),
                            borderBottomWidth: 1,
                            borderBottomColor: "#F3F4F6",
                        }}
                    >
                        <Text style={{ fontSize: moderateScale(18), fontWeight: "800", color: "#111827" }}>
                            {activeTab === "pickup" ? "🏠 Pick Up Stops" : "🏫 Drop Off Stops"}
                        </Text>
                        <Text style={{ fontSize: moderateScale(12), color: "#9CA3AF" }}>
                            Tap stop to navigate
                        </Text>
                    </View>

                    {loadingStops ? (
                        <View style={{ padding: moderateScale(32), alignItems: "center" }}>
                            <Text style={{ color: "#6B7280", fontSize: moderateScale(15) }}>Loading students…</Text>
                        </View>
                    ) : stops.length === 0 ? (
                        <View style={{ padding: moderateScale(32), alignItems: "center" }}>
                            <Text style={{ color: "#6B7280", fontSize: moderateScale(15), textAlign: "center" }}>
                                No students assigned yet.{"\n"}Ask parents to add their child in the app.
                            </Text>
                        </View>
                    ) : (
                        <ScrollView
                            contentContainerStyle={{
                                paddingHorizontal: wp(4),
                                paddingTop: moderateScale(12),
                                paddingBottom: insets.bottom + moderateScale(24),
                            }}
                        >
                            {orderedStops.map((stop, index) => {
                                const studentStatus = doneStudents[stop.id];
                                const isDone = studentStatus === "picked" || studentStatus === "dropped";
                                const isSkipped = studentStatus === "skipped";
                                const proximityFired = notifiedStops[stop.id];

                                return (
                                    <View
                                        key={stop.id}
                                        style={{
                                            backgroundColor: isDone ? "#F0FDF4" : isSkipped ? "#FFF7ED" : "#F9FAFB",
                                            borderRadius: moderateScale(14),
                                            marginBottom: moderateScale(12),
                                            borderLeftWidth: 4,
                                            borderLeftColor: isDone ? "#10B981" : isSkipped ? "#F59E0B" : tabColor,
                                            overflow: "hidden",
                                        }}
                                    >
                                        {/* Proximity banner */}
                                        {proximityFired && !isDone && !isSkipped && (
                                            <View
                                                style={{
                                                    flexDirection: "row",
                                                    alignItems: "center",
                                                    gap: 5,
                                                    backgroundColor: "#FEF3C7",
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 5,
                                                    borderBottomWidth: 1,
                                                    borderBottomColor: "#FDE68A",
                                                }}
                                            >
                                                <Text style={{ fontSize: 11, fontWeight: "600", color: "#92400E" }}>
                                                    Parent notified — van approaching
                                                </Text>
                                            </View>
                                        )}

                                        {/* Stop header — tap to navigate in-app */}
                                        <TouchableOpacity
                                            onPress={() => navigateToStop(stop)}
                                            style={{
                                                padding: moderateScale(14),
                                                flexDirection: "row",
                                                justifyContent: "space-between",
                                                alignItems: "flex-start",
                                            }}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: moderateScale(4) }}>
                                                    <View
                                                        style={{
                                                            width: moderateScale(22), height: moderateScale(22), borderRadius: moderateScale(11),
                                                            backgroundColor: isDone ? "#10B981" : isSkipped ? "#F59E0B" : tabColor,
                                                            alignItems: "center", justifyContent: "center",
                                                        }}
                                                    >
                                                        <Text style={{ color: "#fff", fontSize: moderateScale(11), fontWeight: "700" }}>
                                                            {isDone ? "✓" : isSkipped ? "–" : index + 1}
                                                        </Text>
                                                    </View>
                                                    <Text style={{ fontSize: moderateScale(16), fontWeight: "700", color: "#111827" }}>
                                                        {stop.name}
                                                    </Text>
                                                </View>
                                                <Text style={{ fontSize: moderateScale(13), color: "#6B7280", marginLeft: moderateScale(28) }}>
                                                    {stop.address}
                                                </Text>
                                                <Text style={{ fontSize: moderateScale(12), color: "#9CA3AF", marginLeft: moderateScale(28), marginTop: moderateScale(2) }}>
                                                    🏫 {stop.school}
                                                </Text>
                                            </View>

                                            {/* Navigate button — zooms map in-app */}
                                            <View
                                                style={{
                                                    flexDirection: "row",
                                                    alignItems: "center",
                                                    gap: 4,
                                                    backgroundColor: tabColor + "18",
                                                    paddingHorizontal: moderateScale(10),
                                                    paddingVertical: moderateScale(6),
                                                    borderRadius: moderateScale(8),
                                                }}
                                            >
                                                <Navigation size={moderateScale(13)} color={tabColor} />
                                                <Text style={{ fontSize: moderateScale(12), fontWeight: "600", color: tabColor }}>Go</Text>
                                            </View>
                                        </TouchableOpacity>

                                        {/* Students list */}
                                        <View style={{ paddingHorizontal: moderateScale(14), paddingBottom: moderateScale(12), gap: 6 }}>
                                            {stop.students.map((student) => {
                                                const sStatus = doneStudents[student.id];
                                                const sDone = sStatus === "picked" || sStatus === "dropped";
                                                const sSkipped = sStatus === "skipped";
                                                return (
                                                    <View
                                                        key={student.id}
                                                        style={{
                                                            flexDirection: "row",
                                                            alignItems: "center",
                                                            justifyContent: "space-between",
                                                            backgroundColor: sDone ? "#DCFCE7" : sSkipped ? "#FEF3C7" : "#fff",
                                                            borderRadius: moderateScale(10),
                                                            paddingVertical: moderateScale(10),
                                                            paddingHorizontal: moderateScale(12),
                                                            borderWidth: 1,
                                                            borderColor: sDone ? "#86EFAC" : sSkipped ? "#FDE68A" : "#E5E7EB",
                                                        }}
                                                    >
                                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                                                            <View
                                                                style={{
                                                                    width: moderateScale(32), height: moderateScale(32), borderRadius: moderateScale(16),
                                                                    backgroundColor: sDone ? "#10B981" : sSkipped ? "#F59E0B" : tabColor + "22",
                                                                    alignItems: "center", justifyContent: "center",
                                                                }}
                                                            >
                                                                <Text style={{ fontSize: moderateScale(14) }}>
                                                                    {sDone ? "✓" : sSkipped ? "–" : "👦"}
                                                                </Text>
                                                            </View>
                                                            <View>
                                                                <Text
                                                                    style={{
                                                                        fontSize: moderateScale(14),
                                                                        fontWeight: "600",
                                                                        color: sDone ? "#065F46" : sSkipped ? "#92400E" : "#111827",
                                                                        textDecorationLine: sSkipped ? "line-through" : "none",
                                                                    }}
                                                                >
                                                                    {student.name}
                                                                </Text>
                                                                {sDone && (
                                                                    <Text style={{ fontSize: moderateScale(11), color: "#059669" }}>
                                                                        {sStatus === "picked" ? "Picked up" : "Dropped off"} · Parent notified ✓
                                                                    </Text>
                                                                )}
                                                                {sSkipped && (
                                                                    <Text style={{ fontSize: moderateScale(11), color: "#D97706" }}>
                                                                        Stop skipped
                                                                    </Text>
                                                                )}
                                                            </View>
                                                        </View>

                                                        {/* Action buttons */}
                                                        {!sDone && !sSkipped && (
                                                            <View style={{ flexDirection: "row", gap: 6 }}>
                                                                <TouchableOpacity
                                                                    onPress={() =>
                                                                        markStudentDone(
                                                                            student, stop,
                                                                            activeTab === "pickup" ? "picked" : "dropped"
                                                                        )
                                                                    }
                                                                    style={{
                                                                        flexDirection: "row",
                                                                        alignItems: "center",
                                                                        gap: 5,
                                                                        backgroundColor: tabColor,
                                                                        paddingHorizontal: moderateScale(10),
                                                                        paddingVertical: moderateScale(7),
                                                                        borderRadius: moderateScale(8),
                                                                    }}
                                                                >
                                                                    <Bell size={moderateScale(13)} color="#fff" />
                                                                    <Text style={{ color: "#fff", fontSize: moderateScale(12), fontWeight: "700" }}>
                                                                        {activeTab === "pickup" ? "Picked Up" : "Dropped Off"}
                                                                    </Text>
                                                                </TouchableOpacity>

                                                                <TouchableOpacity
                                                                    onPress={() =>
                                                                        setDoneStudents((prev) => ({ ...prev, [student.id]: "skipped" }))
                                                                    }
                                                                    style={{
                                                                        paddingHorizontal: moderateScale(10),
                                                                        paddingVertical: moderateScale(7),
                                                                        borderRadius: moderateScale(8),
                                                                        borderWidth: 1,
                                                                        borderColor: "#E5E7EB",
                                                                        backgroundColor: "#F9FAFB",
                                                                    }}
                                                                >
                                                                    <Text style={{ fontSize: moderateScale(12), color: "#6B7280", fontWeight: "600" }}>
                                                                        Skip
                                                                    </Text>
                                                                </TouchableOpacity>
                                                            </View>
                                                        )}
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    </View>
                                );
                            })}
                        </ScrollView>
                    )}
                </View>
            )}

            {/* ── Child Selector Modal ─────────────────────────────────────── */}
            <Modal
                visible={showChildSelector}
                animationType="slide"
                transparent
                onRequestClose={() => setShowChildSelector(false)}
            >
                <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" }}>
                    <View
                        style={{
                            backgroundColor: "#fff",
                            borderTopLeftRadius: moderateScale(24),
                            borderTopRightRadius: moderateScale(24),
                            maxHeight: "80%",
                            paddingBottom: insets.bottom + moderateScale(16),
                        }}
                    >
                        <View style={{ paddingTop: moderateScale(12), alignItems: "center" }}>
                            <View style={{ width: moderateScale(40), height: moderateScale(4), backgroundColor: "#D1D5DB", borderRadius: 2 }} />
                        </View>

                        <View style={{ paddingHorizontal: wp(5), paddingVertical: moderateScale(16), borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
                            <Text style={{ fontSize: moderateScale(18), fontWeight: "800", color: "#111827" }}>
                                Select Children for This Trip
                            </Text>
                            <Text style={{ fontSize: moderateScale(13), color: "#6B7280", marginTop: moderateScale(4) }}>
                                Deselect any children not riding today
                            </Text>
                        </View>

                        <ScrollView contentContainerStyle={{ paddingHorizontal: wp(4), paddingTop: moderateScale(12), paddingBottom: moderateScale(8) }}>
                            {stops.map((stop) => {
                                const isSelected = selectedChildIds.has(stop.id);
                                return (
                                    <TouchableOpacity
                                        key={stop.id}
                                        onPress={() => toggleChildSelection(stop.id)}
                                        style={{
                                            flexDirection: "row",
                                            alignItems: "center",
                                            backgroundColor: isSelected ? "#EFF6FF" : "#F9FAFB",
                                            borderRadius: moderateScale(14),
                                            padding: moderateScale(14),
                                            marginBottom: moderateScale(10),
                                            borderWidth: 1.5,
                                            borderColor: isSelected ? "#3B82F6" : "#E5E7EB",
                                        }}
                                    >
                                        <View
                                            style={{
                                                width: moderateScale(24), height: moderateScale(24), borderRadius: moderateScale(12),
                                                borderWidth: 2,
                                                borderColor: isSelected ? "#3B82F6" : "#D1D5DB",
                                                backgroundColor: isSelected ? "#3B82F6" : "#fff",
                                                alignItems: "center", justifyContent: "center",
                                                marginRight: moderateScale(12),
                                            }}
                                        >
                                            {isSelected && (
                                                <Text style={{ color: "#fff", fontSize: moderateScale(13), fontWeight: "800" }}>✓</Text>
                                            )}
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: moderateScale(15), fontWeight: "700", color: "#111827" }}>
                                                {stop.name}
                                            </Text>
                                            <Text style={{ fontSize: moderateScale(12), color: "#6B7280", marginTop: moderateScale(2) }}>
                                                🏫 {stop.school}
                                            </Text>
                                            <Text style={{ fontSize: moderateScale(12), color: "#9CA3AF", marginTop: moderateScale(1) }}>
                                                📍 {stop.address}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        <View style={{ paddingHorizontal: wp(4), paddingTop: moderateScale(12), gap: 10 }}>
                            <TouchableOpacity
                                onPress={confirmChildSelection}
                                disabled={selectedChildIds.size === 0}
                                style={{
                                    backgroundColor: selectedChildIds.size === 0 ? "#9CA3AF" : "#10B981",
                                    paddingVertical: moderateScale(14),
                                    borderRadius: moderateScale(14),
                                    alignItems: "center",
                                }}
                            >
                                <Text style={{ color: "#fff", fontWeight: "800", fontSize: moderateScale(16) }}>
                                    Start Trip with {selectedChildIds.size} {selectedChildIds.size === 1 ? "Child" : "Children"}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setShowChildSelector(false)}
                                style={{
                                    paddingVertical: moderateScale(12),
                                    borderRadius: moderateScale(14),
                                    alignItems: "center",
                                    borderWidth: 1,
                                    borderColor: "#E5E7EB",
                                }}
                            >
                                <Text style={{ color: "#6B7280", fontWeight: "600", fontSize: moderateScale(15) }}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
