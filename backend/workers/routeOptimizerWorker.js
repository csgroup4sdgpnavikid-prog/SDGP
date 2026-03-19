// workers/routeOptimizerWorker.js
// Runs the O(n²) nearest-neighbour optimisation off the main event loop.
// Receives: { stops, startLocation }   via workerData
// Posts back: optimised stops array    via parentPort.postMessage
const { workerData, parentPort } = require('worker_threads');

const { stops, startLocation } = workerData;

// Inline Haversine — worker cannot require('../utils/helpers') (different cwd)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function optimizeStopOrder(stopsArr, start) {
    if (stopsArr.length <= 1) return stopsArr;

    const optimized = [];
    const remaining = [...stopsArr];
    let current = start;

    while (remaining.length > 0) {
        let nearestIdx = 0;
        let nearestDist = Infinity;

        for (let i = 0; i < remaining.length; i++) {
            const d = calculateDistance(
                current.latitude, current.longitude,
                remaining[i].location.latitude, remaining[i].location.longitude
            );
            if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
        }

        const nearest = remaining.splice(nearestIdx, 1)[0];
        optimized.push(nearest);
        current = nearest.location;
    }

    return optimized.map((stop, idx) => ({ ...stop, order: idx }));
}

const result = optimizeStopOrder(stops, startLocation);
parentPort.postMessage(result);
