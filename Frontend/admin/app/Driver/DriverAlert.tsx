import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { getAuth } from "firebase/auth";
import { API_BASE_URL } from "../../constants/api";
import { moderateScale, wp } from "../../constants/responsive";
import { doc, getDoc, updateDoc } from "firebase/firestore";
 // adjusted path since had an error
import { db } from "../../firebaseConfig";
import { Clock, TrafficCone, Wrench, Cloud, AlertCircle, CheckCircle, LucideIcon } from "lucide-react-native";

interface QuickAlert {
    id: number;
    icon: LucideIcon;
    text: string;
    message: string;
}

// Configure how notifications should be handled when app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function DriverAlert() {
    const insets = useSafeAreaInsets();
    const [selectedAlert, setSelectedAlert] = useState<number | null>(null);
    const [customMessage, setCustomMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [expoPushToken, setExpoPushToken] = useState<string>("");
    const [driverId, setDriverId] = useState<string>("");
    const maxLength = 100;

    const quickAlerts: QuickAlert[] = [
        { id: 1, icon: Clock, text: "Running 10 mins late", message: "Running 10 mins late" },
        { id: 2, icon: TrafficCone, text: "Heavy traffic delay", message: "Experiencing heavy traffic delay" },
        { id: 3, icon: Wrench, text: "Mechanical issue", message: "Van has a mechanical issue" },
        { id: 4, icon: Cloud, text: "Delay due to weather", message: "Delay due to weather conditions" },
        { id: 5, icon: AlertCircle, text: "Accident", message: "Accident on route - expect delays" },
        { id: 6, icon: CheckCircle, text: "All students dropped off", message: "All students have been dropped off" },
    ];

    // On mount: get push token + current driver ID, then save token to Firestore
    useEffect(() => {
        setupDriverAndToken();
    }, []);

    async function setupDriverAndToken() {
        // Get the logged-in driver's UID from Firebase Auth
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (currentUser) {
            setDriverId(currentUser.uid);
            console.log("Driver UID:", currentUser.uid);
        } else {
            console.warn("No logged-in user found");
        }

        // Get push token
        const token = await registerForPushNotificationsAsync();
        if (token) {
            setExpoPushToken(token);

            // Save push token to Firestore so backend can reach this driver too
            if (currentUser) {
                try {
                    await updateDoc(doc(db, "drivers", currentUser.uid), {
                        expoPushToken: token,
                    });
                } catch (e) {
                    console.warn("Could not save driver token to Firestore:", e);
                }
            }
        }
    }

    async function registerForPushNotificationsAsync() {
        let token;

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        if (Device.isDevice) {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            
            if (existingStatus !== "granted") {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            
            if (finalStatus !== "granted") {
                console.log("Push notification permissions not granted");
                return;
            }
            
            try {
                token = (await Notifications.getExpoPushTokenAsync({
                    projectId: Constants.expoConfig?.extra?.eas?.projectId
                        ?? Constants.easConfig?.projectId,
                })).data;
            } catch (error) {
                console.error("Error getting push token:", error);
            }
        } else {
            console.log("Not a physical device - push notifications won't work");
        }

        return token;
    }

    const handleQuickAlert = (alert: QuickAlert) => {
        setSelectedAlert(alert.id);
        setCustomMessage("");
    };

    const handleSendAlert = async () => {
        const messageToSend =
            customMessage.trim() ||
            quickAlerts.find((a) => a.id === selectedAlert)?.message;
    
        if (!messageToSend) {
            Alert.alert("No message", "Please select an alert or type a message.");
            return;
        }

        if (!driverId) {
            Alert.alert("Error", "Driver ID not found. Please log in again.");
            return;
        }

        setIsSending(true);

        try {
            // ── Get Firebase auth token (required by backend verifyToken middleware) ──
            const auth = getAuth();
            const idToken = await auth.currentUser?.getIdToken();
            if (!idToken) {
                Alert.alert("Auth Error", "Session expired. Please log in again.");
                return;
            }

            // ── Send to backend ─
            const response = await fetch(`${API_BASE_URL}/api/sos/trigger`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                    driverId: driverId,   // uses actual logged-in driver's UID
                    message: messageToSend,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error: ${errorText}`);
            }

            const result = await response.json();
            console.log("✅ Backend response:", result);

            // Success feedback
            Alert.alert(
                "✅ Alert Sent Successfully",
                `Message sent to ${result.parentsNotified ?? "all"} parent(s):\n"${messageToSend}"`,
                [
                    {
                        text: "OK",
                        onPress: () => {
                            setSelectedAlert(null);
                            setCustomMessage("");
                        },
                    },                
                ],
            );
        } catch (error) {
            console.error("Error sending alert:", error);
            Alert.alert(
                "❌ Failed to Send",
                `Could not reach the server.\n\nMake sure:\n• Backend is running (node server.js)\n• Backend is on the same WiFi network\n• Both devices on same WiFi\n\nError: ${error instanceof Error ? error.message : String(error)}`,
                [{ text: "OK" }]
            );
        } finally {
            setIsSending(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: "#f0f4f8" }}>
            <StatusBar style="dark" />

            <View
                style={{
                    backgroundColor: "#fff",
                    paddingTop: insets.top + moderateScale(20),
                    paddingHorizontal: wp(5),
                    paddingBottom: moderateScale(16),
                    borderBottomWidth: 1,
                    borderBottomColor: "#e2e8f0",
                }}
            >
                <Text style={{ fontSize: moderateScale(24), fontWeight: "bold", color: "#0f172a" }}>
                    Send Parent Alert
                </Text>

                <View style={{ flexDirection: "row", alignItems: "center", marginTop: moderateScale(8) }}>
                    <View
                        style={{
                            width: moderateScale(8),
                            height: moderateScale(8),
                            borderRadius: moderateScale(4),
                            backgroundColor: expoPushToken ? "#10B981" : "#EF4444",
                            marginRight: moderateScale(6),
                        }}
                    />
                    <Text style={{ fontSize: moderateScale(14), color: "#64748b" }}>
                        {expoPushToken ? "Connected to notification service" : "Not connected"}
                    </Text>
                </View>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: insets.bottom + moderateScale(100) }}
                showsVerticalScrollIndicator={false}
            >
                <View style={{ padding: wp(5) }}>
                    <Text style={{ fontSize: moderateScale(22), fontWeight: "bold", color: "#0f172a", marginBottom: moderateScale(20) }}>
                        Quick Alerts
                    </Text>

                    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
                        {quickAlerts.map((alert) => {
                            const Icon = alert.icon;
                            const isSelected = selectedAlert === alert.id;
                            return (
                                <TouchableOpacity
                                    key={alert.id}
                                    onPress={() => handleQuickAlert(alert)}
                                    disabled={isSending}
                                    style={{
                                        width: "48%",
                                        backgroundColor: isSelected ? "#eff6ff" : "#ffffff",
                                        borderRadius: moderateScale(16),
                                        padding: moderateScale(20),
                                        marginBottom: moderateScale(16),
                                        alignItems: "center",
                                        justifyContent: "center",
                                        minHeight: moderateScale(140),
                                        borderWidth: isSelected ? 2 : 1,
                                        borderColor: isSelected ? "#3b82f6" : "#e2e8f0",
                                        opacity: isSending ? 0.5 : 1,
                                    }}
                                >
                                    <View style={{ marginBottom: moderateScale(12) }}>
                                        <Icon size={moderateScale(40)} color="#3b82f6" strokeWidth={2} />
                                    </View>
                                    <Text style={{ fontSize: moderateScale(15), fontWeight: "500", color: "#0f172a", textAlign: "center" }}>
                                        {alert.text}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <View style={{ marginTop: moderateScale(24) }}>
                        <Text style={{ fontSize: moderateScale(16), color: "#0f172a", marginBottom: moderateScale(12), fontWeight: "500" }}>
                            Type a custom message below.
                        </Text>

                        <View style={{ backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: moderateScale(14), padding: moderateScale(16), minHeight: moderateScale(120) }}>
                            <TextInput
                                style={{ fontSize: moderateScale(15), color: "#0f172a", flex: 1, textAlignVertical: "top" }}
                                placeholder="Custom Message."
                                placeholderTextColor="#94a3b8"
                                multiline
                                maxLength={maxLength}
                                value={customMessage}
                                editable={!isSending}
                                onChangeText={(text) => {
                                    setCustomMessage(text);
                                    if (text.trim()) setSelectedAlert(null);
                                }}
                            />
                            <Text style={{ fontSize: moderateScale(14), color: "#64748b", textAlign: "right", marginTop: moderateScale(8) }}>
                                {customMessage.length}/{maxLength}
                            </Text>
                        </View>
                    </View>


                </View>
            </ScrollView>

            {/* Send alert button */}
            <View
                style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: "#fff",
                    paddingHorizontal: wp(5),
                    paddingTop: moderateScale(16),
                    paddingBottom: insets.bottom + moderateScale(16),
                    borderTopWidth: 1,
                    borderTopColor: "#e2e8f0",
                }}
            >
                <TouchableOpacity
                    onPress={handleSendAlert}
                    disabled={isSending}
                    style={{
                        backgroundColor: isSending ? "#94a3b8" : "#3b82f6",
                        borderRadius: moderateScale(14),
                        paddingVertical: moderateScale(16),
                        alignItems: "center",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: 3,
                        flexDirection: "row",
                        justifyContent: "center",
                    }}
                >
                    {isSending ? (
                        <>
                            <ActivityIndicator color="#fff" style={{ marginRight: moderateScale(8) }} />
                            <Text style={{ color: "#fff", fontSize: moderateScale(17), fontWeight: "bold" }}>Sending...</Text>
                        </>
                    ) : (
                        <Text style={{ color: "#fff", fontSize: moderateScale(17), fontWeight: "bold" }}>Send Alert</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}