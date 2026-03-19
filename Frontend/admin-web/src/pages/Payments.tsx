import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { CreditCard } from "lucide-react";

interface Payment {
  id: string;
  parentName: string;
  childName: string;
  driverName: string;
  amount: number;
  status: "paid" | "pending";
  month: string;
  paidAt: string | null;
}

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );

  useEffect(() => {
    const q = query(
      collection(db, "payments"),
      where("month", "==", selectedMonth),
      orderBy("status", "asc")  // "paid" < "pending" alphabetically
    );

    const unsub = onSnapshot(q, (snap) => {
      const data: Payment[] = snap.docs.map((d) => {
        const x = d.data();
        return {
          id: d.id,
          parentName: x.parentName || "—",
          childName: x.childName || "—",
          driverName: x.driverName || "—",
          amount: x.amount || 0,
          status: x.status || "pending",
          month: x.month || selectedMonth,
          paidAt: x.paidAt || null,
        };
      });
      setPayments(data);
      setLoading(false);
    }, (err) => { console.error(err); setLoading(false); });

    return () => unsub();
  }, [selectedMonth]);

  const paid = payments.filter((p) => p.status === "paid");
  const pending = payments.filter((p) => p.status === "pending");
  const totalCollected = paid.reduce((s, p) => s + p.amount, 0);
  const totalOutstanding = pending.reduce((s, p) => s + p.amount, 0);
  const collectionRate = payments.length > 0 ? Math.round((paid.length / payments.length) * 100) : 0;

  // Build month options for the past 6 months
  const monthOptions: string[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    monthOptions.push(d.toISOString().slice(0, 7));
  }

  const formatMonth = (ym: string) => {
    const [year, month] = ym.split("-");
    return new Date(Number(year), Number(month) - 1, 1).toLocaleString("default", {
      month: "long", year: "numeric",
    });
  };

  return (
    <div>
      <div className="page-header">
        <h1>Payments</h1>
        <p>{formatMonth(selectedMonth)} · {payments.length} records</p>
      </div>

      {/* Month picker */}
      <div style={{ marginBottom: 20 }}>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            padding: "8px 14px",
            fontSize: 14,
            color: "#0f172a",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          {monthOptions.map((m) => (
            <option key={m} value={m}>{formatMonth(m)}</option>
          ))}
        </select>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Collected</div>
          <div className="stat-value" style={{ color: "#10b981" }}>
            LKR {totalCollected.toLocaleString()}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Outstanding</div>
          <div className="stat-value" style={{ color: "#ef4444" }}>
            LKR {totalOutstanding.toLocaleString()}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Collection Rate</div>
          <div className="stat-value">{collectionRate}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Paid / Total</div>
          <div className="stat-value">{paid.length} / {payments.length}</div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header"><h2>All Payment Records</h2></div>

        {loading ? (
          <p style={{ color: "#64748b" }}>Loading payments…</p>
        ) : payments.length === 0 ? (
          <div className="empty-state">
            <CreditCard size={40} color="#cbd5e1" />
            <p>No payment records for this month.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Parent</th>
                  <th>Child</th>
                  <th>Driver</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Paid On</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, i) => (
                  <tr key={p.id}>
                    <td style={{ color: "#94a3b8" }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{p.parentName}</td>
                    <td>{p.childName}</td>
                    <td>{p.driverName}</td>
                    <td>LKR {p.amount.toLocaleString()}</td>
                    <td>
                      <span className={`badge ${p.status === "paid" ? "badge-green" : "badge-yellow"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, color: "#64748b" }}>
                      {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : "—"}
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
