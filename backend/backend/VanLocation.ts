import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";

export class VanTracker {
  driverId: string;

  constructor(driverId: string) {
    this.driverId = driverId;
  }

  async updateLocation(lat: number, lng: number) {
    try {
      // Targets the same document ID (e.g., 'van1')
      const locationDocRef = doc(db, "locationRecords", this.driverId);
      await setDoc(
        locationDocRef,
        {
          latitude: lat,
          longitude: lng,
          timestamp: new Date(),
        },
        { merge: true } // Crucial: This updates fields instead of creating new docs
      );
    } catch (err) {
      console.error(`Error:`, err);
    }
  }

  startSimulation() {
    return setInterval(() => {
      const simulatedLat = 7.8731 + (Math.random() - 0.5) * 0.002;
      const simulatedLng = 80.7718 + (Math.random() - 0.5) * 0.002;
      this.updateLocation(simulatedLat, simulatedLng);
    }, 3000);
  }
  
}