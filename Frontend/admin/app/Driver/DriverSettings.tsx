
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";

export default function SettingsScreen() {
  const router = useRouter();
  const { logout, updateUserEmail, updateUserPassword } = useAuth();
  const [openSection, setOpenSection] = React.useState<string | null>(null);

  // Email modal state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  // Password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Notification preferences state
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState({
    tripAlerts: true,
    sosAlerts: true,
    paymentAlerts: true,
    proximityAlerts: true,
  });

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const handleChangeEmail = async () => {
    setEmailError("");
    if (!newEmail || !newEmail.includes("@")) { setEmailError("Enter a valid email"); return; }
    try {
      await updateUserEmail(newEmail);
      Alert.alert("Check your inbox", `A verification link was sent to ${newEmail}. Your email will update after you click it.`);
      setShowEmailModal(false);
      setNewEmail("");
    } catch (err: any) {
      setEmailError(err.message || "Failed to update email");
    }
  };

  const handleChangePassword = async () => {
    setPasswordError("");
    if (!currentPassword || !newPassword || !confirmNewPassword) { setPasswordError("All fields are required"); return; }
    if (newPassword !== confirmNewPassword) { setPasswordError("Passwords do not match"); return; }
    if (newPassword.length < 6) { setPasswordError("Minimum 6 characters"); return; }
    try {
      await updateUserPassword(currentPassword, newPassword);
      Alert.alert("Success", "Password updated.");
      setShowPasswordModal(false);
      setCurrentPassword(""); setNewPassword(""); setConfirmNewPassword("");
    } catch (err: any) {
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setPasswordError("Current password is incorrect");
      } else {
        setPasswordError(err.message || "Failed to update password");
      }
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>

        {/* Account Section */}
        <Text style={styles.sectionTitle}>Account Settings</Text>

        <SettingItem
          icon="person-outline"
          label="Edit Profile"
          onPress={() => router.push("/Driver/DriverProfile")}
        />
        <SettingItem
          icon="mail-outline"
          label="Change Email"
          onPress={() => { setNewEmail(""); setEmailError(""); setShowEmailModal(true); }}
        />
        <SettingItem
          icon="lock-closed-outline"
          label="Change Password"
          onPress={() => { setCurrentPassword(""); setNewPassword(""); setConfirmNewPassword(""); setPasswordError(""); setShowPasswordModal(true); }}
        />

        <SettingItem
          icon="card-outline"
          label="Payment & Bank Details"
          onPress={() => router.push("/Driver/Payment")}
        />

        <Text style={styles.sectionTitle}>App Preferences</Text>

        <SettingItem
          icon="notifications-outline"
          label="Notification Preferences"
          onPress={() => setShowNotifModal(true)}
        />

        <SettingItem
          icon="map-outline"
          label="Route & Map Settings"
          onPress={() => toggleSection("Route")}
        />

        {openSection === "Route" && (
          <View style={styles.dropdownContainer}>
            <Text style={styles.policyText}>
              1. GPS tracking is provided for monitoring the vehicle location in
              real time.
            </Text>

            <Text style={styles.policyText}>
              2. Location data is collected only for safety and transport
              monitoring purposes.
            </Text>

            <Text style={styles.policyText}>
              3. Map information may sometimes be delayed or inaccurate due to
              network or technical issues.
            </Text>
            <Text style={styles.policyText}>
              4. Parents must not misuse the tracking system or share live
              location data without permission.
            </Text>
            <Text style={styles.policyText}>
              5. The company is not responsible for delays caused by traffic,
              weather, or other unavoidable circumstances.
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Support & Legal</Text>
        <>
          <SettingItem
            icon="help-circle-outline"
            label="Help & Support"
            onPress={() => toggleSection("Help")}
          />
          {openSection === "Help" && (
            <View style={styles.dropdownContainer}>
              <Text style={styles.policyText}>
                1. Parents can contact Help & Support through the Parent Portal
                for questions or issues.
              </Text>

              <Text style={styles.policyText}>
                2. All communication must be respectful and sent through
                official channels. service purposes.
              </Text>

              <Text style={styles.policyText}>
                3. Parents must ensure their child is ready at pickup time and
                inform the company about any special needs.
              </Text>
              <Text style={styles.policyText}>
                4. Refund and cancellation requests must follow company policy
                and be submitted in writing.
              </Text>
              <Text style={styles.policyText}>
                5. All personal and tracking information will be kept secure and
                used only for safety purposes.
              </Text>
            </View>
          )}
          <SettingItem
            icon="shield-checkmark-outline"
            label="Privacy Policy"
            onPress={() => toggleSection("privacy")}
          />
        </>
        {openSection === "privacy" && (
          <View style={styles.dropdownContainer}>
            <Text style={styles.policyText}>
              1. Student and parent information will be stored securely.
            </Text>

            <Text style={styles.policyText}>
              2. GPS tracking data is collected for safety and monitoring
              purposes.
            </Text>

            <Text style={styles.policyText}>
              3. Data will not be sold or shared with third parties without
              consent unless required by law.
            </Text>
          </View>
        )}
        <SettingItem
          icon="document-text-outline"
          label="Terms of Service"
          onPress={() => toggleSection("Terms")}
        />
        {openSection === "Terms" && (
          <View style={styles.dropdownContainer}>
            <Text style={styles.policyText}>
              1. “Parent” refers to a legal guardian registered in the system.
            </Text>

            <Text style={styles.policyText}>
              2. “Student” refers to the child registered for transportation
              service purposes.
            </Text>

            <Text style={styles.policyText}>
              3. “Portal” refers to the web/mobile interface for monitoring
              transport services.
            </Text>
          </View>
        )}

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={async () => {
            await logout();
            router.replace("/RoleSelectionScreen");
          }}
        >
          <Ionicons name="log-out-outline" size={20} color="#f1e9e9" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Change Email Modal */}
      <Modal visible={showEmailModal} transparent animationType="slide" onRequestClose={() => setShowEmailModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Change Email</Text>
            <Text style={styles.modalSub}>A verification link will be sent to the new address.</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="New email address"
              value={newEmail}
              onChangeText={setNewEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
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

      {/* Notification Preferences Modal */}
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
              <TouchableOpacity
                key={key}
                style={styles.notifRow}
                onPress={() => setNotifPrefs((prev) => ({ ...prev, [key]: !prev[key] }))}
              >
                <Text style={styles.notifLabel}>{label}</Text>
                <Ionicons
                  name={notifPrefs[key] ? "checkmark-circle" : "ellipse-outline"}
                  size={22}
                  color={notifPrefs[key] ? "#3b82f6" : "#9CA3AF"}
                />
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

      {/* Change Password Modal */}
      <Modal visible={showPasswordModal} transparent animationType="slide" onRequestClose={() => setShowPasswordModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <TextInput style={styles.modalInput} placeholder="Current password" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
            <TextInput style={styles.modalInput} placeholder="New password" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
            <TextInput style={styles.modalInput} placeholder="Confirm new password" value={confirmNewPassword} onChangeText={setConfirmNewPassword} secureTextEntry />
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f0f4f8",
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 26,
    marginBottom: 8,
    marginHorizontal: 16,
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },

  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  itemLabel: {
    marginLeft: 8,
    fontSize: 16,
    color: "#0f172a",
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  badge: {
    backgroundColor: "#fef3c7",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
    minWidth: 20,
    alignItems: "center",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#D97706",
  },

  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3b82f6",
    backgroundColor: "#3b82f6",
  },

  logoutText: {
    marginLeft: 1,
    fontSize: 16,
    color: "#ffffff",
    fontWeight: "500",
  },
  iconCircle: {
    backgroundColor: "#3b82f6",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  dropdownContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#f8fafc",
  },

  policyText: {
    fontSize: 14,
    color: "#334155",
    marginBottom: 8,
    lineHeight: 20,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a", marginBottom: 4 },
  modalSub: { fontSize: 13, color: "#64748b", marginBottom: 16 },
  modalInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    marginBottom: 12,
    backgroundColor: "#f8fafc",
  },
  modalError: { color: "#ef4444", fontSize: 13, marginBottom: 8 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  modalCancel: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: "#e2e8f0", alignItems: "center",
  },
  modalCancelText: { color: "#64748b", fontWeight: "600" },
  modalConfirm: {
    flex: 2, paddingVertical: 12, borderRadius: 10,
    backgroundColor: "#3b82f6", alignItems: "center",
  },
  modalConfirmText: { color: "#ffffff", fontWeight: "700" },
  notifRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#e2e8f0",
  },
  notifLabel: { fontSize: 15, color: "#0f172a" },
});
function SettingItem({
  icon,
  label,
  onPress,
  showBadge = false,
  badgeCount,
}: {
  icon: any;
  label: string;
  onPress: () => void;
  showBadge?: boolean;
  badgeCount?: string;
}) {
  return (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <View style={styles.itemLeft}>
        <View style={styles.iconCircle}>
          <Ionicons name={icon} size={20} color="#FFFFFF" />
        </View>
        <Text style={styles.itemLabel}>{label}</Text>
      </View>
      <View style={styles.itemRight}>
        {showBadge && badgeCount && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badgeCount}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
      </View>
    </TouchableOpacity>
  );
}
