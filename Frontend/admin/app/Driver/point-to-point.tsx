import { StatusBar } from "expo-status-bar";
import {
    Bell,
    ChevronDown,
    ChevronUp,
    Navigation
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
    Alert,
    Linking,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
interface Student {
  id: string;
  name: string;
  parentPhone: string; // used to send notification
  status: "pending" | "done";
}

interface Stop {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  students: Student[];
  pickupTime: string;
  dropoffTime: string;
}

type RouteTab = "pickup" | "dropoff";
const allStops: Stop[] = [
  {
    id: 1,
    name: "Maple Street",
    address: "123 Maple St",
    latitude: 37.78825,
    longitude: -122.4324,
    pickupTime: "7:15 AM",
    dropoffTime: "3:30 PM",
    students: [
      { id: "s1", name: "Emma Johnson", parentPhone: "+1-555-0101", status: "pending" },
      { id: "s2", name: "Lucas Brown", parentPhone: "+1-555-0102", status: "pending" },
    ],
  },
  {
    id: 2,
    name: "Oak Avenue",
    address: "456 Oak Ave",
    latitude: 37.78925,
    longitude: -122.4314,
    pickupTime: "7:22 AM",
    dropoffTime: "3:38 PM",
    students: [
      { id: "s3", name: "Sophia Davis", parentPhone: "+1-555-0103", status: "pending" },
      { id: "s4", name: "Mason Wilson", parentPhone: "+1-555-0104", status: "pending" },
    ],
  },
  {
    id: 3,
    name: "Pine Road",
    address: "789 Pine Rd",
    latitude: 37.79025,
    longitude: -122.4304,
    pickupTime: "7:30 AM",
    dropoffTime: "3:45 PM",
    students: [
      { id: "s5", name: "Olivia Miller", parentPhone: "+1-555-0105", status: "pending" },
    ],
  },
  {
    id: 4,
    name: "Elm Street",
    address: "321 Elm St",
    latitude: 37.79125,
    longitude: -122.4294,
    pickupTime: "7:38 AM",
    dropoffTime: "3:52 PM",
    students: [
      { id: "s6", name: "Noah Garcia", parentPhone: "+1-555-0106", status: "pending" },
      { id: "s7", name: "Ava Martinez", parentPhone: "+1-555-0107", status: "pending" },
    ],
  },
];

const school = {
  id: 99,
  name: "Washington Elementary",
  address: "100 School Ave",
  latitude: 37.79225,
  longitude: -122.4284,
};
export default function DriverMap() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const [activeTab, setActiveTab] = useState<RouteTab>("pickup");
  const [showStopsList, setShowStopsList] = useState(false);

  
  const [doneStudents, setDoneStudents] = useState<Record<string, boolean>>({});

  
  const orderedStops =
    activeTab === "pickup" ? allStops : [...allStops].reverse();

  
  const totalStudents = allStops.reduce((n, s) => n + s.students.length, 0);
  const doneCount = Object.values(doneStudents).filter(Boolean).length;

  
  const navigateToStop = (stop: Stop) => {
    
    mapRef.current?.animateToRegion(
      {
        latitude: stop.latitude,
        longitude: stop.longitude,
        latitudeDelta: 0.004,
        longitudeDelta: 0.004,
      },
      800
    );

    
    const url = `https://maps.google.com/?daddr=${stop.latitude},${stop.longitude}&directionsmode=driving`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Navigation", `Navigating to ${stop.name}\n${stop.address}`);
    });
  };
