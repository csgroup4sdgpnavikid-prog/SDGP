import * as Location from "expo-location";
import { StatusBar } from "expo-status-bar";
import { Bell, ChevronDown, ChevronUp, Navigation, Radio } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Linking,
  PanResponder,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Circle, Marker, Polyline } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const API_BASE = "http://localhost:4000";

const PROXIMITY_RADIUS_M = 300;

interface Student {
  id: string;
  name: string;
  parentPhone: string;
  parentExpoPushToken: string; // FCM / Expo push token for the parent's phone
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