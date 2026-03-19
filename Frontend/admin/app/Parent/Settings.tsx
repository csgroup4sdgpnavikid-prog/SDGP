import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert, Modal, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";

export default function ParentSettings() {
  const router = useRouter();
  const { logout, updateUserEmail, updateUserPassword } = useAuth();
  const [openSection, setOpenSection] = useState<string | null>(null);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState({
    tripAlerts: true, sosAlerts: true, paymentAlerts: true, proximityAlerts: true,
  });

  const toggleSection = (s: string) => setOpenSection(openSection === s ? null : s);

  const handleChangeEmail = async () => {
    setEmailError("");
    if (!newEmail || !newEmail.includes("@")) { setEmailError("Enter a valid email"); return; }
    try {
      await updateUserEmail(newEmail);
      Alert.alert("Check your inbox", `A verification link was sent to ${newEmail}. Your email updates after you click it.`);
      setShowEmailModal(false); setNewEmail("");
    } catch (err: any) { setEmailError(err.message || "Failed to update email"); }
  };

  const handleChangePassword = async () => {
    setPasswordError("");
    if (!currentPassword || !newPassword || !confirmPassword) { setPasswordError("All fields are required"); return; }
    if (newPassword !== confirmPassword) { setPasswordError("Passwords do not match"); return; }
    if (newPassword.length < 6) { setPasswordError("Minimum 6 characters"); return; }
    try {
      await updateUserPassword(currentPassword, newPassword);
      Alert.alert("Success", "Password updated.");
      setShowPasswordModal(false);
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err: any) {
      setPasswordError(
        err.code === "auth/wrong-password" || err.code === "auth/invalid-credential"
          ? "Current password is incorrect"
          : err.message || "Failed to update password"
      );
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Account Settings</Text>
        <SettingItem icon="person-outline" label="Edit Profile" onPress={() => router.push("/Parent/profile")} />
        <SettingItem icon="mail-outline" label="Change Email"
          onPress={() => { setNewEmail(""); setEmailError(""); setShowEmailModal(true); }} />
        <SettingItem icon="lock-closed-outline" label="Change Password"
          onPress={() => { setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setPasswordError(""); setShowPasswordModal(true); }} />
        <SettingItem icon="card-outline" label="Payment Status" onPress={() => router.push("/Parent/PaymentStatus")} />

        <Text style={styles.sectionTitle}>App Preferences</Text>
        <SettingItem icon="notifications-outline" label="Notification Preferences" onPress={() => setShowNotifModal(true)} />

        <Text style={styles.sectionTitle}>Support & Legal</Text>
        <SettingItem icon="help-circle-outline" label="Help & Support" onPress={() => toggleSection("Help")} />
        {openSection === "Help" && (
          <View style={styles.dropdown}>
            <Text style={styles.dropText}>For support, contact your school admin or driver through the app. All queries must be submitted through official channels.</Text>
          </View>
        )}
        <SettingItem icon="shield-checkmark-outline" label="Privacy Policy" onPress={() => toggleSection("Privacy")} />
        {openSection === "Privacy" && (
          <View style={styles.dropdown}>
            <Text style={styles.dropText}>Your personal data and your child's information are stored securely. GPS data is collected only for safety monitoring. Data is never sold to third parties.</Text>
          </View>
        )}
        <SettingItem icon="document-text-outline" label="Terms of Service" onPress={() => toggleSection("Terms")} />
        {openSection === "Terms" && (
          <View style={styles.dropdown}>
            <Text style={styles.dropText}>By using NaviKid you agree to our terms including responsible use of the tracking system and child data protection policies.</Text>
          </View>
        )}

        <TouchableOpacity style={styles.logoutBtn}
          onPress={async () => { await logout(); router.replace("/RoleSelectionScreen"); }}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showEmailModal} transparent animationType="slide" onRequestClose={() => setShowEmailModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Change Email</Text>
            <Text style={styles.modalSub}>A verification link will be sent to the new address.</Text>
            <TextInput style={styles.modalInput} placeholder="New email address" value={newEmail}
              onChangeText={setNewEmail} keyboardType="email-address" autoCapitalize="none" />
            {emailError ? <Text style={styles.modalError}>{emailError}</Text> : null}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowEmailModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleChangeEmail}>
                <Text style={styles.modalConfirmText}>Send Link</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showPasswordModal} transparent animationType="slide" onRequestClose={() => setShowPasswordModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <TextInput style={styles.modalInput} placeholder="Current password" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
            <TextInput style={styles.modalInput} placeholder="New password" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
            <TextInput style={styles.modalInput} placeholder="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
            {passwordError ? <Text style={styles.modalError}>{passwordError}</Text> : null}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowPasswordModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleChangePassword}>
                <Text style={styles.modalConfirmText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showNotifModal} transparent animationType="slide" onRequestClose={() => setShowNotifModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Notification Preferences</Text>
            <Text style={styles.modalSub}>Choose which alerts you want to receive.</Text>
            {([
              { key: "tripAlerts", label: "Trip start / end alerts" },
              { key: "sosAlerts", label: "Emergency SOS alerts" },
              { key: "paymentAlerts", label: "Payment confirmations" },
              { key: "proximityAlerts", label: "Van approaching (500m)" },
            ] as const).map(({ key, label }) => (
              <TouchableOpacity key={key} style={styles.notifRow}
                onPress={() => setNotifPrefs((p) => ({ ...p, [key]: !p[key] }))}>
                <Text style={styles.notifLabel}>{label}</Text>
                <Ionicons name={notifPrefs[key] ? "checkmark-circle" : "ellipse-outline"}
                  size={22} color={notifPrefs[key] ? "#86c7ef" : "#9CA3AF"} />
              </TouchableOpacity>
            ))}
            <View style={[styles.modalActions, { marginTop: 16 }]}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowNotifModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={() => setShowNotifModal(false)}>
                <Text style={styles.modalConfirmText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SettingItem({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <View style={styles.itemLeft}>
        <View style={styles.iconCircle}><Ionicons name={icon} size={20} color="#fff" /></View>
        <Text style={styles.itemLabel}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  backBtn: { margin: 16 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#111827", marginTop: 24, marginBottom: 6, marginHorizontal: 16 },
  item: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  itemLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#86c7ef", justifyContent: "center", alignItems: "center" },
  itemLabel: { fontSize: 15, color: "#111827" },
  dropdown: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: "#F9FAFB" },
  dropText: { fontSize: 14, color: "#374151", lineHeight: 20 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, margin: 24, padding: 14, borderRadius: 12, backgroundColor: "#EF4444" },
  logoutText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 4 },
  modalSub: { fontSize: 13, color: "#6B7280", marginBottom: 16 },
  modalInput: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, marginBottom: 12 },
  modalError: { color: "#EF4444", fontSize: 13, marginBottom: 8 },
  modalActions: { flexDirection: "row", gap: 12 },
  modalCancel: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center" },
  modalCancelText: { color: "#6B7280", fontWeight: "600" },
  modalConfirm: { flex: 2, paddingVertical: 12, borderRadius: 10, backgroundColor: "#86c7ef", alignItems: "center" },
  modalConfirmText: { color: "#fff", fontWeight: "700" },
  notifRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  notifLabel: { fontSize: 15, color: "#111827" },
});
