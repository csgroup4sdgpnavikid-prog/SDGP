// Function to calculate distance between two GPS points
function calculateDistance(driverLat, driverLon, parentLat, parentLon) {

  const earthRadius = 6371000; // meters

  const latDifference = (parentLat - driverLat) * Math.PI / 180;
  const lonDifference = (parentLon - driverLon) * Math.PI / 180;

  const driverLatInRad = driverLat * Math.PI / 180;
  const parentLatInRad = parentLat * Math.PI / 180;

  const a =
    Math.sin(latDifference / 2) * Math.sin(latDifference / 2) +
    Math.cos(driverLatInRad) *
    Math.cos(parentLatInRad) *
    Math.sin(lonDifference / 2) *
    Math.sin(lonDifference / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = earthRadius * c;

  return distance; // distance in meters
}








//update the location and proximity check API


app.post('/update-location', async function (req, res) {

  const driverId = req.body.driverId;
  const latitude = req.body.latitude;
  const longitude = req.body.longitude;

  if (!driverId) {
    res.send("Driver ID missing");
    return;
  }

  if (!latitude || !longitude) {
    res.send("Location missing");
    return;
  }

  try {

    // 1️⃣ Save driver's latest location
    await db.collection('liveLocations').doc(driverId).set({
      latitude: latitude,
      longitude: longitude,
      updatedAt: new Date()
    });

    // 2️⃣ Get all parents from database
    const parentsSnapshot = await db.collection('parents').get();

    // 3️⃣ Loop through each parent
    parentsSnapshot.forEach(async function (doc) {

      const parentData = doc.data();

      const parentLatitude = parentData.pickupLatitude;
      const parentLongitude = parentData.pickupLongitude;
      const parentToken = parentData.fcmToken;

      // 4️⃣ Calculate distance
      const distance = calculateDistance(
        latitude,
        longitude,
        parentLatitude,
        parentLongitude
      );

      // 5️⃣ Check if distance is within 500 meters
      if (distance <= 500) {

        await admin.messaging().send({
          token: parentToken,
          notification: {
            title: "Van is Near!",
            body: "The school van is within 500 meters of your pickup location."
          }
        });

      }

    });

    res.send("Location updated and proximity checked successfully");

  } catch (error) {
    res.send("Error updating location");
  }

});


