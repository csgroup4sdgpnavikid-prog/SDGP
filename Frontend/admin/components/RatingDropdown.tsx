import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { Picker } from "@react-native-picker/picker";

interface RatingDropdownProps {
  selectedValue: string;
  onChange: (value: string) => void;
  label?: string;
}

export default function RatingDropdown({
  selectedValue,
  onChange,
  label = "Filter by Stars",
}: RatingDropdownProps) {
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={selectedValue}
          onValueChange={(itemValue) => onChange(String(itemValue))}
          style={styles.picker}
          dropdownIconColor="#1a237e"
        >
          <Picker.Item label="All Ratings" value="" />
          <Picker.Item label="⭐⭐⭐⭐⭐  5 Stars" value="5" />
          <Picker.Item label="⭐⭐⭐⭐    4 Stars" value="4" />
          <Picker.Item label="⭐⭐⭐      3 Stars" value="3" />
          <Picker.Item label="⭐⭐        2 Stars" value="2" />
          <Picker.Item label="⭐          1 Star"  value="1" />
        </Picker>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 14 },
  label: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  picker: {
    height: Platform.OS === "ios" ? 150 : 50,
    color: "#333",
  },
});
