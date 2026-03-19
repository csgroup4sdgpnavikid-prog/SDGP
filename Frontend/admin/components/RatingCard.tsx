import React from "react";
import { View, Text, StyleSheet } from "react-native";
import StarRating from "./StarRating";
import { Rating } from "../types";

interface RatingCardProps {
  item: Rating;
}

function formatDate(value: any): string {
  if (!value) return "";
  try {
    const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
    return date.toLocaleDateString();
  } catch {
    return "";
  }
}

export default function RatingCard({ item }: RatingCardProps) {
  const date = formatDate(item.createdAt);
  const isHighRated = (item.overall ?? 0) >= 4.0;

  return (
    <View style={styles.card}>
      {/* Header: driver name + score badge */}
      <View style={styles.header}>
        <View style={styles.driverInfo}>
          {item.driverName ? (
            <Text style={styles.driverName}>{item.driverName}</Text>
          ) : null}
        </View>
        <View style={[styles.overallBadge, isHighRated && styles.overallBadgeGreen]}>
          <Text style={styles.overallNumber}>{item.overall?.toFixed(1) ?? "—"}</Text>
          <Text style={[styles.overallMax, isHighRated && styles.overallMaxGreen]}>/5</Text>
        </View>
      </View>

      {/* Star display */}
      <StarRating rating={Math.round(item.overall ?? 0)} size={18} readonly />

      {/* Optional comment */}
      {item.comment ? (
        <Text style={styles.comment}>"{item.comment}"</Text>
      ) : null}

      {date ? <Text style={styles.date}>{date}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  driverInfo: { flex: 1 },
  driverName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4A8FE7",
    marginBottom: 4,
  },
  overallBadge: {
    backgroundColor: "#5AA9E6",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "flex-end",
    alignSelf: "flex-start",
  },
  overallBadgeGreen: {
    backgroundColor: "#5AA9E6",
  },
  overallNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  overallMax: {
    fontSize: 11,
    color: "#59d2fe",
    marginBottom: 2,
  },
  overallMaxGreen: {
    color: "#5AA9E6",
  },
  comment: {
    marginTop: 10,
    fontSize: 13,
    color: "#444",
    fontStyle: "italic",
  },
  date: {
    marginTop: 8,
    fontSize: 11,
    color: "#bbb",
    textAlign: "right",
  },
});
