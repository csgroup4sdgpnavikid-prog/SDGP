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
import { moderateScale, wp, CONTENT_MAX_WIDTH } from "../../constants/responsive";

export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const { login, isLoading } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    setErrorMsg("");
    if (!email || !password) {
      setErrorMsg("Please enter both email and password");
      return;
    }
    try {
      await login(email, password, 'driver');
      // Navigation is handled by AuthContext's auth guard (watches role + user state)
    } catch (error: any) {
      const code = error?.code || "";
      if (code === "auth/user-not-found" || code === "auth/invalid-credential" || code === "auth/wrong-password") {
        setErrorMsg("Invalid email or password. Please check your credentials.");
      } else if (code === "auth/too-many-requests") {
        setErrorMsg("Too many failed attempts. Try again later.");
      } else if (code === "auth/network-request-failed") {
        setErrorMsg("No internet connection. Check your network.");
      } else {
        setErrorMsg(error.message || "Login failed. Please try again.");
      }
      console.error("[DriverLogin] error:", code, error.message);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>

      <TouchableOpacity style={styles.backButton} onPress={() => router.push("/RoleSelectionScreen")}>
        <Text style={styles.backText}>‹</Text>
      </TouchableOpacity>

      <View style={styles.container}>
        <View style={{ width: "100%", maxWidth: CONTENT_MAX_WIDTH, alignSelf: "center" }}>
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

        {errorMsg ? (
          <Text style={{ color: "#DC2626", fontSize: 13, marginBottom: 10, textAlign: "center" }}>
            {errorMsg}
          </Text>
        ) : null}

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
    marginLeft: wp(6),
    marginTop: moderateScale(40),
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },

  backText: {
    fontSize: moderateScale(20),
    fontWeight: "600",
  },

  container: {
    paddingHorizontal: wp(6),
    marginTop: moderateScale(30),
  },

  title: {
    fontSize: moderateScale(26),
    fontWeight: "700",
    marginBottom: moderateScale(40),
    color: "#111827",
  },

  input: {
    height: moderateScale(52),
    borderWidth: 1,
    borderColor: "#5AA9E6",
    borderRadius: moderateScale(12),
    paddingHorizontal: moderateScale(14),
    fontSize: moderateScale(15),
    marginBottom: moderateScale(18),
  },

  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#5AA9E6",
    borderRadius: moderateScale(12),
    paddingHorizontal: moderateScale(14),
    height: moderateScale(52),
  },

  passwordInput: {
    flex: 1,
    fontSize: moderateScale(15),
  },

  eyeText: {
    fontSize: moderateScale(18),
  },

  forgotText: {
    textAlign: "right",
    fontWeight: "600",
    marginVertical: moderateScale(14),
    marginTop: moderateScale(15),
  },

  loginButton: {
    height: moderateScale(54),
    borderRadius: moderateScale(14),
    backgroundColor: "#5AA9E6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: moderateScale(35),
  },

  loginText: {
    color: "#0f0101ff",
    fontSize: moderateScale(16),
    fontWeight: "700",
  },

  orRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: moderateScale(20),
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },

  orText: {
    marginHorizontal: moderateScale(10),
    color: "#6B7280",
    fontSize: moderateScale(13),
    fontWeight: "500",
  },

  socialRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: moderateScale(24),
  },

  socialButton: {
    flex: 1,
    height: moderateScale(52),
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: moderateScale(12),
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: moderateScale(6),
  },

  socialText: {
    fontSize: moderateScale(18),
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
