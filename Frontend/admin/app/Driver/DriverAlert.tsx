import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { getAuth } from "firebase/auth";
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

//  IMPORTANT: Replace with PC's local IP 
// Run `ipconfig` to get the ip

const BACKEND_URL = "http://192.168.1.8:5000";
// 

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
            console.log("Expo Push Token:", token);

            // Save push token to Firestore so backend can reach this driver too
            if (currentUser) {
                try {
                    await updateDoc(doc(db, "drivers", currentUser.uid), {
                        expoPushToken: token,
                    });
                    console.log("✅ Driver push token saved to Firestore");
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
                    projectId: "7c01cf21-d0c7-4d53-a992-5d74bfde98f2",
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
            // ── Send to backend ─
            const response = await fetch(`${BACKEND_URL}/api/sos/trigger`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
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
                `Could not reach the server.\n\nMake sure:\n• Backend is running (node server.js)\n• IP in BACKEND_URL is correct\n• Both devices on same WiFi\n\nError: ${error instanceof Error ? error.message : String(error)}`,
                [{ text: "OK" }]
            );
        } finally {
            setIsSending(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
            <StatusBar style="dark" />

            <View
                style={{
                    backgroundColor: "#fff",
                    paddingTop: insets.top + 20,
                    paddingHorizontal: 20,
                    paddingBottom: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: "#E5E7EB",
                }}
            >
                <Text style={{ fontSize: 24, fontWeight: "bold", color: "#111827" }}>
                    Send Parent Alert
                </Text>
                
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
                    <View
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: expoPushToken ? "#10B981" : "#EF4444",
                            marginRight: 6,
                        }}
                    />
                    <Text style={{ fontSize: 14, color: "#6B7280" }}>
                        {expoPushToken ? "Connected to notification service" : "Not connected"}
                    </Text>
                </View>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                showsVerticalScrollIndicator={false}
            >
                <View style={{ padding: 20 }}>
                    <Text style={{ fontSize: 22, fontWeight: "bold", color: "#111827", marginBottom: 20 }}>
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
                                        backgroundColor: isSelected ? "#EFF6FF" : "#F3F4F6",
                                        borderRadius: 16,
                                        padding: 20,
                                        marginBottom: 16,
                                        alignItems: "center",
                                        justifyContent: "center",
                                        minHeight: 140,
                                        borderWidth: isSelected ? 2 : 0,
                                        borderColor: "#2563EB",
                                        opacity: isSending ? 0.5 : 1,
                                    }}
                                >
                                    <View style={{ marginBottom: 12 }}>
                                        <Icon size={40} color="#2563EB" strokeWidth={2} />
                                    </View>  
                                    <Text style={{ fontSize: 15, fontWeight: "500", color: "#111827", textAlign: "center" }}>
                                        {alert.text}
                                    </Text>  
                                </TouchableOpacity>          
                            );
                        })}
                    </View>    

                    <View style={{ marginTop: 24 }}>
                        <Text style={{ fontSize: 16, color: "#111827", marginBottom: 12, fontWeight: "500" }}>
                            Type a custom message below.
                        </Text>

                        <View style={{ backgroundColor: "#F3F4F6", borderRadius: 12, padding: 16, minHeight: 120 }}>
                            <TextInput
                                style={{ fontSize: 15, color: "#111827", flex: 1, textAlignVertical: "top" }}
                                placeholder="Detour due to closure on street."
                                placeholderTextColor="#9CA3AF"
                                multiline
                                maxLength={maxLength}
                                value={customMessage}
                                editable={!isSending}
                                onChangeText={(text) => {
                                    setCustomMessage(text);
                                    if (text.trim()) setSelectedAlert(null);
                                }}
                            />
                            <Text style={{ fontSize: 14, color: "#6B7280", textAlign: "right", marginTop: 8 }}>
                                {customMessage.length}/{maxLength}
                            </Text>
                        </View>
                    </View>

                    {/* Info Box */}
                    <View
                        style={{
                            backgroundColor: "#EFF6FF",
                            borderRadius: 12,
                            padding: 16,
                            marginTop: 20,
                            borderLeftWidth: 4,
                            borderLeftColor: "#2563EB",
                        }}
                    >
                        <Text style={{ fontSize: 14, color: "#1E40AF", lineHeight: 20 }}>
                            <Text style={{ fontWeight: "600" }}>ℹ️ Note: </Text>
                            Alert will be sent to all parents linked to your driver account via the backend server.
                        </Text>
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
                    paddingHorizontal: 20,
                    paddingTop: 16,
                    paddingBottom: insets.bottom + 16,
                    borderTopWidth: 1,
                    borderTopColor: "#E5E7EB",
                }}        
            >
                <TouchableOpacity
                    onPress={handleSendAlert}
                    disabled={isSending}
                    style={{
                        backgroundColor: isSending ? "#9CA3AF" : "#2563EB",
                        borderRadius: 12,
                        paddingVertical: 16,
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
                            <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                            <Text style={{ color: "#fff", fontSize: 17, fontWeight: "bold" }}>Sending...</Text>
                        </>
                    ) : (
                        <Text style={{ color: "#fff", fontSize: 17, fontWeight: "bold" }}>Send Alert</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}