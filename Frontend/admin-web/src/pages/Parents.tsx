import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Parent {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

export default function Parents() {
  const navigate = useNavigate();
  const [parents, setParents] = useState<Parent[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(collection(db, "parents")).then((snap) => {
      const data: Parent[] = snap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          name: d.name || d.fullName || "Unknown",
          email: d.email || "—",
          phone: d.phone || d.phoneNumber || "—",
          address: d.address || "—",
        };
      });
      setParents(data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = parents.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <h1>Parents</h1>
        <p>{parents.length} registered parents</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>All Parents</h2>
          <input
            className="search-input"
            placeholder="Search parents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <p style={{ color: "#64748b" }}>Loading parents...</p>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Users size={40} color="#cbd5e1" />
            <p>No parents found.</p>
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
                  <th>Address</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/parents/${p.id}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <td style={{ color: "#94a3b8" }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>{p.email}</td>
                    <td>{p.phone}</td>
                    <td>{p.address}</td>
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
