import React, { useRef } from "react";
import { useRouter } from "expo-router";
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

export default function ParentRegisterScreen() {
  const scrollRef = useRef<ScrollView | null>(null);
  const router = useRouter();

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
    
        <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Parent Portal</Text>
            <Text style={styles.subtitle}>
              Track your child’s school van in real time
            </Text>
          </View>

          <View style={styles.formWrapper}>
            <View style={styles.form}>
              {input("account", "Parent Name", "Enter your full name")}
              {input("email-outline", "Email", "Enter your email")}
              {input("phone-outline", "Phone Number", "Enter phone number")}

              {input(
                "account-child-outline",
                "Student Name",
                "Enter child’s name",
                false,
                scrollRef,
                150
              )}

              {input(
                "school-outline",
                "Current Class",
                "e.g. Grade 5A",
                false,
                scrollRef,
                200
              )}

              {input(
                "lock-outline",
                "Password",
                "Create password",
                true,
                scrollRef,
                300
              )}

              {input(
                "lock-check-outline",
                "Confirm Password",
                "Re-enter password",
                true,
                scrollRef,
                350
              )}

              <TouchableOpacity style={styles.button}>
                <Text style={styles.buttonText}>Register</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.LoginRow}>
                <Text style={styles.LoginText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => console.log("Go to Login")}>
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
  scrollY: number = 0
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
        onFocus={() => {
          scrollRef?.current?.scrollTo({
            y: scrollY,
            animated: true,
          });
        }}
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e8f8ffff",
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
    marginTop:10,
  },

  LoginText: {
    color: "#6B7280",
  },

  LoginNow: {
    color: "#5AA9E6",
    fontWeight: "700",
  },
});
