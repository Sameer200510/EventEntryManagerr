import React, { useState, useEffect, useRef } from "react";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";
import { ArrowLeft, Play, Pause, XCircle, CheckCircle, Clock, Activity, Download, RefreshCw, Trash2 } from "lucide-react";

export default function CampaignConsole({ campaignId, onClose, onRedirectCleanup }) {
  const [campaign, setCampaign] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logFilter, setLogFilter] = useState("all");
  const [rate, setRate] = useState(0);
  const [error, setError] = useState(null);
  const { toast } = useToast();
  const logsEndRef = useRef(null);

  // Poll campaign stats
  useEffect(() => {
    let lastSent = 0;
    let lastTime = Date.now();
    
    const fetchStats = async () => {
      try {
        const res = await api.get(`/campaigns/${campaignId}`);
        const c = res.data;
        setCampaign(c);
        
        // Calculate rate
        const now = Date.now();
        if (c.sentCount > lastSent && lastSent > 0) {
          const diff = c.sentCount - lastSent;
          const timeDiffMins = (now - lastTime) / 60000;
          if (timeDiffMins > 0) {
            setRate(Math.round(diff / timeDiffMins));
          }
        } else if (c.status !== "RUNNING") {
          setRate(0);
        }
        lastSent = c.sentCount;
        lastTime = now;
      } catch (e) {
        console.error("Failed to fetch campaign stats", e);
        setError(e.response?.data?.error || e.message || "Failed to fetch campaign stats");
      }
    };
    
    fetchStats();
    const int = setInterval(fetchStats, 2000);
    return () => clearInterval(int);
  }, [campaignId]);

  // Poll recent jobs for live logs
  useEffect(() => {
    const fetchedJobIds = new Set();
    const fetchLogs = async () => {
      try {
        const res = await api.get(`/campaigns/${campaignId}/recent-jobs`);
        const jobs = res.data; 
        
        const newLogs = [];
        // Reverse so we process oldest first in the batch
        [...jobs].reverse().forEach(job => {
          const key = `${job.id}-${job.status}`;
          if (!fetchedJobIds.has(key)) {
            fetchedJobIds.add(key);
            
            let message = "";
            let type = "info";
            if (job.status === "PROCESSING") {
              message = `Sending email to ${job.attendee?.email || "Unknown"}`;
              type = "info";
            } else if (job.status === "SENT") {
              message = `Delivered successfully to ${job.attendee?.email || "Unknown"}`;
              type = "success";
            } else if (["FAILED", "PERM_FAILED"].includes(job.status)) {
              message = `Failed - ${job.errorMessage} (${job.attendee?.email})`;
              type = "error";
            }
            
            if (message) {
              newLogs.push({
                id: key,
                time: new Date(job.updatedAt).toLocaleTimeString(),
                message,
                type,
                rawTime: new Date(job.updatedAt).getTime()
              });
            }
          }
        });
        
        if (newLogs.length > 0) {
          setLogs(prev => {
            const combined = [...prev, ...newLogs];
            return combined.slice(-1000); // Keep last 1000 logs
          });
        }
      } catch (e) {
        console.error("Failed to fetch logs");
      }
    };
    
    fetchLogs();
    const int = setInterval(fetchLogs, 2000);
    return () => clearInterval(int);
  }, [campaignId]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const handleAction = async (action) => {
    try {
      if (action === "retry") {
        await api.post(`/attendees/campaigns/${campaignId}/retry-failed`);
        toast({ type: "success", message: "Failed batches queued for retry." });
      }
    } catch(e) {
      toast({ type: "error", message: `Failed to execute action.` });
    }
  };

  const exportLogs = () => {
    const text = logs.map(l => `[${l.time}] [${l.type.toUpperCase()}] ${l.message}`).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campaign_${campaignId}_logs.txt`;
    a.click();
  };

  if (error) return <div style={{ padding: "3rem", textAlign: "center", color: "var(--danger)" }}><XCircle /> {error}</div>;
  if (!campaign) return <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}><RefreshCw className="animate-spin" /> Loading Enterprise Console...</div>;

  const pct = campaign.totalCount > 0 ? Math.round(((campaign.sentCount + campaign.failedCount) / campaign.totalCount) * 100) : 0;
  const etaMins = rate > 0 ? Math.ceil(campaign.pendingCount / rate) : "?";

  const filteredLogs = logs.filter(l => logFilter === "all" || l.type === logFilter);

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.5rem", height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button className="btn-icon" onClick={onClose}><ArrowLeft size={24} /></button>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.5rem" }}>{campaign.name}</h2>
            <div style={{ display: "flex", gap: "1rem", color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: campaign.status === "RUNNING" ? "var(--brand)" : "inherit" }}>
                <Activity size={14} /> {campaign.status}
              </span>
              <span>Started: {new Date(campaign.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {campaign.failedCount > 0 && (
            <button className="btn btn-secondary" style={{ color: "var(--danger)", borderColor: "var(--danger-light)" }} onClick={() => handleAction("retry")}>
              <RefreshCw size={16} /> Retry {campaign.failedCount} Failed
            </button>
          )}
          <button className="btn btn-secondary" style={{ color: "var(--danger)", borderColor: "var(--danger-light)" }} onClick={() => onRedirectCleanup({ type: 'campaign', id: campaignId, name: campaign.name, text: '' })}>
            <Trash2 size={16} /> Delete Campaign
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
        <div className="card" style={{ padding: "1.5rem", borderLeft: "4px solid var(--text-primary)" }}>
          <div style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 800, color: "var(--text-muted)", marginBottom: "0.5rem" }}>Total Audience</div>
          <div style={{ fontSize: "2rem", fontWeight: 900 }}>{campaign.totalCount}</div>
        </div>
        <div className="card" style={{ padding: "1.5rem", borderLeft: "4px solid var(--success)" }}>
          <div style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 800, color: "var(--success)", marginBottom: "0.5rem" }}>Sent Successfully</div>
          <div style={{ fontSize: "2rem", fontWeight: 900, color: "var(--success)" }}>{campaign.sentCount}</div>
        </div>
        <div className="card" style={{ padding: "1.5rem", borderLeft: "4px solid var(--warning)" }}>
          <div style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 800, color: "var(--warning)", marginBottom: "0.5rem" }}>Pending Remaining</div>
          <div style={{ fontSize: "2rem", fontWeight: 900, color: "var(--warning)" }}>{campaign.pendingCount}</div>
        </div>
        <div className="card" style={{ padding: "1.5rem", borderLeft: "4px solid var(--danger)" }}>
          <div style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 800, color: "var(--danger)", marginBottom: "0.5rem" }}>Failed</div>
          <div style={{ fontSize: "2rem", fontWeight: 900, color: "var(--danger)" }}>{campaign.failedCount}</div>
        </div>
      </div>

      {/* Progress & Live Meta */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontWeight: 800 }}>
          <span>Campaign Progress</span>
          <span style={{ color: "var(--brand)" }}>{pct}%</span>
        </div>
        <div style={{ height: "12px", background: "var(--surface-2)", borderRadius: "6px", overflow: "hidden", display: "flex", marginBottom: "1.5rem" }}>
          <div style={{ height: "100%", width: `${(campaign.sentCount / campaign.totalCount) * 100}%`, background: "var(--success)", transition: "width 0.5s ease" }} />
          <div style={{ height: "100%", width: `${(campaign.failedCount / campaign.totalCount) * 100}%`, background: "var(--danger)", transition: "width 0.5s ease" }} />
        </div>
        <div style={{ display: "flex", gap: "2rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Activity size={16} /> <strong>{rate}</strong> emails / min
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Clock size={16} /> ETA: <strong>{etaMins}</strong> {etaMins === 1 ? "min" : "mins"}
          </div>
        </div>
      </div>

      {/* Real-Time Logs Console */}
      <div className="card" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: "400px", background: "#0f172a", color: "#e2e8f0" }}>
        <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#1e293b" }}>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <span style={{ fontWeight: 800, fontSize: "0.9rem", color: "#fff" }}>Live Terminal</span>
            <div style={{ display: "flex", gap: "0.25rem" }}>
              <button onClick={() => setLogFilter("all")} style={{ background: logFilter==="all"?"#334155":"transparent", color: "#fff", border: "none", padding: "0.25rem 0.75rem", borderRadius: "4px", fontSize: "0.75rem", cursor: "pointer" }}>All</button>
              <button onClick={() => setLogFilter("success")} style={{ background: logFilter==="success"?"#065f46":"transparent", color: "#34d399", border: "none", padding: "0.25rem 0.75rem", borderRadius: "4px", fontSize: "0.75rem", cursor: "pointer" }}>Success</button>
              <button onClick={() => setLogFilter("error")} style={{ background: logFilter==="error"?"#7f1d1d":"transparent", color: "#f87171", border: "none", padding: "0.25rem 0.75rem", borderRadius: "4px", fontSize: "0.75rem", cursor: "pointer" }}>Failed</button>
            </div>
          </div>
          <button className="btn-icon" onClick={exportLogs} style={{ color: "#94a3b8" }} title="Export Logs"><Download size={16} /></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.5rem", fontFamily: "monospace", fontSize: "0.85rem", lineHeight: 1.6 }}>
          {filteredLogs.map(l => (
            <div key={l.id} style={{ display: "flex", gap: "0.75rem", marginBottom: "0.25rem", color: l.type === "success" ? "#34d399" : l.type === "error" ? "#f87171" : "#94a3b8" }}>
              <span style={{ opacity: 0.5, flexShrink: 0 }}>[{l.time}]</span>
              <span style={{ wordBreak: "break-all" }}>{l.message}</span>
            </div>
          ))}
          {filteredLogs.length === 0 && (
            <div style={{ color: "#64748b", fontStyle: "italic", textAlign: "center", marginTop: "2rem" }}>Waiting for job events...</div>
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}
