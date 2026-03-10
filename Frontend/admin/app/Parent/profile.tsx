import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function ParentProfileCard() {
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
  const [name, setName] = useState("Jane Doe");
  const [email, setEmail] = useState("jane.doe@email.com");
  const [phone, setPhone] = useState("+1 234 567 890");
  const [vanNumber, setVanNumber] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handlePasswordChange = () => {
    setError("");
    setSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required.");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // If everything is valid
    setSuccess("Password updated successfully!");

    // Clear fields
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <ScrollView style={styles.screen}>
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => router.push("/Parent/settings")}
      >
        <Ionicons name="settings-outline" size={22} color="#374151" />
      </TouchableOpacity>
      <View style={styles.card}>
        {/* Profile Image */}
        <TouchableOpacity
          onPress={pickImage}
          activeOpacity={0.8}
          style={styles.imageWrapper}
        >
          {image ? (
            <Image source={{ uri: image }} style={styles.profileImage} />
          ) : (
            <View style={[styles.profileImage, styles.profilePlaceholder]}>
              <Ionicons name="person" size={40} color="#9CA3AF" />
            </View>
          )}

          <View style={styles.cameraIcon}>
            <Ionicons name="camera" size={14} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Parent Name */}
        <View style={styles.textContainer}>
          <Text style={styles.label}>Parent</Text>
          <Text style={styles.name}>{name}</Text>
        </View>
      </View>

      <View style={styles.detailsContainer}>
        {/*Parent Name*/}
        <Text style={styles.labelInput1}>Parent Name</Text>
        <View style={styles.inputBox1}>
          <Ionicons name="person-outline" size={18} color="#6B7280" />
          <TextInput style={styles.input} value={name} onChangeText={setName} />
        </View>
      </View>

      {/* Email */}
      <Text style={styles.labelInput2}>Email</Text>
      <View style={styles.inputBox2}>
        <Ionicons name="mail-outline" size={18} color="#6B7280" />
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
      </View>
      {/* Phone */}
      <Text style={styles.labelInput3}>Phone</Text>
      <View style={styles.inputBox3}>
        <Ionicons name="call-outline" size={18} color="#6B7280" />
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
      </View>

      {/* Registered Van Number */}
      <Text style={styles.labelInput4}>Registered Van number</Text>
      <View style={styles.inputBox4}>
        <Ionicons name="car-outline" size={18} color="#6B7280" />
        <TextInput
          style={styles.input}
          value={vanNumber}
          onChangeText={setVanNumber}
        />
      </View>
      {/* Change Password Section */}
      {/* Change Password Section */}
      <View style={styles.passwordSection}>
        <Text style={styles.sectionTitle}>Change Password</Text>

        {/* Current Password */}
        <Text style={styles.labelInput5}>Current Password</Text>
        <View style={styles.inputBox5}>
          <Ionicons name="lock-closed-outline" size={18} color="#6B7280" />
          <TextInput
            style={styles.input}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Enter current password"
            secureTextEntry
          />
        </View>

        {/* New Password */}
        <Text style={styles.labelInput5}>New Password</Text>
        <View style={styles.inputBox5}>
          <Ionicons name="lock-closed-outline" size={18} color="#6B7280" />
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Enter new password"
            secureTextEntry
          />
        </View>

        {/* Confirm Password */}
        <Text style={styles.labelInput5}>Confirm Password</Text>
        <View style={styles.inputBox5}>
          <Ionicons name="lock-closed-outline" size={18} color="#6B7280" />
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm new password"
            secureTextEntry
          />
        </View>

        {/* Confirm Button */}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {success ? <Text style={styles.successText}>{success}</Text> : null}

        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handlePasswordChange}
        >
          <Text style={styles.confirmText}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start",
    backgroundColor: "#FFFFFF",
  },
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#BCEAFB",
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 50,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  settingsButton: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10,
  },

  imageWrapper: {
    position: "relative",
  },

  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E5E7EB",
  },

  profilePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },

  cameraIcon: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "#3B82F6",
    padding: 6,
    borderRadius: 20,
  },

  textContainer: {
    marginLeft: 16,
  },

  label: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },

  name: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  detailsContainer: {
    marginTop: 30,
    paddingHorizontal: 16,
  },
  labelInput1: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    color: "#374151",
    marginLeft: 4,
  },

  inputBox1: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 50,
    marginBottom: 20,
    marginLeft: 1,
  },
  labelInput2: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    color: "#374151",
    marginLeft: 20,
  },

  inputBox2: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 50,
    marginBottom: 20,
    marginLeft: 16,
    marginRight: 15,
  },
  labelInput3: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    color: "#374151",
    marginLeft: 20,
  },

  inputBox3: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 50,
    marginBottom: 20,
    marginLeft: 15,
    marginRight: 15,
  },
  labelInput4: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    color: "#374151",
    marginLeft: 20,
  },

  inputBox4: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 50,
    marginBottom: 20,
    marginLeft: 15,
    marginRight: 15,
  },
  labelInput5: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    color: "#374151",
    marginLeft: 4,
  },

  inputBox5: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 50,
    marginBottom: 20,
    marginLeft: 1,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
  },
  passwordSection: {
    marginTop: 30,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 15,
    color: "#111827",
  },

  confirmButton: {
    backgroundColor: "#F4E285",
    height: 50,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },

  confirmText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  errorText: {
    color: "#DC2626",
    marginBottom: 10,
    fontSize: 14,
  },

  successText: {
    color: "#16A34A",
    marginBottom: 10,
    fontSize: 14,
  },
});
