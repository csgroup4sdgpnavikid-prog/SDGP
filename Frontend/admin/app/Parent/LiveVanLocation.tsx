import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from "react-native-maps";
import { useAuth } from "../../context/AuthContext";
import { db, auth } from "../../firebaseConfig";
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  onSnapshot, query, where, arrayUnion,
} from "firebase/firestore";
import { moderateScale, wp } from "../../constants/responsive";

// ─── Decode Google encoded polyline into lat/lng array ────────────────────────
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

// ─── Reusable map-based address picker ───────────────────────────────────────
interface HomeAddress { lat: number; lng: number; address: string; }

function MapPickerModal({
  visible, title, initialAddress, onConfirm, onClose,
}: {
  visible: boolean; title: string; initialAddress?: HomeAddress;
  onConfirm: (addr: HomeAddress) => void; onClose: () => void;
}) {
  const DEFAULT: Region = { latitude: 6.9271, longitude: 79.8612, latitudeDelta: 0.04, longitudeDelta: 0.04 };
  const [pin, setPin] = React.useState<{ lat: number; lng: number } | null>(
    initialAddress ? { lat: initialAddress.lat, lng: initialAddress.lng } : null
  );
  const [region, setRegion] = React.useState<Region>(
    initialAddress
      ? { latitude: initialAddress.lat, longitude: initialAddress.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }
      : DEFAULT
  );
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", padding: moderateScale(12), borderBottomWidth: 1, borderColor: "#E5E7EB" }}>
          <TouchableOpacity onPress={onClose} style={{ marginRight: moderateScale(12) }}>
            <Ionicons name="close" size={moderateScale(24)} color="#111827" />
          </TouchableOpacity>
          <Text style={{ fontSize: moderateScale(16), fontWeight: "700", color: "#111827", flex: 1 }}>{title}</Text>
          {pin && (
            <TouchableOpacity
              onPress={() => onConfirm({ lat: pin.lat, lng: pin.lng, address: `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}` })}
              style={{ backgroundColor: "#3b82f6", paddingHorizontal: moderateScale(14), paddingVertical: moderateScale(8), borderRadius: moderateScale(8) }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: moderateScale(14) }}>Confirm</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={{ textAlign: "center", fontSize: moderateScale(13), color: "#6B7280", padding: moderateScale(8) }}>
          Tap the map to set the drop/pickup location
        </Text>
        <MapView
          style={{ flex: 1 }}
          provider={PROVIDER_GOOGLE}
          initialRegion={region}
          onRegionChangeComplete={setRegion}
          onPress={(e) => {
            const { latitude, longitude } = e.nativeEvent.coordinate;
            if (
              typeof latitude === 'number' && typeof longitude === 'number' &&
              !isNaN(latitude) && !isNaN(longitude) &&
              latitude >= -90 && latitude <= 90 &&
              longitude >= -180 && longitude <= 180
            ) {
              setPin({ lat: latitude, lng: longitude });
            }
          }}
        >
          {pin && <Marker coordinate={{ latitude: pin.lat, longitude: pin.lng }} pinColor="#3b82f6" />}
        </MapView>
      </SafeAreaView>
    </Modal>
  );
}

interface Route {
  id: string;
  name: string;
  area: string;
  schools: string[];
}

interface Driver {
  id: string;
  name: string;
  vehicleNumber: string;
  routeId: string;
  isActive?: boolean;
}

interface VanLocation {
  lat: number;
  lng: number;
  isActive: boolean;
  lastUpdated?: any;
  tripId?: string | null;
}

interface StopInfo {
  stopsAway: number | null;
  totalStops: number;
}

export default function LiveVanLocation() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [driverStatus, setDriverStatus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  // Add child form
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("");
  const [childSchool, setChildSchool] = useState("");
  const [childGrade, setChildGrade] = useState("");
  const [childPhone, setChildPhone] = useState("");
  const [homeAddress, setHomeAddress] = useState<HomeAddress | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  // Live map
  const [vanLocation, setVanLocation] = useState<VanLocation | null>(null);
  const [assignedDriverId, setAssignedDriverId] = useState<string | null>(null);
  const [assignedDriverName, setAssignedDriverName] = useState("");
  const [stopInfo, setStopInfo] = useState<StopInfo>({ stopsAway: null, totalStops: 0 });
  const [secondsAgo, setSecondsAgo] = useState<number | null>(null);
  const [childOnTrip, setChildOnTrip] = useState<boolean | null>(null); // null = no active trip
  const [childServed, setChildServed] = useState(false); // true when child has been picked/dropped this trip
  const [childServedStatus, setChildServedStatus] = useState<'picked' | 'dropped' | null>(null);
  const [childLocation, setChildLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [roadRoute, setRoadRoute] = useState<{ latitude: number; longitude: number }[]>([]);

  // Refs
  const mapRef = useRef<MapView>(null);
  const locationUnsubRef = useRef<(() => void) | null>(null);
  const tripUnsubRef = useRef<(() => void) | null>(null);
  const currentTripIdRef = useRef<string | null>(null);
  const lastUpdatedRef = useRef<Date | null>(null);
  const driverStatusUnsubsRef = useRef<(() => void)[]>([]);

  // On mount — check if parent already has assigned driver
  useEffect(() => {
    if (!user) return;
    checkExistingAssignment();
    loadRoutes();
  }, [user]);

  // Animate map to follow van as it moves
  useEffect(() => {
    if (!vanLocation || !mapRef.current) return;
    mapRef.current.animateToRegion({
      latitude: vanLocation.lat,
      longitude: vanLocation.lng,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }, 800);
  }, [vanLocation]);

  // Tick "Updated X seconds ago" every second
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastUpdatedRef.current) {
        setSecondsAgo(Math.round((Date.now() - lastUpdatedRef.current.getTime()) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch real road route from van to child whenever van moves
  useEffect(() => {
    if (!vanLocation?.lat || !childLocation) return;
    const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) {
      // Fallback: straight line
      setRoadRoute([
        { latitude: vanLocation.lat, longitude: vanLocation.lng },
        { latitude: childLocation.lat, longitude: childLocation.lng },
      ]);
      return;
    }
    const origin = `${vanLocation.lat},${vanLocation.lng}`;
    const dest = `${childLocation.lat},${childLocation.lng}`;
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${dest}&key=${key}`;
    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (data.status === "OK" && data.routes?.[0]) {
          const points: { latitude: number; longitude: number }[] = [];
          data.routes[0].legs.forEach((leg: any) => {
            (leg.steps || []).forEach((step: any) => {
              if (step.polyline?.points) {
                points.push(...decodePolyline(step.polyline.points));
              }
            });
          });
          if (points.length > 0) {
            setRoadRoute(points);
            return;
          }
        }
        // Fallback
        setRoadRoute([
          { latitude: vanLocation.lat, longitude: vanLocation.lng },
          { latitude: childLocation.lat, longitude: childLocation.lng },
        ]);
      })
      .catch(() => {
        setRoadRoute([
          { latitude: vanLocation.lat, longitude: vanLocation.lng },
          { latitude: childLocation.lat, longitude: childLocation.lng },
        ]);
      });
  }, [vanLocation?.lat, vanLocation?.lng, childLocation]);

  // Cleanup listeners on unmount
  useEffect(() => {
    return () => {
      if (locationUnsubRef.current) locationUnsubRef.current();
      if (tripUnsubRef.current) tripUnsubRef.current();
      driverStatusUnsubsRef.current.forEach(fn => fn());
    };
  }, []);

  const checkExistingAssignment = async () => {
    try {
      const snap = await getDoc(doc(db, "parents", user!.uid));
      if (snap.exists()) {
        const data = snap.data();
        if (data.assignedDriverId) {
          setAssignedDriverId(data.assignedDriverId);
          const driverSnap = await getDoc(doc(db, "drivers", data.assignedDriverId));
          if (driverSnap.exists()) {
            setAssignedDriverName(driverSnap.data().name || "Driver");
          }
          setStep(4);
          subscribeToLocation(data.assignedDriverId);

          // Fetch first child's home location for map display
          const childrenSnap = await getDocs(collection(db, "parents", user!.uid, "children"));
          if (!childrenSnap.empty) {
            const childData = childrenSnap.docs[0].data();
            if (childData.homeAddress?.lat && childData.homeAddress?.lng) {
              setChildLocation({ lat: childData.homeAddress.lat, lng: childData.homeAddress.lng });
            }
          }
        }
      }
    } catch (err) {
      console.error("Error checking assignment:", err);
    }
  };

  const loadRoutes = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "routes"));
      setRoutes(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error loading routes:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadDriversForRoute = async (routeId: string) => {
    // Cancel any existing driver status listeners before subscribing to new ones
    driverStatusUnsubsRef.current.forEach(fn => fn());
    driverStatusUnsubsRef.current = [];

    setLoading(true);
    try {
      const q = query(collection(db, "drivers"), where("routeId", "==", routeId));
      const snap = await getDocs(q);
      const driverList: Driver[] = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      setDrivers(driverList);

      driverList.forEach((driver) => {
        const unsub = onSnapshot(doc(db, "locationRecords", driver.id), (locSnap: any) => {
          setDriverStatus((prev) => ({
            ...prev,
            [driver.id]: locSnap.exists() && locSnap.data().isActive === true,
          }));
        });
        driverStatusUnsubsRef.current.push(unsub);
      });
    } catch (err) {
      console.error("Error loading drivers:", err);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToLocation = (driverId: string) => {
    if (locationUnsubRef.current) locationUnsubRef.current();

    const unsub = onSnapshot(doc(db, "locationRecords", driverId), (snap: any) => {
      if (snap.exists()) {
        const data = snap.data();
        setVanLocation(data as VanLocation);

        // Capture lastUpdated for "X seconds ago" ticker
        if (data.lastUpdated?.toDate) {
          lastUpdatedRef.current = data.lastUpdated.toDate();
          setSecondsAgo(0);
        }

        // Subscribe to active trip (switches listener when tripId changes)
        const newTripId = data.tripId;
        if (newTripId && newTripId !== currentTripIdRef.current) {
          currentTripIdRef.current = newTripId;
          if (tripUnsubRef.current) tripUnsubRef.current();

          tripUnsubRef.current = onSnapshot(doc(db, "trips", newTripId), (tripSnap: any) => {
            if (!tripSnap.exists()) return;
            const stops = tripSnap.data().stops || [];
            const myStop = stops.find((s: any) => s.parentId === user!.uid);

            // Child has been picked up or dropped off — stop receiving location for this parent
            if (myStop && (myStop.status === 'picked' || myStop.status === 'dropped')) {
              setChildOnTrip(false);
              setChildServed(true);
              setChildServedStatus(myStop.status);
              setStopInfo({ stopsAway: null, totalStops: stops.length });
              // Unsubscribe from live location — this parent no longer needs it
              if (locationUnsubRef.current) {
                locationUnsubRef.current();
                locationUnsubRef.current = null;
              }
              return;
            }

            setChildOnTrip(!!myStop);
            if (!myStop) {
              setStopInfo({ stopsAway: null, totalStops: stops.length });
              return;
            }
            const myIndex = stops.indexOf(myStop);
            const currentIndex = stops.findIndex((s: any) => s.status === "pending");
            setStopInfo({
              stopsAway: Math.max(0, myIndex - (currentIndex === -1 ? stops.length : currentIndex)),
              totalStops: stops.length,
            });
          });
        }

        if (!newTripId) {
          if (tripUnsubRef.current) {
            tripUnsubRef.current();
            tripUnsubRef.current = null;
          }
          currentTripIdRef.current = null;
          setChildOnTrip(null);
          setChildServed(false);
          setChildServedStatus(null);
          setStopInfo({ stopsAway: null, totalStops: 0 });
        }
      } else {
        setVanLocation(null);
        setChildOnTrip(null);
      }
    });
    locationUnsubRef.current = unsub;
  };

  const handleSelectRoute = (route: Route) => {
    setSelectedRoute(route);
    loadDriversForRoute(route.id);
    setStep(2);
  };

  const handleSelectDriver = (driver: Driver) => {
    setSelectedDriver(driver);
    setStep(3);
  };

  const handleAssignChild = async () => {
    if (!childName || !childSchool) {
      Alert.alert("Error", "Child name and school are required");
      return;
    }
    if (!homeAddress) {
      Alert.alert("Location Required", "Please set the drop/pickup location on the map.");
      return;
    }
    if (!selectedDriver || !selectedRoute) return;
    setSaving(true);
    try {
      const parentId = auth.currentUser!.uid;

      await addDoc(collection(db, "parents", parentId, "children"), {
        name: childName,
        age: parseInt(childAge) || 0,
        school: childSchool,
        grade: childGrade,
        driverId: selectedDriver.id,
        isAbsent: false,
        photoUrl: null,
        parentId,
        parentPhone: childPhone.trim() || "",
        homeAddress,
        createdAt: new Date().toISOString(),
      });

      await updateDoc(doc(db, "parents", parentId), {
        assignedDriverId: selectedDriver.id,
        routeId: selectedRoute.id,
      });

      await updateDoc(doc(db, "drivers", selectedDriver.id), {
        associatedParentIds: arrayUnion(parentId),
      });

      setAssignedDriverId(selectedDriver.id);
      setAssignedDriverName(selectedDriver.name);
      if (homeAddress) setChildLocation({ lat: homeAddress.lat, lng: homeAddress.lng });
      subscribeToLocation(selectedDriver.id);
      setStep(4);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to assign child");
    } finally {
      setSaving(false);
    }
  };

  // ─── Step 1: Route Selection ───
  if (step === 1) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Select Route</Text>
          <Text style={styles.headerSub}>Choose the route your child's van uses</Text>
        </View>
        {loading ? (
          <ActivityIndicator style={{ marginTop: moderateScale(40) }} color="#3b82f6" />
        ) : routes.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="map-outline" size={moderateScale(56)} color="#D1D5DB" />
            <Text style={styles.emptyText}>No routes available</Text>
            <Text style={styles.emptySub}>Contact your school admin to set up routes</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.listContent}>
            {routes.map((route) => (
              <TouchableOpacity key={route.id} style={styles.card} onPress={() => handleSelectRoute(route)}>
                <View style={styles.cardRow}>
                  <View style={styles.cardIcon}>
                    <Ionicons name="navigate-outline" size={moderateScale(22)} color="#3b82f6" />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{route.name}</Text>
                    <Text style={styles.cardSub}>{route.area}</Text>
                    {route.schools?.length > 0 && (
                      <Text style={styles.cardDetail}>{route.schools.join(" • ")}</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={moderateScale(20)} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  // ─── Step 2: Driver Selection ───
  if (step === 2) {
    return (
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity style={styles.backRow} onPress={() => setStep(1)}>
          <Ionicons name="arrow-back" size={moderateScale(22)} color="#111827" />
          <Text style={styles.backText}>Back to Routes</Text>
        </TouchableOpacity>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Select Driver</Text>
          <Text style={styles.headerSub}>{selectedRoute?.name}</Text>
        </View>
        {loading ? (
          <ActivityIndicator style={{ marginTop: moderateScale(40) }} color="#3b82f6" />
        ) : drivers.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="car-outline" size={moderateScale(56)} color="#D1D5DB" />
            <Text style={styles.emptyText}>No drivers on this route</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.listContent}>
            {drivers.map((driver) => {
              const isActive = driverStatus[driver.id] || false;
              return (
                <TouchableOpacity key={driver.id} style={styles.card} onPress={() => handleSelectDriver(driver)}>
                  <View style={styles.cardRow}>
                    <View style={styles.driverAvatar}>
                      <Ionicons name="person" size={moderateScale(22)} color="#3b82f6" />
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle}>{driver.name}</Text>
                      <Text style={styles.cardSub}>{driver.vehicleNumber || "No plate"}</Text>
                    </View>
                    <View style={[styles.statusPill, isActive ? styles.activePill : styles.offlinePill]}>
                      <View style={[styles.statusDot, isActive ? styles.activeDot : styles.offlineDot]} />
                      <Text style={[styles.statusText, isActive ? styles.activeText : styles.offlineText]}>
                        {isActive ? "On Trip" : "Offline"}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  // ─── Step 3: Add Child ───
  if (step === 3) {
    return (
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity style={styles.backRow} onPress={() => setStep(2)}>
          <Ionicons name="arrow-back" size={moderateScale(22)} color="#111827" />
          <Text style={styles.backText}>Back to Drivers</Text>
        </TouchableOpacity>
        <ScrollView contentContainerStyle={styles.listContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Add Your Child</Text>
            <Text style={styles.headerSub}>Assigning to {selectedDriver?.name}</Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.fieldLabel}>Child Name *</Text>
            <TextInput style={styles.input} placeholder="Enter child's name" value={childName} onChangeText={setChildName} />

            <Text style={styles.fieldLabel}>Age</Text>
            <TextInput style={styles.input} placeholder="Age" keyboardType="numeric" value={childAge} onChangeText={setChildAge} />

            <Text style={styles.fieldLabel}>School *</Text>
            <TextInput style={styles.input} placeholder="School name" value={childSchool} onChangeText={setChildSchool} />

            <Text style={styles.fieldLabel}>Grade / Class</Text>
            <TextInput style={styles.input} placeholder="e.g. Grade 3A" value={childGrade} onChangeText={setChildGrade} />

            <Text style={styles.fieldLabel}>Parent Phone</Text>
            <TextInput style={styles.input} placeholder="e.g. 0771234567" keyboardType="phone-pad" value={childPhone} onChangeText={setChildPhone} />

            <Text style={styles.fieldLabel}>Drop / Pickup Location *</Text>
            <TouchableOpacity
              style={[styles.locationPickerBtn, homeAddress && styles.locationPickerBtnSet]}
              onPress={() => setShowMapPicker(true)}
            >
              <Ionicons
                name={homeAddress ? "location" : "location-outline"}
                size={moderateScale(18)}
                color={homeAddress ? "#059669" : "#F59E0B"}
              />
              <Text style={[styles.locationPickerText, homeAddress && { color: "#059669" }]} numberOfLines={1}>
                {homeAddress ? homeAddress.address : "Tap to set on map ⚠"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, saving && { opacity: 0.6 }]}
              onPress={handleAssignChild}
              disabled={saving}
            >
              <Text style={styles.primaryButtonText}>{saving ? "Saving..." : "Add Child & Start Tracking"}</Text>
            </TouchableOpacity>
          </View>

          <MapPickerModal
            visible={showMapPicker}
            title="Drop / Pickup Location"
            initialAddress={homeAddress ?? undefined}
            onConfirm={(addr) => { setHomeAddress(addr); setShowMapPicker(false); }}
            onClose={() => setShowMapPicker(false)}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Step 4: Live Van Map ───
  return (
    <SafeAreaView style={styles.safe}>
      {/* Map Header */}
      <View style={styles.mapHeader}>
        <View>
          <Text style={styles.mapHeaderTitle}>Live Van Tracking</Text>
          <Text style={styles.mapHeaderSub}>{assignedDriverName}</Text>
        </View>
        <TouchableOpacity
          style={styles.changeButton}
          onPress={() => {
            if (locationUnsubRef.current) { locationUnsubRef.current(); locationUnsubRef.current = null; }
            if (tripUnsubRef.current) { tripUnsubRef.current(); tripUnsubRef.current = null; }
            currentTripIdRef.current = null;
            setAssignedDriverId(null);
            setVanLocation(null);
            setChildOnTrip(null);
            setChildServed(false);
            setChildServedStatus(null);
            setStopInfo({ stopsAway: null, totalStops: 0 });
            setStep(1);
          }}
        >
          <Text style={styles.changeButtonText}>Change</Text>
        </TouchableOpacity>
      </View>

      {/* Status Card */}
      <View style={styles.statusCard}>
        <View style={[styles.statusPill, vanLocation?.isActive ? styles.activePill : styles.offlinePill]}>
          <View style={[styles.statusDot, vanLocation?.isActive ? styles.activeDot : styles.offlineDot]} />
          <Text style={[styles.statusText, vanLocation?.isActive ? styles.activeText : styles.offlineText]}>
            {vanLocation?.isActive ? "Van is on the way" : "Van is offline"}
          </Text>
        </View>

        <View style={styles.statusInfoRow}>
          {stopInfo.stopsAway !== null && vanLocation?.isActive && (
            <Text style={styles.stopsAwayText}>
              {stopInfo.stopsAway === 0
                ? "🏠 Next stop is yours!"
                : `📍 ${stopInfo.stopsAway} stop${stopInfo.stopsAway === 1 ? "" : "s"} away`}
            </Text>
          )}
          {stopInfo.stopsAway !== null && stopInfo.stopsAway > 0 && vanLocation?.isActive && (
            <Text style={styles.etaText}>~{stopInfo.stopsAway * 3} min</Text>
          )}
        </View>

        {secondsAgo !== null && vanLocation?.isActive && (
          <Text style={styles.lastUpdatedText}>Updated {secondsAgo}s ago</Text>
        )}
      </View>

      {/* Map or placeholder */}
      {vanLocation && vanLocation.lat ? (
        <>
          {/* Child was served (picked up or dropped off) — location tracking stopped */}
          {childServed ? (
            <View style={styles.mapPlaceholder}>
              <Ionicons name="checkmark-circle-outline" size={moderateScale(56)} color="#10B981" />
              <Text style={styles.mapPlaceholderText}>
                {childServedStatus === 'dropped' ? 'Child Dropped Off ✓' : 'Child Picked Up ✓'}
              </Text>
              <Text style={styles.mapPlaceholderSub}>Live tracking has ended for your child's stop</Text>
            </View>
          ) : vanLocation.isActive && childOnTrip === false ? (
            /* Van is active but child is absent / not on this trip */
            <View style={styles.mapPlaceholder}>
              <Ionicons name="close-circle-outline" size={moderateScale(56)} color="#D1D5DB" />
              <Text style={styles.mapPlaceholderText}>Your child is not on the van today</Text>
              <Text style={styles.mapPlaceholderSub}>Marked absent or not selected for this trip</Text>
            </View>
          ) : (
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={{
                latitude: vanLocation.lat,
                longitude: vanLocation.lng,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }}
            >
              <Marker coordinate={{ latitude: vanLocation.lat, longitude: vanLocation.lng }}>
                <View style={styles.vanMarker}>
                  <Ionicons name="bus" size={moderateScale(24)} color="#fff" />
                </View>
              </Marker>

              {/* Child home location marker */}
              {childLocation && (
                <Marker coordinate={{ latitude: childLocation.lat, longitude: childLocation.lng }}>
                  <View style={{
                    alignItems: "center",
                  }}>
                    <View style={{
                      backgroundColor: "#EF4444", borderRadius: moderateScale(20),
                      width: moderateScale(36), height: moderateScale(36),
                      alignItems: "center", justifyContent: "center",
                      borderWidth: 3, borderColor: "#fff",
                      shadowColor: "#000", elevation: 8,
                      shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4,
                    }}>
                      <Ionicons name="person" size={moderateScale(18)} color="#fff" />
                    </View>
                    <View style={{
                      width: 0, height: 0,
                      borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8,
                      borderLeftColor: "transparent", borderRightColor: "transparent",
                      borderTopColor: "#EF4444",
                    }} />
                  </View>
                </Marker>
              )}

              {/* Blue road route from van to child */}
              {roadRoute.length > 1 && (
                <>
                  <Polyline
                    coordinates={roadRoute}
                    strokeColor="#FFFFFF"
                    strokeWidth={9}
                    zIndex={0}
                  />
                  <Polyline
                    coordinates={roadRoute}
                    strokeColor="#4285F4"
                    strokeWidth={6}
                    zIndex={1}
                  />
                </>
              )}
            </MapView>
          )}
        </>
      ) : (
        <View style={styles.mapPlaceholder}>
          <Ionicons name="location-outline" size={moderateScale(56)} color="#D1D5DB" />
          <Text style={styles.mapPlaceholderText}>Waiting for van location...</Text>
          <Text style={styles.mapPlaceholderSub}>The van will appear here once the driver starts the trip</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  header: { paddingHorizontal: wp(5), paddingTop: moderateScale(16), paddingBottom: moderateScale(8) },
  headerTitle: { fontSize: moderateScale(22), fontWeight: "700", color: "#111827" },
  headerSub: { fontSize: moderateScale(14), color: "#6B7280", marginTop: moderateScale(2) },
  backRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: wp(4), paddingVertical: moderateScale(12), gap: moderateScale(8),
  },
  backText: { fontSize: moderateScale(15), color: "#111827", fontWeight: "500" },
  listContent: { padding: wp(4), paddingBottom: moderateScale(40) },

  card: {
    backgroundColor: "#F9FAFB", borderRadius: moderateScale(14),
    padding: moderateScale(14), marginBottom: moderateScale(12),
    borderWidth: 1, borderColor: "#E5E7EB",
  },
  cardRow: { flexDirection: "row", alignItems: "center" },
  cardIcon: {
    width: moderateScale(42), height: moderateScale(42), borderRadius: moderateScale(21),
    backgroundColor: "#EFF6FF", justifyContent: "center", alignItems: "center", marginRight: moderateScale(12),
  },
  driverAvatar: {
    width: moderateScale(42), height: moderateScale(42), borderRadius: moderateScale(21),
    backgroundColor: "#DBEAFE", justifyContent: "center", alignItems: "center", marginRight: moderateScale(12),
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: moderateScale(15), fontWeight: "700", color: "#111827" },
  cardSub: { fontSize: moderateScale(13), color: "#6B7280", marginTop: moderateScale(2) },
  cardDetail: { fontSize: moderateScale(12), color: "#9CA3AF", marginTop: moderateScale(2) },

  statusPill: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: moderateScale(4), paddingHorizontal: moderateScale(10),
    borderRadius: moderateScale(20), gap: moderateScale(5),
  },
  activePill: { backgroundColor: "#DCFCE7", borderWidth: 1, borderColor: "#34D399" },
  offlinePill: { backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#D1D5DB" },
  statusDot: { width: moderateScale(7), height: moderateScale(7), borderRadius: moderateScale(4) },
  activeDot: { backgroundColor: "#22C55E" },
  offlineDot: { backgroundColor: "#9CA3AF" },
  statusText: { fontSize: moderateScale(12), fontWeight: "600" },
  activeText: { color: "#065F46" },
  offlineText: { color: "#6B7280" },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: moderateScale(60) },
  emptyText: { fontSize: moderateScale(17), fontWeight: "600", color: "#6B7280", marginTop: moderateScale(12) },
  emptySub: {
    fontSize: moderateScale(13), color: "#9CA3AF", marginTop: moderateScale(4),
    textAlign: "center", paddingHorizontal: wp(8),
  },

  formCard: {
    backgroundColor: "#F0F9FF", borderRadius: moderateScale(16),
    padding: wp(4), borderWidth: 1, borderColor: "#BAE6FD",
  },
  fieldLabel: { fontSize: moderateScale(13), fontWeight: "600", color: "#374151", marginBottom: moderateScale(4) },
  input: {
    borderWidth: 1, borderColor: "#D1D5DB", borderRadius: moderateScale(8),
    padding: moderateScale(10), fontSize: moderateScale(14),
    backgroundColor: "#fff", marginBottom: moderateScale(12),
  },
  primaryButton: {
    backgroundColor: "#3b82f6", paddingVertical: moderateScale(14),
    borderRadius: moderateScale(12), alignItems: "center", marginTop: moderateScale(4),
  },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: moderateScale(15) },

  // Step 4 — map view
  mapHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: wp(5), paddingVertical: moderateScale(14),
    borderBottomWidth: 1, borderBottomColor: "#E5E7EB",
  },
  mapHeaderTitle: { fontSize: moderateScale(18), fontWeight: "700", color: "#111827" },
  mapHeaderSub: { fontSize: moderateScale(13), color: "#6B7280" },
  changeButton: {
    paddingVertical: moderateScale(6), paddingHorizontal: moderateScale(14),
    borderRadius: moderateScale(8), backgroundColor: "#F3F4F6",
  },
  changeButtonText: { fontSize: moderateScale(13), fontWeight: "600", color: "#374151" },

  statusCard: {
    paddingHorizontal: wp(5), paddingVertical: moderateScale(10),
    borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
  },
  statusInfoRow: { flexDirection: "row", alignItems: "center", gap: moderateScale(10), marginTop: moderateScale(6) },
  stopsAwayText: { fontSize: moderateScale(13), color: "#1D4ED8", fontWeight: "600" },
  etaText: { fontSize: moderateScale(13), color: "#6B7280" },
  lastUpdatedText: { fontSize: moderateScale(11), color: "#9CA3AF", marginTop: moderateScale(4) },

  locationPickerBtn: {
    flexDirection: "row", alignItems: "center", gap: moderateScale(8),
    borderWidth: 1, borderColor: "#F59E0B", borderRadius: moderateScale(8),
    padding: moderateScale(10), backgroundColor: "#FFFBEB", marginBottom: moderateScale(12),
  },
  locationPickerBtnSet: { borderColor: "#059669", backgroundColor: "#F0FDF4" },
  locationPickerText: { flex: 1, fontSize: moderateScale(13), color: "#F59E0B", fontWeight: "600" },
  map: { flex: 1 },
  vanMarker: {
    backgroundColor: "#1a237e", borderRadius: moderateScale(20),
    padding: moderateScale(8),
  },
  mapPlaceholder: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: wp(8) },
  mapPlaceholderText: { fontSize: moderateScale(15), color: "#9CA3AF", marginTop: moderateScale(12), textAlign: "center" },
  mapPlaceholderSub: { fontSize: moderateScale(13), color: "#D1D5DB", marginTop: moderateScale(6), textAlign: "center" },
});
