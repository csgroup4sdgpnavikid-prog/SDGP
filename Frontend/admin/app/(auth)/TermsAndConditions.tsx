import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { auth, db } from "../../firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import React, { useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function TermsAndConditions() {
  const router = useRouter();
  useLocalSearchParams<{ role: string }>(); // role param kept for backwards-compat navigation, not trusted
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const handleScroll = ({ nativeEvent }: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 20) {
      setHasScrolledToBottom(true);
    }
  };

  const handleAccept = async () => {
    if (!auth.currentUser) return;
    setAccepting(true);
    try {
      const uid = auth.currentUser.uid;

      // Determine the actual collection from Firestore — never trust the URL param,
      // which could be manipulated to write to the wrong collection or redirect incorrectly.
      let collection: "drivers" | "parents" | null = null;
      const driverSnap = await getDoc(doc(db, "drivers", uid));
      if (driverSnap.exists()) {
        collection = "drivers";
      } else {
        const parentSnap = await getDoc(doc(db, "parents", uid));
        if (parentSnap.exists()) collection = "parents";
      }

      if (!collection) {
        Alert.alert("Error", "Account not found. Please register again.");
        return;
      }

      await updateDoc(doc(db, collection, uid), {
        termsAccepted: true,
        termsAcceptedAt: new Date().toISOString(),
      });

      router.replace(collection === "drivers" ? "/Driver" : "/Parent");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save acceptance");
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = () => {
    Alert.alert(
      "Decline Terms",
      "If you decline, your account will be removed. Do you want to continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline & Delete Account",
          style: "destructive",
          onPress: async () => {
            try {
              if (auth.currentUser) {
                await auth.currentUser.delete();
              }
            } catch {}
            router.replace("/RoleSelectionScreen");
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
        <Text style={styles.headerSub}>Please read and scroll to accept</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator
      >
        <Section title="1. Introduction & App Purpose">
          NaviKid is a school van tracking and safety application designed to help
          parents monitor their children's safe transport to and from school. By
          registering, you agree to these Terms & Conditions in full. Please read
          them carefully before proceeding.
        </Section>

        <Section title="2. Eligibility">
          You must be 18 years of age or older to use this application. For
          parents/guardians, you must be the legal guardian of the child(ren) you
          register. For drivers, you must hold a valid driver's license and be
          authorized to transport school children in your jurisdiction.
        </Section>

        <Section title="3. Location Data Collection">
          NaviKid collects real-time GPS location data from drivers during active
          school transport trips. This location data is:
          {"\n\n"}• Shared with parents whose children are assigned to that driver
          {"\n"}• Visible to school administrators via the admin dashboard
          {"\n"}• Stored in our secure Firestore database
          {"\n"}• Retained for trip history and safety review purposes
          {"\n\n"}Location tracking is only active when a driver starts a trip and
          automatically stops when the trip ends. By using this app, you consent
          to the collection and sharing of this location data.
        </Section>

        <Section title="4. Push Notification Consent">
          By registering, you consent to receive push notifications including:
          {"\n\n"}• Trip start and end alerts
          {"\n"}• Child pickup and drop-off confirmations
          {"\n"}• Proximity alerts (when the van is 500m from your location)
          {"\n"}• Emergency and SOS alerts from drivers
          {"\n"}• Payment confirmation notifications
          {"\n\n"}You can manage notification preferences in your device settings,
          but disabling notifications may affect your ability to monitor your
          child's safety in real-time.
        </Section>

        <Section title="5. Child Data Protection">
          We take the protection of children's data seriously. Child data collected
          includes name, age, school, grade, and home address coordinates. This data
          is:
          {"\n\n"}• Only accessible to the registered parent/guardian and their
          assigned driver
          {"\n"}• Never shared with third parties for marketing purposes
          {"\n"}• Protected by Firestore security rules limiting access to
          authorized users only
          {"\n"}• Handled in compliance with applicable child privacy regulations
          {"\n\n"}Parents may request deletion of their child's data at any time by
          contacting support.
        </Section>

        <Section title="6. Data Storage & Retention">
          Your account data, trip history, and child information are stored securely
          in Google Firebase Firestore. Data is retained for as long as your account
          is active. Upon account deletion, personal data is removed within 30 days.
          Trip logs may be retained for up to 12 months for safety audit purposes.
        </Section>

        <Section title="7. User Responsibilities">
          As a user of NaviKid, you agree to:
          {"\n\n"}• Provide accurate and truthful registration information
          {"\n"}• Keep your account credentials secure and not share them
          {"\n"}• Notify us immediately of any unauthorized account access
          {"\n"}• Use the app solely for its intended purpose of child transport safety
          {"\n"}• Not attempt to misuse, hack, or exploit the application or its data
          {"\n"}• Drivers: maintain a valid license and comply with all traffic laws
        </Section>

        <Section title="8. Limitation of Liability">
          NaviKid provides a tracking and communication platform to assist with school
          transport safety. We do not employ the drivers, own the vehicles, or operate
          the transport service. NaviKid is not liable for:
          {"\n\n"}• Delays or failures in GPS location updates due to network issues
          {"\n"}• Actions or negligence of drivers using the platform
          {"\n"}• Any harm arising from reliance on real-time location data
          {"\n"}• Service interruptions due to third-party platform outages
          {"\n\n"}Use of this application is at your own risk.
        </Section>

        <Section title="9. Agreement">
          By tapping "Accept & Continue" below, you confirm that:
          {"\n\n"}• You have read and understood these Terms & Conditions in full
          {"\n"}• You are 18 years or older (or a licensed driver where applicable)
          {"\n"}• You consent to the collection and use of location and personal data
          as described above
          {"\n"}• You agree to be bound by these terms for the duration of your
          use of the NaviKid application
          {"\n\n"}These terms may be updated from time to time. Continued use of
          the app after changes constitutes acceptance of the updated terms.
        </Section>

        <View style={styles.endMarker}>
          <Ionicons name="checkmark-circle" size={28} color="#5AA9E6" />
          <Text style={styles.endText}>End of Terms & Conditions</Text>
        </View>
      </ScrollView>

      {!hasScrolledToBottom && (
        <View style={styles.scrollHint}>
          <Ionicons name="arrow-down" size={16} color="#6B7280" />
          <Text style={styles.scrollHintText}>Scroll down to read all terms</Text>
        </View>
      )}

      <View style={styles.footer}>
        <TouchableOpacity style={styles.declineButton} onPress={handleDecline}>
          <Text style={styles.declineText}>Decline</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.acceptButton, !hasScrolledToBottom && styles.acceptDisabled]}
          onPress={handleAccept}
          disabled={!hasScrolledToBottom || accepting}
        >
          <Text style={styles.acceptText}>
            {accepting ? "Saving..." : "Accept & Continue"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },

  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },

  headerSub: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },

  scrollView: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },

  section: {
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },

  sectionBody: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 22,
  },

  endMarker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 8,
  },

  endText: {
    fontSize: 14,
    color: "#5AA9E6",
    fontWeight: "600",
  },

  scrollHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    backgroundColor: "#F9FAFB",
    gap: 6,
  },

  scrollHintText: {
    fontSize: 12,
    color: "#6B7280",
  },

  footer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },

  declineButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },

  declineText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6B7280",
  },

  acceptButton: {
    flex: 2,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#5AA9E6",
    justifyContent: "center",
    alignItems: "center",
  },

  acceptDisabled: {
    backgroundColor: "#C8E6F7",
  },

  acceptText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});
