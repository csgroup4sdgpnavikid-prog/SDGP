import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import { useAuth } from "../../context/AuthContext";
import { db, auth } from "../../firebaseConfig";
import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { API_BASE_URL } from "../../constants/api";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// Default centre — Colombo, Sri Lanka
const DEFAULT_REGION: Region = {
  latitude: 6.9271,
  longitude: 79.8612,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

interface HomeAddress {
  lat: number;
  lng: number;
  address: string;
}

interface Child {
  id: string;
  name: string;
  school: string;
  grade: string;
  age: number;
  driverId: string | null;
  isAbsent: boolean;
  homeAddress?: HomeAddress;
}

interface Driver {
  id: string;
  name: string;
  vehicleNumber: string;
  phone: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable Map Picker Modal
// ─────────────────────────────────────────────────────────────────────────────
function MapPickerModal({
  visible,
  title,
  initialAddress,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  title: string;
  initialAddress?: HomeAddress;
  onConfirm: (addr: HomeAddress) => void;
  onClose: () => void;
}) {
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [locating, setLocating] = useState(false);

  // When modal opens, initialise pin from existing address or jump to current GPS
  useEffect(() => {
    if (!visible) return;
    if (initialAddress) {
      const r: Region = {
        latitude: initialAddress.lat,
        longitude: initialAddress.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setRegion(r);
      setPin({ lat: initialAddress.lat, lng: initialAddress.lng });
      setResolvedAddress(initialAddress.address);
    } else {
      jumpToCurrentLocation();
    }
  }, [visible]);

  const jumpToCurrentLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { setLocating(false); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const r: Region = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setRegion(r);
      mapRef.current?.animateToRegion(r, 600);
    } catch {
      // keep default region
    } finally {
      setLocating(false);
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    setGeocoding(true);
    try {
      const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (place) {
        const parts = [place.streetNumber, place.street, place.district ?? place.city, place.region]
          .filter(Boolean)
          .join(", ");
        setResolvedAddress(parts || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      } else {
        setResolvedAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch {
      setResolvedAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setGeocoding(false);
    }
  };

  const handleMapPress = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setPin({ lat: latitude, lng: longitude });
    reverseGeocode(latitude, longitude);
  };

  const handleMarkerDragEnd = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setPin({ lat: latitude, lng: longitude });
    reverseGeocode(latitude, longitude);
  };

  const handleConfirm = () => {
    if (!pin) {
      Alert.alert("No location selected", "Tap on the map to place the pin first.");
      return;
    }
    onConfirm({ lat: pin.lat, lng: pin.lng, address: resolvedAddress });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={mpStyles.container}>
        {/* Header */}
        <View style={mpStyles.header}>
          <TouchableOpacity onPress={onClose} style={mpStyles.closeBtn}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={mpStyles.headerTitle}>{title}</Text>
            <Text style={mpStyles.headerSub}>Tap anywhere on the map to pin the location</Text>
          </View>
          {/* Jump to current location */}
          <TouchableOpacity style={mpStyles.myLocBtn} onPress={jumpToCurrentLocation} disabled={locating}>
            {locating
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="navigate" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>

        {/* Map */}
        <MapView
          ref={mapRef}
          style={mpStyles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={region}
          onPress={handleMapPress}
          showsUserLocation
          showsMyLocationButton={false}
        >
          {pin && (
            <Marker
              coordinate={{ latitude: pin.lat, longitude: pin.lng }}
              draggable
              onDragEnd={handleMarkerDragEnd}
              pinColor="#EF4444"
            />
          )}
        </MapView>

        {/* Crosshair hint overlay when no pin yet */}
        {!pin && (
          <View pointerEvents="none" style={mpStyles.hintOverlay}>
            <View style={mpStyles.hintBox}>
              <Ionicons name="locate-outline" size={20} color="#fff" />
              <Text style={mpStyles.hintText}>Tap the map to place the pin</Text>
            </View>
          </View>
        )}

        {/* Bottom panel */}
        <View style={mpStyles.bottomPanel}>
          {pin ? (
            <>
              <View style={mpStyles.addressRow}>
                <Ionicons name="location" size={18} color="#EF4444" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  {geocoding
                    ? <ActivityIndicator size="small" color="#6B7280" />
                    : <Text style={mpStyles.addressText} numberOfLines={2}>{resolvedAddress}</Text>
                  }
                  <Text style={mpStyles.coordText}>
                    {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
                  </Text>
                </View>
              </View>
              <Text style={mpStyles.dragHint}>Drag the pin to fine-tune the location</Text>
            </>
          ) : (
            <Text style={mpStyles.noSelText}>No location selected yet</Text>
          )}

          <TouchableOpacity
            style={[mpStyles.confirmBtn, (!pin || geocoding) && { opacity: 0.5 }]}
            onPress={handleConfirm}
            disabled={!pin || geocoding}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={mpStyles.confirmBtnText}>Use This Location</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function YourChild() {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Add child form
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("");
  const [childSchool, setChildSchool] = useState("");
  const [childGrade, setChildGrade] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [saving, setSaving] = useState(false);
  const [dropAddress, setDropAddress] = useState<HomeAddress | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);

  // Absence modal
  const [absenceModalChild, setAbsenceModalChild] = useState<Child | null>(null);
  const [absenceType, setAbsenceType] = useState<"full_day" | "morning_only" | "evening_only">("full_day");

  // Edit location modal
  const [editLocationChild, setEditLocationChild] = useState<Child | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const childrenSnap = await getDocs(collection(db, "parents", user!.uid, "children"));
      setChildren(childrenSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })));

      const driversSnap = await getDocs(collection(db, "drivers"));
      setDrivers(driversSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error loading children:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddChild = async () => {
    if (!childName || !childSchool) {
      Alert.alert("Error", "Please fill in child name and school");
      return;
    }
    if (!dropAddress) {
      Alert.alert("Drop Location Required", "Please set the drop/pickup location by tapping 'Pick on Map'.");
      return;
    }
    setSaving(true);
    try {
      const parentId = auth.currentUser!.uid;
      await addDoc(collection(db, "parents", parentId, "children"), {
        name: childName,
        age: parseInt(childAge) || 0,
        school: childSchool,
        grade: childGrade,
        driverId: selectedDriverId || null,
        isAbsent: false,
        photoUrl: null,
        parentId,
        homeAddress: dropAddress,
        createdAt: new Date().toISOString(),
      });

      if (selectedDriverId) {
        await updateDoc(doc(db, "parents", parentId), { assignedDriverId: selectedDriverId });
        await updateDoc(doc(db, "drivers", selectedDriverId), { associatedParentIds: arrayUnion(parentId) });
      }

      setChildName(""); setChildAge(""); setChildSchool("");
      setChildGrade(""); setSelectedDriverId(""); setDropAddress(null);
      setShowAddForm(false);
      await loadData();
      Alert.alert("Success", `${childName} has been added`);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to add child");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEditLocation = async (addr: HomeAddress) => {
    if (!editLocationChild) return;
    setEditSaving(true);
    try {
      await updateDoc(
        doc(db, "parents", user!.uid, "children", editLocationChild.id),
        { homeAddress: addr }
      );
      setEditLocationChild(null);
      await loadData();
      Alert.alert("Updated", "Drop location saved.");
    } catch {
      Alert.alert("Error", "Could not save location.");
    } finally {
      setEditSaving(false);
    }
  };

  const handleMarkAbsent = async (child: Child) => {
    const today = new Date().toISOString().split("T")[0];
    try {
      const res = await fetch(`${API_BASE_URL}/api/absence/mark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentId: user!.uid, childId: child.id,
          driverId: child.driverId, date: today, absenceType, note: null,
        }),
      });
      const json = await res.json();
      if (json.success && json.absenceId) {
        await fetch(`${API_BASE_URL}/api/absence/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parentId: user!.uid, absenceId: json.absenceId }),
        });
      }
      await updateDoc(doc(db, "parents", user!.uid, "children", child.id), { isAbsent: true });
      setAbsenceModalChild(null);
      await loadData();
      Alert.alert("Done", `${child.name} marked as absent`);
    } catch {
      Alert.alert("Error", "Could not mark absence. Please try again.");
    }
  };

  const handleMarkPresent = async (child: Child) => {
    try {
      await updateDoc(doc(db, "parents", user!.uid, "children", child.id), { isAbsent: false });
      await loadData();
    } catch {
      Alert.alert("Error", "Could not update attendance");
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#6B7280" }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Children</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddForm(!showAddForm)}
          >
            <Ionicons name={showAddForm ? "close" : "add"} size={20} color="#fff" />
            <Text style={styles.addButtonText}>{showAddForm ? "Cancel" : "Add Child"}</Text>
          </TouchableOpacity>
        </View>

        {/* ADD CHILD FORM */}
        {showAddForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Add New Child</Text>

            <Text style={styles.fieldLabel}>Child Name *</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="Enter child's name"
                value={childName}
                onChangeText={setChildName}
              />
            </View>

            <Text style={styles.fieldLabel}>Age</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="Age"
                keyboardType="numeric"
                value={childAge}
                onChangeText={setChildAge}
              />
            </View>

            <Text style={styles.fieldLabel}>School *</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="School name"
                value={childSchool}
                onChangeText={setChildSchool}
              />
            </View>

            <Text style={styles.fieldLabel}>Grade / Class</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="e.g. Grade 3A"
                value={childGrade}
                onChangeText={setChildGrade}
              />
            </View>

            {/* DROP LOCATION */}
            <Text style={[styles.fieldLabel, { marginTop: 4 }]}>
              Drop / Pickup Location *
            </Text>
            <TouchableOpacity style={styles.mapPickBtn} onPress={() => setShowMapPicker(true)}>
              <Ionicons name="map" size={18} color="#fff" />
              <Text style={styles.mapPickBtnText}>
                {dropAddress ? "Change Location on Map" : "Pick on Map"}
              </Text>
            </TouchableOpacity>

            {dropAddress && (
              <View style={styles.selectedLocBox}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.selectedLocAddress} numberOfLines={2}>
                    {dropAddress.address}
                  </Text>
                  <Text style={styles.selectedLocCoords}>
                    {dropAddress.lat.toFixed(5)}, {dropAddress.lng.toFixed(5)}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setDropAddress(null)}>
                  <Ionicons name="close-circle" size={18} color="#D1D5DB" />
                </TouchableOpacity>
              </View>
            )}

            {/* Driver */}
            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Assign Driver</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {drivers.map((d) => (
                <TouchableOpacity
                  key={d.id}
                  style={[styles.driverChip, selectedDriverId === d.id && styles.driverChipSelected]}
                  onPress={() => setSelectedDriverId(d.id)}
                >
                  <Text style={[styles.driverChipText, selectedDriverId === d.id && styles.driverChipTextSelected]}>
                    {d.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveButton, saving && { opacity: 0.6 }]}
              onPress={handleAddChild}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Add Child"}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* CHILDREN LIST */}
        {children.length === 0 && !showAddForm ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={56} color="#D1D5DB" />
            <Text style={styles.emptyText}>No children added yet</Text>
            <Text style={styles.emptySubtext}>Tap "Add Child" to get started</Text>
          </View>
        ) : (
          children.map((child) => {
            const assignedDriver = drivers.find((d) => d.id === child.driverId);
            return (
              <View key={child.id} style={styles.childCard}>
                <View style={styles.childCardTop}>
                  <View style={styles.childAvatar}>
                    <Ionicons name="person" size={26} color="#5AA9E6" />
                  </View>
                  <View style={styles.childDetails}>
                    <Text style={styles.childName}>{child.name}</Text>
                    <Text style={styles.childSchool}>{child.school}</Text>
                    {child.grade ? <Text style={styles.childGrade}>{child.grade}</Text> : null}
                  </View>
                  <View style={[styles.statusBadge, child.isAbsent ? styles.absentBadge : styles.presentBadge]}>
                    <Text style={[styles.statusText, child.isAbsent ? styles.absentText : styles.presentText]}>
                      {child.isAbsent ? "Absent" : "Present"}
                    </Text>
                  </View>
                </View>

                {/* Drop location row — tap to edit on map */}
                <TouchableOpacity
                  style={[styles.locationRow, !child.homeAddress && styles.locationRowWarn]}
                  onPress={() => setEditLocationChild(child)}
                >
                  <Ionicons
                    name={child.homeAddress ? "location" : "location-outline"}
                    size={14}
                    color={child.homeAddress ? "#059669" : "#F59E0B"}
                  />
                  <Text style={[styles.locationRowText, !child.homeAddress && { color: "#F59E0B" }]} numberOfLines={1}>
                    {child.homeAddress?.address || "⚠ Drop location not set — tap to add"}
                  </Text>
                  <Ionicons name="map-outline" size={14} color="#9CA3AF" />
                </TouchableOpacity>

                {assignedDriver && (
                  <View style={styles.driverRow}>
                    <Ionicons name="car-outline" size={14} color="#6B7280" />
                    <Text style={styles.driverRowText}>{assignedDriver.name}</Text>
                    <TouchableOpacity onPress={() => Linking.openURL(`tel:${assignedDriver.phone}`)}>
                      <Ionicons name="call-outline" size={16} color="#5AA9E6" />
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.attendanceActions}>
                  {child.isAbsent ? (
                    <TouchableOpacity style={styles.presentButton} onPress={() => handleMarkPresent(child)}>
                      <Text style={styles.presentButtonText}>Mark Present</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.absentButton}
                      onPress={() => { setAbsenceModalChild(child); setAbsenceType("full_day"); }}
                    >
                      <Text style={styles.absentButtonText}>Report Absence</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}

        {/* ABSENCE MODAL */}
        <Modal
          visible={absenceModalChild !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setAbsenceModalChild(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Report Absence</Text>
              <Text style={styles.modalSubtitle}>{absenceModalChild?.name} — Select type</Text>

              {(["full_day", "morning_only", "evening_only"] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.absenceTypeButton, absenceType === type && styles.absenceTypeSelected]}
                  onPress={() => setAbsenceType(type)}
                >
                  <Text style={[styles.absenceTypeText, absenceType === type && styles.absenceTypeTextSelected]}>
                    {type === "full_day" ? "Full Day" : type === "morning_only" ? "Morning Only" : "Evening Only"}
                  </Text>
                </TouchableOpacity>
              ))}

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancelButton} onPress={() => setAbsenceModalChild(null)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmButton}
                  onPress={() => absenceModalChild && handleMarkAbsent(absenceModalChild)}
                >
                  <Text style={styles.modalConfirmText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>

      {/* MAP PICKER — for Add Child form */}
      <MapPickerModal
        visible={showMapPicker}
        title="Set Drop Location"
        initialAddress={dropAddress ?? undefined}
        onConfirm={(addr) => {
          setDropAddress(addr);
          setShowMapPicker(false);
        }}
        onClose={() => setShowMapPicker(false)}
      />

      {/* MAP PICKER — for editing existing child */}
      <MapPickerModal
        visible={editLocationChild !== null}
        title={editLocationChild ? `Drop Location — ${editLocationChild.name}` : "Drop Location"}
        initialAddress={editLocationChild?.homeAddress}
        onConfirm={(addr) => {
          handleSaveEditLocation(addr);
          setEditLocationChild(null);
        }}
        onClose={() => setEditLocationChild(null)}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff", padding: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#111827" },
  addButton: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#5AA9E6",
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, gap: 4,
  },
  addButtonText: { color: "#fff", fontWeight: "600", fontSize: 13 },

  formCard: {
    backgroundColor: "#F0F9FF", borderRadius: 16, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: "#BAE6FD",
  },
  formTitle: { fontSize: 16, fontWeight: "700", color: "#0369A1", marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 4 },
  inputBox: { display: "none" },
  inputText: {},
  inputWrap: { marginBottom: 12 },
  input: {
    borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8,
    padding: 10, fontSize: 14, backgroundColor: "#fff",
  },

  mapPickBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#3B82F6", paddingVertical: 11, borderRadius: 10,
    gap: 8, marginBottom: 10,
  },
  mapPickBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  selectedLocBox: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: "#DCFCE7", borderRadius: 10,
    padding: 10, marginBottom: 4, gap: 2,
  },
  selectedLocAddress: { fontSize: 13, color: "#065F46", fontWeight: "600" },
  selectedLocCoords: { fontSize: 11, color: "#6B7280", marginTop: 2 },

  driverChip: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20,
    borderWidth: 1, borderColor: "#D1D5DB", marginRight: 8, backgroundColor: "#F9FAFB",
  },
  driverChipSelected: { backgroundColor: "#5AA9E6", borderColor: "#5AA9E6" },
  driverChipText: { fontSize: 13, color: "#374151" },
  driverChipTextSelected: { color: "#fff", fontWeight: "600" },
  saveButton: {
    backgroundColor: "#5AA9E6", paddingVertical: 12,
    borderRadius: 10, alignItems: "center", marginTop: 4,
  },
  saveButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  emptyState: { alignItems: "center", paddingVertical: 60 },
  emptyText: { fontSize: 17, fontWeight: "600", color: "#6B7280", marginTop: 12 },
  emptySubtext: { fontSize: 13, color: "#9CA3AF", marginTop: 4 },

  childCard: {
    backgroundColor: "#E8F4FD", borderRadius: 16, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: "#CFE7F7",
  },
  childCardTop: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  childAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#DBEAFE", justifyContent: "center",
    alignItems: "center", marginRight: 10,
  },
  childDetails: { flex: 1 },
  childName: { fontSize: 16, fontWeight: "700", color: "#111827" },
  childSchool: { fontSize: 13, color: "#6B7280" },
  childGrade: { fontSize: 12, color: "#9CA3AF" },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20 },
  presentBadge: { backgroundColor: "#DCFCE7" },
  absentBadge: { backgroundColor: "#FEF2F2" },
  statusText: { fontSize: 12, fontWeight: "600" },
  presentText: { color: "#065F46" },
  absentText: { color: "#991B1B" },

  locationRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#fff", borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 10,
    marginBottom: 8, borderWidth: 1, borderColor: "#D1FAE5",
  },
  locationRowWarn: { borderColor: "#FDE68A", backgroundColor: "#FFFBEB" },
  locationRowText: { flex: 1, fontSize: 12, color: "#374151" },

  driverRow: {
    flexDirection: "row", alignItems: "center",
    gap: 6, marginBottom: 10, paddingLeft: 2,
  },
  driverRowText: { flex: 1, fontSize: 13, color: "#6B7280" },

  attendanceActions: { flexDirection: "row" },
  absentButton: {
    flex: 1, paddingVertical: 9, borderRadius: 8,
    backgroundColor: "#FEE2E2", alignItems: "center",
  },
  absentButtonText: { color: "#DC2626", fontWeight: "600", fontSize: 13 },
  presentButton: {
    flex: 1, paddingVertical: 9, borderRadius: 8,
    backgroundColor: "#DCFCE7", alignItems: "center",
  },
  presentButtonText: { color: "#15803D", fontWeight: "600", fontSize: 13 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: "#fff", borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: "#6B7280", marginBottom: 20 },
  absenceTypeButton: {
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10,
    borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 10, backgroundColor: "#F9FAFB",
  },
  absenceTypeSelected: { backgroundColor: "#EFF6FF", borderColor: "#5AA9E6" },
  absenceTypeText: { fontSize: 15, color: "#374151", fontWeight: "500" },
  absenceTypeTextSelected: { color: "#1D4ED8", fontWeight: "700" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  modalCancelButton: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center",
  },
  modalCancelText: { color: "#6B7280", fontWeight: "600" },
  modalConfirmButton: {
    flex: 2, paddingVertical: 12, borderRadius: 10,
    backgroundColor: "#5AA9E6", alignItems: "center",
  },
  modalConfirmText: { color: "#fff", fontWeight: "700" },
});

// Map Picker Modal styles
const mpStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E5E7EB",
  },
  closeBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  headerSub: { fontSize: 12, color: "#6B7280", marginTop: 1 },
  myLocBtn: {
    backgroundColor: "#3B82F6", width: 38, height: 38,
    borderRadius: 19, justifyContent: "center", alignItems: "center",
  },
  map: { width: SCREEN_W, height: SCREEN_H * 0.52 },
  hintOverlay: {
    position: "absolute",
    top: (SCREEN_H * 0.52) / 2 + 60,
    left: 0, right: 0, alignItems: "center",
    pointerEvents: "none",
  },
  hintBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(0,0,0,0.55)", paddingVertical: 8,
    paddingHorizontal: 16, borderRadius: 20,
  },
  hintText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  bottomPanel: {
    flex: 1, backgroundColor: "#fff",
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32,
  },
  addressRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 4 },
  addressText: { fontSize: 14, fontWeight: "600", color: "#111827" },
  coordText: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  dragHint: { fontSize: 12, color: "#9CA3AF", marginBottom: 16 },
  noSelText: { fontSize: 14, color: "#9CA3AF", marginBottom: 16, textAlign: "center" },
  confirmBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#10B981", paddingVertical: 14, borderRadius: 14, gap: 8,
  },
  confirmBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
