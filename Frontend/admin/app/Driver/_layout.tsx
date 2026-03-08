import { Tabs } from "expo-router";
import { Map, Megaphone, DollarSign, ClipboardList, User } from "lucide-react-native";

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
          tabBarIcon: ({ color }) => <Map color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="DriverAlert"
        options={{
          title: "Alerts",
          tabBarIcon: ({ color }) => <Megaphone color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="Payment"
        options={{
          title: "Payment",
          tabBarIcon: ({ color }) => <DollarSign color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="Absense"
        options={{
          title: "Attendance",
          tabBarIcon: ({ color }) => <ClipboardList color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="DriverProfile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <User color={color} size={24} />,
        }}
      />

      {/* ── Hidden Tabs (not shown in tab bar) ── */}
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}