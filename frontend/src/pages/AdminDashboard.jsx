import { useState, useEffect } from "react";
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  Mail,
  CheckCircle2,
  Users,
  Send,
  RefreshCw,
  Search,
  Moon,
  Sun,
  LogOut,
  ChevronDown,
  ScanLine,
  Utensils,
  AlertCircle,
  X,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  Filter,
  Trash2,
} from "lucide-react";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";
import logoImg from "../assets/logo.png";
import EventManagement from "../components/EventManagement";
import CampaignManagement from "../components/CampaignManagement";
import DataCleanup from "../components/DataCleanup";
import DeleteModal from "../components/DeleteModal";
import { GlobalFooter } from "../components/ui/GlobalFooter";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import AttendeeTable from "../components/AttendeeTable";
import DashboardAnalytics from "../components/DashboardAnalytics";

function StatCard({ label, value, total, color, icon, statColor, trend = "+12%", trendUp = true }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="card-glass p-5 relative overflow-hidden group hover:border-indigo-500/50 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] transition-all duration-300">
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div>
          <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-white m-0 tracking-tight" style={{ color: statColor || color }}>{value}</h3>
            {total > 0 && <span className="text-sm font-medium text-slate-500">/ {total}</span>}
          </div>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg" style={{ background: `${statColor || color}20`, color: statColor || color, boxShadow: `0 4px 20px ${statColor || color}20` }}>
          {icon}
        </div>
      </div>
      
      <div className="flex items-center justify-between relative z-10">
        <div className={`flex items-center gap-1.5 text-xs font-bold ${trendUp ? 'text-emerald-400' : 'text-red-400'}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${trendUp ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`} />
          {trend} vs last event
        </div>
        
        {total > 0 && (
          <div className="w-1/3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%`, background: statColor || color }} />
          </div>
        )}
      </div>
      
      {/* Decorative background glow */}
      <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full blur-2xl opacity-20 pointer-events-none transition-opacity group-hover:opacity-40" style={{ background: statColor || color }} />
    </div>
  );
}
function StatusBadge({
  done,
  doneLabel = "Done",
  pendingLabel = "Pending",
  time,
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 3,
      }}
    >
      {" "}
      <span className={`badge ${done ? "badge-green" : "badge-muted"}`}>
        {" "}
        {done ? `✓ ${doneLabel}` : `○ ${pendingLabel}`}{" "}
      </span>{" "}
      {time && (
        <span
          style={{
            fontSize: "0.6rem",
            color: "var(--text-muted)",
            fontWeight: 600,
          }}
        >
          {" "}
          {new Date(time).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
        </span>
      )}{" "}
    </div>
  );
}
export default function AdminDashboard({ onLogout }) {
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({ name: "", roll: "", email: "" });
  const [step, setStep] = useState(1);
  const [eventName, setEventName] = useState("");
  const [validationSummary, setValidationSummary] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [providers, setProviders] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [settingsProvider, setSettingsProvider] = useState("RESEND");
  const [settingsSender, setSettingsSender] = useState("");
  const [settingsCreds, setSettingsCreds] = useState({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [emailLoading, setEmailLoading] = useState(null);
  const [activeCampaign, setActiveCampaign] = useState(null);
  const [campaignReport, setCampaignReport] = useState(null);
  const [campaignActionLoading, setCampaignActionLoading] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("upload");
  const [checkpointFilters, setCheckpointFilters] = useState({});
  const [emailFilter, setEmailFilter] = useState("all");
  const [showEmailConfig, setShowEmailConfig] = useState(false);
  const [events, setEvents] = useState([]);
  const [activeEventId, setActiveEventId] = useState("");
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, type: null, id: null, isProcessing: false });
  
  const activeEvent = events.find(e => e.id === activeEventId);
  const eventCheckpoints = activeEvent?.checkpoints || [];
  
  const { toast } = useToast();
  
  const fetchGlobalEvents = async () => {
    try {
      const res = await api.get("/events");
      setEvents(res.data);
      const active = res.data.find(e => e.isActive);
      if (active && !activeEventId) setActiveEventId(active.id);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchGlobalEvents();
  }, []);

  useEffect(() => {
    if (activeEventId) {
      fetchAttendees();
      fetchActiveCampaign();
    }
  }, [activeEventId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (activeEventId) fetchActiveCampaign();
    }, 3000);
    return () => clearInterval(interval);
  }, [activeEventId]);

  const fetchActiveCampaign = async () => {
    if (!activeEventId) return;
    try {
      const res = await api.get(`/attendees/campaigns/active?eventId=${activeEventId}`);
      setActiveCampaign(res.data || null);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeTab === "settings") {
      fetchSettings();
    }
  }, [activeTab]);

  const fetchSettings = async () => {
    try {
      const [provRes, logRes] = await Promise.all([
        api.get("/settings/email-providers"),
        api.get("/settings/audit-logs")
      ]);
      setProviders(provRes.data);
      setAuditLogs(logRes.data);
    } catch (err) {
      console.error("Failed to fetch settings", err);
    }
  };

  const fetchAttendees = async () => {
    if (!activeEventId) return;
    try {
      const [attRes, dsRes] = await Promise.all([
        api.get(`/attendees?eventId=${activeEventId}`),
        api.get(`/attendees/datasets?eventId=${activeEventId}`)
      ]);
      setAttendees(Array.isArray(attRes.data) ? attRes.data : []);
      setDatasets(Array.isArray(dsRes.data) ? dsRes.data : []);
    } catch (err) {
      console.error(err);
      setAttendees([]);
      setDatasets([]);
    }
  };
  const handleFileChange = async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", selected);
      const { data } = await api.post("/attendees/parse-excel", fd);
      setHeaders(data.headers || []);
      const m = { name: "", roll: "", email: "" };
      (data.headers || []).forEach((h) => {
        const l = h.toLowerCase();
        if (l.includes("name")) m.name = h;
        if (l.includes("roll") || l.includes("id")) m.roll = h;
        if (l.includes("mail")) m.email = h;
      });
      setMapping(m);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to parse file.");
      setFile(null);
    } finally {
      setLoading(false);
    }
  };
  const handleValidate = async () => {
    if (!mapping.name || !mapping.roll) {
      setError("Name and Roll are required!");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("mapping", JSON.stringify(mapping));
      const res = await api.post("/attendees/validate-excel", fd);
      setValidationSummary(res.data);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || "Validation failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!activeEventId) {
      setError("Please select or create an event in the top-left dropdown first!");
      return;
    }
    if (!eventName.trim()) {
      setError("Event name is required!");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("mapping", JSON.stringify(mapping));
      fd.append("eventName", eventName.trim());
      fd.append("eventId", activeEventId);
      
      const res = await api.post("/attendees/upload-excel", fd, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.setAttribute("download", `QR_Codes_${Date.now()}.zip`);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setStep(4);
      await fetchAttendees();
    } catch (err) {
      const errMsg = err.response && err.response.data instanceof Blob 
        ? await err.response.data.text().then(t => { try { return JSON.parse(t).error; } catch { return "Upload failed."; } })
        : (err.response?.data?.error || "Upload failed.");
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreDataset = async (id) => {
    if (!window.confirm("Restore this dataset? It will become the active dataset.")) return;
    try {
      await api.post(`/attendees/datasets/${id}/restore`);
      toast({ type: "success", message: "Dataset restored!" });
      await fetchAttendees();
    } catch (err) {
      toast({ type: "error", message: "Failed to restore dataset." });
    }
  };

  const handleClearAttendees = () => {
    if (!activeEventId) return toast({ type: "error", message: "Select an event first!" });
    setDeleteModal({ isOpen: true, type: "clearAttendees", id: activeEventId, isProcessing: false });
  };

  const handleDeleteDataset = (id) => {
    setDeleteModal({ isOpen: true, type: "deleteDataset", id, isProcessing: false });
  };

  const processModalConfirm = async () => {
    setDeleteModal(prev => ({ ...prev, isProcessing: true }));
    try {
      if (deleteModal.type === "clearAttendees") {
        await api.delete(`/attendees/clear?eventId=${deleteModal.id}`);
        toast({ type: "success", message: "All attendees cleared successfully!" });
        await fetchAttendees();
      } else if (deleteModal.type === "deleteDataset") {
        await api.delete(`/attendees/datasets/${deleteModal.id}`);
        toast({ type: "success", message: "Dataset deleted!" });
        await fetchAttendees();
      }
    } catch (err) {
      toast({ type: "error", message: err.response?.data?.error || "Operation failed" });
    } finally {
      setDeleteModal({ isOpen: false, type: null, id: null, isProcessing: false });
    }
  };

  const handleSaveSettings = async () => {
    if (!settingsSender) {
      toast({ type: "error", message: "Sender email is required!" });
      return;
    }
    setSettingsLoading(true);
    try {
      await api.post("/settings/email-providers", {
        name: settingsProvider,
        senderEmail: settingsSender,
        credentials: settingsCreds
      });
      toast({ type: "success", message: "Provider settings saved and active!" });
      setSettingsCreds({}); // Clear inputs
      await fetchSettings();
    } catch (err) {
      toast({ type: "error", message: err.response?.data?.error || "Failed to save settings." });
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTestLoading(true);
    try {
      await api.post("/settings/test-email");
      toast({ type: "success", message: "Connection successful. Test email sent!" });
    } catch (err) {
      toast({ type: "error", message: err.response?.data?.error || "Connection failed." });
    } finally {
      setTestLoading(false);
    }
  };

  const handleSendEmail = async (id) => {
    setEmailLoading(id);
    try {
      await api.post(`/attendees/send-email/${id}`, { message: customMessage });
      await fetchAttendees();
      toast({ type: "success", message: "Email sent!" });
    } catch (err) {
      toast({
        type: "error",
        message: err.response?.data?.error || "Failed to send email",
      });
    } finally {
      setEmailLoading(null);
    }
  };
  const handleStartCampaign = async () => {
    if (!window.confirm(`Start background email campaign?`)) return;
    setCampaignActionLoading(true);
    try {
      const activeProv = providers.find(p => p.isActive);
      const delayMs = activeProv?.name === "GOOGLE" ? 1500 : activeProv?.name === "AWS_SES" ? 100 : 10000;
      await api.post(`/attendees/campaigns/start`, {
        batchSize: 50,
        delayMs,
        providerName: activeProv?.name || "RESEND",
        eventId: activeEventId
      });
      toast({ type: "success", message: "Campaign started successfully!" });
      await fetchActiveCampaign();
    } catch (err) {
      toast({ type: "error", message: err.response?.data?.error || "Failed to start campaign" });
    } finally {
      setCampaignActionLoading(false);
    }
  };

  const handlePauseCampaign = async () => {
    if (!activeCampaign) return;
    setCampaignActionLoading(true);
    try {
      await api.post(`/attendees/campaigns/${activeCampaign.id}/pause`);
      toast({ type: "success", message: "Campaign paused." });
      await fetchActiveCampaign();
    } catch (err) {
      toast({ type: "error", message: "Failed to pause campaign." });
    } finally {
      setCampaignActionLoading(false);
    }
  };

  const handleResumeCampaign = async () => {
    if (!activeCampaign) return;
    setCampaignActionLoading(true);
    try {
      await api.post(`/attendees/campaigns/${activeCampaign.id}/resume`);
      toast({ type: "success", message: "Campaign resumed." });
      await fetchActiveCampaign();
    } catch (err) {
      toast({ type: "error", message: "Failed to resume campaign." });
    } finally {
      setCampaignActionLoading(false);
    }
  };

  const handleCancelCampaign = async () => {
    if (!activeCampaign) return;
    if (!window.confirm("Cancel this campaign? Pending emails will NOT be sent.")) return;
    setCampaignActionLoading(true);
    try {
      await api.post(`/attendees/campaigns/${activeCampaign.id}/cancel`);
      toast({ type: "success", message: "Campaign cancelled." });
      await fetchActiveCampaign();
    } catch (err) {
      toast({ type: "error", message: "Failed to cancel campaign." });
    } finally {
      setCampaignActionLoading(false);
    }
  };
  const resetState = () => {
    setFile(null);
    setHeaders([]);
    setStep(1);
    setError(null);
  };
  let filtered = attendees.filter((a) => {
    const s = searchTerm.toLowerCase();
    if (!(a.name.toLowerCase().includes(s) || a.roll.toLowerCase().includes(s))) return false;
    
    for (const cp of eventCheckpoints) {
      const filterValue = checkpointFilters[cp.id] || "all";
      if (filterValue !== "all") {
        const statusObj = a.checkpointStatuses?.find(cs => cs.checkpointId === cp.id);
        const isDone = !!statusObj?.status;
        if (filterValue === "done" && !isDone) return false;
        if (filterValue === "pending" && isDone) return false;
      }
    }
    
    if (emailFilter === "sent" && !a.emailSent) return false;
    if (emailFilter === "pending" && a.emailSent) return false;

    return true;
  });
  filtered = filtered.sort((a, b) => {
    if (sortOption === "name") {
      return a.name.localeCompare(b.name);
    } else if (sortOption === "roll") {
      return a.roll.localeCompare(b.roll, undefined, { numeric: true, sensitivity: 'base' });
    }
    return 0; // upload order
  });

  const stats = {
    total: attendees.length,
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Header */}
      <header
        style={{
          background: "var(--surface)",
          backdropFilter: "blur(24px)",
          borderBottom: "1px solid var(--border)",
          padding: "0 1.25rem",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 50,
          boxShadow: "0 1px 0 var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
          <div
            style={{
              width: 38,
              height: 38,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img src={logoImg} alt="Logo" style={{ height: "100%", width: "auto", objectFit: "contain" }} />
          </div>
          <div>
            <h1
              style={{
                fontWeight: 800,
                fontSize: "1.1rem",
                color: "var(--text-primary)",
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              Event Control Center
            </h1>
            <select 
              className="input select" 
              style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem", height: "auto", marginTop: "0.25rem", background: "var(--surface-2)", border: "none" }}
              value={activeEventId}
              onChange={(e) => setActiveEventId(e.target.value)}
            >
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.625rem", alignItems: "center" }}>
          <button
            onClick={() => setActiveTab("dashboard")}
            className="btn btn-sm btn-secondary"
            style={{ borderRadius: 10, height: "36px", background: activeTab === "dashboard" ? "var(--brand)" : "", color: activeTab === "dashboard" ? "#fff" : "" }}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className="btn btn-sm btn-secondary"
            style={{ borderRadius: 10, height: "36px", background: activeTab === "history" ? "var(--brand)" : "", color: activeTab === "history" ? "#fff" : "" }}
          >
            History
          </button>
          <button
            onClick={() => setActiveTab("events")}
            className="btn btn-sm btn-secondary"
            style={{ borderRadius: 10, height: "36px", background: activeTab === "events" ? "var(--brand)" : "", color: activeTab === "events" ? "#fff" : "" }}
          >
            Events
          </button>
          <button
            onClick={() => setActiveTab("campaigns")}
            className="btn btn-sm btn-secondary"
            style={{ borderRadius: 10, height: "36px", background: activeTab === "campaigns" ? "var(--brand)" : "", color: activeTab === "campaigns" ? "#fff" : "" }}
          >
            Campaigns
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className="btn-icon"
            title="Settings"
            style={{ borderRadius: 10, background: activeTab === "settings" ? "var(--brand-light)" : "transparent", color: activeTab === "settings" ? "var(--brand)" : "inherit" }}
          >
            <Settings size={18} />
          </button>
          <button onClick={activeTab === "settings" ? fetchSettings : fetchAttendees} className="btn-icon" title="Refresh" style={{ borderRadius: 10 }}>
            <RefreshCw size={18} />
          </button>
          <button onClick={onLogout} className="btn btn-sm btn-secondary" style={{ marginLeft: "0.25rem", height: "36px" }}>
            <LogOut size={16} /> <span className="hide-mobile">Logout</span>
          </button>
        </div>
      </header>

      <main
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "1.5rem 1rem 5rem",
        }}
      >
        {activeTab === "events" ? (
          <EventManagement activeEventId={activeEventId} setActiveEventId={setActiveEventId} />
        ) : activeTab === "campaigns" ? (
          <CampaignManagement activeEventId={activeEventId} />
        ) : activeTab === "settings" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div className="card" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <h2 style={{ color: "var(--text-primary)", margin: 0 }}>Email Provider Settings</h2>
                <button 
                  onClick={handleTestConnection} 
                  disabled={testLoading}
                  className="btn btn-sm btn-secondary"
                >
                  {testLoading ? "Testing..." : "Test Connection"}
                </button>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label className="input-label">Select Provider</label>
                <select 
                  className="input select" 
                  value={settingsProvider} 
                  onChange={(e) => {
                    setSettingsProvider(e.target.value);
                    setSettingsCreds({});
                  }}
                >
                  <option value="RESEND">Resend</option>
                  <option value="GOOGLE">Google OAuth (Gmail API)</option>
                  <option value="AWS_SES">AWS SES</option>
                  <option value="SMTP">Custom SMTP (e.g. Gmail App Password)</option>
                </select>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label className="input-label">Verified Sender Email</label>
                <input 
                  type="email" 
                  className="input" 
                  value={settingsSender} 
                  onChange={(e) => setSettingsSender(e.target.value)} 
                  placeholder="e.g. hello@myfarewell.com" 
                />
              </div>

              {settingsProvider === "RESEND" && (
                <div style={{ marginBottom: "1.5rem" }}>
                  <label className="input-label">API Key</label>
                  <input 
                    type="password" 
                    className="input" 
                    placeholder="re_..." 
                    value={settingsCreds.apiKey || ""} 
                    onChange={(e) => setSettingsCreds({ ...settingsCreds, apiKey: e.target.value })} 
                  />
                </div>
              )}

              {settingsProvider === "GOOGLE" && (
                <>
                  <div style={{ marginBottom: "1rem" }}>
                    <label className="input-label">Client ID</label>
                    <input type="password" className="input" value={settingsCreds.clientId || ""} onChange={(e) => setSettingsCreds({ ...settingsCreds, clientId: e.target.value })} />
                  </div>
                  <div style={{ marginBottom: "1rem" }}>
                    <label className="input-label">Client Secret</label>
                    <input type="password" className="input" value={settingsCreds.clientSecret || ""} onChange={(e) => setSettingsCreds({ ...settingsCreds, clientSecret: e.target.value })} />
                  </div>
                  <div style={{ marginBottom: "1.5rem" }}>
                    <label className="input-label">Refresh Token</label>
                    <input type="password" className="input" value={settingsCreds.refreshToken || ""} onChange={(e) => setSettingsCreds({ ...settingsCreds, refreshToken: e.target.value })} />
                  </div>
                </>
              )}

              {settingsProvider === "AWS_SES" && (
                <>
                  <div style={{ marginBottom: "1rem" }}>
                    <label className="input-label">Access Key ID</label>
                    <input type="password" className="input" value={settingsCreds.accessKey || ""} onChange={(e) => setSettingsCreds({ ...settingsCreds, accessKey: e.target.value })} />
                  </div>
                  <div style={{ marginBottom: "1rem" }}>
                    <label className="input-label">Secret Access Key</label>
                    <input type="password" className="input" value={settingsCreds.secretKey || ""} onChange={(e) => setSettingsCreds({ ...settingsCreds, secretKey: e.target.value })} />
                  </div>
                  <div style={{ marginBottom: "1.5rem" }}>
                    <label className="input-label">Region</label>
                    <input type="text" className="input" placeholder="e.g. us-east-1" value={settingsCreds.region || ""} onChange={(e) => setSettingsCreds({ ...settingsCreds, region: e.target.value })} />
                  </div>
                </>
              )}

              {settingsProvider === "SMTP" && (
                <>
                  <div style={{ marginBottom: "1rem" }}>
                    <label className="input-label">SMTP Host</label>
                    <input type="text" className="input" placeholder="e.g. smtp.gmail.com" value={settingsCreds.host || ""} onChange={(e) => setSettingsCreds({ ...settingsCreds, host: e.target.value })} />
                  </div>
                  <div style={{ marginBottom: "1rem" }}>
                    <label className="input-label">SMTP Port</label>
                    <input type="text" className="input" placeholder="e.g. 465 or 587" value={settingsCreds.port || ""} onChange={(e) => setSettingsCreds({ ...settingsCreds, port: e.target.value })} />
                  </div>
                  <div style={{ marginBottom: "1rem" }}>
                    <label className="input-label">Username (Email)</label>
                    <input type="text" className="input" placeholder="e.g. you@gmail.com" value={settingsCreds.username || ""} onChange={(e) => setSettingsCreds({ ...settingsCreds, username: e.target.value })} />
                  </div>
                  <div style={{ marginBottom: "1.5rem" }}>
                    <label className="input-label">Password (App Password)</label>
                    <input type="password" className="input" placeholder="16-letter App Password" value={settingsCreds.password || ""} onChange={(e) => setSettingsCreds({ ...settingsCreds, password: e.target.value })} />
                  </div>
                </>
              )}

              <button 
                onClick={handleSaveSettings} 
                disabled={settingsLoading} 
                className="btn btn-primary"
              >
                {settingsLoading ? "Saving..." : "Save & Set Active"}
              </button>

              <div style={{ marginTop: "2rem" }}>
                <h3 style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>Current Active Configuration</h3>
                <div style={{ background: "var(--surface-2)", padding: "1rem", borderRadius: "8px" }}>
                  {providers.filter(p => p.isActive).map(p => (
                    <div key={p.id}>
                      <p><strong>Provider:</strong> {p.name}</p>
                      <p><strong>Sender:</strong> {p.senderEmail}</p>
                      <p><strong>Status:</strong> <span className="badge badge-green">Connected</span></p>
                    </div>
                  ))}
                  {providers.filter(p => p.isActive).length === 0 && (
                    <p style={{ color: "var(--text-muted)" }}>No provider active.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: "1.5rem" }}>
              <h2 style={{ marginBottom: "1rem", color: "var(--text-primary)" }}>Audit Logs</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ background: "var(--surface-2)" }}>
                    <th style={{ padding: "0.75rem", textAlign: "left", color: "var(--text-muted)" }}>Time</th>
                    <th style={{ padding: "0.75rem", textAlign: "left", color: "var(--text-muted)" }}>Admin</th>
                    <th style={{ padding: "0.75rem", textAlign: "left", color: "var(--text-muted)" }}>Action</th>
                    <th style={{ padding: "0.75rem", textAlign: "left", color: "var(--text-muted)" }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: "center", padding: "1rem" }}>No logs found.</td></tr>
                  ) : auditLogs.map(log => (
                    <tr key={log.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "0.75rem", color: "var(--text-muted)" }}>{new Date(log.createdAt).toLocaleString()}</td>
                      <td style={{ padding: "0.75rem" }}>{log.admin?.name || "System"}</td>
                      <td style={{ padding: "0.75rem" }}>{log.action}</td>
                      <td style={{ padding: "0.75rem" }}>{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === "history" ? (
          <div className="card" style={{ padding: "1.5rem" }}>
            <h2 style={{ marginBottom: "1rem", color: "var(--text-primary)" }}>Upload History</h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--surface-2)" }}>
                  <th style={{ padding: "0.75rem", textAlign: "left", color: "var(--text-muted)" }}>Event Name</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", color: "var(--text-muted)" }}>Date</th>
                  <th style={{ padding: "0.75rem", textAlign: "center", color: "var(--text-muted)" }}>Records</th>
                  <th style={{ padding: "0.75rem", textAlign: "center", color: "var(--text-muted)" }}>Status</th>
                  <th style={{ padding: "0.75rem", textAlign: "center", color: "var(--text-muted)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {datasets.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: "center", padding: "2rem" }}>No history found.</td></tr>
                ) : datasets.map(ds => (
                  <tr key={ds.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "1rem" }}>{ds.eventName}</td>
                    <td style={{ padding: "1rem", color: "var(--text-muted)" }}>{new Date(ds.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: "1rem", textAlign: "center" }}>{ds.totalRecords}</td>
                    <td style={{ padding: "1rem", textAlign: "center" }}>
                      {ds.isActive ? <span className="badge badge-green">Active</span> : <span className="badge badge-muted">Archived</span>}
                    </td>
                    <td style={{ padding: "1rem", textAlign: "center" }}>
                      {!ds.isActive && (
                        <>
                          <button onClick={() => handleRestoreDataset(ds.id)} className="btn btn-sm btn-primary" style={{ marginRight: "0.5rem" }}>Restore</button>
                          <button onClick={() => handleDeleteDataset(ds.id)} className="btn btn-sm btn-secondary">Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <>
        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))",
            gap: "0.875rem",
            marginBottom: "1.5rem",
          }}
        >
          <StatCard
            label="Total"
            value={stats.total}
            color="var(--text-primary)"
            icon={<Users size={16} />}
            statColor="var(--brand)"
          />
          {eventCheckpoints.map((cp, idx) => {
            const passed = attendees.filter(a => a.checkpointStatuses?.find(cs => cs.checkpointId === cp.id)?.status).length;
            const colors = ["var(--green)", "var(--amber)", "var(--blue)", "var(--purple)", "var(--pink)"];
            return (
              <StatCard
                key={cp.id}
                label={cp.name}
                value={passed}
                total={stats.total}
                color={colors[idx % colors.length]}
                icon={<ScanLine size={16} />}
                statColor={colors[idx % colors.length]}
              />
            );
          })}
        </div>

        {/* Analytics Dashboard */}
        <DashboardAnalytics attendees={attendees} eventCheckpoints={eventCheckpoints} />

        {/* Campaign Monitor */}
        {activeCampaign && (
          <div className="card animate-pop-in" style={{ padding: "1.5rem", marginBottom: "1.25rem", border: "2px solid var(--brand)", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <h3 style={{ fontSize: "1rem", fontWeight: 900, color: "var(--text-primary)", margin: 0 }}>
                  Live Email Campaign
                </h3>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0.125rem 0 0" }}>
                  Status: <strong style={{ color: activeCampaign.status === "RUNNING" ? "var(--green)" : activeCampaign.status === "PAUSED" ? "var(--amber)" : "inherit" }}>{activeCampaign.status}</strong>
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {activeCampaign.status === "RUNNING" && (
                  <button onClick={handlePauseCampaign} disabled={campaignActionLoading} className="btn btn-sm btn-secondary" style={{ background: "var(--amber-light)", color: "var(--amber)" }}>
                    Pause
                  </button>
                )}
                {activeCampaign.status === "PAUSED" && (
                  <button onClick={handleResumeCampaign} disabled={campaignActionLoading} className="btn btn-sm btn-secondary" style={{ background: "var(--green-light)", color: "var(--green)" }}>
                    Resume
                  </button>
                )}
                <button onClick={handleCancelCampaign} disabled={campaignActionLoading} className="btn btn-sm btn-secondary" style={{ background: "var(--red-light)", color: "var(--red)" }}>
                  Cancel
                </button>
              </div>
            </div>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                {activeCampaign.totalCount - activeCampaign.pendingCount} of {activeCampaign.totalCount}
              </span>
              <span style={{ fontSize: "1.125rem", fontWeight: 900, color: "var(--brand)" }}>
                {activeCampaign.totalCount > 0 ? Math.round(((activeCampaign.totalCount - activeCampaign.pendingCount) / activeCampaign.totalCount) * 100) : 0}%
              </span>
            </div>
            
            <div className="progress-bar" style={{ height: 10, marginBottom: "1.25rem" }}>
              <div
                className="progress-bar-fill"
                style={{ width: `${activeCampaign.totalCount > 0 ? ((activeCampaign.totalCount - activeCampaign.pendingCount) / activeCampaign.totalCount) * 100 : 0}%`, background: "var(--brand)" }}
              />
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem", marginBottom: "1.5rem" }}>
              <div style={{ background: "var(--green-light)", borderRadius: 12, padding: "0.875rem", border: "1px solid var(--green)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--green)", marginBottom: "0.25rem" }}>
                  <CheckCircle size={14} />
                  <span style={{ fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase" }}>Success</span>
                </div>
                <p style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--green)", margin: 0 }}>{activeCampaign.sentCount}</p>
              </div>
              <div style={{ background: "var(--red-light)", borderRadius: 12, padding: "0.875rem", border: "1px solid var(--red)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--red)", marginBottom: "0.25rem" }}>
                  <XCircle size={14} />
                  <span style={{ fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase" }}>Failed</span>
                </div>
                <p style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--red)", margin: 0 }}>{activeCampaign.failedCount}</p>
              </div>
            </div>
          </div>
        )}

        {/* Upload */}
        {!activeCampaign && (
          <div
            className="card"
            style={{ padding: "1.5rem", marginBottom: "1.25rem" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.625rem",
                marginBottom: "1.125rem",
              }}
            >
              <Upload size={17} style={{ color: "var(--brand)" }} />
              <h2
                style={{
                  fontSize: "0.9375rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  margin: 0,
                }}
              >
                Bulk Import
              </h2>
              <div
                style={{ marginLeft: "auto", display: "flex", gap: "0.375rem" }}
              >
                {[1, 2, 3, 4].map((s) => (
                  <div
                    key={s}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background:
                        step >= s ? "var(--brand)" : "var(--surface-2)",
                      color: step >= s ? "#fff" : "var(--text-muted)",
                      border: `2px solid ${step >= s ? "var(--brand)" : "var(--border)"}`,
                      boxShadow:
                        step >= s ? "0 2px 8px rgba(99,102,241,0.35)" : "none",
                      transition: "all 0.3s",
                    }}
                  >
                    {s}
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div
                style={{
                  background: "var(--red-light)",
                  color: "var(--red)",
                  borderRadius: 10,
                  padding: "0.7rem 1rem",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "1rem",
                }}
              >
                <AlertCircle size={15} />
                {error}
              </div>
            )}

            {step === 1 && (
              <div style={{ textAlign: "center", padding: "1.75rem 1rem" }}>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 16,
                    background: "var(--brand-light)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1rem",
                    color: "var(--brand)",
                  }}
                >
                  {loading ? (
                    <Loader2 size={28} className="animate-spin" />
                  ) : (
                    <FileSpreadsheet size={28} />
                  )}
                </div>
                <h3
                  style={{
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    margin: "0 0 0.375rem",
                    fontSize: "1rem",
                  }}
                >
                  Upload Excel File
                </h3>
                <p
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.875rem",
                    margin: "0 0 1.5rem",
                  }}
                >
                  Select a .xlsx file with attendee details
                </p>
                <label style={{ cursor: "pointer" }}>
                  <span
                    className="btn btn-primary"
                    style={{ pointerEvents: "none" }}
                  >
                    <Upload size={15} /> Choose File
                  </span>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    disabled={loading}
                    style={{ display: "none" }}
                  />
                </label>
              </div>
            )}

            {step === 2 && (
              <div
                className="animate-fade-in"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                <h3
                  style={{
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    margin: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    fontSize: "0.9375rem",
                  }}
                >
                  <Filter size={15} style={{ color: "var(--brand)" }} /> Map
                  Columns
                </h3>
                <div
                  style={{
                    background: "var(--surface-2)",
                    borderRadius: 12,
                    padding: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                    border: "1px solid var(--border)",
                  }}
                >
                  {Object.keys(mapping).map((key) => (
                    <div
                      key={key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <label
                        style={{
                          width: 56,
                          fontWeight: 700,
                          color: "var(--text-secondary)",
                          fontSize: "0.8125rem",
                          textTransform: "capitalize",
                          flexShrink: 0,
                        }}
                      >
                        {key}
                        {key !== "email" && (
                          <span style={{ color: "var(--red)" }}>*</span>
                        )}
                      </label>
                      <select
                        className="input select"
                        style={{ flex: 1, minWidth: 130 }}
                        value={mapping[key]}
                        onChange={(e) =>
                          setMapping({ ...mapping, [key]: e.target.value })
                        }
                      >
                        <option value="">-- Select --</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button
                    onClick={resetState}
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleValidate}
                    disabled={loading}
                    className="btn btn-primary"
                    style={{ flex: 2 }}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />{" "}
                        Validating…
                      </>
                    ) : (
                      <>Validate</>
                    )}
                  </button>
                </div>
              </div>
            )}

            {step === 3 && validationSummary && (
              <div className="animate-fade-in" style={{ padding: "1rem" }}>
                <h3 style={{ marginBottom: "1rem", color: "var(--text-primary)" }}>Validation Summary</h3>
                <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
                  <div style={{ flex: 1, padding: "1rem", background: "var(--surface-2)", borderRadius: 8 }}>
                    <strong>Total Rows:</strong> {validationSummary.totalRows}
                  </div>
                  <div style={{ flex: 1, padding: "1rem", background: "var(--green-light)", color: "var(--green)", borderRadius: 8 }}>
                    <strong>Valid:</strong> {validationSummary.validRows}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
                  <div style={{ flex: 1, padding: "1rem", background: "var(--amber-light)", color: "var(--amber)", borderRadius: 8 }}>
                    <strong>Duplicate Rolls:</strong> {validationSummary.duplicateRolls}
                  </div>
                  <div style={{ flex: 1, padding: "1rem", background: "var(--red-light)", color: "var(--red)", borderRadius: 8 }}>
                    <strong>Invalid/Duplicate Emails:</strong> {validationSummary.invalidEmails + validationSummary.duplicateEmails}
                  </div>
                </div>
                <label className="input-label">Event Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Annual Tech Summit 2026"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  style={{ marginBottom: "1.5rem" }}
                />
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button onClick={() => setStep(2)} className="btn btn-secondary" style={{ flex: 1 }}>Back</button>
                  <button onClick={handleUpload} disabled={loading} className="btn btn-primary" style={{ flex: 2 }}>
                    {loading ? <><Loader2 size={15} className="animate-spin" /> Uploading…</> : <>Confirm Replace & Upload</>}
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div
                className="animate-pop-in"
                style={{ textAlign: "center", padding: "1.25rem 1rem" }}
              >
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 16,
                    background: "var(--green-light)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 0.875rem",
                    color: "var(--green)",
                  }}
                >
                  <CheckCircle2 size={32} />
                </div>
                <h3
                  style={{
                    fontWeight: 800,
                    color: "var(--text-primary)",
                    margin: "0 0 0.25rem",
                  }}
                >
                  QR Codes Ready!
                </h3>
                <p
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.875rem",
                    margin: "0 0 1.25rem",
                  }}
                >
                  ZIP downloaded. Send emails from the list below.
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    justifyContent: "center",
                  }}
                >
                  <button
                    onClick={resetState}
                    className="btn btn-secondary btn-sm"
                  >
                    Upload Another
                  </button>
                  <button
                    onClick={() =>
                      document
                        .getElementById("alist")
                        ?.scrollIntoView({ behavior: "smooth" })
                    }
                    className="btn btn-primary btn-sm"
                  >
                    View List ↓
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Email Config */}
        {!loading && (
          <div
            className="card"
            style={{ marginBottom: "1.25rem", overflow: "hidden" }}
          >
            <button
              onClick={() => setShowEmailConfig((v) => !v)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "1rem 1.25rem",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-primary)",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                }}
              >
                <MessageSquare size={15} style={{ color: "var(--brand)" }} />{" "}
                Email Configuration
              </span>
              <ChevronDown
                size={16}
                style={{
                  color: "var(--text-muted)",
                  transform: showEmailConfig ? "rotate(180deg)" : "none",
                  transition: "transform 0.25s",
                }}
              />
            </button>
            {showEmailConfig && (
              <div
                className="animate-fade-in"
                style={{ padding: "0 1.25rem 1.25rem" }}
              >
                <hr className="divider" style={{ marginBottom: "1rem" }} />
                <label className="input-label" htmlFor="custom-msg">
                  Custom Message (Optional)
                </label>
                <textarea
                  id="custom-msg"
                  className="input"
                  style={{ height: 90, resize: "vertical" }}
                  placeholder="Message to include above QR in email…"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                />
                <p
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.75rem",
                    margin: "0.375rem 0 1rem",
                  }}
                >
                  Appears above QR code in the email.
                </p>
                <button
                  onClick={handleStartCampaign}
                  disabled={
                    activeCampaign || campaignActionLoading ||
                    !attendees.filter((a) => !a.emailSent && a.email).length
                  }
                  className="btn btn-primary"
                  style={{ width: "100%" }}
                >
                  <Send size={15} /> {activeCampaign ? "Campaign Active" : "Start Email Campaign"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Attendee Table Component */}
        <div id="alist" className="mb-4">
          <AttendeeTable 
            filtered={filtered}
            stats={stats}
            eventCheckpoints={eventCheckpoints}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            sortOption={sortOption}
            setSortOption={setSortOption}
            checkpointFilters={checkpointFilters}
            setCheckpointFilters={setCheckpointFilters}
            emailFilter={emailFilter}
            setEmailFilter={setEmailFilter}
            handleClearAttendees={handleClearAttendees}
            fetchAttendees={fetchAttendees}
            handleSendEmail={handleSendEmail}
            emailLoading={emailLoading}
          />
        </div>
        </>
        )}
        <GlobalFooter />
      </main>
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, type: null, id: null, isProcessing: false })}
        onConfirm={processModalConfirm}
        title={deleteModal.type === "clearAttendees" ? "Clear All Attendees" : "Delete Dataset"}
        message={deleteModal.type === "clearAttendees" ? "Are you sure you want to permanently delete all attendees for this event? This action cannot be undone." : "Are you sure you want to permanently delete this dataset? This action cannot be undone."}
        isDeleting={deleteModal.isProcessing}
      />
    </div>
  );
}
