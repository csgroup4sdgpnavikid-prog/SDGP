import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { Users, UserCheck, Baby, Route, AlertTriangle, CalendarOff, RefreshCw } from "lucide-react";

interface Stats {
  drivers: number;
  parents: number;
  children: number;
  trips: number;
  sosAlerts: number;
  absences: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ drivers: 0, parents: 0, children: 0, trips: 0, sosAlerts: 0, absences: 0 });
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchStats = () => {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    Promise.all([
      getDocs(collection(db, "drivers")),
      getDocs(collection(db, "parents")),
      getDocs(collection(db, "children")),
      getDocs(collection(db, "trips")),
      getDocs(query(collection(db, "emergencyAlerts"), where("status", "!=", "resolved"))),
      getDocs(query(collection(db, "absences"), where("date", "==", today))),
    ]).then(([d, p, c, t, sos, abs]) => {
      setStats({
        drivers: d.size,
        parents: p.size,
        children: c.size,
        trips: t.size,
        sosAlerts: sos.size,
        absences: abs.size,
      });
      setLastRefreshed(new Date());
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchStats(); }, []);

  const cards = [
    { label: "Drivers", value: stats.drivers, icon: UserCheck, color: "blue" },
    { label: "Parents", value: stats.parents, icon: Users, color: "green" },
    { label: "Children", value: stats.children, icon: Baby, color: "purple" },
    { label: "Trips", value: stats.trips, icon: Route, color: "yellow" },
    { label: "Unresolved SOS", value: stats.sosAlerts, icon: AlertTriangle, color: "red" },
    { label: "Today's Absences", value: stats.absences, icon: CalendarOff, color: "orange" },
  ];

  return (
    <div>
      <div className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1>Dashboard</h1>
          <p>
            Overview of NaviKid school van tracker
            {lastRefreshed && (
              <span style={{ color: "#94a3b8", fontSize: 12, marginLeft: 10 }}>
                · Last updated {lastRefreshed.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: loading ? "#e2e8f0" : "#f1f5f9",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            padding: "7px 14px",
            fontSize: 13,
            fontWeight: 600,
            color: "#475569",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          <RefreshCw size={14} style={{ animation: loading ? "spin 0.8s linear infinite" : "none" }} />
          Refresh
        </button>
      </div>

      {loading ? (
        <p style={{ color: "#64748b" }}>Loading stats...</p>
      ) : (
        <div className="stat-grid">
          {cards.map(({ label, value, icon: Icon, color }) => (
            <div className="stat-card" key={label}>
              <div className={`stat-icon ${color}`}>
                <Icon size={18} color={color === "blue" ? "#1d4ed8" : color === "green" ? "#15803d" : color === "purple" ? "#7c3aed" : color === "yellow" ? "#854d0e" : color === "red" ? "#dc2626" : "#9a3412"} />
              </div>
              <div className="stat-label">{label}</div>
              <div className="stat-value">{value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
