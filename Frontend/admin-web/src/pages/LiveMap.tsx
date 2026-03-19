import { useEffect, useRef, useState } from "react";
import { collection, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";

// ── Van icon helper ──────────────────────────────────────────────────────────
// Returns a data-URI SVG suitable for google.maps.Marker icon.url

function makeVanIconUrl(color: "green" | "gray" | "orange"): string {
  const colors: Record<string, string> = {
    green: "#16a34a",
    gray: "#6b7280",
    orange: "#d97706",
  };
  const c = colors[color];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="42" viewBox="0 0 36 42">
    <rect x="2" y="2" width="32" height="26" rx="5" fill="${c}" stroke="white" stroke-width="2"/>
    <text x="18" y="20" font-size="14" text-anchor="middle" fill="white" font-family="sans-serif">&#128656;</text>
    <polygon points="18,42 12,30 24,30" fill="${c}"/>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

// ── Types ──────────────────────────────────────────────────────────────────

interface DriverRecord {
  id: string;
  name: string;
  phone: string;
}

interface LiveLocation {
  driverId: string;
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;     // m/s
  isActive: boolean;
  tripId: string | null;
  lastUpdated: Date | null;
  isOnline: boolean;        // updated in last 5 minutes AND isActive
}

// ── Component ───────────────────────────────────────────────────────────────

export default function LiveMap() {
  const [drivers, setDrivers] = useState<Record<string, DriverRecord>>({});
  const [locations, setLocations] = useState<LiveLocation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "",
  });

  // ── Step 1: Load driver names once ────────────────────────────────────────
  useEffect(() => {
    getDocs(collection(db, "drivers")).then((snap) => {
      const map: Record<string, DriverRecord> = {};
      snap.docs.forEach((doc) => {
        const d = doc.data();
        map[doc.id] = {
          id: doc.id,
          name: d.name || d.fullName || "Unknown Driver",
          phone: d.phone || d.phoneNumber || "—",
        };
      });
      setDrivers(map);
    });
  }, []);

  // ── Step 2: Real-time listener on locationRecords ──────────────────────────
  // Each document is keyed by driverId and updated every 10 seconds by DriverMap
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "locationRecords"), (snap) => {
      const now = new Date();
      const data: LiveLocation[] = snap.docs
        .map((doc) => {
          const d = doc.data();
          // DriverMap.tsx writes: lat, lng, heading, speed, isActive, tripId, lastUpdated
          const lastUpdated: Date | null = d.lastUpdated?.toDate?.() ?? null;
          const minutesAgo = lastUpdated
            ? (now.getTime() - lastUpdated.getTime()) / 60000
            : Infinity;
          return {
            driverId: doc.id,
            lat: d.lat ?? 0,
            lng: d.lng ?? 0,
            heading: d.heading ?? null,
            speed: d.speed ?? null,
            isActive: d.isActive === true,
            tripId: d.tripId ?? null,
            lastUpdated,
            // Online = marked active by driver app AND updated within 5 minutes
            isOnline: d.isActive === true && minutesAgo < 5,
          };
        })
        .filter((l) => l.lat !== 0 && l.lng !== 0); // skip docs with no GPS yet
      setLocations(data);
    });
    return unsub;
  }, []);

  // Auto-pan to first driver location when it first appears
  const firstLoc = locations[0];
  const firstLocRef = useRef<string | null>(null);
  useEffect(() => {
    if (mapRef.current && firstLoc && firstLocRef.current !== firstLoc.driverId) {
      firstLocRef.current = firstLoc.driverId;
      mapRef.current.panTo({ lat: firstLoc.lat, lng: firstLoc.lng });
    }
  }, [firstLoc]);

  const online  = locations.filter((l) => l.isOnline).length;
  const offline = locations.length - online;
  const selectedLoc = locations.find((l) => l.driverId === selected);

  function formatSpeed(ms: number | null) {
    if (ms === null || ms < 0) return "—";
    return `${(ms * 3.6).toFixed(0)} km/h`;
  }

  function formatHeading(h: number | null) {
    if (h === null || h < 0) return "—";
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return `${dirs[Math.round(h / 45) % 8]} (${h.toFixed(0)}°)`;
  }

  function timeAgo(d: Date | null) {
    if (!d) return "Never";
    const s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return d.toLocaleTimeString();
  }

  return (
    <div>
      <div className="page-header">
        <h1>Live Driver Monitoring</h1>
        <p>
          {locations.length} driver{locations.length !== 1 ? "s" : ""} tracked —{" "}
          <span style={{ color: "#16a34a", fontWeight: 600 }}>{online} on trip</span>
          {" · "}
          <span style={{ color: "#64748b" }}>{offline} offline</span>
        </p>
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        {/* ── Map ─────────────────────────────────────────────────────────── */}
        <div className="card" style={{ flex: 1, padding: 0, overflow: "hidden", minHeight: 520 }}>
          {!isLoaded ? (
            <div style={{ height: 520, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
              Loading map…
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={{ height: 520, width: "100%" }}
              center={{ lat: 6.9271, lng: 79.8612 }}
              zoom={12}
              onLoad={(map) => { mapRef.current = map; }}
            >
              {locations.map((loc) => {
                const isSelected = loc.driverId === selected;
                return (
                  <Marker
                    key={loc.driverId}
                    position={{ lat: loc.lat, lng: loc.lng }}
                    icon={{
                      url: makeVanIconUrl(isSelected ? "orange" : loc.isOnline ? "green" : "gray"),
                      scaledSize: new window.google.maps.Size(36, 42),
                      anchor: new window.google.maps.Point(18, 42),
                    }}
                    onClick={() => setSelected(isSelected ? null : loc.driverId)}
                  />
                );
              })}

              {selected && selectedLoc && (
                <InfoWindow
                  position={{ lat: selectedLoc.lat, lng: selectedLoc.lng }}
                  onCloseClick={() => setSelected(null)}
                >
                  <div style={{ fontSize: 13, lineHeight: 1.9, minWidth: 180 }}>
                    <strong style={{ fontSize: 15 }}>
                      {drivers[selectedLoc.driverId]?.name ?? selectedLoc.driverId}
                    </strong>
                    <br />
                    <span style={{ color: selectedLoc.isOnline ? "#16a34a" : "#6b7280", fontWeight: 600 }}>
                      {selectedLoc.isOnline ? "● On trip" : "● Offline"}
                    </span>
                    <br />
                    <span style={{ color: "#64748b" }}>Speed: {formatSpeed(selectedLoc.speed)}</span>
                    <br />
                    <span style={{ color: "#64748b" }}>Heading: {formatHeading(selectedLoc.heading)}</span>
                    <br />
                    <span style={{ color: "#64748b", fontSize: 11 }}>
                      Updated: {timeAgo(selectedLoc.lastUpdated)}
                    </span>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          )}
        </div>

        {/* ── Side panel ──────────────────────────────────────────────────── */}
        <div style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Selected driver detail */}
          {selectedLoc && (
            <div className="card" style={{ borderLeft: "4px solid #2563eb" }}>
              <div className="card-header" style={{ marginBottom: 12 }}>
                <h2 style={{ fontSize: 15 }}>
                  {drivers[selectedLoc.driverId]?.name ?? selectedLoc.driverId}
                </h2>
                <button
                  onClick={() => setSelected(null)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 18 }}
                >×</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                <Row label="Status"    value={selectedLoc.isOnline ? "🟢 On trip" : "⚫ Offline"} />
                <Row label="Speed"     value={formatSpeed(selectedLoc.speed)} />
                <Row label="Heading"   value={formatHeading(selectedLoc.heading)} />
                <Row label="Trip ID"   value={selectedLoc.tripId ?? "—"} mono />
                <Row label="Phone"     value={drivers[selectedLoc.driverId]?.phone ?? "—"} />
                <Row label="Updated"   value={timeAgo(selectedLoc.lastUpdated)} />
                <Row label="Position"  value={`${selectedLoc.lat.toFixed(5)}, ${selectedLoc.lng.toFixed(5)}`} mono />
              </div>
            </div>
          )}

          {/* All drivers list */}
          <div className="card" style={{ padding: 0 }}>
            <div className="card-header" style={{ padding: "14px 16px 10px" }}>
              <h2 style={{ fontSize: 14 }}>All Drivers</h2>
            </div>
            {locations.length === 0 ? (
              <p style={{ color: "#94a3b8", fontSize: 13, padding: "12px 16px" }}>
                No drivers have sent GPS data yet.
              </p>
            ) : (
              <div>
                {locations
                  .sort((a, b) => Number(b.isOnline) - Number(a.isOnline))
                  .map((loc) => {
                    const driver = drivers[loc.driverId];
                    const isSelected = loc.driverId === selected;
                    return (
                      <div
                        key={loc.driverId}
                        onClick={() => setSelected(isSelected ? null : loc.driverId)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 16px",
                          cursor: "pointer",
                          backgroundColor: isSelected ? "#eff6ff" : "transparent",
                          borderLeft: isSelected ? "3px solid #2563eb" : "3px solid transparent",
                          borderBottom: "1px solid #f1f5f9",
                        }}
                      >
                        <span style={{
                          width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                          backgroundColor: loc.isOnline ? "#16a34a" : "#9ca3af",
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {driver?.name ?? loc.driverId}
                          </div>
                          <div style={{ fontSize: 11, color: "#6b7280" }}>
                            {loc.isOnline
                              ? `${formatSpeed(loc.speed)} · ${timeAgo(loc.lastUpdated)}`
                              : `Last seen ${timeAgo(loc.lastUpdated)}`}
                          </div>
                        </div>
                        {loc.isOnline && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#16a34a", backgroundColor: "#dcfce7", padding: "2px 6px", borderRadius: 4 }}>
                            LIVE
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Summary table ───────────────────────────────────────────────────── */}
      {locations.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-header">
            <h2>Driver Status Table</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Driver</th>
                  <th>Speed</th>
                  <th>Heading</th>
                  <th>Trip ID</th>
                  <th>Last Update</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc) => (
                  <tr
                    key={loc.driverId}
                    onClick={() => setSelected(loc.driverId)}
                    style={{ cursor: "pointer" }}
                  >
                    <td style={{ fontWeight: 600 }}>
                      {drivers[loc.driverId]?.name ?? loc.driverId}
                    </td>
                    <td>{formatSpeed(loc.speed)}</td>
                    <td>{formatHeading(loc.heading)}</td>
                    <td style={{ fontFamily: "monospace", fontSize: 11, color: "#64748b" }}>
                      {loc.tripId ? loc.tripId.slice(0, 12) + "…" : "—"}
                    </td>
                    <td>{timeAgo(loc.lastUpdated)}</td>
                    <td>
                      <span className={`badge ${loc.isOnline ? "badge-green" : "badge-gray"}`}>
                        {loc.isOnline ? "On Trip" : "Offline"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
      <span style={{ color: "#64748b", flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: "right", fontFamily: mono ? "monospace" : undefined, fontSize: mono ? 11 : undefined, color: "#111827", wordBreak: "break-all" }}>
        {value}
      </span>
    </div>
  );
}
