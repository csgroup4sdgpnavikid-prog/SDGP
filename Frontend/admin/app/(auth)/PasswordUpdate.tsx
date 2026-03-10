import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function PasswordUpdateScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        <Text style={styles.title}>CHECK YOUR{"\n"}EMAIL</Text>

        <View style={styles.circle}>
          <Ionicons name="mail" size={40} color="#fff" />
        </View>

        <Text style={styles.subtitle}>
          We've sent a password reset link to{"\n"}your email address.
        </Text>

        <Text style={styles.hint}>
          Open the link in the email to reset your password.{"\n"}
          The link will expire in a few minutes.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace("/RoleSelectionScreen")}
        >
          <Text style={styles.buttonText}>BACK TO LOGIN</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f2f2",
    alignItems: "center",
    paddingTop: 120,
  },

  content: {
    alignItems: "center",
    paddingHorizontal: 30,
  },

  title: {
    fontSize: 27,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 40,
    color: "#000",
  },

  circle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#50bcff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },

  subtitle: {
    fontSize: 15,
    color: "#333",
    textAlign: "center",
    marginBottom: 12,
  },

  hint: {
    fontSize: 13,
    color: "#777",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 20,
  },

  button: {
    backgroundColor: "#50bcff",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 8,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});
