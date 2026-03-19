// ParentProfileCard Screen
// This component displays the parent profile information.
// It allows updating personal details, profile image,
// and changing the account password.
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { db, auth, storage } from "../../firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import "firebase/auth";

export default function ParentProfileCard() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [image, setImage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      try {
        const snap = await getDoc(doc(db, "parents", user.uid));
        if (snap.exists()) {
          const d = snap.data();
          setName(d.name || "");
          setEmail(d.email || "");
          setPhone(d.phone || "");
          if (d.photoUrl) setImage(d.photoUrl);
        }
      } catch (err) {
        console.error("Error loading parent profile:", err);
      }
    };
    loadProfile();
  }, [user]);

  const uploadImageToStorage = async (localUri: string): Promise<string> => {
    const uid = auth.currentUser!.uid;
    const storageRef = ref(storage, `profileImages/parents/${uid}`);
    const response = await fetch(localUri);
    const blob = await response.blob();
    await uploadBytes(storageRef, blob);
    return getDownloadURL(storageRef);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Camera roll access is needed to change your photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      const localUri = result.assets[0].uri;
      setImage(localUri); // show immediately
      try {
        const downloadUrl = await uploadImageToStorage(localUri);
        await updateDoc(doc(db, "parents", auth.currentUser!.uid), { photoUrl: downloadUrl });
        setImage(downloadUrl);
      } catch (err) {
        Alert.alert("Upload Failed", "Could not upload photo. Please try again.");
        console.error("Profile image upload error:", err);
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!name || !phone) { Alert.alert("Error", "Name and phone are required"); return; }
    setSaving(true);
    try {
      await updateDoc(doc(db, "parents", auth.currentUser!.uid), { name, phone });
      Alert.alert("Success", "Profile saved successfully");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  // Render parent profile interface
  return (
    <ScrollView style={styles.screen}>
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => router.push("/Parent/Settings")}
      >
        <Ionicons name="settings-outline" size={22} color="#374151" />
      </TouchableOpacity>
      <View style={styles.card}>
        {/* Profile Image */}
        {/* Profile card displaying user image and name */}
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
      {/* Editable user information fields */}
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

      {/* Save Profile Button */}
      <View style={{ paddingHorizontal: 16, marginTop: 4, marginBottom: 20 }}>
        <TouchableOpacity style={styles.confirmButton} onPress={handleSaveProfile} disabled={saving}>
          <Text style={styles.confirmText}>{saving ? "Saving..." : "Save Profile"}</Text>
        </TouchableOpacity>
      </View>

      {/* Change Password — navigates to Settings */}
      <View style={{ paddingHorizontal: 16, marginBottom: 30 }}>
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#F3F4F6",
            borderRadius: 12,
            paddingVertical: 14,
            paddingHorizontal: 16,
          }}
          onPress={() => router.push("/Parent/Settings")}
        >
          <Ionicons name="lock-closed-outline" size={20} color="#374151" />
          <Text style={{ flex: 1, fontSize: 15, fontWeight: "600", color: "#374151", marginLeft: 12 }}>
            Change Password
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// Stylesheet for ParentProfileCard layout
// Defines card layout, input fields, buttons and spacing
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
