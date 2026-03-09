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


type RouteTab = "pickup" | "dropoff";
type NotifyType = "proximity" | "confirmed";

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

        {
        id: "s1",
        name: "Emma Johnson",
        parentPhone: "+1-555-0101",
        parentExpoPushToken: "ExponentPushToken[PARENT_TOKEN_1]",
        status: "pending",
      },
      {
        id: "s2",
        name: "Lucas Brown",
        parentPhone: "+1-555-0102",
        parentExpoPushToken: "ExponentPushToken[PARENT_TOKEN_2]",
        status: "pending",
      },
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
      {
        id: "s3",
        name: "Sophia Davis",
        parentPhone: "+1-555-0103",
        parentExpoPushToken: "ExponentPushToken[PARENT_TOKEN_3]",
        status: "pending",
      },