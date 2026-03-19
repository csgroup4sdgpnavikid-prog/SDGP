import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import logo from "./assets/logo.png";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Drivers from "./pages/Drivers";
import DriverDetails from "./pages/DriverDetails";
import Parents from "./pages/Parents";
import ParentDetails from "./pages/ParentDetails";
import Children from "./pages/Children";
import Trips from "./pages/Trips";
import Absences from "./pages/Absences";
import Ratings from "./pages/Ratings";
import SOSAlerts from "./pages/SOSAlerts";
import LiveMap from "./pages/LiveMap";
import Payments from "./pages/Payments";
import RouteManagement from "./pages/RouteManagement";

function AppLoader() {
  return (
    <div className="app-loader">
      <img src={logo} alt="NaviKid" className="app-loader-logo" />
      <div className="loader-spinner" />
      <p className="app-loader-text">Loading dashboard…</p>
    </div>
  );
}

function AccessDenied() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: 12 }}>
      <h2>Access Denied</h2>
      <p>This dashboard is for NaviKid admins only.</p>
      <button onClick={() => auth.signOut()}>Sign out</button>
    </div>
  );
}

// Admin check: Firestore admins/{uid} document must exist
function ProtectedRoute({ user, isAdmin, children }: { user: User | null; isAdmin: boolean; children: React.ReactNode }) {
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <AccessDenied />;
  return <>{children}</>;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Check admins/{uid} Firestore document
        try {
          const snap = await getDoc(doc(db, "admins", u.uid));
          setIsAdmin(snap.exists());
        } catch {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) return <AppLoader />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute user={user} isAdmin={isAdmin}>
              <Layout user={user} />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="live-map" element={<LiveMap />} />
          <Route path="drivers" element={<Drivers />} />
          <Route path="drivers/:driverId" element={<DriverDetails />} />
          <Route path="parents" element={<Parents />} />
          <Route path="parents/:parentId" element={<ParentDetails />} />
          <Route path="children" element={<Children />} />
          <Route path="payments" element={<Payments />} />
          <Route path="trips" element={<Trips />} />
          <Route path="absences" element={<Absences />} />
          <Route path="ratings" element={<Ratings />} />
          <Route path="sos-alerts" element={<SOSAlerts />} />
          <Route path="routes" element={<RouteManagement />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
