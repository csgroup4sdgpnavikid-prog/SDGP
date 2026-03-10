// server.js — Fixed & Production-Ready
import cors from "cors";
import express from "express";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebaseConfig.js";

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Request Logger ───────────────────────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ status: "✅ Backend is running", timestamp: new Date().toISOString() });
});

// ─── UPDATE Location (Driver → Firebase) ──────────────────────────────────────
// Called by the van driver app to push GPS coordinates
app.post("/update-location", async (req, res) => {
  const { driverId, latitude, longitude } = req.body;

  // Validate all required fields
  if (!driverId || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: "Missing required fields: driverId, latitude, longitude" });
  }

  // Validate coordinate ranges
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return res.status(400).json({ error: "Invalid coordinate values" });
  }

  try {
    const docRef = doc(db, "locationRecords", driverId);
    await setDoc(docRef, {
      latitude: lat,         // ✅ Consistent field names matching LiveVan.tsx
      longitude: lng,        // ✅ Consistent field names matching LiveVan.tsx
      updatedAt: new Date(),
      driverId,
    }, { merge: true });

    console.log(`✅ Location updated for ${driverId}: (${lat}, ${lng})`);
    res.status(200).json({ success: true, driverId, latitude: lat, longitude: lng });
  } catch (error) {
    console.error("❌ Firebase write error:", error.message);
    res.status(500).json({ error: "Failed to update location", details: error.message });
  }
});

// ─── GET Location (App → Read current position) ───────────────────────────────
app.get("/location/:driverId", async (req, res) => {
  const { driverId } = req.params;
  try {
    const docRef = doc(db, "locationRecords", driverId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      return res.status(404).json({ error: `No location found for driver: ${driverId}` });
    }

    res.json({ success: true, ...snapshot.data() });
  } catch (error) {
    console.error("❌ Firebase read error:", error.message);
    res.status(500).json({ error: "Failed to read location" });
  }
});

// ─── Monitoring: Health Ping ───────────────────────────────────────────────────
app.get("/health", async (req, res) => {
  const checks = { server: "ok", firebase: "unknown" };
  try {
    // Try a lightweight Firebase read as connectivity check
    const testRef = doc(db, "locationRecords", "health-check");
    await getDoc(testRef);
    checks.firebase = "ok";
  } catch (e) {
    checks.firebase = "error: " + e.message;
  }
  const allOk = Object.values(checks).every(v => v === "ok");
  res.status(allOk ? 200 : 503).json({ status: allOk ? "healthy" : "degraded", checks, timestamp: new Date().toISOString() });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚐 Van Tracker backend running at http://localhost:${PORT}`);
  console.log(`   POST /update-location  → push GPS from driver`);
  console.log(`   GET  /location/:id     → read van position`);
  console.log(`   GET  /health           → system health check`);
});