import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";

import { useColorScheme } from "../../hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#3b82f6",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 0,
          shadowColor: "#0f172a",
          shadowOpacity: 0.06,
          shadowOffset: { width: 0, height: -2 },
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarInactiveTintColor: "#94a3b8",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
        headerStyle: {
          backgroundColor: "#ffffff",
        },
        headerTitleStyle: {
          color: "#5AA9E6",
          fontSize:18,
        },
        headerTintColor: "#0f172a",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "home-sharp" : "home-outline"}
              color={color}
              size={24}
            />
          ),
        }}
      />
      {/* Your Child */}
      <Tabs.Screen
        name="your_child"
        options={{
          title: "Your Child",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "accessibility" : "accessibility-outline"}
              color={color}
              size={24}
            />
          ),
        }}
      />
      {/* Alerts */}
      <Tabs.Screen
        name="ParentAlert"
        options={{
          title: "Notifications",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "notifications" : "notifications-outline"}
              color={color}
              size={24}
            />
          ),
        }}
      />
      {/* Track Van */}
      <Tabs.Screen
        name="LiveVanLocation"
        options={{
          title: "Track Van",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "location" : "location-outline"}
              color={color}
              size={24}
            />
          ),
        }}
      />
      {/* Rate Driver */}
      <Tabs.Screen
        name="RateDriver"
        options={{
          title: "Rate Driver",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "star" : "star-outline"}
              color={color}
              size={24}
            />
          ),
        }}
      />
      {/* Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              color={color}
              size={24}
            />
          ),
        }}
      />

      {/* Hidden screens */}
      <Tabs.Screen name="Settings" options={{ href: null }} />
      <Tabs.Screen name="PaymentStatus" options={{ href: null }} />
    </Tabs>
  );
}
