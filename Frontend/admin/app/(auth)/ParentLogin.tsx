import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) { setError('Please fill in all fields'); return; }
    setLoading(true);
    setError('');
    try {
      await login(email, password, 'parent');
      // Navigation handled by AuthContext auth guard
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/network-request-failed') {
        setError('No internet connection. Check your network.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Try again later.');
      } else {
        setError('Invalid email or password');
      }
    } finally {
      setLoading(false);
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

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity onPress={() => router.push('/SendMail')}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
          <Text style={styles.loginText}>{loading ? 'Logging in...' : 'Login'}</Text>
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

          <TouchableOpacity onPress={() => router.push("/ParentRegister")}>
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
    backgroundColor: "#f0f4f8",
  },

  backButton: {
    marginLeft: wp(6),
    marginTop: moderateScale(40),
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  backText: {
    fontSize: moderateScale(20),
    fontWeight: "600",
    color: "#0f172a",
  },

  container: {
    paddingHorizontal: wp(6),
    marginTop: moderateScale(30),
  },

  title: {
    fontSize: moderateScale(26),
    fontWeight: "700",
    marginBottom: moderateScale(40),
    color: "#0f172a",
  },

  input: {
    height: moderateScale(52),
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: moderateScale(10),
    paddingHorizontal: moderateScale(14),
    fontSize: moderateScale(15),
    marginBottom: moderateScale(18),
    backgroundColor: "#ffffff",
  },

  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: moderateScale(10),
    paddingHorizontal: moderateScale(14),
    height: moderateScale(52),
    backgroundColor: "#ffffff",
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
    color: "#3b82f6",
    marginVertical: moderateScale(14),
    marginTop: moderateScale(15),
  },

  loginButton: {
    height: moderateScale(54),
    borderRadius: moderateScale(12),
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: moderateScale(35),
    shadowColor: "#3b82f6",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  loginText: {
    color: "#ffffff",
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
    backgroundColor: "#e2e8f0",
  },

  orText: {
    marginHorizontal: moderateScale(10),
    color: "#64748b",
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
    borderColor: "#e2e8f0",
    borderRadius: moderateScale(12),
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: moderateScale(6),
    backgroundColor: "#ffffff",
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
    color: "#64748b",
  },

  registerNow: {
    color: "#3b82f6",
    fontWeight: "700",
  },

  errorText: {
    color: '#ef4444',
    fontSize: moderateScale(13),
    marginBottom: moderateScale(10),
    textAlign: 'center',
  },

});
