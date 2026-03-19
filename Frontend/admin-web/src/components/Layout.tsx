import { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth } from "../firebase";
import logo from "../assets/logo.png";
import {
  LayoutDashboard, Map, Users, UserCheck, Baby,
  Route, CalendarOff, Star, AlertTriangle, CreditCard, MapPin, Menu,
} from "lucide-react";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/live-map", label: "Live Map", icon: Map },
  { to: "/routes", label: "Routes", icon: MapPin },
  { to: "/drivers", label: "Drivers", icon: UserCheck },
  { to: "/parents", label: "Parents", icon: Users },
  { to: "/children", label: "Children", icon: Baby },
  { to: "/trips", label: "Trips", icon: Route },
  { to: "/payments", label: "Payments", icon: CreditCard },
  { to: "/absences", label: "Absences", icon: CalendarOff },
  { to: "/ratings", label: "Ratings", icon: Star },
  { to: "/sos-alerts", label: "SOS Alerts", icon: AlertTriangle },
];

export default function Layout({ user }: { user: User | null }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="app-shell">
      {/* Mobile top bar — hidden on desktop via CSS */}
      <div className="mobile-topbar">
        <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
          <Menu size={22} color="#0f172a" />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={logo} alt="NaviKid" style={{ width: 28, height: 28, borderRadius: 6, objectFit: "contain" }} />
          <span style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>NaviKid</span>
        </div>
        {/* Spacer to keep logo centred */}
        <div style={{ width: 30 }} />
      </div>

      {/* Backdrop overlay — tapping outside closes the sidebar on mobile */}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={closeSidebar} />
      )}

      <aside className={`sidebar${sidebarOpen ? " sidebar-open" : ""}`}>
        {/* Close button inside drawer — only shown on mobile */}
        <button className="sidebar-close-btn" onClick={closeSidebar}>✕</button>

        <div className="sidebar-logo">
          <img src={logo} alt="NaviKid" className="sidebar-logo-img" />
          <div>
            <h2>NaviKid</h2>
            <span>Admin Dashboard</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => (isActive ? "active" : "")}
              onClick={closeSidebar}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p>{user?.email}</p>
          <button className="btn-logout" onClick={() => signOut(auth)}>
            Sign Out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="main-inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
