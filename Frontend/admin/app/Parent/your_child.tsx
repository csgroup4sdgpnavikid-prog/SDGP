import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import { Linking, ScrollView } from "react-native";

import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type ChildInfoType = {
  studentName: string;
  school: string;
  routeNumber: string;
  driver: string;
  pickup: string;
  dropoff: string;
  parentContact: string;
};

import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Type definition for child information
type ChildInfoType = {
  studentName: string;
  school: string;
  routeNumber: string;
  driver: string;
  pickup: string;
  dropoff: string;
  parentContact: string;
};
// Parent screen to view and manage child's transport information
export default function YourChild() {
  const navigation = useNavigation();

  const [attendance, setAttendance] = useState<"ABSENT" | "PRESENT" | null>(
    null,
  );

  const confirmAttendance = (type: "ABSENT" | "PRESENT") => {
    Alert.alert("Confirm Attendance", `Are you sure your child is ${type}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "OK", onPress: () => setAttendance(type) },
    ]);
  };

  const [childInfo, setChildInfo] = useState<ChildInfoType>({
    studentName: "Amana",
    school: "Musaeus College",
    routeNumber: "R-05",
    driver: "Mr. Sunil Perera",
    pickup: "123 Main St, Colombo",
    dropoff: "456 Park Ave, Colombo",
    parentContact: "0771234567",
  });

  const [editingField, setEditingField] = useState<keyof ChildInfoType | null>(
    null,
  );
  // ⭐ DRIVER RATING STATE
  const [driverRating, setDriverRating] = useState(0);
  const [lastRatedDate, setLastRatedDate] = useState<Date | null>(null);
  const [canRateDriver, setCanRateDriver] = useState(true);

  const checkDriverRatingEligibility = () => {
    if (!lastRatedDate) {
      setCanRateDriver(true);
      return;
    }
    const now = new Date();
    const diffDays =
      (now.getTime() - lastRatedDate.getTime()) / (1000 * 60 * 60 * 24);
    setCanRateDriver(diffDays >= 90);
  };

  const submitDriverRating = useCallback((value: number) => {
    if (!canRateDriver) return;
    setDriverRating(value);
    setLastRatedDate(new Date());
    setCanRateDriver(false);
    Alert.alert("Thank you", `You rated the driver ${value} stars`);
    // TODO: save to database here
  }, [canRateDriver]);

  const handleStarPress = useCallback(
    (star: number) => {
      submitDriverRating(star);
    },
    [submitDriverRating],
  );

  useEffect(() => {
    checkDriverRatingEligibility();
  }, [lastRatedDate]);

  const InfoRow = ({
    label,
    field,
    editable = true,
  }: {
    label: string;
    field: keyof ChildInfoType;
    editable?: boolean;
  }) => {
    const isEditing = editingField === field;

    return (
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>

        {isEditing ? (
          <TextInput
            style={styles.input}
            value={childInfo[field]}
            onChangeText={(text) =>
              setChildInfo({ ...childInfo, [field]: text })
            }
            onBlur={() => setEditingField(null)}
            autoFocus
          />
        ) : (
          <View style={styles.valueRow}>
            <Text style={styles.infoValue}>{childInfo[field]}</Text>

            {editable && (
              <TouchableOpacity onPress={() => setEditingField(field)}>
                <Ionicons name="create-outline" size={18} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  // Confirm attendance before updating state
  const confirmAttendance = (type: "ABSENT" | "PRESENT") => {
    Alert.alert("Confirm Attendance", `Are you sure your child is ${type}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "OK", onPress: () => setAttendance(type) },
    ]);
  };

  // State storing editable child information
  const [childInfo, setChildInfo] = useState<ChildInfoType>({
    studentName: "Amana",
    school: "Musaeus College",
    routeNumber: "R-05",
    driver: "Mr. Sunil Perera",
    pickup: "123 Main St, Colombo",
    dropoff: "456 Park Ave, Colombo",
    parentContact: "0771234567",
  });

  // Track which field is currently being edited
  const [editingField, setEditingField] = useState<keyof ChildInfoType | null>(
    null
  );

  const InfoRow = ({
    label,
    field,
    editable = true,
  }: {
    label: string;
    field: keyof ChildInfoType;
    editable?: boolean;
  }) => {
    const isEditing = editingField === field;

    return (
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>

        {isEditing ? (
          <TextInput
            style={styles.input}
            value={childInfo[field]}
            onChangeText={(text) =>
              setChildInfo({ ...childInfo, [field]: text })
            }
            onBlur={() => setEditingField(null)}
            autoFocus
          />
        ) : (
          <View style={styles.valueRow}>
            <Text style={styles.infoValue}>{childInfo[field]}</Text>

            {editable && (
              <TouchableOpacity onPress={() => setEditingField(field)}>
                <Ionicons name="create-outline" size={18} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Your Child</Text>
      </View>

      {/* CHILD CARD */}
      <View style={styles.childCard}>
        <View style={styles.topRow}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={28} color="#444" />
          </View>

          <View>
            <Text style={styles.attendanceTitle}>Attendance</Text>

            <View style={styles.attendanceRow}>
              <TouchableOpacity
                style={[
                  styles.attendanceButton,
                  attendance === "ABSENT" && styles.absentActive,
                ]}
                onPress={() => confirmAttendance("ABSENT")}
              >
                <Text style={styles.attendanceText}>ABSENT</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.attendanceButton,
                  attendance === "PRESENT" && styles.presentActive,
                ]}
                onPress={() => confirmAttendance("PRESENT")}
              >
                <Text style={styles.attendanceText}>PRESENT</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 12 }}>
          <Text style={styles.childName}>{childInfo.studentName}</Text>
          <Text style={styles.schoolName}>{childInfo.school}</Text>
        </View>
      </View>

      {/* PROFILE / INFO CARD */}
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Child Information</Text>

        <InfoRow label="Student Name" field="studentName" />
        <InfoRow label="School" field="school" />
        <InfoRow label="Assign route Number" field="routeNumber" editable={false} />
        <InfoRow label="Assigned Driver" field="driver" editable={false} />
        <InfoRow label="Pickup Location" field="pickup" />
        <InfoRow label="Drop-off Location" field="dropoff" />
        <InfoRow label="Parent Contact" field="parentContact" />
      </View>

      {/* DRIVER CARD */}
      <View style={styles.driverCard}>
        <Text style={styles.driverTitle}>Assigned Driver</Text>
        <Text style={styles.driverName}>{childInfo.driver}</Text>
        <Text style={styles.driverInfo}>Vehicle: Van</Text>
        {/* replace with real data */}
        <Text style={styles.driverInfo}>Number: WP R-1234</Text>
      

        {/* replace with real data */}
        <TouchableOpacity
          style={styles.callButton}
          onPress={() => Linking.openURL(`tel:0779876543`)} // replace with real driver phone
        >
          <Text style={styles.callText}>Call Driver</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 16,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginLeft: 12,
  },

  childCard: {
    backgroundColor: "#E8F4FD",
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#CFE7F7",
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#D9EFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  childName: {
    fontSize: 18,
    fontWeight: "bold",
  },

  schoolName: {
    fontSize: 14,
    color: "#666",
  },

  attendanceTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },

  attendanceRow: {
    flexDirection: "row",
  },

  attendanceButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#ECECEC",
    marginRight: 10,
  },

  presentActive: {
    backgroundColor: "#FBF1A1",
  },

  absentActive: {
    backgroundColor: "#FBF1A1",
  },

  attendanceText: {
    fontSize: 14,
    fontWeight: "600",
  },

  infoCard: {
    backgroundColor: "#FCF4BA",
    borderRadius: 16,
    padding: 16,
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },

  cardTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 16,
  },

  infoRow: {
    marginBottom: 14,
  },

  infoLabel: {
    fontSize: 14,
    color: "#777",
    marginBottom: 4,
  },

  valueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  infoValue: {
    fontSize: 17,
    fontWeight: "500",
  },

  input: {
    borderWidth: 1,
    borderColor: "#CCC",
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
    backgroundColor: "#FFF",
  },
  driverCard: {
    backgroundColor: "#D9EFFF",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#CFE7F7",
    marginTop: 18,
  },

  driverTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },

  driverName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },

  driverInfo: {
    fontSize: 14,
    marginBottom: 2,
  },

  callButton: {
    marginTop: 10,
    backgroundColor: "#2E86DE",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },

  callText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
