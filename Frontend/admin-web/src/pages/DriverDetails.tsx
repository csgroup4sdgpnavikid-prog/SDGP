import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  limit,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";
import { ArrowLeft, Star, MapPin, Wifi, WifiOff } from "lucide-react";

interface DriverData {
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  vehicleNumber: string;
  routeId: string | null;
  isActive: boolean;
  termsAccepted: boolean;
  createdAt: string;
  averageRating: {
    overall: number;
    safety?: number;
    punctuality?: number;
    service?: number;
    totalRatings: number;
    lastUpdated: string;
  } | null;
  associatedParentIds: string[];
}

interface Child {
  id: string;
  name: string;
  age: number;
  school: string;
  grade: string;
  parentName: string;
  parentPhone: string;
}

interface Trip {
  id: string;
  date: string;
  tripType: string;
  status: string;
  startedAt: string;
  endedAt: string;
}

interface Rating {
  id: string;
  overall: number;
  safety?: number;
  punctuality?: number;
  service?: number;
  comment: string | null;
  createdAt: string;
}

interface LocationRecord {
  lat: number;
  lng: number;
  isActive: boolean;
  lastUpdated: any;
}

function Stars({ n }: { n: number }) {
  return (
    <span style={{ color: "#f59e0b" }}>
      {"★".repeat(Math.round(n))}{"☆".repeat(5 - Math.round(n))}
    </span>
  );
}

export default function DriverDetails() {
  const { driverId } = useParams<{ driverId: string }>();
  const navigate = useNavigate();

  const [driver, setDriver] = useState<DriverData | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [location, setLocation] = useState<LocationRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!driverId) return;

    const loadAll = async () => {
      try {
        // 1. Driver doc
        const driverSnap = await getDoc(doc(db, "drivers", driverId));
        if (!driverSnap.exists()) { setLoading(false); return; }
        const d = driverSnap.data() as DriverData;
        setDriver(d);

        // 2. Children — loop associatedParentIds, fetch parent info + children subcollection
        const parentIds: string[] = d.associatedParentIds || [];
        const allChildren: Child[] = [];
        for (const parentId of parentIds) {
          // Get parent info for name/phone
          const parentSnap = await getDoc(doc(db, "parents", parentId));
          const parentData = parentSnap.exists() ? parentSnap.data() : {};
          const parentName = parentData?.name || parentData?.displayName || "—";
          const parentPhone = parentData?.phone || parentData?.phoneNumber || "—";

          const childSnap = await getDocs(collection(db, "parents", parentId, "children"));
          childSnap.docs.forEach((c) => {
            const cd = c.data();
            allChildren.push({
              id: c.id,
              name: cd.name || "—",
              age: cd.age || 0,
              school: cd.school || "—",
              grade: cd.grade || cd.class || "—",
              parentName,
              parentPhone,
            });
          });
        }
        setChildren(allChildren);

        // 3. Recent trips
        const tripSnap = await getDocs(
          query(
            collection(db, "trips"),
            where("driverId", "==", driverId),
            orderBy("createdAt", "desc"),
            limit(10)
          )
        );
        setTrips(
          tripSnap.docs.map((t) => {
            const td = t.data();
            return {
              id: t.id,
              date: td.date || "—",
              tripType: td.tripType || "—",
              status: td.status || "—",
              startedAt: td.startedAt || "—",
              endedAt: td.endedAt || "—",
            };
          })
        );

        // 4. Ratings
        const ratingSnap = await getDocs(
          query(collection(db, "ratings"), where("driverId", "==", driverId), orderBy("createdAt", "desc"))
        );
        setRatings(
          ratingSnap.docs.map((r) => {
            const rd = r.data();
            return {
              id: r.id,
              overall: rd.overall || 0,
              safety: rd.safety,
              punctuality: rd.punctuality,
              service: rd.service,
              comment: rd.comment || null,
              createdAt: rd.createdAt?.toDate?.()?.toLocaleDateString() || rd.createdAt || "—",
            };
          })
        );
      } catch (err) {
        console.error("DriverDetails load error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadAll();

    // 5. Real-time location
    const unsub = onSnapshot(doc(db, "locationRecords", driverId), (snap) => {
      if (snap.exists()) setLocation(snap.data() as LocationRecord);
    });

    return () => unsub();
  }, [driverId]);

  if (loading) return <p style={{ padding: 24, color: "#64748b" }}>Loading driver details…</p>;
  if (!driver) return <p style={{ padding: 24, color: "#ef4444" }}>Driver not found.</p>;

  const tripStatusClass: Record<string, string> = {
    in_progress: "badge-blue",
    completed: "badge-green",
    cancelled: "badge-red",
    not_started: "badge-gray",
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={() => navigate("/drivers")}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}
        >
          <ArrowLeft size={20} color="#64748b" />
        </button>
        <div>
          <h1 style={{ margin: 0 }}>{driver.name}</h1>
          <p style={{ margin: 0 }}>Driver Profile</p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {location?.isActive ? (
            <span className="badge badge-green" style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Wifi size={13} /> Active
            </span>
          ) : (
            <span className="badge badge-gray" style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <WifiOff size={13} /> Offline
            </span>
          )}
        </div>
      </div>

      {/* Profile Card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h2>Personal Information</h2></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
          {[
            ["Email", driver.email],
            ["Phone", driver.phone],
            ["License", driver.licenseNumber],
            ["Vehicle", driver.vehicleNumber],
            ["Terms Accepted", driver.termsAccepted ? "Yes" : "No"],
            ["Joined", driver.createdAt ? new Date(driver.createdAt).toLocaleDateString() : "—"],
          ].map(([label, value]) => (
            <div key={label}>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>{label}</div>
              <div style={{ fontWeight: 600, color: "#0f172a" }}>{value}</div>
            </div>
          ))}
        </div>

        {driver.averageRating && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Average Rating</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>
                {driver.averageRating.overall.toFixed(1)}
              </span>
              <Stars n={driver.averageRating.overall} />
              <span style={{ fontSize: 13, color: "#64748b" }}>
                ({driver.averageRating.totalRatings} ratings)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Live Location */}
      {location && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h2>Live Location</h2></div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <MapPin size={18} color="#2563eb" />
            <span style={{ fontWeight: 600 }}>
              {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
            </span>
            <span style={{ fontSize: 12, color: "#64748b" }}>
              · Updated {location.lastUpdated?.toDate?.()?.toLocaleTimeString() || "—"}
            </span>
          </div>
          <a
            href={`https://maps.google.com/?q=${location.lat},${location.lng}`}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 13, color: "#2563eb", marginTop: 8, display: "inline-block" }}
          >
            Open in Google Maps →
          </a>
        </div>
      )}

      {/* Children */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h2>Assigned Children ({children.length})</h2></div>
        {children.length === 0 ? (
          <p style={{ color: "#64748b" }}>No children assigned.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th><th>Age</th><th>School</th><th>Grade</th><th>Parent</th><th>Phone</th>
                </tr>
              </thead>
              <tbody>
                {children.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>{c.age}</td>
                    <td>{c.school}</td>
                    <td>{c.grade}</td>
                    <td>{c.parentName}</td>
                    <td>{c.parentPhone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Trips */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h2>Recent Trips</h2></div>
        {trips.length === 0 ? (
          <p style={{ color: "#64748b" }}>No trips recorded.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Date</th><th>Type</th><th>Status</th><th>Started</th><th>Ended</th></tr>
              </thead>
              <tbody>
                {trips.map((t) => (
                  <tr key={t.id}>
                    <td>{t.date}</td>
                    <td>{t.tripType}</td>
                    <td>
                      <span className={`badge ${tripStatusClass[t.status] || "badge-gray"}`}>
                        {t.status.replace("_", " ")}
                      </span>
                    </td>
                    <td style={{ fontSize: 13 }}>{t.startedAt}</td>
                    <td style={{ fontSize: 13 }}>{t.endedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ratings */}
      <div className="card">
        <div className="card-header"><h2>Ratings ({ratings.length})</h2></div>
        {ratings.length === 0 ? (
          <p style={{ color: "#64748b" }}>No ratings yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Overall</th><th>Safety</th><th>Punctuality</th><th>Service</th><th>Comment</th><th>Date</th></tr>
              </thead>
              <tbody>
                {ratings.map((r) => (
                  <tr key={r.id}>
                    <td><Stars n={r.overall} /> {r.overall.toFixed(1)}</td>
                    <td>{r.safety ?? "—"}</td>
                    <td>{r.punctuality ?? "—"}</td>
                    <td>{r.service ?? "—"}</td>
                    <td style={{ fontSize: 13, color: "#475569", fontStyle: "italic" }}>
                      {r.comment || "—"}
                    </td>
                    <td style={{ fontSize: 12, color: "#64748b" }}>{r.createdAt}</td>
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
