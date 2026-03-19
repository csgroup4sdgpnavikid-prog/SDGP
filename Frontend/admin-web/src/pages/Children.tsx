import { useEffect, useState } from "react";
import { collection, getDocs, getDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { Baby } from "lucide-react";

interface Child {
  id: string;
  name: string;
  grade: string;
  parentName: string;
  schoolName: string;
  driverName: string;
}

export default function Children() {
  const [children, setChildren] = useState<Child[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadChildren = async () => {
      try {
        // Children are stored as subcollections: parents/{parentId}/children/{childId}
        const parentsSnap = await getDocs(collection(db, "parents"));
        const allChildren: Child[] = [];

        for (const parentDoc of parentsSnap.docs) {
          const parentData = parentDoc.data();
          const parentName = parentData.name || parentData.displayName || "—";

          const childrenSnap = await getDocs(
            collection(db, "parents", parentDoc.id, "children")
          );

          for (const childDoc of childrenSnap.docs) {
            const cd = childDoc.data();

            // Resolve driver name if assigned
            let driverName = "—";
            if (cd.driverId) {
              try {
                const driverSnap = await getDoc(doc(db, "drivers", cd.driverId));
                if (driverSnap.exists()) {
                  const dd = driverSnap.data();
                  driverName = dd.name || dd.displayName || cd.driverId;
                }
              } catch { /* ignore */ }
            }

            allChildren.push({
              id: childDoc.id,
              name: cd.name || cd.childName || "Unknown",
              grade: cd.grade || cd.class || "—",
              parentName,
              schoolName: cd.school || cd.schoolName || "—",
              driverName,
            });
          }
        }

        setChildren(allChildren);
      } catch (err) {
        console.error("Error loading children:", err);
      } finally {
        setLoading(false);
      }
    };

    loadChildren();
  }, []);

  const filtered = children.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.parentName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <h1>Children</h1>
        <p>{children.length} registered children</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>All Children</h2>
          <input
            className="search-input"
            placeholder="Search children..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <p style={{ color: "#64748b" }}>Loading children...</p>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Baby size={40} color="#cbd5e1" />
            <p>No children found.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Grade</th>
                  <th>Parent</th>
                  <th>School</th>
                  <th>Assigned Driver</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.id}>
                    <td style={{ color: "#94a3b8" }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>{c.grade}</td>
                    <td>{c.parentName}</td>
                    <td>{c.schoolName}</td>
                    <td><span className="badge badge-blue">{c.driverName}</span></td>
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
