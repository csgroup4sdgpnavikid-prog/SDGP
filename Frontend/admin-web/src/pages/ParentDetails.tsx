import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../firebase";
import { ArrowLeft } from "lucide-react";

interface ParentData {
  name: string;
  email: string;
  phone: string;
  assignedDriverId: string | null;
  routeId: string | null;
  termsAccepted: boolean;
  createdAt: string;
}

interface Child {
  id: string;
  name: string;
  age: number;
  school: string;
  grade: string;
  isAbsent: boolean;
}

interface Absence {
  id: string;
  childName: string;
  date: string;
  type: string;
  status: string;
}

export default function ParentDetails() {
  const { parentId } = useParams<{ parentId: string }>();
  const navigate = useNavigate();

  const [parent, setParent] = useState<ParentData | null>(null);
  const [driverName, setDriverName] = useState<string | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!parentId) return;

    const loadAll = async () => {
      try {
        // 1. Parent doc
        const parentSnap = await getDoc(doc(db, "parents", parentId));
        if (!parentSnap.exists()) { setLoading(false); return; }
        const p = parentSnap.data() as ParentData;
        setParent(p);

        // 2. Assigned driver name
        if (p.assignedDriverId) {
          const driverSnap = await getDoc(doc(db, "drivers", p.assignedDriverId));
          if (driverSnap.exists()) setDriverName(driverSnap.data().name || null);
        }

        // 3. Children subcollection
        const childSnap = await getDocs(collection(db, "parents", parentId, "children"));
        setChildren(
          childSnap.docs.map((c) => {
            const cd = c.data();
            return {
              id: c.id,
              name: cd.name || "—",
              age: cd.age || 0,
              school: cd.school || "—",
              grade: cd.grade || cd.class || "—",
              isAbsent: !!cd.isAbsent,
            };
          })
        );

        // 4. Absence history
        const absSnap = await getDocs(
          query(
            collection(db, "absences"),
            where("parentId", "==", parentId),
            orderBy("date", "desc"),
            limit(20)
          )
        );
        setAbsences(
          absSnap.docs.map((a) => {
            const ad = a.data();
            return {
              id: a.id,
              childName: ad.childName || "—",
              date: ad.date || "—",
              type: ad.type || "—",
              status: ad.status || "—",
            };
          })
        );
      } catch (err) {
        console.error("ParentDetails load error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, [parentId]);

  if (loading) return <p style={{ padding: 24, color: "#64748b" }}>Loading parent details…</p>;
  if (!parent) return <p style={{ padding: 24, color: "#ef4444" }}>Parent not found.</p>;

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={() => navigate("/parents")}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}
        >
          <ArrowLeft size={20} color="#64748b" />
        </button>
        <div>
          <h1 style={{ margin: 0 }}>{parent.name}</h1>
          <p style={{ margin: 0 }}>Parent Profile</p>
        </div>
      </div>

      {/* Profile */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h2>Personal Information</h2></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
          {[
            ["Email", parent.email],
            ["Phone", parent.phone],
            ["Terms Accepted", parent.termsAccepted ? "Yes" : "No"],
            ["Joined", parent.createdAt ? new Date(parent.createdAt).toLocaleDateString() : "—"],
          ].map(([label, value]) => (
            <div key={label}>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>{label}</div>
              <div style={{ fontWeight: 600, color: "#0f172a" }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Assigned Driver */}
      {parent.assignedDriverId && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h2>Assigned Driver</h2></div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16, color: "#0f172a" }}>{driverName || "—"}</div>
              <div style={{ fontSize: 13, color: "#64748b" }}>Driver ID: {parent.assignedDriverId}</div>
            </div>
            <button
              onClick={() => navigate(`/drivers/${parent.assignedDriverId}`)}
              className="btn-primary"
              style={{
                background: "#2563eb", color: "#fff", border: "none", borderRadius: 8,
                padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600,
              }}
            >
              View Driver →
            </button>
          </div>
        </div>
      )}

      {/* Children */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h2>Children ({children.length})</h2></div>
        {children.length === 0 ? (
          <p style={{ color: "#64748b" }}>No children registered.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Name</th><th>Age</th><th>School</th><th>Grade</th><th>Today's Status</th></tr>
              </thead>
              <tbody>
                {children.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>{c.age}</td>
                    <td>{c.school}</td>
                    <td>{c.grade}</td>
                    <td>
                      <span className={`badge ${c.isAbsent ? "badge-red" : "badge-green"}`}>
                        {c.isAbsent ? "Absent" : "Present"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Absence History */}
      <div className="card">
        <div className="card-header"><h2>Absence History</h2></div>
        {absences.length === 0 ? (
          <p style={{ color: "#64748b" }}>No absences recorded.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Child</th><th>Date</th><th>Type</th><th>Status</th></tr>
              </thead>
              <tbody>
                {absences.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{a.childName}</td>
                    <td>{a.date}</td>
                    <td>{a.type.replace("_", " ")}</td>
                    <td>
                      <span className={`badge ${a.status === "confirmed" ? "badge-green" : "badge-gray"}`}>
                        {a.status}
                      </span>
                    </td>
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
