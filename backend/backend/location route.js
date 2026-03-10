// location route.js
const { doc, setDoc } = require("firebase/firestore"); // Ensure these are imported
const { db } = require("./firebaseConfig");
const express = require("express");
const router = express.Router();

router.post("/update-location", async function (req, res) {
  const { driverId, latitude, longitude } = req.body;

  if (!driverId || latitude === undefined || longitude === undefined) {
    return res.status(400).send("Missing data");
  }

  try {
    // Synchronize collection name to "locationRecords"
    const docRef = doc(db, "locationRecords", driverId); 
    await setDoc(docRef, {
      latitude: Number(latitude),
      longitude: Number(longitude),
      updatedAt: new Date()
    }, { merge: true });

    res.status(200).send("Location updated");
  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).send("Error updating location");
  }
});