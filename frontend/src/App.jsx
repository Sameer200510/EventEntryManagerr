import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useState, useEffect } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import api from "./utils/api";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import VolunteerScanner from "./pages/VolunteerScanner";
import ExternalVerify from "./pages/ExternalVerify";

function App() {
  const [role, setRole] = useState(localStorage.getItem("role") || null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const validateSession = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        handleLogout();
        setIsInitializing(false);
        return;
      }


      try {
        const { data } = await api.get("/auth/validate");
        const currentRole = localStorage.getItem("role");
        if (data.role !== currentRole) {
          localStorage.setItem("role", data.role);
          setRole(data.role);
        }
      } catch (err) {
        handleLogout();
      } finally {
        setIsInitializing(false);
      }
    };
    validateSession();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setRole(null);
  };

  const isVolunteer = role === "ENTRY_VOLUNTEER" || role === "FOOD_VOLUNTEER";

  return (
    <ThemeProvider>
      <ToastProvider>
        <Router>
          <div className="app-bg">
            {isInitializing ? (
              <div
                style={{
                  height: "100dvh",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    border: "3px solid rgba(99,102,241,0.2)",
                    borderTopColor: "#6366f1",
                    animation: "spin 1s linear infinite",
                  }}
                />
              </div>
            ) : (
              <Routes>
                <Route
                  path="/"
                  element={
                    <Navigate
                      to={
                        role
                          ? role === "ADMIN"
                            ? "/admin"
                            : "/volunteer"
                          : "/login"
                      }
                    />
                  }
                />
                <Route
                  path="/login"
                  element={
                    !role ? <Login setRole={setRole} /> : <Navigate to="/" />
                  }
                />
                <Route
                  path="/admin"
                  element={
                    role === "ADMIN" ? (
                      <AdminDashboard onLogout={handleLogout} />
                    ) : (
                      <Navigate to="/" />
                    )
                  }
                />
                <Route
                  path="/volunteer"
                  element={
                    isVolunteer ? (
                      <VolunteerScanner role={role} onLogout={handleLogout} />
                    ) : (
                      <Navigate to="/login" />
                    )
                  }
                />
                <Route path="/verify/:token" element={<ExternalVerify />} />
              </Routes>
            )}
          </div>
        </Router>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
