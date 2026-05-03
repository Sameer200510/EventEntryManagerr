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
  Filter,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import api from "../utils/api";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
function StatCard({ label, value, total, color, icon, statColor }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="stat-card" style={{ "--stat-color": statColor || color }}>
      {" "}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.5rem",
        }}
      >
        {" "}
        <p
          style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            margin: 0,
          }}
        >
          {" "}
          {label}{" "}
        </p>{" "}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: `${statColor || color}18`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: statColor || color,
          }}
        >
          {" "}
          {icon}{" "}
        </div>{" "}
      </div>{" "}
      <p
        className="animate-count-up"
        style={{
          fontSize: "2rem",
          fontWeight: 900,
          color: statColor || color,
          margin: "0 0 0.375rem",
          lineHeight: 1,
        }}
      >
        {" "}
        {value}{" "}
      </p>{" "}
      {total > 0 && (
        <>
          {" "}
          <div className="progress-bar">
            {" "}
            <div
              className="progress-bar-fill"
              style={{ width: `${pct}%` }}
            />{" "}
          </div>{" "}
          <p
            style={{
              fontSize: "0.7rem",
              color: "var(--text-muted)",
              marginTop: "0.375rem",
              fontWeight: 600,
            }}
          >
            {" "}
            {pct}% of {total}{" "}
          </p>{" "}
        </>
      )}{" "}
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [emailLoading, setEmailLoading] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({
    current: 0,
    total: 0,
    success: 0,
    failed: 0,
  });
  const [bulkLogs, setBulkLogs] = useState([]);
  const [customMessage, setCustomMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEntry, setFilterEntry] = useState("all");
  const [filterFood, setFilterFood] = useState("all");
  const [showEmailConfig, setShowEmailConfig] = useState(false);
  const { dark, setDark } = useTheme();
  const { toast } = useToast();
  useEffect(() => {
    fetchAttendees();
  }, []);
  const fetchAttendees = async () => {
    try {
      const { data } = await api.get("/attendees");
      setAttendees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setAttendees([]);
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
  const handleUpload = async () => {
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
      setStep(3);
      await fetchAttendees();
      toast({ type: "success", message: "QR codes generated & downloaded!" });
    } catch {
      setError("Upload failed.");
      toast({ type: "error", message: "Upload failed." });
    } finally {
      setLoading(false);
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
  const handleBulkEmail = async () => {
    const pending = attendees.filter((a) => !a.emailSent && a.email);
    if (!pending.length) {
      toast({ type: "warning", message: "No pending emails to send!" });
      return;
    }
    if (
      !window.confirm(
        `Start bulk sending to ${pending.length} attendees? This might take a while.`,
      )
    ) {
      return;
    }
    setBulkLoading(true);
    setBulkProgress({
      current: 0,
      total: pending.length,
      success: 0,
      failed: 0,
    });
    setBulkLogs([]);
    for (let i = 0; i < pending.length; i++) {
      const attendee = pending[i];
      try {
        await api.post(`/attendees/send-email/${attendee.id}`, {
          message: customMessage,
        });
        setBulkProgress((prev) => ({
          ...prev,
          current: i + 1,
          success: prev.success + 1,
        }));
        setBulkLogs((prev) =>
          [
            {
              roll: attendee.roll,
              name: attendee.name,
              status: "success",
              time: new Date(),
            },
            ...prev,
          ].slice(0, 30),
        );
      } catch (err) {
        console.error(`Failed to send to ${attendee.roll}:`, err);
        setBulkProgress((prev) => ({
          ...prev,
          current: i + 1,
          failed: prev.failed + 1,
        }));
        setBulkLogs((prev) =>
          [
            {
              roll: attendee.roll,
              name: attendee.name,
              status: "error",
              time: new Date(),
              error: err.response?.data?.error || "Failed",
            },
            ...prev,
          ].slice(0, 30),
        );
      }
      await new Promise((r) => setTimeout(r, 600));
    }
    toast({ type: "success", message: "Bulk email process completed!" });
    await fetchAttendees();
  };
  const resetState = () => {
    setFile(null);
    setHeaders([]);
    setStep(1);
    setError(null);
  };
  const filtered = attendees.filter((a) => {
    const s = searchTerm.toLowerCase();
    return (
      (a.name.toLowerCase().includes(s) || a.roll.toLowerCase().includes(s)) &&
      (filterEntry === "all" ||
        (filterEntry === "done" ? a.entryStatus : !a.entryStatus)) &&
      (filterFood === "all" ||
        (filterFood === "done" ? a.foodStatus : !a.foodStatus))
    );
  });
  const stats = {
    total: attendees.length,
    entry: attendees.filter((a) => a.entryStatus).length,
    food: attendees.filter((a) => a.foodStatus).length,
    pending: attendees.filter((a) => !a.entryStatus).length,
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Header */}
      <header
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          padding: "0 1.25rem",
          height: 58,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 50,
          boxShadow: "0 1px 0 var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "linear-gradient(135deg,#6366f1,#4f46e5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(99,102,241,0.4)",
            }}
          >
            <ScanLine size={17} color="#fff" />
          </div>
          <div>
            <p
              style={{
                fontWeight: 800,
                fontSize: "0.9375rem",
                color: "var(--text-primary)",
                margin: 0,
                lineHeight: 1,
              }}
            >
              Admin Dashboard
            </p>
            <p
              style={{
                fontSize: "0.7rem",
                color: "var(--text-muted)",
                margin: 0,
                fontWeight: 500,
              }}
            >
              {stats.total} attendees
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button onClick={() => setDark(!dark)} className="btn-icon">
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button onClick={fetchAttendees} className="btn-icon" title="Refresh">
            <RefreshCw size={16} />
          </button>
          <button onClick={onLogout} className="btn btn-sm btn-secondary">
            <LogOut size={13} /> Logout
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
          <StatCard
            label="Admitted"
            value={stats.entry}
            total={stats.total}
            color="var(--green)"
            icon={<ScanLine size={16} />}
            statColor="var(--green)"
          />
          <StatCard
            label="Food Served"
            value={stats.food}
            total={stats.total}
            color="var(--amber)"
            icon={<Utensils size={16} />}
            statColor="var(--amber)"
          />
          <StatCard
            label="Pending"
            value={stats.pending}
            total={stats.total}
            color="var(--red)"
            icon={<AlertCircle size={16} />}
            statColor="var(--red)"
          />
        </div>

        {/* Bulk Status (Floating/Conditional Overlay) */}
        {bulkLoading && (
          <div
            className="card animate-pop-in"
            style={{
              padding: "1.5rem",
              marginBottom: "1.25rem",
              border: "2px solid var(--brand)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: "1rem",
                    fontWeight: 900,
                    color: "var(--text-primary)",
                    margin: 0,
                  }}
                >
                  Bulk Email Campaign
                </h3>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    margin: "0.125rem 0 0",
                  }}
                >
                  Status:{" "}
                  {bulkProgress.current === bulkProgress.total
                    ? "Finished"
                    : "Processing..."}
                </p>
              </div>
              {bulkProgress.current === bulkProgress.total && (
                <button
                  onClick={() => setBulkLoading(false)}
                  className="btn-icon"
                  style={{
                    borderRadius: "50%",
                    background: "var(--surface-2)",
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                marginBottom: "0.5rem",
              }}
            >
              <span
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  color: "var(--text-secondary)",
                }}
              >
                {bulkProgress.current} of {bulkProgress.total}
              </span>
              <span
                style={{
                  fontSize: "1.125rem",
                  fontWeight: 900,
                  color: "var(--brand)",
                }}
              >
                {Math.round((bulkProgress.current / bulkProgress.total) * 100)}%
              </span>
            </div>
            <div
              className="progress-bar"
              style={{ height: 10, marginBottom: "1.25rem" }}
            >
              <div
                className="progress-bar-fill"
                style={{
                  width: `${(bulkProgress.current / bulkProgress.total) * 100}%`,
                  background: "var(--brand)",
                }}
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.875rem",
                marginBottom: "1.5rem",
              }}
            >
              <div
                style={{
                  background: "var(--green-light)",
                  borderRadius: 12,
                  padding: "0.875rem",
                  border: "1px solid var(--green)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    color: "var(--green)",
                    marginBottom: "0.25rem",
                  }}
                >
                  <CheckCircle size={14} />
                  <span
                    style={{
                      fontSize: "0.65rem",
                      fontWeight: 800,
                      textTransform: "uppercase",
                    }}
                  >
                    Success
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 900,
                    color: "var(--green)",
                    margin: 0,
                  }}
                >
                  {bulkProgress.success}
                </p>
              </div>
              <div
                style={{
                  background: "var(--red-light)",
                  borderRadius: 12,
                  padding: "0.875rem",
                  border: "1px solid var(--red)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    color: "var(--red)",
                    marginBottom: "0.25rem",
                  }}
                >
                  <XCircle size={14} />
                  <span
                    style={{
                      fontSize: "0.65rem",
                      fontWeight: 800,
                      textTransform: "uppercase",
                    }}
                  >
                    Failed
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 900,
                    color: "var(--red)",
                    margin: 0,
                  }}
                >
                  {bulkProgress.failed}
                </p>
              </div>
            </div>
            {/* Logs List */}
            <div
              style={{
                background: "var(--surface-2)",
                borderRadius: 12,
                border: "1px solid var(--border)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "0.625rem 1rem",
                  background: "var(--border-subtle)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <Clock size={12} style={{ color: "var(--text-muted)" }} />
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    color: "var(--text-muted)",
                  }}
                >
                  Recent Activity
                </span>
              </div>
              <div
                style={{ maxHeight: 180, overflowY: "auto", padding: "0.5rem" }}
              >
                {bulkLogs.length === 0 ? (
                  <p
                    style={{
                      textAlign: "center",
                      color: "var(--text-muted)",
                      fontSize: "0.75rem",
                      padding: "1rem",
                    }}
                  >
                    No activity yet...
                  </p>
                ) : (
                  bulkLogs.map((log, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.5rem 0.75rem",
                        borderRadius: 8,
                        background:
                          idx === 0 ? "var(--surface)" : "transparent",
                        marginBottom: 2,
                      }}
                    >
                      {log.status === "success" ? (
                        <CheckCircle2 size={14} color="var(--green)" />
                      ) : (
                        <AlertCircle size={14} color="var(--red)" />
                      )}
                      <div style={{ flex: 1 }}>
                        <p
                          style={{
                            fontSize: "0.8125rem",
                            fontWeight: 700,
                            color: "var(--text-primary)",
                            margin: 0,
                          }}
                        >
                          {log.name} ({log.roll})
                        </p>
                        {log.error && (
                          <p
                            style={{
                              fontSize: "0.65rem",
                              color: "var(--red)",
                              margin: 0,
                            }}
                          >
                            {log.error}
                          </p>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: "0.65rem",
                          color: "var(--text-muted)",
                          fontWeight: 500,
                        }}
                      >
                        {new Date(log.time).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Upload */}
        {!bulkLoading && (
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
                {[1, 2, 3].map((s) => (
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
                    onClick={handleUpload}
                    disabled={loading}
                    className="btn btn-primary"
                    style={{ flex: 2 }}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />{" "}
                        Processing…
                      </>
                    ) : (
                      <>Generate QR Codes</>
                    )}
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
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
        {!bulkLoading && (
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
                  onClick={handleBulkEmail}
                  disabled={
                    bulkLoading ||
                    !attendees.filter((a) => !a.emailSent && a.email).length
                  }
                  className="btn btn-primary"
                  style={{ width: "100%" }}
                >
                  <Send size={15} /> Bulk Send (
                  {attendees.filter((a) => !a.emailSent && a.email).length}{" "}
                  pending)
                </button>
              </div>
            )}
          </div>
        )}

        {/* Attendee List */}
        <div id="alist" className="card" style={{ overflow: "hidden" }}>
          {/* Toolbar */}
          <div
            style={{
              padding: "1rem 1.25rem",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.75rem",
              justifyContent: "space-between",
            }}
          >
            <div>
              <h2
                style={{
                  fontWeight: 800,
                  fontSize: "0.9375rem",
                  color: "var(--text-primary)",
                  margin: 0,
                }}
              >
                Attendee List
              </h2>
              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.75rem",
                  margin: "0.125rem 0 0",
                  fontWeight: 500,
                }}
              >
                {filtered.length} of {stats.total} shown
              </p>
            </div>
            <button
              onClick={fetchAttendees}
              className="btn btn-sm btn-secondary"
            >
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          {/* Filters */}
          <div
            style={{
              padding: "0.875rem 1.25rem",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              gap: "0.625rem",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: "2 1 180px", position: "relative" }}>
              <Search
                size={15}
                style={{
                  position: "absolute",
                  left: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              />
              <input
                className="input"
                style={{ paddingLeft: "2.25rem", fontSize: "0.875rem" }}
                type="text"
                placeholder="Search name or roll…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="input select"
              style={{ flex: "1 1 130px", fontSize: "0.875rem" }}
              value={filterEntry}
              onChange={(e) => setFilterEntry(e.target.value)}
            >
              <option value="all">Entry: All</option>
              <option value="done">Entry: Done ✓</option>
              <option value="pending">Entry: Pending</option>
            </select>
            <select
              className="input select"
              style={{ flex: "1 1 130px", fontSize: "0.875rem" }}
              value={filterFood}
              onChange={(e) => setFilterFood(e.target.value)}
            >
              <option value="all">Food: All</option>
              <option value="done">Food: Served ✓</option>
              <option value="pending">Food: Pending</option>
            </select>
            {(searchTerm || filterEntry !== "all" || filterFood !== "all") && (
              <button
                className="btn-icon"
                onClick={() => {
                  setSearchTerm("");
                  setFilterEntry("all");
                  setFilterFood("all");
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 680,
              }}
            >
              <thead>
                <tr style={{ background: "var(--surface-2)" }}>
                  {["Attendee", "Roll No", "Entry", "Food", "Email"].map(
                    (h) => (
                      <th
                        key={h}
                        style={{
                          padding: "0.75rem 1rem",
                          textAlign: ["Entry", "Food", "Email"].includes(h)
                            ? "center"
                            : "left",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          color: "var(--text-muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          borderBottom: "1px solid var(--border)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        padding: "3rem",
                        textAlign: "center",
                        color: "var(--text-muted)",
                        fontWeight: 500,
                      }}
                    >
                      No results found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((a, i) => (
                    <tr
                      key={a.id}
                      style={{
                        borderBottom: "1px solid var(--border-subtle)",
                        background:
                          i % 2 === 0 ? "transparent" : "var(--surface-2)",
                        transition: "background 0.15s",
                        cursor: "default",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "var(--brand-light)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background =
                          i % 2 === 0 ? "transparent" : "var(--surface-2)")
                      }
                    >
                      <td style={{ padding: "0.875rem 1rem" }}>
                        <p
                          style={{
                            fontWeight: 700,
                            color: "var(--text-primary)",
                            margin: 0,
                            fontSize: "0.9rem",
                          }}
                        >
                          {a.name}
                        </p>
                        <p
                          style={{
                            color: "var(--text-muted)",
                            fontSize: "0.7rem",
                            margin: "0.125rem 0 0",
                            fontWeight: 500,
                          }}
                        >
                          {a.emailSent ? "✉️ Sent" : "⏳ Pending"}
                        </p>
                      </td>
                      <td
                        style={{
                          padding: "0.875rem 1rem",
                          color: "var(--text-secondary)",
                          fontWeight: 600,
                          fontSize: "0.875rem",
                        }}
                      >
                        {a.roll}
                      </td>
                      <td
                        style={{
                          padding: "0.875rem 1rem",
                          textAlign: "center",
                        }}
                      >
                        <StatusBadge
                          done={a.entryStatus}
                          doneLabel="Admitted"
                          time={a.entryScannedAt}
                        />
                      </td>
                      <td
                        style={{
                          padding: "0.875rem 1rem",
                          textAlign: "center",
                        }}
                      >
                        <StatusBadge
                          done={a.foodStatus}
                          doneLabel="Served"
                          time={a.foodScannedAt}
                        />
                      </td>
                      <td
                        style={{
                          padding: "0.875rem 1rem",
                          textAlign: "center",
                        }}
                      >
                        <button
                          onClick={() => handleSendEmail(a.id)}
                          disabled={!a.email || emailLoading === a.id}
                          className={`btn btn-xs ${a.emailSent ? "btn-secondary" : "btn-primary"}`}
                        >
                          {emailLoading === a.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Mail size={12} />
                          )}
                          {a.emailSent ? "Resend" : "Send"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <div className="watermark">
        Designed by SAMEER LOHANI &amp; VARUN DOBHAL
      </div>
    </div>
  );
}
