import React, { useRef, useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { moderateScale, wp } from "../../constants/responsive";
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { auth, db } from "../../firebaseConfig";
import { sendEmailVerification } from "firebase/auth";
import { doc, setDoc, getDocs, collection } from "firebase/firestore";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface RouteOption {
  id: string;
  name: string;
  area: string;
}

export default function DriverRegisterScreen() {
  const scrollRef = useRef<ScrollView | null>(null);
  const router = useRouter();
  const { register, isLoading } = useAuth();

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [license, setLicense] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  // Route selection
  const [routes, setRoutes] = React.useState<RouteOption[]>([]);
  const [selectedRouteId, setSelectedRouteId] = React.useState<string | null>(null);
  const [routesLoading, setRoutesLoading] = React.useState(true);
  const [showRoutePicker, setShowRoutePicker] = React.useState(false);

  useEffect(() => {
    getDocs(collection(db, "routes"))
      .then((snap) => {
        setRoutes(
          snap.docs.map((d) => ({
            id: d.id,
            name: d.data().name || "",
            area: d.data().area || "",
          }))
        );
      })
      .catch(console.error)
      .finally(() => setRoutesLoading(false));
  }, []);

  const selectedRoute = routes.find((r) => r.id === selectedRouteId);

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      alert("Please fill in all required fields");
      return;
    }
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    try {
      await register(email, password, "driver");

      if (auth.currentUser) {
        await setDoc(doc(db, "drivers", auth.currentUser.uid), {
          driverId: auth.currentUser.uid,
          name,
          email,
          phone,
          licenseNumber: license,
          vehicleNumber: "",
          routeId: selectedRouteId,
          role: "driver",
          expoPushToken: null,
          tokenUpdatedAt: null,
          associatedParentIds: [],
          activeTripId: null,
          averageRating: null,
          isActive: false,
          termsAccepted: false,
          termsAcceptedAt: null,
          createdAt: new Date().toISOString(),
        });
        await sendEmailVerification(auth.currentUser);
      }

      router.replace({ pathname: "/(auth)/TermsAndConditions", params: { role: "driver" } });
    } catch (error: any) {
      alert(error.message || "Registration failed");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 20}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Driver Portal</Text>
            <Text style={styles.subtitle}>Manage Your Van Route & Students</Text>
          </View>

          <View style={styles.formWrapper}>
            <View style={styles.form}>
              {input("account", "Driver Name", "Enter your full name", false, scrollRef, 0, name, setName)}
              {input("email-outline", "Email", "Enter your email", false, scrollRef, 0, email, setEmail)}
              {input("phone-outline", "Phone Number", "Enter phone number", false, scrollRef, 0, phone, setPhone)}
              {input("license", "License Number", "Enter License Number", false, scrollRef, 150, license, setLicense)}

              {/* Route Selector */}
              <View style={styles.field}>
                <Text style={styles.label}>Route</Text>
                {routesLoading ? (
                  <View style={[styles.inputWrapper, { justifyContent: "center", height: 46 }]}>
                    <ActivityIndicator size="small" color="#5AA9E6" />
                    <Text style={{ marginLeft: 8, color: "#999", fontSize: 14 }}>Loading routes…</Text>
                  </View>
                ) : routes.length === 0 ? (
                  <View style={[styles.inputWrapper, { height: 46 }]}>
                    <MaterialCommunityIcons name="routes" size={20} color="#999" />
                    <Text style={{ marginLeft: 8, color: "#999", fontSize: 14 }}>
                      No routes available — ask admin to create routes first
                    </Text>
                  </View>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.inputWrapper}
                      onPress={() => setShowRoutePicker(!showRoutePicker)}
                    >
                      <MaterialCommunityIcons name="routes" size={20} color="#777" />
                      <Text style={[styles.input, { paddingTop: 13, color: selectedRoute ? "#000" : "#999" }]}>
                        {selectedRoute ? `${selectedRoute.name} (${selectedRoute.area})` : "Select a route"}
                      </Text>
                      <MaterialCommunityIcons
                        name={showRoutePicker ? "chevron-up" : "chevron-down"}
                        size={20}
                        color="#777"
                      />
                    </TouchableOpacity>

                    {showRoutePicker && (
                      <View style={styles.dropdown}>
                        <TouchableOpacity
                          style={styles.dropdownItem}
                          onPress={() => { setSelectedRouteId(null); setShowRoutePicker(false); }}
                        >
                          <Text style={{ color: "#94a3b8", fontSize: 14 }}>No route (assign later)</Text>
                        </TouchableOpacity>
                        {routes.map((r) => (
                          <TouchableOpacity
                            key={r.id}
                            style={[
                              styles.dropdownItem,
                              selectedRouteId === r.id && styles.dropdownItemSelected,
                            ]}
                            onPress={() => { setSelectedRouteId(r.id); setShowRoutePicker(false); }}
                          >
                            <Text style={{ fontSize: 14, fontWeight: "600", color: "#0f172a" }}>{r.name}</Text>
                            <Text style={{ fontSize: 12, color: "#64748b" }}>{r.area}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </>
                )}
              </View>

              {input("lock-outline", "Password", "Create password", true, scrollRef, 300, password, setPassword)}
              {input("lock-check-outline", "Confirm Password", "Re-enter password", true, scrollRef, 350, confirmPassword, setConfirmPassword)}

              <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={isLoading}>
                <Text style={styles.buttonText}>{isLoading ? "Registering..." : "Register"}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.LoginRow}>
              <Text style={styles.LoginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push("/DriverLogin")}>
                <Text style={styles.LoginNow}>Login Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const input = (
  iconName: IconName,
  label: string,
  placeholder: string,
  secure: boolean = false,
  scrollRef?: React.RefObject<ScrollView | null>,
  scrollY: number = 0,
  value?: string,
  setValue?: (text: string) => void
) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.inputWrapper}>
      <MaterialCommunityIcons name={iconName} size={20} color="#777" />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#999"
        secureTextEntry={secure}
        style={styles.input}
        value={value}
        onChangeText={setValue}
        onFocus={() => {
          scrollRef?.current?.scrollTo({ y: scrollY, animated: true });
        }}
        autoCapitalize="none"
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e8f8ffff",
  },

  backButton: {
    position: "absolute",
    top: moderateScale(25),
    left: moderateScale(25),
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },

  backText: {
    fontSize: moderateScale(20),
    fontWeight: "600",
  },

  scroll: {
    padding: moderateScale(20),
    flexGrow: 1,
    justifyContent: "space-between",
    paddingBottom: moderateScale(40),
  },

  header: {
    alignItems: "center",
    marginBottom: moderateScale(20),
  },

  title: {
    fontSize: moderateScale(22),
    fontWeight: "700",
    color: "#222",
    marginTop: moderateScale(20),
  },

  subtitle: {
    fontSize: moderateScale(13),
    color: "#666",
    textAlign: "center",
    marginTop: moderateScale(5),
  },

  formWrapper: {
    flex: 1,
  },

  form: {
    backgroundColor: "#fff",
    borderRadius: moderateScale(18),
    padding: moderateScale(18),
    elevation: 10,
  },

  field: {
    marginBottom: moderateScale(14),
  },

  label: {
    fontSize: moderateScale(13),
    fontWeight: "600",
    marginBottom: moderateScale(6),
    color: "#333",
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#71d6f3ff",
    borderRadius: moderateScale(12),
    paddingHorizontal: moderateScale(12),
    backgroundColor: "#FAFAFA",
  },

  input: {
    flex: 1,
    height: moderateScale(46),
    marginLeft: moderateScale(8),
    fontSize: moderateScale(14),
    color: "#000",
  },

  dropdown: {
    marginTop: moderateScale(4),
    borderWidth: 1,
    borderColor: "#71d6f3ff",
    borderRadius: moderateScale(12),
    backgroundColor: "#fff",
    overflow: "hidden",
    elevation: 4,
  },

  dropdownItem: {
    paddingHorizontal: moderateScale(14),
    paddingVertical: moderateScale(10),
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },

  dropdownItemSelected: {
    backgroundColor: "#eff6ff",
  },

  button: {
    backgroundColor: "#5AA9E6",
    height: moderateScale(48),
    borderRadius: moderateScale(14),
    justifyContent: "center",
    alignItems: "center",
    marginTop: moderateScale(10),
  },

  buttonText: {
    color: "#fff",
    fontSize: moderateScale(16),
    fontWeight: "700",
  },

  LoginRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: moderateScale(10),
  },

  LoginText: {
    color: "#6B7280",
  },

  LoginNow: {
    color: "#5AA9E6",
    fontWeight: "700",
  },
});
