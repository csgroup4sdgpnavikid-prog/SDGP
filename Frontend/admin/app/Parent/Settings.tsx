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

  return (
    <View style={styles.screen}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 24 }} />
        </View>

        <Text style={styles.sectionTitle}>Account Settings</Text>
        <SettingItem
          icon="person-outline"
          label="Edit Profile"
            onPress={() => {}}
        />
        <SettingItem
          icon="lock-closed-outline"
          label="Change Password"
          onPress={() => {}}
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
            onPress={() => {}}
        />

        <Text style={styles.sectionTitle}>Support & Legal</Text>
        <SettingItem
          icon="help-circle-outline"
          label="Help & Support"
            onPress={() => {}}
        />
        <SettingItem
          icon="shield-checkmark-outline"
          label="Privacy Policy"
          onPress={() => {}}
        />
        <SettingItem
          icon="document-text-outline"
          label="Terms of Service"
          onPress={() => {}}
        />

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={() => {
          // Handle logout logic here
          console.log("Logout pressed");
        }}>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
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
    borderColor:  "#5AA9E6",
    backgroundColor:  "#5AA9E6",
  },
  logoutText: {
    marginLeft: -15,
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
