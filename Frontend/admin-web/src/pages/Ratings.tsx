import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import { Star } from "lucide-react";

interface Rating {
  id: string;
  driverName: string;
  parentName: string;
  rating: number;
  comment: string;
  date: string;
}

function Stars({ value }: { value: number }) {
  return (
    <span className="stars">
      {[1, 2, 3, 4, 5].map((s) => (s <= value ? "★" : "☆")).join("")}
    </span>
  );
}

export default function Ratings() {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(query(collection(db, "ratings"), orderBy("createdAt", "desc")))
      .then((snap) => {
        const data: Rating[] = snap.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            driverName: d.driverName || d.driverId || "Unknown",
            parentName: d.parentName || d.parentId || "Unknown",
            rating: d.rating || d.stars || 0,
            comment: d.comment || d.feedback || "—",
            date: d.createdAt?.toDate?.()?.toLocaleDateString() || d.date || "—",
          };
        });
        setRatings(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const avgRating =
    ratings.length > 0
      ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
      : "—";

  return (
    <div>
      <div className="page-header">
        <h1>Driver Ratings</h1>
        <p>{ratings.length} ratings submitted — Average: {avgRating} / 5</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>All Ratings</h2>
        </div>

        {loading ? (
          <p style={{ color: "#64748b" }}>Loading ratings...</p>
        ) : ratings.length === 0 ? (
          <div className="empty-state">
            <Star size={40} color="#cbd5e1" />
            <p>No ratings submitted yet.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Driver</th>
                  <th>Parent</th>
                  <th>Rating</th>
                  <th>Comment</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {ratings.map((r, i) => (
                  <tr key={r.id}>
                    <td style={{ color: "#94a3b8" }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{r.driverName}</td>
                    <td>{r.parentName}</td>
                    <td>
                      <Stars value={r.rating} />{" "}
                      <span style={{ fontSize: 13, color: "#64748b" }}>({r.rating})</span>
                    </td>
                    <td>{r.comment}</td>
                    <td>{r.date}</td>
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
