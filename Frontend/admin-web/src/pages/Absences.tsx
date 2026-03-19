import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import { CalendarOff } from "lucide-react";

interface Absence {
  id: string;
  childName: string;
  parentName: string;
  date: string;
  type: string;
  reason: string;
}

const typeBadge: Record<string, string> = {
  full_day: "badge-red",
  morning_only: "badge-yellow",
  evening_only: "badge-orange",
};

export default function Absences() {
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(query(collection(db, "absences"), orderBy("date", "desc")))
      .then((snap) => {
        const data: Absence[] = snap.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            childName: d.childName || d.studentName || "Unknown",
            parentName: d.parentName || "—",
            date: d.date || "—",
            type: d.type || d.absenceType || "full_day",
            reason: d.reason || "—",
          };
        });
        setAbsences(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>Absences</h1>
        <p>{absences.length} total absence records</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Absence Records</h2>
        </div>

        {loading ? (
          <p style={{ color: "#64748b" }}>Loading absences...</p>
        ) : absences.length === 0 ? (
          <div className="empty-state">
            <CalendarOff size={40} color="#cbd5e1" />
            <p>No absence records found.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Child</th>
                  <th>Parent</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {absences.map((a, i) => (
                  <tr key={a.id}>
                    <td style={{ color: "#94a3b8" }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{a.childName}</td>
                    <td>{a.parentName}</td>
                    <td>{a.date}</td>
                    <td>
                      <span className={`badge ${typeBadge[a.type] || "badge-gray"}`}>
                        {a.type.replace("_", " ")}
                      </span>
                    </td>
                    <td>{a.reason}</td>
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
