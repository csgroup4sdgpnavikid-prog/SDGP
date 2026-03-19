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

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { moderateScale, wp } from "../../constants/responsive";
import { auth, db } from "../../firebaseConfig";
import { doc, setDoc } from "firebase/firestore";
import { sendEmailVerification } from "firebase/auth";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

export default function ParentRegisterScreen() {
  const scrollRef = useRef<ScrollView | null>(null);
  const router = useRouter();
  const { register, isLoading } = useAuth();

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [error, setError] = React.useState("");

  const handleRegister = async () => {
    setError("");
    if (!name || !email || !phone || !password || !confirmPassword) {
      setError("Please fill in all required fields");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    try {
      await register(email, password, "parent");

      if (auth.currentUser) {
        await setDoc(doc(db, "parents", auth.currentUser.uid), {
          parentId: auth.currentUser.uid,
          name,
          email,
          phone,
          role: "parent",
          assignedDriverId: null,
          routeId: null,
          expoPushToken: null,
          tokenUpdatedAt: null,
          termsAccepted: false,
          termsAcceptedAt: null,
          createdAt: new Date().toISOString(),
        });

        await sendEmailVerification(auth.currentUser);
      }

      router.replace({
        pathname: "/(auth)/TermsAndConditions",
        params: { role: "parent" },
      });
    } catch (err: any) {
      setError(err.message || "Registration failed");
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
            <Text style={styles.title}>Parent Portal</Text>
            <Text style={styles.subtitle}>
              Register to track your child's van
            </Text>
          </View>

          <View style={styles.formWrapper}>
            <View style={styles.form}>
              {input("account", "Full Name", "Enter your full name", false, scrollRef, 0, name, setName)}
              {input("email-outline", "Email", "Enter your email", false, scrollRef, 50, email, setEmail)}
              {input("phone-outline", "Phone Number", "Enter phone number", false, scrollRef, 100, phone, setPhone)}
              {input("lock-outline", "Password", "Create password", true, scrollRef, 200, password, setPassword)}
              {input("lock-check-outline", "Confirm Password", "Re-enter password", true, scrollRef, 260, confirmPassword, setConfirmPassword)}

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={styles.button}
                onPress={handleRegister}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? "Registering..." : "Register"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push("/ParentLogin")}>
                <Text style={styles.loginNow}>Login Now</Text>
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
    padding: wp(5),
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

  errorText: {
    color: "#EF4444",
    fontSize: moderateScale(13),
    marginBottom: moderateScale(10),
    textAlign: "center",
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

  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: moderateScale(10),
  },

  loginText: {
    color: "#6B7280",
  },

  loginNow: {
    color: "#5AA9E6",
    fontWeight: "700",
  },
});
