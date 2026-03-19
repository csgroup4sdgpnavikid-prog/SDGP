import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, updateDoc, doc, limit } from "firebase/firestore";
import { db, auth } from "../firebase";
import { AlertTriangle, CheckCircle } from "lucide-react";

interface SOSAlert {
  id: string;
  triggeredBy: string;
  role: string;
  message: string;
  location: string;
  status: string;
  acknowledgedBy: string | null;
  createdAt: string;
}

export default function SOSAlerts() {
  const [alerts, setAlerts] = useState<SOSAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);

  useEffect(() => {
    // Real-time subscription — new alerts appear instantly
    const q = query(
      collection(db, "emergencyAlerts"),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data: SOSAlert[] = snap.docs.map((d) => {
          const x = d.data();
          return {
            id: d.id,
            triggeredBy: x.triggeredBy || x.driverName || x.userId || "Unknown",
            role: x.role || "driver",
            message: x.message || x.alertMessage || "Emergency alert triggered",
            location: x.location
              ? typeof x.location === "object"
                ? `${(x.location.lat ?? x.location.latitude)?.toFixed(4)}, ${(x.location.lng ?? x.location.longitude)?.toFixed(4)}`
                : String(x.location)
              : "—",
            status: x.status || "sent",
            acknowledgedBy: x.acknowledgedBy || null,
            createdAt: x.createdAt?.toDate?.()?.toLocaleString() || x.createdAt || "—",
          };
        });
        setAlerts(data);
        setLoading(false);
      },
      (err) => { console.error(err); setLoading(false); }
    );
    return () => unsub();
  }, []);

  const handleAcknowledge = async (alertId: string) => {
    setAcknowledging(alertId);
    try {
      await updateDoc(doc(db, "emergencyAlerts", alertId), {
        status: "acknowledged",
        acknowledgedBy: auth.currentUser?.email || "admin",
        acknowledgedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Acknowledge error:", err);
    } finally {
      setAcknowledging(null);
    }
  };

  const handleResolve = async (alertId: string) => {
    setResolving(alertId);
    try {
      await updateDoc(doc(db, "emergencyAlerts", alertId), {
        status: "resolved",
        resolvedAt: new Date().toISOString(),
        resolvedBy: auth.currentUser?.email || "admin",
      });
    } catch (err) {
      console.error("Resolve error:", err);
    } finally {
      setResolving(null);
    }
  };

  const unresolved = alerts.filter(
    (a) => a.status !== "resolved" && a.status !== "acknowledged"
  ).length;

  const statusBadgeClass = (status: string) => {
    if (status === "resolved") return "badge-green";
    if (status === "acknowledged") return "badge-blue";
    return "badge-red";
  };

  return (
    <div>
      <div className="page-header">
        <h1>SOS Alerts</h1>
        <p>
          {alerts.length} total alerts —{" "}
          {unresolved > 0 ? (
            <span style={{ color: "#dc2626", fontWeight: 600 }}>{unresolved} unresolved</span>
          ) : (
            "All resolved"
          )}
        </p>
      </div>

      {unresolved > 0 && (
        <div className="alert-card sos" style={{ marginBottom: 24 }}>
          <AlertTriangle size={22} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
          <div className="alert-body">
            <h4>Action Required</h4>
            <p>{unresolved} emergency alert{unresolved > 1 ? "s" : ""} need attention.</p>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2>All Emergency Alerts</h2>
        </div>

        {loading ? (
          <p style={{ color: "#64748b" }}>Loading alerts…</p>
        ) : alerts.length === 0 ? (
          <div className="empty-state">
            <AlertTriangle size={40} color="#cbd5e1" />
            <p>No SOS alerts recorded.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Triggered By</th>
                  <th>Message</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a, i) => (
                  <tr key={a.id}>
                    <td style={{ color: "#94a3b8" }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{a.triggeredBy}</td>
                    <td>{a.message}</td>
                    <td style={{ fontSize: 12, color: "#64748b" }}>{a.location}</td>
                    <td>
                      <span className={`badge ${statusBadgeClass(a.status)}`}>
                        {a.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 13 }}>{a.createdAt}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {a.status !== "resolved" && a.status !== "acknowledged" && (
                          <button
                            onClick={() => handleAcknowledge(a.id)}
                            disabled={acknowledging === a.id}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              background: "#2563eb",
                              color: "#fff",
                              border: "none",
                              borderRadius: 6,
                              padding: "5px 12px",
                              cursor: "pointer",
                              fontSize: 12,
                              fontWeight: 600,
                              opacity: acknowledging === a.id ? 0.6 : 1,
                            }}
                          >
                            <CheckCircle size={13} />
                            {acknowledging === a.id ? "…" : "Acknowledge"}
                          </button>
                        )}
                        {a.status !== "resolved" && (
                          <button
                            onClick={() => handleResolve(a.id)}
                            disabled={resolving === a.id}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              background: "#16a34a",
                              color: "#fff",
                              border: "none",
                              borderRadius: 6,
                              padding: "5px 12px",
                              cursor: "pointer",
                              fontSize: 12,
                              fontWeight: 600,
                              opacity: resolving === a.id ? 0.6 : 1,
                            }}
                          >
                            <CheckCircle size={13} />
                            {resolving === a.id ? "…" : "Resolve"}
                          </button>
                        )}
                        {a.status === "resolved" && (
                          <span style={{ fontSize: 12, color: "#64748b" }}>
                            {a.acknowledgedBy ? `By ${a.acknowledgedBy}` : "Done"}
                          </span>
                        )}
                      </div>
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
