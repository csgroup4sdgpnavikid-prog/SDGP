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
      <div className="login-brand">
        <img src={logo} alt="NaviKid" className="login-logo" />
        <h1 className="login-brand-title">NaviKid</h1>
        <p className="login-brand-sub">School Van Tracking &amp; Safety System</p>
      </div>

      <div className="login-card">
        <h2>Admin Portal</h2>
        <p>Sign in to manage your fleet</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@navikid.com"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button className="btn-login" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
          {error && <p className="error-msg">{error}</p>}
        </form>
      </div>
    </div>
  );
}
