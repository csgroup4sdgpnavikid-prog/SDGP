import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import { Route } from "lucide-react";

interface Trip {
  id: string;
  driverName: string;
  status: string;
  startTime: string;
  endTime: string;
  routeName: string;
}

const statusBadge: Record<string, string> = {
  in_progress: "badge-blue",
  completed: "badge-green",
  cancelled: "badge-red",
  not_started: "badge-gray",
};

export default function Trips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(query(collection(db, "trips"), orderBy("startTime", "desc")))
      .then((snap) => {
        const data: Trip[] = snap.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            driverName: d.driverName || d.driverId || "Unknown",
            status: d.status || "not_started",
            startTime: d.startTime?.toDate?.()?.toLocaleString() || d.startTime || "—",
            endTime: d.endTime?.toDate?.()?.toLocaleString() || d.endTime || "—",
            routeName: d.routeName || d.route || "—",
          };
        });
        setTrips(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>Trips</h1>
        <p>{trips.length} total trips recorded</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>All Trips</h2>
        </div>

        {loading ? (
          <p style={{ color: "#64748b" }}>Loading trips...</p>
        ) : trips.length === 0 ? (
          <div className="empty-state">
            <Route size={40} color="#cbd5e1" />
            <p>No trips recorded yet.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Driver</th>
                  <th>Route</th>
                  <th>Status</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((t, i) => (
                  <tr key={t.id}>
                    <td style={{ color: "#94a3b8" }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{t.driverName}</td>
                    <td>{t.routeName}</td>
                    <td>
                      <span className={`badge ${statusBadge[t.status] || "badge-gray"}`}>
                        {t.status.replace("_", " ")}
                      </span>
                    </td>
                    <td>{t.startTime}</td>
                    <td>{t.endTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
