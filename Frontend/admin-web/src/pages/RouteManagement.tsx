import { useEffect, useState } from "react";
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, query, getDocs, where,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { MapPin, Plus, Trash2, UserCheck, X } from "lucide-react";

interface RouteDoc {
  id: string;
  name: string;
  area: string;
  description: string;
  schools: string[];
  createdAt: string;
  createdBy: string;
}

interface DriverDoc {
  id: string;
  name: string;
  email: string;
  routeId: string | null;
}

export default function RouteManagement() {
  const [routes, setRoutes] = useState<RouteDoc[]>([]);
  const [drivers, setDrivers] = useState<DriverDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [assigningRouteId, setAssigningRouteId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [description, setDescription] = useState("");
  const [schoolsInput, setSchoolsInput] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    // Real-time routes subscription
    const unsub = onSnapshot(collection(db, "routes"), (snap) => {
      setRoutes(
        snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name || "",
          area: d.data().area || "",
          description: d.data().description || "",
          schools: d.data().schools || [],
          createdAt: d.data().createdAt || "",
          createdBy: d.data().createdBy || "",
        }))
      );
      setLoading(false);
    });

    // Load all drivers for assignment panel
    getDocs(collection(db, "drivers")).then((snap) => {
      setDrivers(
        snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name || d.data().email || "Unknown",
          email: d.data().email || "",
          routeId: d.data().routeId || null,
        }))
      );
    });

    return () => unsub();
  }, []);

  const handleAddRoute = async () => {
    setFormError("");
    if (!name.trim() || !area.trim()) {
      setFormError("Route name and area are required.");
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, "routes"), {
        name: name.trim(),
        area: area.trim(),
        description: description.trim(),
        schools: schoolsInput
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        createdAt: new Date().toISOString(),
        createdBy: auth.currentUser?.email || "admin",
      });
      setName("");
      setArea("");
      setDescription("");
      setSchoolsInput("");
      setShowForm(false);
    } catch (err) {
      setFormError("Failed to create route. Try again.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRoute = async (routeId: string) => {
    if (!window.confirm("Delete this route? Drivers assigned to it will be unassigned.")) return;
    setDeletingId(routeId);
    try {
      // Unassign any drivers on this route
      const q = query(collection(db, "drivers"), where("routeId", "==", routeId));
      const snap = await getDocs(q);
      await Promise.all(snap.docs.map((d) => updateDoc(d.ref, { routeId: null })));
      await deleteDoc(doc(db, "routes", routeId));
      setDrivers((prev) =>
        prev.map((d) => (d.routeId === routeId ? { ...d, routeId: null } : d))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleAssignDriver = async (driverId: string, routeId: string | null) => {
    try {
      await updateDoc(doc(db, "drivers", driverId), { routeId });
      setDrivers((prev) =>
        prev.map((d) => (d.id === driverId ? { ...d, routeId } : d))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const driversOnRoute = (routeId: string) =>
    drivers.filter((d) => d.routeId === routeId);

  const unassignedDrivers = drivers.filter((d) => !d.routeId);

  return (
    <div>
      <div className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1>Routes</h1>
          <p>{routes.length} route{routes.length !== 1 ? "s" : ""} configured</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setFormError(""); }}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "#2563eb", color: "#fff", border: "none",
            borderRadius: 8, padding: "8px 16px", fontSize: 14,
            fontWeight: 600, cursor: "pointer",
          }}
        >
          <Plus size={16} /> Add Route
        </button>
      </div>

      {/* Add Route Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2>New Route</h2>
            <button
              onClick={() => setShowForm(false)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
            >
              <X size={18} />
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: "0 0 16px" }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                Route Name *
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Route A — Colombo North"
                style={{ width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                Area *
              </label>
              <input
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="e.g. Colombo North"
                style={{ width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                Schools (comma-separated)
              </label>
              <input
                value={schoolsInput}
                onChange={(e) => setSchoolsInput(e.target.value)}
                placeholder="e.g. Royal College, Visakha Vidyalaya, St. Joseph's"
                style={{ width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                Description
              </label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                style={{ width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
              />
            </div>
          </div>
          {formError && <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{formError}</p>}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={handleAddRoute}
              disabled={saving}
              style={{
                background: saving ? "#93c5fd" : "#2563eb", color: "#fff",
                border: "none", borderRadius: 8, padding: "9px 20px",
                fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Saving…" : "Create Route"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              style={{
                background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0",
                borderRadius: 8, padding: "9px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Routes List */}
      {loading ? (
        <p style={{ color: "#64748b" }}>Loading routes…</p>
      ) : routes.length === 0 ? (
        <div className="empty-state">
          <MapPin size={40} color="#cbd5e1" />
          <p>No routes created yet. Click "Add Route" to get started.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {routes.map((route) => {
            const assigned = driversOnRoute(route.id);
            return (
              <div key={route.id} className="card" style={{ padding: 0 }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <MapPin size={16} color="#2563eb" />
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{route.name}</h3>
                      <span className="badge badge-blue">{route.area}</span>
                    </div>
                    {route.schools.length > 0 && (
                      <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                        Schools: {route.schools.join(", ")}
                      </p>
                    )}
                    {route.description && (
                      <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>{route.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteRoute(route.id)}
                    disabled={deletingId === route.id}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: "#ef4444", padding: 4, opacity: deletingId === route.id ? 0.5 : 1,
                    }}
                    title="Delete route"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Assigned Drivers */}
                <div style={{ padding: "12px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                      <UserCheck size={14} style={{ verticalAlign: "middle", marginRight: 5 }} />
                      Assigned Drivers ({assigned.length})
                    </span>
                    <button
                      onClick={() => setAssigningRouteId(assigningRouteId === route.id ? null : route.id)}
                      style={{
                        background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0",
                        borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      {assigningRouteId === route.id ? "Done" : "Assign Driver"}
                    </button>
                  </div>

                  {assigned.length === 0 && assigningRouteId !== route.id && (
                    <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>No drivers assigned yet.</p>
                  )}

                  {assigned.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: assigningRouteId === route.id ? 12 : 0 }}>
                      {assigned.map((d) => (
                        <div key={d.id} style={{
                          display: "inline-flex", alignItems: "center", gap: 6,
                          background: "#eff6ff", border: "1px solid #bfdbfe",
                          borderRadius: 20, padding: "4px 12px", fontSize: 13,
                        }}>
                          <span>{d.name}</span>
                          <button
                            onClick={() => handleAssignDriver(d.id, null)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0, lineHeight: 1 }}
                            title="Remove from route"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Assign unassigned drivers dropdown */}
                  {assigningRouteId === route.id && (
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 12 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: "0 0 8px" }}>
                        Unassigned drivers — click to assign:
                      </p>
                      {unassignedDrivers.length === 0 ? (
                        <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>All drivers are already assigned to routes.</p>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {unassignedDrivers.map((d) => (
                            <button
                              key={d.id}
                              onClick={() => handleAssignDriver(d.id, route.id)}
                              style={{
                                background: "#fff", border: "1px solid #e2e8f0",
                                borderRadius: 20, padding: "4px 12px", fontSize: 13,
                                cursor: "pointer", color: "#374151",
                              }}
                            >
                              + {d.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
