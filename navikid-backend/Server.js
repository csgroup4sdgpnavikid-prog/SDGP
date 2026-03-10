const express = require("express");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/navi-kid-school-van-tracker/databases/(default)/documents`;

// ─── Helper: Get Firestore document via REST ───────────────────────────────
async function getFirestoreDoc(collection, docId) {
  const url = `${FIRESTORE_BASE}/${collection}/${docId}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Firestore GET failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  const fields = {};
  for (const [key, val] of Object.entries(data.fields || {})) {
    fields[key] = val.stringValue ?? val.integerValue ?? val.booleanValue ?? val.doubleValue ?? "";
  }
  return fields;
}

// ─── Helper: Write Firestore document via REST ─────────────────────────────
async function addFirestoreDoc(collection, docData) {
  const url = `${FIRESTORE_BASE}/${collection}`;
  const fields = {};
  for (const [key, val] of Object.entries(docData)) {
    fields[key] = { stringValue: String(val) };
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    throw new Error(`Firestore POST failed: ${res.status} ${await res.text()}`);
  }
  return await res.json();
}

// ─── Helper: Query Firestore collection ───────────────────────────────────
async function queryFirestore(collection, fieldPath, value) {
  const url = `${FIRESTORE_BASE}:runQuery`;
  const body = {
    structuredQuery: {
      from: [{ collectionId: collection }],
      where: {
        fieldFilter: {
          field: { fieldPath },
          op: "EQUAL",
          value: { stringValue: value },
        },
      },
      limit: 10,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Firestore QUERY failed: ${res.status} ${await res.text()}`);
  }

  const results = await res.json();
  return results
    .filter((r) => r.document)
    .map((r) => {
      const fields = {};
      for (const [key, val] of Object.entries(r.document.fields || {})) {
        fields[key] = val.stringValue ?? val.integerValue ?? val.booleanValue ?? "";
      }
      return fields;
    });
}

// ─── Helper: Send Expo Push Notification ──────────────────────────────────
async function sendExpoPushNotification(expoPushToken, title, body) {
  if (!expoPushToken || !expoPushToken.startsWith("ExponentPushToken")) {
    throw new Error(`Invalid Expo push token: ${expoPushToken}`);
  }

  const message = {
    to: expoPushToken,
    sound: "default",
    title,
    body,
    priority: "high",
    data: { type: "driver_alert" },
  };

  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });

  const result = await res.json();
  console.log("Expo push result:", JSON.stringify(result));
  return result;
}

// ─── POST /api/sos/trigger ─────────────────────────────────────────────────
app.post("/api/sos/trigger", async (req, res) => {
  try {
    const { driverId, message } = req.body;

    if (!driverId || !message) {
      return res.status(400).json({ error: "driverId and message are required" });
    }

    console.log(`\n📨 SOS received`);
    console.log(`   driverId: "${driverId}"`);
    console.log(`   message:  "${message}"`);

    // ── Step 1: Get driver info ──────────────────────────────────────────
    let driverData;
    try {
      driverData = await getFirestoreDoc("drivers", driverId);
      console.log(`✅ Driver found: "${driverData.name}"`);
    } catch (e) {
      console.error("❌ Driver not found:", e.message);
      return res.status(404).json({ error: "Driver not found in Firestore", driverId });
    }

    // ── Step 2: Find parents assigned to this driver ─────────────────────
    const parents = await queryFirestore("parents", "assignedDriverId", driverId);
    console.log(`\n👨‍👩‍👧 Found ${parents.length} parent(s) for assignedDriverId="${driverId}":`);
    parents.forEach((p, i) => {
      console.log(`   [${i+1}] name="${p.name}" | token="${p.expoPushToken}" | assignedDriverId="${p.assignedDriverId}"`);
    });

    // ── Step 3: Save alert to Firestore ─────────────────────────────────
    await addFirestoreDoc("emergencyAlerts", {
      driverId,
      driverName: driverData.name || "Unknown Driver",
      message,
      timestamp: new Date().toISOString(),
      status: "sent",
    });
    console.log("✅ Alert saved to emergencyAlerts");

    // ── Step 4: Push to parents with valid tokens only ───────────────────
    const pushResults = [];
    const skipped = [];

    for (const parent of parents) {
      const token = parent.expoPushToken;

      if (!token || token.trim() === "") {
        console.warn(`⚠️  Skipping "${parent.name}" — token is empty`);
        skipped.push({ name: parent.name, reason: "no token" });
        continue;
      }

      if (!token.startsWith("ExponentPushToken")) {
        console.warn(`⚠️  Skipping "${parent.name}" — invalid token: "${token}"`);
        skipped.push({ name: parent.name, reason: "invalid token format" });
        continue;
      }

      try {
        const result = await sendExpoPushNotification(token, "🚐 Driver Alert", message);
        pushResults.push({ parent: parent.name, token, result });
        console.log(`✅ Push sent to "${parent.name}"`);
      } catch (err) {
        console.error(`❌ Push failed for "${parent.name}":`, err.message);
        pushResults.push({ parent: parent.name, error: err.message });
      }
    }

    console.log(`\n📊 Done — notified: ${pushResults.length}, skipped: ${skipped.length}`);

    return res.json({
      success: true,
      parentsFound: parents.length,
      parentsNotified: pushResults.length,
      parentsSkipped: skipped,
      pushResults,
    });

  } catch (error) {
    console.error("❌ Server error:", error);
    return res.status(500).json({ error: "Internal server error", details: error.message });
  }
});

// ─── Health check ──────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ status: "NaviKid Alert Backend is running 🚀" });
});

// ─── Start Server ──────────────────────────────────────────────────────────
const PORT = 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🚀 NaviKid backend running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}`);
  console.log(`   SOS endpoint: http://localhost:${PORT}/api/sos/trigger\n`);
});