import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ScanLine,
  Eye,
  EyeOff,
  ShieldCheck,
  User,
  ArrowRight,
  CheckCircle2,
  Lock,
} from "lucide-react";
import api from "../utils/api";
import logoImg from "../assets/logo.png";
import { GlobalFooter } from "../components/ui/GlobalFooter";

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

export default function Login({ setRole }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen bg-transparent flex flex-col relative overflow-hidden font-sans">
      
      <div className="flex-1 flex flex-col lg:flex-row w-full z-10">
        
        {/* Left Side: Brand & Visuals */}
        <div className="hidden lg:flex w-1/2 p-12 flex-col justify-between relative border-r border-white/5 bg-slate-900/20 backdrop-blur-sm">
          {/* Decorative gradients */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-600/10 blur-[100px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-600/10 blur-[100px]" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-16">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <ShieldCheck className="text-white" size={24} />
              </div>
              <span className="font-bold text-2xl tracking-tight text-white">Event<span className="text-indigo-400">Core</span></span>
            </div>

            <h1 className="text-5xl font-extrabold text-white leading-[1.1] tracking-tight mb-6">
              Access the <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400">Command Center</span>
            </h1>
            <p className="text-lg text-slate-400 max-w-md leading-relaxed">
              Securely authenticate to manage campaigns, monitor live checkpoints, and orchestrate massive events with sub-second QR validation.
            </p>

            <div className="mt-12 space-y-6">
              {[
                { icon: <Lock size={20} className="text-indigo-400" />, title: "Zero-Trust Security", desc: "JWT authenticated sessions with role-based access control." },
                { icon: <ScanLine size={20} className="text-emerald-400" />, title: "Live Analytics", desc: "Monitor entry bottlenecks and attendee flow in real-time." },
                { icon: <CheckCircle2 size={20} className="text-purple-400" />, title: "Instant Sync", desc: "Checkpoints synchronize globally across all active volunteer devices." }
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-800/50 border border-white/5 flex items-center justify-center shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{item.title}</h3>
                    <p className="text-sm text-slate-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="relative z-10 text-slate-500 text-sm font-medium flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Systems Operational
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
          <div className="w-full max-w-md animate-fade-in">
            <div className="text-center mb-10">
              <img 
                src={logoImg} 
                alt="Logo" 
                className="h-20 w-auto mx-auto mb-6 drop-shadow-2xl"
              />
              <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Welcome Back</h2>
              <p className="text-slate-400">Enter your credentials to access the portal</p>
            </div>

            <div className="card-glass p-8">
              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 animate-pop-in">
                  <ShieldCheck className="text-red-400 shrink-0 mt-0.5" size={18} />
                  <p className="text-sm font-medium text-red-200">{error}</p>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2" htmlFor="login-user">
                    Username
                  </label>
                  <div className="relative group">
                    <input
                      id="login-user"
                      className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3.5 pl-11 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                      type="text"
                      placeholder="admin_user"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onFocus={() => setFocusedField("user")}
                      onBlur={() => setFocusedField(null)}
                      autoComplete="username"
                      disabled={loading}
                      required
                    />
                    <User
                      size={18}
                      className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${focusedField === 'user' ? 'text-indigo-400' : 'text-slate-500'}`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2" htmlFor="login-pass">
                    Password
                  </label>
                  <div className="relative group">
                    <input
                      id="login-pass"
                      className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3.5 pl-11 pr-12 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField("pass")}
                      onBlur={() => setFocusedField(null)}
                      autoComplete="current-password"
                      disabled={loading}
                      required
                    />
                    <Lock
                      size={18}
                      className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${focusedField === 'pass' ? 'text-indigo-400' : 'text-slate-500'}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative w-4 h-4 rounded border border-white/20 bg-slate-900/50 flex items-center justify-center group-hover:border-indigo-400 transition-colors">
                      <input 
                        type="checkbox" 
                        className="opacity-0 absolute inset-0 cursor-pointer"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      {rememberMe && <CheckCircle2 size={12} className="text-indigo-400" />}
                    </div>
                    <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">Remember me</span>
                  </label>
                  
                  <button type="button" className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                    Forgot Password?
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full btn btn-primary py-3.5 rounded-xl text-base shadow-lg shadow-indigo-500/25 mt-4"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="animate-spin w-5 h-5 border-2 border-white/20 border-t-white rounded-full" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      Sign In to Console <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            </div>
            
            <p className="text-center text-xs text-slate-500 mt-8 font-medium uppercase tracking-wider">
              Authorized Personnel Only
            </p>
          </div>
        </div>
      </div>

      <GlobalFooter />
    </div>
  );
}
