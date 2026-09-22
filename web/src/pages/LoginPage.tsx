import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(email, password);
      const dest = user.role === "DISPATCHER" ? "/dispatcher" : user.role === "COURIER" ? "/courier" : "/client";
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? `Помилка: ${err.message}` : "Не вдалося увійти");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark large">ШД</span>
          <h1>Швидка Доставка</h1>
          <p className="muted">Увійдіть, щоб відстежувати та керувати доставками.</p>
        </div>
        <form onSubmit={handleSubmit} className="form">
          <label className="field">
            <span>Електронна пошта</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
            />
          </label>
          <label className="field">
            <span>Пароль</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>
          {error && <div className="alert alert-error">{error}</div>}
          <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
            {submitting ? "Вхід…" : "Увійти"}
          </button>
        </form>
        <p className="auth-footer">
          Немає акаунта? <Link to="/register">Зареєструватися</Link>
        </p>
      </div>
    </div>
  );
}
