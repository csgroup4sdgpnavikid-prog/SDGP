import { FontAwesome, Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import {
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please enter both email and password");
      return;
    }
    try {
      await login(email, password, 'driver');
      router.replace('/Driver');
    } catch (error: any) {
      alert(error.message || "Login failed");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>

      <TouchableOpacity style={styles.backButton} onPress={() => router.push("/RoleSelection)")}>
        <Text style={styles.backText}>‹</Text>
      </TouchableOpacity>

      <View style={styles.container}>
        <Text style={styles.title}>
          Welcome back! Glad{"\n"}to see you, Again!
        </Text>

        <TextInput
          placeholder="Enter your email"
          placeholderTextColor="#9CA3AF"
          style={styles.input}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />

        <View style={styles.passwordContainer}>
          <TextInput
            placeholder="Enter your password"
            placeholderTextColor="#9CA3AF"
            secureTextEntry={!showPassword}
            style={styles.passwordInput}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
          >

            <Ionicons
              name={showPassword ? "eye-off" : "eye"}
              size={22}
              color="#6B7280"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push("/SendMail")}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={isLoading}>
          <Text style={styles.loginText}>{isLoading ? "Logging in..." : "Login"}</Text>
        </TouchableOpacity>

        <View style={styles.orRow}>
          <View style={styles.line} />
          <Text style={styles.orText}>Or login with</Text>
          <View style={styles.line} />
        </View>

        <View style={styles.socialRow}>
          <TouchableOpacity style={styles.socialButton}>
            <FontAwesome name="facebook" size={22} color="#1877F2" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.socialButton}>
            <Image
              source={require("../../assets/images/google.png")}
              style={{ width: 40, height: 22 }}
              resizeMode="contain"
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.socialButton}>
            <FontAwesome name="apple" size={22} color="#000000" />
          </TouchableOpacity>
        </View>

        <View style={styles.registerRow}>
          <Text style={styles.registerText}>
            Don’t have an account?{" "}
          </Text>

          <TouchableOpacity onPress={() => router.push("/DriverRegister")}>
            <Text style={styles.registerNow}>Register Now</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  backButton: {
    marginLeft: 23,
    marginTop: 40,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },

  backText: {
    fontSize: 20,
    fontWeight: "600",
  },

  container: {
    paddingHorizontal: 24,
    marginTop: 30,
  },

  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 40,
    color: "#111827",
  },

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#5AA9E6",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 18,
  },

  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#5AA9E6",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },

  passwordInput: {
    flex: 1,
    fontSize: 15,
  },

  eyeText: {
    fontSize: 18,
  },

  forgotText: {
    textAlign: "right",
    fontWeight: "600",
    marginVertical: 14,
    marginTop: 15,
  },

  loginButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: "#5AA9E6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 35,
  },

  loginText: {
    color: "#0f0101ff",
    fontSize: 16,
    fontWeight: "700",
  },

  orRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },

  orText: {
    marginHorizontal: 10,
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "500",
  },

  socialRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },

  socialButton: {
    flex: 1,
    height: 52,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 6,
  },

  socialText: {
    fontSize: 18,
    fontWeight: "700",
  },

  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
  },

  registerText: {
    color: "#6B7280",
  },

  registerNow: {
    color: "#5AA9E6",
    fontWeight: "700",
  },
});
