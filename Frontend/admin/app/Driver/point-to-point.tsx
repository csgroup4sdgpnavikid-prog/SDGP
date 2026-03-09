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
