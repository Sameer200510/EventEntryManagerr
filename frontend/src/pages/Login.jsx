import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ScanLine,
  Eye,
  EyeOff,
  Moon,
  Sun,
  ShieldCheck,
  Utensils,
  User,
  ArrowRight,
} from "lucide-react";
import api from "../utils/api";
import { useTheme } from "../context/ThemeContext";

const ALLOWED_ROLES = ["ADMIN", "ENTRY_VOLUNTEER", "FOOD_VOLUNTEER"];

const getRoleHome = (role) => {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "ENTRY_VOLUNTEER":
      return "/scanner/entry";
    case "FOOD_VOLUNTEER":
      return "/scanner/food";
    default:
      return "/login";
  }
};

const persistSession = ({ token, role }) => {
  localStorage.setItem("token", token);
  localStorage.setItem("role", role);
};

const FloatingOrb = ({ style }) => (
  <div
    aria-hidden
    style={{
      position: "absolute",
      borderRadius: "50%",
      filter: "blur(90px)",
      pointerEvents: "none",
      ...style,
    }}
  />
);

export default function Login({ setRole }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const navigate = useNavigate();
  const { dark, setDark } = useTheme();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setError("Username and password are required.");
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.post("/auth/login", {
        username: cleanUser,
        password: cleanPass,
      });

      if (!data?.token || !data?.role) {
        throw new Error("Invalid authentication response.");
      }

      if (!ALLOWED_ROLES.includes(data.role)) {
        throw new Error("Unauthorized role received.");
      }

      persistSession({
        token: data.token,
        role: data.role,
      });

      setRole(data.role);
      navigate(getRoleHome(data.role), { replace: true });
    } catch (err) {
      localStorage.removeItem("token");
      localStorage.removeItem("role");

      setError(
        err.response?.data?.error ||
          err.message ||
          "Invalid credentials. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    {
      icon: <ShieldCheck size={14} />,
      label: "ADMIN",
      hint: "Dashboard",
    },
    {
      icon: <User size={14} />,
      label: "ENTRY_VOLUNTEER",
      hint: "Gate Access",
    },
    {
      icon: <Utensils size={14} />,
      label: "FOOD_VOLUNTEER",
      hint: "Food Access",
    },
  ];

  const pageBg = dark
    ? "#050816"
    : "radial-gradient(circle at top left, #e0e7ff 0%, #f8fafc 55%)";

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        position: "relative",
        overflow: "hidden",
        background: pageBg,
      }}
    >
      <FloatingOrb
        style={{
          top: "-10%",
          right: "-8%",
          width: 320,
          height: 320,
          background: dark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.16)",
        }}
      />
      <FloatingOrb
        style={{
          bottom: "-12%",
          left: "-10%",
          width: 280,
          height: 280,
          background: dark ? "rgba(16,185,129,0.08)" : "rgba(16,185,129,0.12)",
        }}
      />

      <button
        onClick={() => setDark(!dark)}
        className="btn-icon"
        style={{
          position: "absolute",
          top: "1.25rem",
          right: "1.25rem",
          zIndex: 10,
        }}
        aria-label="Toggle theme"
      >
        {dark ? <Sun size={17} /> : <Moon size={17} />}
      </button>

      <div
        className="card-glass"
        style={{
          width: "100%",
          maxWidth: 430,
          padding: "2rem",
          borderRadius: "1.5rem",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 22,
              margin: "0 auto 1rem",
              background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 10px 30px rgba(79,70,229,0.35)",
            }}
          >
            <ScanLine size={34} color="#fff" strokeWidth={1.8} />
          </div>

          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              color: "var(--text-primary)",
              margin: "0 0 0.35rem",
              letterSpacing: "-0.02em",
            }}
          >
            Event Access Portal
          </h1>

          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "0.9rem",
              fontWeight: 500,
              margin: 0,
            }}
          >
            Secure role-based access for event operations
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "0.55rem",
            marginBottom: "1.4rem",
          }}
        >
          {roles.map((role) => (
            <div
              key={role.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.8rem 0.9rem",
                borderRadius: 14,
                border: "1px solid var(--border)",
                background: "var(--surface-2)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.65rem",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                {role.icon}
                {role.label}
              </div>
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                }}
              >
                {role.hint}
              </span>
            </div>
          ))}
        </div>

        {error && (
          <div
            style={{
              background: "var(--red-light)",
              color: "var(--red)",
              border: "1px solid var(--red)",
              borderRadius: 12,
              padding: "0.8rem 0.95rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              marginBottom: "1rem",
            }}
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleLogin}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <div>
            <label className="input-label" htmlFor="login-user">
              Username
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="login-user"
                className="input"
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setFocusedField("user")}
                onBlur={() => setFocusedField(null)}
                autoComplete="username"
                disabled={loading}
                required
                style={{ paddingLeft: "2.7rem" }}
              />
              <User
                size={16}
                style={{
                  position: "absolute",
                  left: "0.9rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color:
                    focusedField === "user"
                      ? "var(--brand)"
                      : "var(--text-muted)",
                }}
              />
            </div>
          </div>

          <div>
            <label className="input-label" htmlFor="login-pass">
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="login-pass"
                className="input"
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField("pass")}
                onBlur={() => setFocusedField(null)}
                autoComplete="current-password"
                disabled={loading}
                required
                style={{
                  paddingLeft: "2.7rem",
                  paddingRight: "3rem",
                }}
              />
              <ShieldCheck
                size={16}
                style={{
                  position: "absolute",
                  left: "0.9rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color:
                    focusedField === "pass"
                      ? "var(--brand)"
                      : "var(--text-muted)",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: "absolute",
                  right: "0.9rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  display: "flex",
                  padding: 0,
                }}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              width: "100%",
              marginTop: "0.25rem",
              padding: "0.95rem",
              borderRadius: "0.9rem",
              fontSize: "0.95rem",
              fontWeight: 700,
            }}
          >
            {loading ? (
              <>
                <span
                  style={{
                    width: 18,
                    height: 18,
                    border: "2px solid rgba(255,255,255,0.25)",
                    borderTopColor: "#fff",
                    borderRadius: "50%",
                  }}
                  className="animate-spin"
                />
                Signing in...
              </>
            ) : (
              <>
                Continue <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            marginTop: "1.15rem",
            fontWeight: 500,
          }}
        >
          Protected event terminal access
        </p>
      </div>
    </div>
  );
}
