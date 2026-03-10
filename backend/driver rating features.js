
//Feature 1 : Get Drivers Vans by Route

// Get drivers by route
app.get('/drivers', async function (req, res) {
  const route = req.query.route;

  if (!route) {
    res.send('Route is required');
    return;
  }

  try {
    const snapshot = await db
      .collection('drivers')
      .where('route', '==', route)
      .get();

    let drivers = [];

    snapshot.forEach(function (doc) {
      drivers.push({
        driverId: doc.id,
        name: doc.data().name,
        route: doc.data().route,
        rating: doc.data().rating
      });
    });

    res.json(drivers);
  } catch (error) {
    res.send('Error fetching drivers');
  }
});






//Feature 2 :  Rate a driver (Parent to Driver)


// Rate a driver (Student-friendly version)
app.post('/rate-driver', async function (req, res) {

  const parentId = req.body.parentId;
  const driverId = req.body.driverId;
  const rating = req.body.rating;

  // Basic validation (easy to understand)
  if (!parentId) {
    res.send('Parent ID missing');
    return;
  }

  if (!driverId) {
    res.send('Driver ID missing');
    return;
  }

  if (!rating) {
    res.send('Rating missing');
    return;
  }

  try {
    // Check if parent has already rated this driver
    const snapshot = await db
      .collection('ratings')
      .where('parentId', '==', parentId)
      .where('driverId', '==', driverId)
      .get();

    if (!snapshot.empty) {
      res.send('You have already rated this driver');
      return;
    }

    // Save rating in Firebase
    await db.collection('ratings').add({
      parentId: parentId,
      driverId: driverId,
      rating: rating,
      date: new Date()
    });

    // Update driver's average rating (simple logic)
    const driverRef = db.collection('drivers').doc(driverId);
    const driverDoc = await driverRef.get();

    if (driverDoc.exists) {
      const oldRating = driverDoc.data().rating || 0;
      const newRating = (oldRating + rating) / 2;

      await driverRef.update({
        rating: newRating
      });
    }

    res.send('Rating submitted successfully');

  } catch (error) {
    res.send('Error submitting rating');
  }
});





//Feature 3 : Get driver rating used to show on UI

// Get driver details
app.get('/driver/:id', async function (req, res) {
  const driverId = req.params.id;

  try {
    const driverDoc = await db.collection('drivers').doc(driverId).get();

    if (!driverDoc.exists) {
      res.send('Driver not found');
      return;
    }

    res.json(driverDoc.data());
  } catch (error) {
    res.send('Error fetching driver');
  }
});






