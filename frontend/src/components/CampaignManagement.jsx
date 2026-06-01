import React, { useState, useEffect } from "react";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";
import { Mail, Clock, PlayCircle, Plus, Edit2, Trash2, Save, X, RefreshCw, Download } from "lucide-react";

export default function CampaignManagement({ activeEventId }) {
  const [activeTab, setActiveTab] = useState("monitor");
  const [templates, setTemplates] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [templateForm, setTemplateForm] = useState(null);
  const [campaignForm, setCampaignForm] = useState(null);

  useEffect(() => {
    if (activeEventId) {
      fetchTemplates();
      fetchCampaigns();
    }
  }, [activeEventId]);

  const fetchTemplates = async () => {
    try {
      const res = await api.get(`/campaigns/templates?eventId=${activeEventId}`);
      setTemplates(res.data);
    } catch (e) {
      console.error("Failed to fetch templates");
    }
  };

  const fetchCampaigns = async () => {
    try {
      const res = await api.get(`/campaigns?eventId=${activeEventId}`);
      setCampaigns(res.data);
    } catch (e) {
      console.error("Failed to fetch campaigns");
    }
  };

  const saveTemplate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (templateForm.id) {
        await api.put(`/campaigns/templates/${templateForm.id}`, templateForm);
        toast({ type: "success", message: "Template updated." });
      } else {
        await api.post(`/campaigns/templates`, { ...templateForm, eventId: activeEventId });
        toast({ type: "success", message: "Template created." });
      }
      setTemplateForm(null);
      fetchTemplates();
    } catch (err) {
      toast({ type: "error", message: "Failed to save template." });
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (id) => {
    if (!window.confirm("Delete this template?")) return;
    try {
      await api.delete(`/campaigns/templates/${id}`);
      toast({ type: "success", message: "Template deleted." });
      fetchTemplates();
    } catch (err) {
      toast({ type: "error", message: "Failed to delete template." });
    }
  };

  const startCampaign = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/campaigns/start`, { ...campaignForm, eventId: activeEventId });
      toast({ type: "success", message: "Campaign scheduled/started successfully." });
      setCampaignForm(null);
      setActiveTab("monitor");
      fetchCampaigns();
    } catch (err) {
      toast({ type: "error", message: err.response?.data?.error || "Failed to start campaign." });
    } finally {
      setLoading(false);
    }
  };

  const retryCampaign = async (id) => {
    try {
      await api.post(`/campaigns/${id}/retry`);
      toast({ type: "success", message: "Failed emails queued for retry." });
      fetchCampaigns();
    } catch (err) {
      toast({ type: "error", message: "Failed to retry campaign." });
    }
  };

  const downloadReport = (camp) => {
    // Generate simple CSV summarizing campaign stats
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Metric,Count\n"
      + `Total,${camp.totalCount}\n`
      + `Sent,${camp.sentCount}\n`
      + `Opened,${camp.openedCount}\n`
      + `Bounced,${camp.bouncedCount}\n`
      + `Failed,${camp.failedCount}\n`
      + `Pending,${camp.pendingCount}\n`;
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Campaign_Report_${camp.name}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  if (!activeEventId) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Please select an Active Event in the header first.</div>;
  }

  return (
    <div style={{ padding: "1rem" }}>
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
        <button 
          className={`btn btn-sm ${activeTab === 'monitor' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('monitor')}
        >
          Monitor & History
        </button>
        <button 
          className={`btn btn-sm ${activeTab === 'builder' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('builder')}
        >
          Campaign Builder
        </button>
        <button 
          className={`btn btn-sm ${activeTab === 'templates' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('templates')}
        >
          Templates
        </button>
      </div>

      {activeTab === 'templates' && (
        <div>
          {templateForm ? (
            <div className="card animate-pop-in" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                <h3>{templateForm.id ? "Edit Template" : "New Template"}</h3>
                <button className="btn-icon" onClick={() => setTemplateForm(null)}><X size={18} /></button>
              </div>
              <form onSubmit={saveTemplate} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label className="input-label">Template Name</label>
                  <input className="input" required value={templateForm.name} onChange={e => setTemplateForm({...templateForm, name: e.target.value})} placeholder="e.g. VIP Reminder" />
                </div>
                <div>
                  <label className="input-label">Email Subject</label>
                  <input className="input" required value={templateForm.subject} onChange={e => setTemplateForm({...templateForm, subject: e.target.value})} placeholder="e.g. Your VIP Pass is Ready!" />
                </div>
                <div>
                  <label className="input-label">HTML Body (Available variables: {'{{name}}'}, {'{{event_name}}'}, {'{{event_date}}'}, {'{{event_venue}}'}, {'{{qr_link}}'})</label>
                  <textarea className="input" required rows={10} style={{ fontFamily: 'monospace', fontSize: '13px' }} value={templateForm.htmlBody} onChange={e => setTemplateForm({...templateForm, htmlBody: e.target.value})} placeholder="<h1>Hello {{name}}</h1>..." />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setTemplateForm(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Saving..." : "Save Template"}</button>
                </div>
              </form>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
                <button className="btn btn-primary" onClick={() => setTemplateForm({ name: "", subject: "", htmlBody: "" })}><Plus size={16} /> New Template</button>
              </div>
              <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
                {templates.map(t => (
                  <div key={t.id} className="card" style={{ padding: "1rem" }}>
                    <h4>{t.name}</h4>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>Subject: {t.subject}</p>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => setTemplateForm(t)}><Edit2 size={14} /> Edit</button>
                      <button className="btn btn-sm btn-secondary" style={{ color: "var(--red)" }} onClick={() => deleteTemplate(t.id)}><Trash2 size={14} /> Delete</button>
                    </div>
                  </div>
                ))}
                {templates.length === 0 && <p style={{ color: "var(--text-muted)" }}>No templates found.</p>}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'builder' && (
        <div className="card animate-pop-in" style={{ padding: "1.5rem", maxWidth: "600px", margin: "0 auto" }}>
          <h2 style={{ marginBottom: "1.5rem" }}>Create Campaign</h2>
          <form onSubmit={startCampaign} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <label className="input-label">Campaign Name</label>
              <input className="input" required value={campaignForm?.name || ""} onChange={e => setCampaignForm({...campaignForm, name: e.target.value})} placeholder="e.g. Batch 1 Initial Send" />
            </div>
            
            <div>
              <label className="input-label">Target Audience</label>
              <select className="input select" value={campaignForm?.target || "all"} onChange={e => setCampaignForm({...campaignForm, target: e.target.value})}>
                <option value="all">All Attendees with Emails</option>
                <option value="pending">Only Attendees who haven't received an email yet</option>
              </select>
            </div>

            <div>
              <label className="input-label">Email Template (Optional)</label>
              <select className="input select" value={campaignForm?.templateId || ""} onChange={e => setCampaignForm({...campaignForm, templateId: e.target.value})}>
                <option value="">Default System Template</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <div>
              <label className="input-label">Schedule Sending (Optional)</label>
              <input className="input" type="datetime-local" value={campaignForm?.scheduledAt || ""} onChange={e => setCampaignForm({...campaignForm, scheduledAt: e.target.value})} />
              <small style={{ color: "var(--text-muted)" }}>Leave blank to send immediately.</small>
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: "1rem" }} disabled={loading}>
              <PlayCircle size={18} /> {campaignForm?.scheduledAt ? "Schedule Campaign" : "Start Sending Now"}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'monitor' && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
            <button className="btn btn-sm btn-secondary" onClick={fetchCampaigns}><RefreshCw size={14} /> Refresh</button>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {campaigns.map(camp => (
              <div key={camp.id} className="card" style={{ padding: "1.5rem", borderLeft: camp.status === "RUNNING" ? "4px solid var(--brand)" : camp.status === "FAILED" ? "4px solid var(--red)" : "4px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                  <div>
                    <h3 style={{ margin: 0 }}>{camp.name}</h3>
                    <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      <span>Status: <strong>{camp.status}</strong></span>
                      <span>Created: {new Date(camp.createdAt).toLocaleString()}</span>
                      {camp.scheduledAt && <span>Scheduled: {new Date(camp.scheduledAt).toLocaleString()}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {camp.failedCount > 0 && (
                      <button className="btn btn-sm btn-secondary" style={{ color: "var(--red)" }} onClick={() => retryCampaign(camp.id)}>
                        Retry {camp.failedCount} Failed
                      </button>
                    )}
                    <button className="btn btn-sm btn-secondary" onClick={() => downloadReport(camp)}>
                      <Download size={14} /> Export CSV
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div style={{ width: "100%", height: "8px", background: "var(--surface-2)", borderRadius: "4px", overflow: "hidden", display: "flex", marginBottom: "1rem" }}>
                  <div style={{ width: `${(camp.sentCount / camp.totalCount) * 100}%`, background: "var(--green)", height: "100%" }} />
                  <div style={{ width: `${(camp.failedCount / camp.totalCount) * 100}%`, background: "var(--red)", height: "100%" }} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "1rem", textAlign: "center" }}>
                  <div style={{ background: "var(--surface-2)", padding: "0.75rem", borderRadius: "8px" }}>
                    <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{camp.totalCount}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Total</div>
                  </div>
                  <div style={{ background: "rgba(34, 197, 94, 0.1)", padding: "0.75rem", borderRadius: "8px", color: "var(--green)" }}>
                    <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{camp.sentCount}</div>
                    <div style={{ fontSize: "0.75rem", textTransform: "uppercase" }}>Sent</div>
                  </div>
                  <div style={{ background: "rgba(99, 102, 241, 0.1)", padding: "0.75rem", borderRadius: "8px", color: "var(--brand)" }}>
                    <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{camp.openedCount}</div>
                    <div style={{ fontSize: "0.75rem", textTransform: "uppercase" }}>Opened</div>
                  </div>
                  <div style={{ background: "rgba(239, 68, 68, 0.1)", padding: "0.75rem", borderRadius: "8px", color: "var(--red)" }}>
                    <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{camp.failedCount}</div>
                    <div style={{ fontSize: "0.75rem", textTransform: "uppercase" }}>Failed</div>
                  </div>
                  <div style={{ background: "rgba(239, 68, 68, 0.1)", padding: "0.75rem", borderRadius: "8px", color: "var(--red)" }}>
                    <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{camp.bouncedCount}</div>
                    <div style={{ fontSize: "0.75rem", textTransform: "uppercase" }}>Bounced</div>
                  </div>
                  <div style={{ background: "var(--surface-2)", padding: "0.75rem", borderRadius: "8px" }}>
                    <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{camp.pendingCount}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Pending</div>
                  </div>
                </div>
              </div>
            ))}
            {campaigns.length === 0 && <p style={{ textAlign: "center", color: "var(--text-muted)", marginTop: "2rem" }}>No campaigns found for this event.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
