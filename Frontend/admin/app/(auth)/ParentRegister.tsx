import React, { useRef, useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext"; 
// Custom authentication context that probably wraps Firebase auth methods
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { collection, getDocs, doc, setDoc } from "firebase/firestore"; 
// Firebase Firestore functions:
// collection -> reference a Firestore collection
// getDocs -> fetch all documents from a collection
// doc -> reference a specific document
// setDoc -> create or update a document in Firestore

import { db, auth } from "../../firebaseConfig";
// db -> Firestore database instance
// auth -> Firebase authentication instance

import { Picker } from "@react-native-picker/picker"; 
// Used to show a dropdown list for selecting drivers

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;
// This ensures only valid MaterialCommunityIcons names can be used

export default function ParentRegisterScreen() {

  const scrollRef = useRef<ScrollView | null>(null);
  const router = useRouter();
  const { register, isLoading } = useAuth();
  // register -> function from AuthContext that likely creates a Firebase user
  // isLoading -> boolean used to show loading state during registration

  const [name, setName] = React.useState(""); 
  const [email, setEmail] = React.useState(""); 
  const [phone, setPhone] = React.useState(""); 
  const [childName, setChildName] = React.useState(""); 
  const [childClass, setChildClass] = React.useState("");
  const [password, setPassword] = React.useState(""); 
  const [confirmPassword, setConfirmPassword] = React.useState(""); 

  const [drivers, setDrivers] = React.useState<any[]>([]); 
  // stores driver list fetched from Firebase

  const [selectedDriver, setSelectedDriver] = React.useState("");
  // stores the ID of the driver selected by the parent

  
  // FETCH DRIVERS FROM FIRESTORE DATABASE

  useEffect(() => {

    // Function to retrieve driver documents from Firestore
    const fetchDrivers = async () => {
      try {

        // Fetch all documents from "drivers" collection
        const snapshot = await getDocs(collection(db, "drivers"));

        const driverList: any[] = [];

        // Loop through each Firestore document
        snapshot.forEach((docItem) => {

          // Add driver data to array
          driverList.push({
            id: docItem.id, // Firestore document ID
            ...docItem.data(), // driver data fields
          });
        });
        
        // Save driver list into state so UI can display them
        setDrivers(driverList);

      } catch (error) {
        // If database request fails
        console.log("Error fetching drivers:", error);
      }
    };

    // Run fetchDrivers when component loads
    fetchDrivers();

  }, []);


  // HANDLE PARENT REGISTRATION

  const handleRegister = async () => {

    // Clean email by removing spaces and converting to lowercase
    const cleanEmail = email.trim().toLowerCase();

    // Validate required fields
    if (
      !name ||
      !cleanEmail ||
      !password ||
      !confirmPassword ||
      !selectedDriver
    ) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    // Email validation using regex pattern
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    // Ensure passwords match
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    // Ensure password length meets Firebase requirement
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    try {
      // Register user in Firebase Authentication
      // register() likely calls createUserWithEmailAndPassword internally
      await register(cleanEmail, password, "parent");

      // After authentication succeeds
      if (auth.currentUser) {

        // Save parent details in Firestore database
        await setDoc(doc(db, "parents", auth.currentUser.uid), {

          // Parent information
          name: name.trim(),
          email: cleanEmail,
          phone: phone.trim(),

          // Child information
          childName: childName.trim(),
          childClass: childClass.trim(),

          // Role used for role-based access
          role: "parent",

          // Store assigned driver ID
          assignedDriverId: selectedDriver,

          // Timestamp of registration
          createdAt: new Date().toISOString(),

        });
      }

      // Navigate parent to Parent dashboard
      router.replace("/Parent");

    } catch (error: any) {

      // Handle Firebase errors
      console.log("Registration error:", error);

      Alert.alert(
        "Registration Failed",
        error.message || "Something went wrong"
      );
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* ScrollView allows scrolling when keyboard opens */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button navigating to ParentLogin */}
          <TouchableOpacity onPress={() => router.push("/ParentLogin")}>
              <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Parent Portal</Text>
            <Text style={styles.subtitle}>
              Track your child’s school van in real time
            </Text>
          </View>

          <View style={styles.form}>
            {input("account", "Parent Name", "Enter your full name", false, scrollRef, 0, name, setName)}
            {input("email-outline", "Email", "Enter your email", false, scrollRef, 0, email, setEmail, true)}
            {input("phone-outline", "Phone Number", "Enter phone number", false, scrollRef, 0, phone, setPhone)}
            {input("account-child-outline", "Student Name", "Enter child’s name", false, scrollRef, 150, childName, setChildName)}
            {input("school-outline", "Current Class", "e.g. Grade 5A", false, scrollRef, 200, childClass, setChildClass)}
            {input("lock-outline", "Password", "Create password", true, scrollRef, 300, password, setPassword)}
            {input("lock-check-outline", "Confirm Password", "Re-enter password", true, scrollRef, 350, confirmPassword, setConfirmPassword)}

            {/* Driver selection dropdown */}

            
            <View style={{ marginBottom: 14 }}>
              <Text style={styles.label}>Select Driver</Text>

              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={selectedDriver}
                  onValueChange={(itemValue) => setSelectedDriver(itemValue)}
                >
                  <Picker.Item label="Select a driver..." value="" />
                  {drivers.map((driver) => (
                    <Picker.Item
                      key={driver.id}
                      label={driver.name}
                      value={driver.id}
                    />
                  ))}
                </Picker>
              </View>
            </View>
            
            {/* Register button */}
            <TouchableOpacity
              style={styles.button}
              onPress={handleRegister}  // Calls Firebase registration function
              disabled={isLoading}      // Disable button while registering
            >
              <Text style={styles.buttonText}>
                {isLoading ? "Registering..." : "Register"}
              </Text>
            </TouchableOpacity>
            
            {/* Redirect to Login */}
            <View style={styles.LoginRow}>
              <Text style={styles.LoginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() =>  router.push("/ParentLogin")}>
                <Text style={styles.LoginNow}>Login Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const input = (
  iconName: IconName,
  label: string,
  placeholder: string,
  secure: boolean,
  scrollRef: React.RefObject<ScrollView | null>,
  scrollY: number,
  value: string,
  setValue: (text: string) => void,
  isEmail: boolean = false
) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.inputWrapper}>
      <MaterialCommunityIcons name={iconName} size={20} color="#777" />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#999"
        secureTextEntry={secure}
        style={styles.input}
        value={value}
        onChangeText={setValue}
        keyboardType={isEmail ? "email-address" : "default"}
        autoCapitalize="none"
        autoCorrect={false}
        onFocus={() =>
          scrollRef?.current?.scrollTo({ y: scrollY, animated: true })
        }
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#e8f8ffff" 
  },

  scroll: { 
    padding: 20, 
    paddingBottom: 40 
  },
  
  header: { 
    alignItems: "center", 
    marginBottom: 20 
  },

  title: { 
    fontSize: 22, 
    fontWeight: "700", 
    color: "#222", 
    marginTop: 20 
  },

  subtitle: { 
    fontSize: 13, 
    color: "#666", 
    textAlign: "center", 
    marginTop: 5 
  },

  form: { 
    backgroundColor: "#fff", 
    borderRadius: 18, 
    padding: 18 
  },

  field: { 
    marginBottom: 14 
  },

  label: { 
    fontSize: 13, 
    fontWeight: "600", 
    marginBottom: 6, 
    color: "#333" 
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#71d6f3ff",
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: "#FAFAFA",
  },

  input: {
    flex: 1, 
    height: 46, 
    marginLeft: 8, 
    fontSize: 14, 
    color: "#000" 
  },

  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#71d6f3ff",
    borderRadius: 12,
    backgroundColor: "#FAFAFA",
  },
  button: {
    backgroundColor: "#5AA9E6",
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },

  buttonText: { 
    color: "#fff", 
    fontSize: 16, 
    fontWeight: "700" 
  },

  LoginRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop:10,
  },

  LoginText: {
    color: "#6B7280",
  },

  LoginNow: {
    color: "#5AA9E6",
    fontWeight: "700",
  },

});
