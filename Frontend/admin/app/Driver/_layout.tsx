import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderColor: "#E5E7EB",
          paddingTop: 4,
        },
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#6B7280",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
      }}
    >
      {/* ── Visible Tabs (5 only) ── */}
      <Tabs.Screen
        name="DriverMap"
        options={{
          title: "Map",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "map" : "map-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="DriverAlert"
        options={{
          title: "Alerts",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "megaphone" : "megaphone-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="Payment"
        options={{
          title: "Payment",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "cash" : "cash-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="Absent-list"
        options={{
          title: "Attendance",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "clipboard" : "clipboard-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="DriverProfile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
          ),
        }}
      />

      {/* ── Hidden Tabs (not shown in tab bar) ── */}
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="explore" options={{ href: null }} />
      <Tabs.Screen name="DriverSettings" options={{ href: null }} />
      <Tabs.Screen name="Students" options={{ href: null }} />
      <Tabs.Screen name="LiveVan" options={{ href: null }} />
    </Tabs>
  );
}
