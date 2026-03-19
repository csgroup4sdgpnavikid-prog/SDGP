import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { UserCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  status: string;
}

export default function Drivers() {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(collection(db, "drivers")).then((snap) => {
      const data: Driver[] = snap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          name: d.name || d.fullName || "Unknown",
          email: d.email || "—",
          phone: d.phone || d.phoneNumber || "—",
          licenseNumber: d.licenseNumber || d.license || "—",
          status: d.status || "active",
        };
      });
      setDrivers(data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = drivers.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <h1>Drivers</h1>
        <p>{drivers.length} registered drivers</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>All Drivers</h2>
          <input
            className="search-input"
            placeholder="Search drivers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <p style={{ color: "#64748b" }}>Loading drivers...</p>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <UserCheck size={40} color="#cbd5e1" />
            <p>No drivers found.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>License</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d, i) => (
                  <tr
                    key={d.id}
                    onClick={() => navigate(`/drivers/${d.id}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <td style={{ color: "#94a3b8" }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{d.name}</td>
                    <td>{d.email}</td>
                    <td>{d.phone}</td>
                    <td>{d.licenseNumber}</td>
                    <td>
                      <span className={`badge ${d.status === "active" ? "badge-green" : "badge-gray"}`}>
                        {d.status}
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
