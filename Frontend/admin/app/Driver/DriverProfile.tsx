import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Alert,
  KeyboardAvoidingView, Platform, KeyboardTypeOptions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { User, Settings, LogOut, Edit3, Save, X, Camera } from "lucide-react-native";

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  address: string;
  licenseNumber: string;
  vanModel: string;
  vanPlate: string;
  startDate: string;
  emergencyContact: string;
  emergencyPhone: string;
}

interface ProfileFieldProps {
  label: string;
  value: string;
  fieldKey: keyof ProfileData;
  editable?: boolean;
  multiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
}

export default function DriverProfile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);

  const [profile, setProfile] = useState<ProfileData>({
    name: "Alex Rodriguez",
    email: "alex.rodriguez@email.com",
    phone: "(555) 123-4567",
    address: "123 Main Street, Springfield, IL 62701",
    licenseNumber: "DL123456789",
    vanModel: "2020 Ford Transit",
    vanPlate: "VAN-123",
    startDate: "2022-09-15",
    emergencyContact: "Maria Rodriguez",
    emergencyPhone: "(555) 987-6543",
  });

  const [editedProfile, setEditedProfile] = useState<ProfileData>(profile);

  const pickImage = async () => {
    try {
      setIsLoadingImage(true);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "We need camera roll permissions to change your profile photo!", [{ text: "OK" }]);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (!result.canceled) setProfileImage(result.assets[0].uri);
    } catch (error) {
      Alert.alert("Error", "Failed to pick image. Please try again.");
      console.error("Image picker error:", error);
    } finally {
      setIsLoadingImage(false);
    }
  };

  const validateProfile = (): boolean => {
    if (!editedProfile.name.trim()) { Alert.alert("Validation Error", "Name cannot be empty"); return false; }
    if (!editedProfile.email.trim() || !editedProfile.email.includes("@")) { Alert.alert("Validation Error", "Please enter a valid email address"); return false; }
    if (!editedProfile.phone.trim()) { Alert.alert("Validation Error", "Phone number cannot be empty"); return false; }
    return true;
  };

  const handleSave = () => {
    if (validateProfile()) {
      setProfile(editedProfile);
      setIsEditing(false);
      Alert.alert("Success", "Profile updated successfully!");
    }
  };

  const handleCancel = () => {
    Alert.alert("Discard Changes", "Are you sure you want to discard your changes?", [
      { text: "Keep Editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: () => { setEditedProfile(profile); setIsEditing(false); } },
    ]);
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => { router.replace("/(auth)/DriverLogin"); } },
    ]);
  };

  const ProfileField: React.FC<ProfileFieldProps> = ({
    label, value, fieldKey, editable = true, multiline = false, keyboardType = "default",
  }) => (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 14, color: "#6B7280", marginBottom: 6, fontWeight: "500" }}>{label}</Text>
      {isEditing && editable ? (
        <TextInput
          style={{ backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, padding: 12, fontSize: 16, color: "#111827", minHeight: multiline ? 80 : 44, textAlignVertical: multiline ? "top" : "center" }}
          value={editedProfile[fieldKey]}
          onChangeText={(text) => setEditedProfile((prev) => ({ ...prev, [fieldKey]: text }))}
          multiline={multiline}
          keyboardType={keyboardType}
        />
      ) : (
        <Text style={{ fontSize: 16, color: "#111827", lineHeight: 24 }}>{value}</Text>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#F9FAFB" }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={{ backgroundColor: "#fff", paddingTop: insets.top + 20, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={{ fontSize: 24, fontWeight: "bold", color: "#111827" }}>Driver Profile</Text>
            <Text style={{ fontSize: 16, color: "#6B7280", marginTop: 4 }}>Manage your information</Text>
          </View>
          {isEditing ? (
            <View style={{ flexDirection: "row" }}>
              <TouchableOpacity onPress={handleCancel} style={{ backgroundColor: "#F3F4F6", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: "row", alignItems: "center", marginRight: 8 }}>
                <X size={16} color="#6B7280" />
                <Text style={{ color: "#6B7280", fontWeight: "500", marginLeft: 4 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={{ backgroundColor: "#2563EB", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: "row", alignItems: "center" }}>
                <Save size={16} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "500", marginLeft: 4 }}>Save</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setIsEditing(true)} style={{ backgroundColor: "#2563EB", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: "row", alignItems: "center" }}>
              <Edit3 size={16} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "500", marginLeft: 4 }}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }} keyboardShouldPersistTaps="handled">
        {/* Profile Photo */}
        <View style={{ padding: 20, alignItems: "center" }}>
          <TouchableOpacity onPress={pickImage} activeOpacity={0.7} disabled={isLoadingImage}>
            <View style={{ position: "relative" }}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={{ width: 80, height: 80, borderRadius: 40 }} contentFit="cover" />
              ) : (
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "#2563EB", justifyContent: "center", alignItems: "center" }}>
                  <User size={32} color="#fff" />
                </View>
              )}
              <View style={{ position: "absolute", bottom: 0, right: 0, backgroundColor: "#fff", borderRadius: 12, padding: 6, borderWidth: 2, borderColor: "#2563EB" }}>
                <Camera size={16} color="#2563EB" />
              </View>
            </View>
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: "bold", color: "#111827", marginTop: 12 }}>{profile.name}</Text>
          <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 2 }}>School Van Driver</Text>
        </View>

        {/* Personal Information */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View style={{ backgroundColor: "#fff", padding: 20, borderRadius: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: "#111827", marginBottom: 16 }}>Personal Information</Text>
            <ProfileField label="Full Name" value={profile.name} fieldKey="name" />
            <ProfileField label="Email Address" value={profile.email} fieldKey="email" keyboardType="email-address" />
            <ProfileField label="Phone Number" value={profile.phone} fieldKey="phone" keyboardType="phone-pad" />
            <ProfileField label="Home Address" value={profile.address} fieldKey="address" multiline />
          </View>
        </View>

        {/* Vehicle Information */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View style={{ backgroundColor: "#fff", padding: 20, borderRadius: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: "#111827", marginBottom: 16 }}>Vehicle Information</Text>
            <ProfileField label="Van Model" value={profile.vanModel} fieldKey="vanModel" />
            <ProfileField label="License Plate" value={profile.vanPlate} fieldKey="vanPlate" />
            <ProfileField label="Driver's License Number" value={profile.licenseNumber} fieldKey="licenseNumber" />
          </View>
        </View>

        {/* Employment Information */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View style={{ backgroundColor: "#fff", padding: 20, borderRadius: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: "#111827", marginBottom: 16 }}>Employment Information</Text>
            <ProfileField label="Start Date" value={profile.startDate} fieldKey="startDate" editable={false} />
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, color: "#6B7280", marginBottom: 6, fontWeight: "500" }}>Employment Status</Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#10B981", marginRight: 8 }} />
                <Text style={{ fontSize: 16, color: "#111827" }}>Active</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Emergency Contact */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View style={{ backgroundColor: "#fff", padding: 20, borderRadius: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: "#111827", marginBottom: 16 }}>Emergency Contact</Text>
            <ProfileField label="Contact Name" value={profile.emergencyContact} fieldKey="emergencyContact" />
            <ProfileField label="Contact Phone" value={profile.emergencyPhone} fieldKey="emergencyPhone" keyboardType="phone-pad" />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={{ paddingHorizontal: 20 }}>
          {/* ── Settings button now navigates to DriverSettings ── */}
          <TouchableOpacity
            onPress={() => router.push("./DriverSettings")}
            style={{ backgroundColor: "#fff", padding: 16, borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB", flexDirection: "row", justifyContent: "center", marginBottom: 12 }}
          >
            <Settings size={20} color="#6B7280" />
            <Text style={{ fontSize: 16, color: "#6B7280", fontWeight: "500", marginLeft: 8 }}>App Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSignOut}
            style={{ backgroundColor: "#fff", padding: 16, borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: "#FEE2E2", flexDirection: "row", justifyContent: "center" }}
          >
            <LogOut size={20} color="#EF4444" />
            <Text style={{ fontSize: 16, color: "#EF4444", fontWeight: "500", marginLeft: 8 }}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}