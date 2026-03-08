import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function SettingsScreen() {
  const router = useRouter();
  const [openSection, setOpenSection] = React.useState<string | null>(null);

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
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
          onPress={() => router.push("/Parent/profile")}
        />

        <SettingItem
          icon="card-outline"
          label="Payment & Bank Details"
          onPress={() => {}}
        />

        <Text style={styles.sectionTitle}>App Preferences</Text>

        <SettingItem
          icon="notifications-outline"
          label="Notification Preferences"
          onPress={() => {}}
          showBadge={true}
          badgeCount="1"
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
          onPress={() => {
            //Handle logout logic here
            console.log("Logout pressed");
          }}
        >
          <Ionicons name="log-out-outline" size={20} color="#f1e9e9" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#020813",
    marginTop: 26,
    marginBottom: 8,
    marginHorizontal: 16,
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },

  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  itemLabel: {
    marginLeft: 8,
    fontSize: 16,
    color: "#111827",
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  badge: {
    backgroundColor: "#FEF3C7",
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
    borderColor: "#5AA9E6",
    backgroundColor: "#5AA9E6",
  },

  logoutText: {
    marginLeft: 1,
    fontSize: 16,
    color: "#f1e9e9",
    fontWeight: "500",
  },
  iconCircle: {
    backgroundColor: "#a5d6fb",
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
    backgroundColor: "#F9FAFB",
  },

  policyText: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 8,
    lineHeight: 20,
  },
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
