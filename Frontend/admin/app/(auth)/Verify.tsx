import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from "react-native";

export default function VerifyScreen() {
  const [code, setCode] = useState("");

  // TEMP: frontend check (replace with backend later)
  const CORRECT_CODE = "1234";

  const handleContinue = () => {
    if (code.length !== 4) {
      Alert.alert("Invalid Code", "Please enter a 4-digit code.");
      return;
    }

    if (code !== CORRECT_CODE) {
      Alert.alert("Verification Failed", "The code you entered is incorrect.");
      return;
    }

    Alert.alert("Success", "Email verified successfully!");
    // navigation.navigate("NextScreen");
  };

  const handleResend = () => {
    Alert.alert("Code Sent", "A new verification code has been sent.");
    // backend resend API later
  };

  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/images/verify.png")}
        style={styles.image}
      />

      <Text style={styles.title}>Verify Your Email to Begin</Text>

      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        maxLength={4}
        value={code}
        onChangeText={setCode}
        placeholder="Enter 4-digit code"
        placeholderTextColor="#9CA3AF"
        textAlign="center"
      />

      <TouchableOpacity style={styles.button} onPress={handleContinue}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>

      <View style={styles.codeRow}>
        <Text style={styles.codeText}>
          Didn't Get the Code?{" "}
        </Text>

        <TouchableOpacity onPress={() => console.log("Resend The Code")}>
          <Text style={styles.resendCode}>Resend Code</Text>
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
    padding: 20,
  },
  image: {
    marginTop: -200,
    width: 250,
    height: 250,
    marginBottom: 20,
    resizeMode: "contain",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  input: {
    width: "60%",
    height: 50,
    borderWidth: 1,
    borderColor: "#50bcffff",
    borderRadius: 10,
    fontSize: 19,
    marginBottom: 30,
    marginTop: 15,
  },
  button: {
    backgroundColor: "#50bcffff",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 15,
  },

  buttonText: {
    color: "#1b0202",
    fontSize: 16,
    fontWeight: "bold",
  },

  codeRow: {
    flexDirection: "row",
    justifyContent: "center",
  },

  codeText: {
    color: "#6B7280",
  },

  resendCode: {
    color: "#50bcffff",
    fontWeight: "700",
  },
});
