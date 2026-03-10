import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";

export default function ForgetPasswordScreen() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { sendPasswordReset } = useAuth();
  const router = useRouter();

  const handleSend = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordReset(email.trim());
      // Navigate to the success screen regardless, to avoid revealing
      // whether an email exists (security best practice)
      router.push("/PasswordUpdate");
    } catch (error: any) {
      // Firebase may throw for invalid emails; still show generic message
      router.push("/PasswordUpdate");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>‹</Text>
      </TouchableOpacity>

      <Image
        source={require("../../assets/images/Sendmail.png")}
        style={styles.image}
        resizeMode="contain"
      />

      <Text style={styles.title}>FORGOT PASSWORD?</Text>

      <Text style={styles.subtitle}>
        Provide your account's email for which you{"\n"}want to reset your password.
      </Text>

      <View style={styles.form}>
        <Ionicons name="mail-outline" size={20} color="gray" />
        <TextInput
          placeholder="Enter your email"
          placeholderTextColor="#9CA3AF"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          style={styles.textInput}
        />
      </View>

      <TouchableOpacity
        onPress={handleSend}
        style={styles.nextButton}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.nextText}>NEXT</Text>
        )}
      </TouchableOpacity>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  backButton: {
    position: "absolute",
    top: 25,
    left: 25,
    width: 32,
    height: 32,
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

  image: {
    width: 210,
    height: 200,
    marginTop: 50,
    marginBottom: 20,
  },

  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },

  subtitle: {
    textAlign: "center",
    color: "gray",
    fontSize: 13,
    marginBottom: 30,
  },

  form: {
    width: "100%",
    height: 52,
    borderWidth: 1,
    borderColor: "#50bcff",
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 18,
    backgroundColor: "#f2f2f2",
    flexDirection: "row",
    alignItems: "center",
  },

  textInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
  },

  nextButton: {
    backgroundColor: "#50bcff",
    height: 50,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },

  nextText: {
    fontWeight: "bold",
    color: "#fff",
    fontSize: 16,
  },
});
