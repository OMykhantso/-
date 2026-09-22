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
      setError(err instanceof ApiError ? `Помилка: ${err.message}` : "Не вдалося зареєструватися");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark large">ШД</span>
          <h1>Створення акаунта</h1>
          <p className="muted">Оберіть роль, що відповідає тому, як ви користуватиметесь системою.</p>
        </div>
        <form onSubmit={handleSubmit} className="form">
          <label className="field">
            <span>Повне ім'я</span>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Іван Петренко" />
          </label>
          <label className="field">
            <span>Електронна пошта</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <label className="field">
            <span>Телефон (необов'язково)</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+380 50 000 1234" />
          </label>
          <label className="field">
            <span>Пароль</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Щонайменше 8 символів"
            />
          </label>
          <label className="field">
            <span>Роль</span>
            <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="CLIENT">Клієнт — замовляє доставки</option>
              <option value="COURIER">Кур'єр — доставляє посилки</option>
              <option value="DISPATCHER">Диспетчер — керує операціями</option>
            </select>
          </label>
          {error && <div className="alert alert-error">{error}</div>}
          <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
            {submitting ? "Створення акаунта…" : "Зареєструватися"}
          </button>
        </form>
        <p className="auth-footer">
          Вже є акаунт? <Link to="/login">Увійти</Link>
        </p>
      </div>
    </div>
  );
}
