// services/ratingApi.ts — Driver rating operations using Firestore directly.

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { Driver, Rating } from "../types";

const COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

function toMs(value: any): number {
  if (!value) return 0;
  if (typeof value.toDate === "function") return value.toDate().getTime();
  return new Date(value).getTime();
}

// ─── fetchDrivers ─────────────────────────────────────────────────────────────

export async function fetchDrivers(): Promise<Driver[]> {
  const snapshot = await getDocs(collection(db, "drivers"));
  const drivers: Driver[] = [];
  snapshot.forEach((docSnap) => {
    const d = docSnap.data();
    drivers.push({
      id: docSnap.id,
      name: d.name || d.driverName || "Unknown",
      vanNumber: d.vanNumber || d.vanId || d.vehicleNumber || "",
      route: d.route || d.serviceArea || d.routeName || "",
    });
  });
  return drivers.sort((a, b) => a.name.localeCompare(b.name));
}

// ─── submitRating ─────────────────────────────────────────────────────────────

/**
 * Submit a single overall star rating (1–5) for a driver.
 * Saves to Firestore "ratings", then recalculates the driver's
 * average: sum of all ratings / number of ratings.
 */
export async function submitRating(payload: {
  parentId: string;
  driverId: string;
  driverName?: string;
  rating: number;        // 1–5 single score
  comment?: string;
}): Promise<{ success: boolean; message: string }> {
  // 1. Save rating document
  await addDoc(collection(db, "ratings"), {
    parentId: payload.parentId,
    driverId: payload.driverId,
    driverName: payload.driverName ?? null,
    overall: payload.rating,
    comment: payload.comment ?? null,
    createdAt: serverTimestamp(),
  });

  // 2. Recalculate driver average: sum / count
  const allSnap = await getDocs(
    query(collection(db, "ratings"), where("driverId", "==", payload.driverId))
  );

  let total = 0;
  let count = 0;
  allSnap.forEach((d) => {
    const r = d.data();
    if (typeof r.overall === "number") {
      total += r.overall;
      count += 1;
    }
  });

  const average = count > 0 ? Math.round((total / count) * 10) / 10 : 0;

  await updateDoc(doc(db, "drivers", payload.driverId), {
    averageRating: {
      overall: average,
      totalRatings: count,
      lastUpdated: new Date().toISOString(),
    },
  });

  return { success: true, message: "Rating submitted successfully" };
}

// ─── fetchRatings ─────────────────────────────────────────────────────────────

export async function fetchRatings(params?: {
  stars?: string;
  driverId?: string;
}): Promise<Rating[]> {
  const baseQuery = params?.driverId
    ? query(collection(db, "ratings"), where("driverId", "==", params.driverId))
    : collection(db, "ratings");

  const snapshot = await getDocs(baseQuery);
  let ratings: Rating[] = [];
  snapshot.forEach((d) => ratings.push({ id: d.id, ...d.data() } as Rating));

  if (params?.stars) {
    const starsNum = Number(params.stars);
    ratings = ratings.filter((r) => Math.round(r.overall) === starsNum);
  }

  ratings.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
  return ratings;
}

// ─── canRateDriver ────────────────────────────────────────────────────────────

export async function canRateDriver(
  parentId: string,
  driverId: string
): Promise<{ canRate: boolean; message: string; daysRemaining?: number }> {
  const snapshot = await getDocs(
    query(
      collection(db, "ratings"),
      where("parentId", "==", parentId),
      where("driverId", "==", driverId)
    )
  );

  if (snapshot.empty) return { canRate: true, message: "You can rate this driver." };

  let latestMs = 0;
  snapshot.forEach((d) => {
    const ms = toMs(d.data().createdAt);
    if (ms > latestMs) latestMs = ms;
  });

  const elapsed = Date.now() - latestMs;
  if (elapsed >= COOLDOWN_MS) return { canRate: true, message: "You can rate this driver." };

  const daysRemaining = Math.ceil((COOLDOWN_MS - elapsed) / (24 * 60 * 60 * 1000));
  return {
    canRate: false,
    message: `You can rate again in ${daysRemaining} days.`,
    daysRemaining,
  };
}
