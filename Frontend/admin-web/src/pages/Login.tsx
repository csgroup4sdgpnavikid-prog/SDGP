import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import logo from "../assets/logo.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Animated background shapes */}
      <div className="login-bg-shapes">
        <div className="login-shape login-shape-1" />
        <div className="login-shape login-shape-2" />
        <div className="login-shape login-shape-3" />
      </div>

      <div className="login-brand">
        <div className="login-logo-ring">
          <img src={logo} alt="NaviKid" className="login-logo" />
        </div>
        <h1 className="login-brand-title">NaviKid</h1>
        <p className="login-brand-sub">School Van Tracking &amp; Safety System</p>
        <div className="login-brand-features">
          <div className="login-feature">
            <span className="login-feature-dot" />
            Real-time GPS tracking
          </div>
          <div className="login-feature">
            <span className="login-feature-dot" />
            Instant SOS alerts
          </div>
          <div className="login-feature">
            <span className="login-feature-dot" />
            Complete fleet management
          </div>
        </div>
      </div>

      <div className="login-card">
        <div className="login-card-inner">
          <div className="login-card-badge">ADMIN</div>
          <h2>Welcome back</h2>
          <p>Sign in to your admin dashboard</p>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email Address</label>
              <div className="input-wrapper">
                <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@navikid.com"
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label>Password</label>
              <div className="input-wrapper">
                <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            <button className="btn-login" type="submit" disabled={loading}>
              {loading ? (
                <span className="btn-login-loading">
                  <span className="btn-spinner" />
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
            {error && <p className="error-msg">{error}</p>}
          </form>
          <div className="login-footer-text">
            Protected by NaviKid Security
          </div>
        </div>
      </div>
    </div>
  );
}
