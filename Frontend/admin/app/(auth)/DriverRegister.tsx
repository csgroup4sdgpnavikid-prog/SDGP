import React, { useRef } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
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
} from "react-native";

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

export default function DriverRegisterScreen() {
  const scrollRef = useRef<ScrollView | null>(null);
  const router = useRouter();
  const { register, isLoading } = useAuth();

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [license, setLicense] = React.useState("");
  const [route, setRoute] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

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
      // Register user in Auth
      await register(email, password, 'driver');

      // Get current user ID (after successful registration)
      // Note: We need to access auth.currentUser since register() in context doesn't return the user object yet
      // A better approach would be to have register return the user, but for now we can rely on auth state or explicit import
      const { auth, db } = require('../../firebaseConfig');
      const { doc, setDoc } = require('firebase/firestore');

      if (auth.currentUser) {
        await setDoc(doc(db, "drivers", auth.currentUser.uid), {
          name,
          email,
          phone,
          license,
          route,
          role: 'driver',
          driverId: auth.currentUser.uid,
          createdAt: new Date().toISOString()
        });
      }

      router.replace('/Driver');
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
            <Text style={styles.subtitle}>
              Manage Your Van Route & Students
            </Text>
          </View>

          <View style={styles.formWrapper}>
            <View style={styles.form}>
              {input("account", "Driver Name", "Enter your full name", false, scrollRef, 0, name, setName)}
              {input("email-outline", "Email", "Enter your email", false, scrollRef, 0, email, setEmail)}
              {input("phone-outline", "Phone Number", "Enter phone number", false, scrollRef, 0, phone, setPhone)}

              {input(
                "license",
                "License Number",
                "Enter License Number",
                false,
                scrollRef,
                150,
                license,
                setLicense
              )}

              {input(
                "routes",
                "Route",
                "Enter the Route(Start - end)",
                false,
                scrollRef,
                200,
                route,
                setRoute
              )}

              {input(
                "lock-outline",
                "Password",
                "Create password",
                true,
                scrollRef,
                300,
                password,
                setPassword
              )}

              {input(
                "lock-check-outline",
                "Confirm Password",
                "Re-enter password",
                true,
                scrollRef,
                350,
                confirmPassword,
                setConfirmPassword
              )}

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
          scrollRef?.current?.scrollTo({
            y: scrollY,
            animated: true,
          });
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
    top: 25,
    left: 25,
    width: 32,
    height: 32,
    color: "#000",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },

  backText: {
    fontSize: 20,
    fontWeight: "600",
  },

  scroll: {
    padding: 20,
    flexGrow: 1,
    justifyContent: "space-between",
    paddingBottom: 40,
  },

  header: {
    alignItems: "center",
    marginBottom: 20,
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#222",
    marginTop: 20,
  },

  subtitle: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    marginTop: 5,
  },

  formWrapper: {
    flex: 1,
  },

  form: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    elevation: 10,
  },

  field: {
    marginBottom: 14,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    color: "#333",
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#71d6f3ff",
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: "#FAFAFA",
  },

  input: {
    flex: 1,
    height: 46,
    marginLeft: 8,
    fontSize: 14,
    color: "#000",
  },

  button: {
    backgroundColor: "#5AA9E6",
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  LoginRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
  },

  LoginText: {
    color: "#6B7280",
  },

  LoginNow: {
    color: "#5AA9E6",
    fontWeight: "700",
  },
});
