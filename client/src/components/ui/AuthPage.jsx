import { useState } from "react";

const API =
  process.env.REACT_APP_API_URL || "https://ritual-backend-giri.onrender.com";
// ── helpers ──────────────────────────────────────────────────────────────────
function PasswordStrength({ password }) {
  if (!password) return null;
  const score = [/.{8,}/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((r) =>
    r.test(password),
  ).length;
  const labels = ["", "weak", "fair", "good", "strong"];
  const colors = ["", "#993C1D", "#BA7517", "#1D9E75", "#1D9E75"];
  return (
    <div
      style={{
        display: "flex",
        gap: "4px",
        alignItems: "center",
        marginTop: "4px",
      }}
    >
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: "3px",
            borderRadius: "2px",
            background: i <= score ? colors[score] : "var(--border)",
            transition: "background 0.3s",
          }}
        />
      ))}
      <span
        style={{
          fontSize: "10px",
          color: colors[score] || "var(--text-dim)",
          marginLeft: "6px",
          minWidth: "36px",
        }}
      >
        {labels[score]}
      </span>
    </div>
  );
}

function Field({ label, optional, hint, children }) {
  return (
    <div className="auth-field">
      <label className="auth-label">
        {label}
        {optional && (
          <span className="auth-optional"> · {hint || "optional"}</span>
        )}
      </label>
      {children}
    </div>
  );
}

// ── Login form ────────────────────────────────────────────────────────────────
function LoginForm({ onAuth, onSwitch }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError("fill in all fields");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      onAuth(data.token, data.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form">
      <Field label="email">
        <input
          className="auth-input"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          autoFocus
        />
      </Field>

      <Field label="password">
        <input
          className="auth-input"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
      </Field>

      {error && <p className="auth-error">{error}</p>}

      <button className="auth-btn" onClick={submit} disabled={loading}>
        {loading ? "signing in..." : "sign in"}
      </button>

      <p className="auth-hint">
        no account?{" "}
        <button className="auth-link" onClick={onSwitch}>
          create one
        </button>
      </p>
    </div>
  );
}

// ── Signup form ───────────────────────────────────────────────────────────────
function SignupForm({ onAuth, onSwitch }) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    phone: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async () => {
    if (!form.firstName.trim()) {
      setError("first name is required");
      return;
    }
    if (!form.email.trim()) {
      setError("email is required");
      return;
    }
    if (!form.password) {
      setError("password is required");
      return;
    }
    if (form.password !== form.confirm) {
      setError("passwords don't match");
      return;
    }
    if (form.password.length < 8) {
      setError("password must be 8+ characters");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          username: form.username.trim() || null,
          phone: form.phone.trim() || null,
          email: form.email.trim(),
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      onAuth(data.token, data.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form">
      <div className="auth-row-2">
        <Field label="first name">
          <input
            className="auth-input"
            placeholder="Luffy"
            value={form.firstName}
            onChange={set("firstName")}
          />
        </Field>
        <Field label="last name">
          <input
            className="auth-input"
            placeholder="Monkey D."
            value={form.lastName}
            onChange={set("lastName")}
          />
        </Field>
      </div>

      <Field label="username" optional hint="defaults to first name or email">
        <input
          className="auth-input"
          placeholder="strawhat"
          value={form.username}
          onChange={set("username")}
        />
      </Field>

      <Field label="email">
        <input
          className="auth-input"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={set("email")}
        />
      </Field>

      <Field label="phone" optional hint="for reminder messages">
        <input
          className="auth-input"
          type="tel"
          placeholder="+91 98765 43210"
          value={form.phone}
          onChange={set("phone")}
        />
      </Field>

      <Field label="password">
        <input
          className="auth-input"
          type="password"
          placeholder="••••••••"
          value={form.password}
          onChange={set("password")}
        />
        <PasswordStrength password={form.password} />
      </Field>

      <Field label="confirm password">
        <input
          className="auth-input"
          type="password"
          placeholder="••••••••"
          value={form.confirm}
          onChange={set("confirm")}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          style={{
            borderColor:
              form.confirm && form.confirm !== form.password
                ? "#993C1D"
                : undefined,
          }}
        />
      </Field>

      {error && <p className="auth-error">{error}</p>}

      <button className="auth-btn" onClick={submit} disabled={loading}>
        {loading ? "creating account..." : "create account"}
      </button>

      <p className="auth-hint">
        already have an account?{" "}
        <button className="auth-link" onClick={onSwitch}>
          sign in
        </button>
      </p>
    </div>
  );
}

// ── AuthPage ──────────────────────────────────────────────────────────────────
function AuthPage({ onAuth }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Branding */}
        <div className="auth-brand">
          <h1 className="auth-logo">ritual.</h1>
          <p className="auth-tagline">track what matters</p>
        </div>

        {/* Tabs */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === "login" ? "active" : ""}`}
            onClick={() => setMode("login")}
          >
            sign in
          </button>
          <button
            className={`auth-tab ${mode === "signup" ? "active" : ""}`}
            onClick={() => setMode("signup")}
          >
            sign up
          </button>
        </div>

        {/* Form */}
        {mode === "login" ? (
          <LoginForm onAuth={onAuth} onSwitch={() => setMode("signup")} />
        ) : (
          <SignupForm onAuth={onAuth} onSwitch={() => setMode("login")} />
        )}
      </div>
    </div>
  );
}

export default AuthPage;
