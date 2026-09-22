import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";
import { Role } from "../types";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("CLIENT");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await register({ name, email, password, phone: phone || undefined, role });
      const dest = user.role === "DISPATCHER" ? "/dispatcher" : user.role === "COURIER" ? "/courier" : "/client";
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not register");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark large">DMS</span>
          <h1>Create an account</h1>
          <p className="muted">Choose the role that matches how you'll use the system.</p>
        </div>
        <form onSubmit={handleSubmit} className="form">
          <label className="field">
            <span>Full name</span>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
          </label>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <label className="field">
            <span>Phone (optional)</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 000 1234" />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </label>
          <label className="field">
            <span>Role</span>
            <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="CLIENT">Client — request deliveries</option>
              <option value="COURIER">Courier — deliver packages</option>
              <option value="DISPATCHER">Dispatcher — manage operations</option>
            </select>
          </label>
          {error && <div className="alert alert-error">{error}</div>}
          <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
