import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function RoleSelectionScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Back Arrow */}
      <Ionicons name="arrow-back" size={24} style={styles.backIcon} />

      {/* Logo */}
      <Image source={require("../assets/images/logo.png")} style={styles.logo} resizeMode="contain" />


      {/* Title */}
      <Text style={styles.title}>School Van Tracking</Text>
      <Text style={styles.subtitle}>
        Smart and secure school van tracking for everyone
      </Text>

      {/* Section Title */}
      <Text style={styles.chooseText}>Choose Your Role</Text>

      {/* Driver Button */}
      <TouchableOpacity
        style={[styles.card, styles.driverCard]}
        onPress={() => router.push("/DriverLogin")}
      >
        <View style={styles.iconCircleBlue}>
          <MaterialIcons name="directions-bus" size={26} color="#1E88E5" />
        </View>
        <Text style={styles.cardText}>Driver</Text>
      </TouchableOpacity>

      {/* Parent Button */}
      <TouchableOpacity
        style={[styles.card, styles.parentCard]}
        onPress={() => router.push("/ParentLogin")}
      >
        <View style={styles.iconCircleYellow}>
          <Ionicons name="person" size={24} color="#FBC02D" />
        </View>
        <Text style={styles.cardText}>Parent</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffffff",
    paddingHorizontal: 24,
    alignItems: "center",
  },

  backIcon: {
    position: "absolute",
    top: 50,
    left: 20,
    color: "#000",
  },

  logo: {
    width: 145,
    height: 150,
    marginTop: 80,
    marginBottom: 10,
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#000",
    marginTop: 10,
  },

  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 13,
    marginBottom: 30,
  },

  chooseText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 20,
    marginTop: 13,
  },

  card: {
    width: "100%",
    height: 130,
    borderRadius: 30,
    borderWidth: 5,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },

  driverCard: {
    borderColor: "#90CAF9",
    backgroundColor: "#e8f7ffff",
  },

  parentCard: {
    borderColor: "#FFF59D",
    backgroundColor: "#fdfae5ff",
  },

  iconCircleBlue: {
    width: 54,
    height: 54,
    borderRadius: 22,
    backgroundColor: "#b2ddfcff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },

  iconCircleYellow: {
    width: 54,
    height: 54,
    borderRadius: 22,
    backgroundColor: "#f2eca9ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },

  cardText: {
    fontSize: 17,
    fontWeight: "600",
  },
});