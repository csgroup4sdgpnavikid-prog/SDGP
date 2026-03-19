import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Image,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../../firebaseConfig";

export default function LoginScreen() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();

  const handleUpdate = async () => {
    setError("");
    if (!currentPassword) {
      setError("Please enter your current password");
      return;
    }
    if (!newPassword || !confirmPassword) {
      setError("Please fill in both password fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    // Guard: ensure a user session exists
    if (!auth.currentUser || !auth.currentUser.email) {
      setError("No active session. Please log in again.");
      return;
    }
    setLoading(true);
    try {
      // Re-authenticate before changing password (Firebase requirement)
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);

      // Route to the correct login screen based on role
      const role = await AsyncStorage.getItem("userRole");
      Alert.alert("Success", "Password updated successfully", [
        {
          text: "OK",
          onPress: () =>
            router.replace(role === "parent" ? "/(auth)/ParentLogin" : "/(auth)/DriverLogin"),
        },
      ]);
    } catch (err: any) {
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setError("Current password is incorrect");
      } else {
        setError(err.message || "Failed to update password");
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >


            {/* Logo */}
            <Image
              source={require("../../assets/images/Newpassword.png")}
              style={styles.logo}
              resizeMode="contain"
            />

            {/* Title */}
            <Text style={styles.title}>Recover Password</Text>
            <Text style={styles.subtitle}>
              Your Identity has been verified{"\n"}
              Set your new password
            </Text>

            {/* FORM */}
            <View style={styles.form}>

              {/* Current Password */}
              <View style={styles.passwordContainer}>
                <TextInput
                  placeholder="Current Password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showCurrentPassword}
                  style={styles.passwordInput}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
                  <Ionicons name={showCurrentPassword ? "eye" : "eye-off"} size={22} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <View style={{ marginBottom: 18 }} />

              {/* New Password */}
              <View style={styles.passwordContainer}>
                <TextInput
                  placeholder="New Password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showNewPassword}
                  style={styles.passwordInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  autoCapitalize="none"
                />

                <TouchableOpacity
                  onPress={() => setShowNewPassword(!showNewPassword)}
                >
                  <Ionicons
                    name={showNewPassword ? "eye" : "eye-off"}
                    size={22}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={{ alignSelf: "flex-end", marginBottom: 12 }}
              >

              </TouchableOpacity>

              {/* Confirm Password */}
              <View style={styles.passwordContainer}>
                <TextInput
                  placeholder="Confirm Password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showConfirmPassword}
                  style={styles.passwordInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  autoCapitalize="none"
                />

                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye" : "eye-off"}
                    size={22}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={{ alignSelf: "flex-end", marginBottom: 35 }}
              >

              </TouchableOpacity>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              {/* Update Button */}
              <TouchableOpacity style={styles.button} onPress={handleUpdate} disabled={loading}>
                <Text style={styles.buttonText}>{loading ? "Updating..." : "Update"}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#fff",
  },

  logo: {
    width: 200,
    height: 200,
    alignSelf: "center",
    marginBottom: 10,
  },

  title: {
    fontSize: 25,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
    color: "#000",
  },

  subtitle: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    marginBottom: 30,
  },

  form: {
    width: "100%",

  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#50bcff",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 18,
  },

  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#50bcff",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },

  passwordInput: {
    flex: 1,
    fontSize: 15,
  },

  button: {
    backgroundColor: "#50bcff",
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: -5,
  },

  buttonText: {
    color: "#0b0909",
    fontWeight: "700",
    fontSize: 16,
  },

  errorText: {
    color: "#EF4444",
    fontSize: 13,
    marginBottom: 10,
    textAlign: "center",
  },

});
