import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../../firebaseConfig";
import { sendEmailVerification, reload } from "firebase/auth";

export default function VerifyScreen() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleCheckVerification = async () => {
    if (!auth.currentUser) {
      Alert.alert("Error", "No user session found. Please log in again.");
      router.replace("/RoleSelectionScreen");
      return;
    }
    setChecking(true);
    try {
      // Reload user to get latest emailVerified status from Firebase
      await reload(auth.currentUser);
      if (auth.currentUser.emailVerified) {
        const role = await AsyncStorage.getItem("userRole");
        const destination = role === "parent" ? "/Parent" : role === "driver" ? "/Driver" : "/RoleSelectionScreen";
        Alert.alert("Verified!", "Your email has been verified.", [
          { text: "Continue", onPress: () => router.replace(destination) },
        ]);
      } else {
        Alert.alert(
          "Not Verified Yet",
          "We couldn't confirm your email yet. Please click the link in the email we sent you, then tap 'I've Verified' again."
        );
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to check verification status.");
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    if (!auth.currentUser) {
      Alert.alert("Session Expired", "Your session has expired. Please log in again.");
      router.replace("/RoleSelectionScreen");
      return;
    }
    setResending(true);
    try {
      await sendEmailVerification(auth.currentUser);
      setResendCooldown(60); // 60-second cooldown to prevent spam
      Alert.alert("Email Sent", `A new verification link was sent to ${auth.currentUser.email}`);
    } catch (err: any) {
      if (err.code === "auth/too-many-requests") {
        Alert.alert("Too Many Requests", "Please wait before requesting another email.");
      } else {
        Alert.alert("Error", err.message || "Failed to resend verification email.");
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/images/verify.png")}
        style={styles.image}
      />

      <Text style={styles.title}>Verify Your Email</Text>
      <Text style={styles.subtitle}>
        We sent a verification link to{"\n"}
        <Text style={styles.email}>{auth.currentUser?.email || "your email"}</Text>
      </Text>
      <Text style={styles.instructions}>
        Click the link in the email, then tap the button below to continue.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={handleCheckVerification}
        disabled={checking}
      >
        {checking ? (
          <ActivityIndicator color="#1b0202" />
        ) : (
          <Text style={styles.buttonText}>I've Verified My Email</Text>
        )}
      </TouchableOpacity>

      <View style={styles.codeRow}>
        <Text style={styles.codeText}>Didn't get the email? </Text>
        <TouchableOpacity
          onPress={handleResend}
          disabled={resending || resendCooldown > 0}
        >
          <Text style={[styles.resendCode, (resending || resendCooldown > 0) && styles.resendDisabled]}>
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Email"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  image: {
    marginTop: -200,
    width: 250,
    height: 250,
    marginBottom: 20,
    resizeMode: "contain",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#111827",
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 22,
  },
  email: {
    fontWeight: "600",
    color: "#111827",
  },
  instructions: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 20,
  },
  button: {
    backgroundColor: "#50bcffff",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 15,
    minHeight: 48,
    justifyContent: "center",
  },
  buttonText: {
    color: "#1b0202",
    fontSize: 16,
    fontWeight: "bold",
  },
  codeRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 4,
  },
  codeText: {
    color: "#6B7280",
    fontSize: 14,
  },
  resendCode: {
    color: "#50bcffff",
    fontWeight: "700",
    fontSize: 14,
  },
  resendDisabled: {
    color: "#9CA3AF",
  },
});
