import React, { useState, useEffect } from "react";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";
import { PlayCircle, Plus, RefreshCw, X, AlertCircle, Download, Edit2, Trash2, Send, FileCode2, Inbox, MailWarning, LayoutTemplate, Loader2 } from "lucide-react";
import { categorizeEmailError } from "../utils/errorCategorization";
import CampaignConsole from "./CampaignConsole";
import DeleteModal from "./DeleteModal";
import { EmptyState } from "./ui/EmptyState";

export default function CampaignManagement({ activeEventId, onRedirectCleanup }) {
  const [activeTab, setActiveTab] = useState("monitor");
  const [templates, setTemplates] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [templateForm, setTemplateForm] = useState(null);
  const [campaignForm, setCampaignForm] = useState(null);
  const [activeFailureModal, setActiveFailureModal] = useState(null);
  const [campaignFailures, setCampaignFailures] = useState([]);
  const [activeConsoleId, setActiveConsoleId] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, templateId: null, isDeleting: false });

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
        toast({ type: "success", message: "Template updated successfully." });
      } else {
        await api.post(`/campaigns/templates`, { ...templateForm, eventId: activeEventId });
        toast({ type: "success", message: "Template created successfully." });
      }
      setTemplateForm(null);
      fetchTemplates();
    } catch (err) {
      toast({ type: "error", message: "Failed to save template." });
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteTemplate = async () => {
    setDeleteModal(prev => ({ ...prev, isDeleting: true }));
    try {
      await api.delete(`/campaigns/templates/${deleteModal.templateId}`);
      toast({ type: "success", message: "Template deleted." });
      fetchTemplates();
    } catch (err) {
      toast({ type: "error", message: "Failed to delete template." });
    } finally {
      setDeleteModal({ isOpen: false, templateId: null, isDeleting: false });
    }
  };

  const startCampaign = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/campaigns/start`, { ...campaignForm, eventId: activeEventId });
      toast({ type: "success", message: "Campaign successfully initiated." });
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
      await api.post(`/attendees/campaigns/${id}/retry-failed`);
      toast({ type: "success", message: "Failed emails queued for retry." });
      fetchCampaigns();
    } catch (err) {
      toast({ type: "error", message: "Failed to retry campaign." });
    }
  };

  const viewFailures = async (camp) => {
    try {
      const res = await api.get(`/attendees/campaigns/${camp.id}/failures`);
      setCampaignFailures(res.data);
      setActiveFailureModal(camp);
    } catch (err) {
      toast({ type: "error", message: "Failed to fetch campaign failures." });
    }
  };

  const downloadReport = (camp) => {
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
    link.setAttribute("download", `Campaign_Report_${camp.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  if (!activeEventId) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 border border-white/5 shadow-2xl">
          <AlertCircle size={32} className="text-amber-500" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">No Active Event Selected</h2>
        <p className="text-slate-400">Please select an event from the header to manage campaigns.</p>
      </div>
    );
  }

  if (activeConsoleId) {
    return <CampaignConsole campaignId={activeConsoleId} onClose={() => { setActiveConsoleId(null); fetchCampaigns(); }} onRedirectCleanup={onRedirectCleanup} />;
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight mb-1 flex items-center gap-2">
            <Send size={24} className="text-indigo-400" />
            Command Center
          </h2>
          <p className="text-slate-400 text-sm font-medium">Orchestrate and monitor high-volume email campaigns.</p>
        </div>
        
        {/* Segmented Control */}
        <div className="bg-slate-900/80 p-1 rounded-xl border border-white/10 flex gap-1 shadow-lg backdrop-blur-md">
          {[
            { id: 'monitor', label: 'Monitor', icon: PlayCircle },
            { id: 'builder', label: 'Launch', icon: Send },
            { id: 'templates', label: 'Templates', icon: LayoutTemplate }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${activeTab === tab.id ? 'bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'templates' && (
        <div className="animate-fade-in">
          {templateForm ? (
            <div className="card-glass p-0 overflow-hidden border-indigo-500/30 shadow-[0_0_50px_rgba(99,102,241,0.1)] mb-8 max-w-4xl mx-auto">
              <div className="bg-slate-900/50 border-b border-white/10 px-8 py-5 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  {templateForm.id ? <><Edit2 size={18} className="text-indigo-400"/> Edit Template</> : <><Plus size={18} className="text-indigo-400"/> New Template Studio</>}
                </h3>
                <button onClick={() => setTemplateForm(null)} className="text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-lg">
                  <X size={18}/>
                </button>
              </div>

              <form onSubmit={saveTemplate} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="input-label">Template Identifier <span className="text-red-400">*</span></label>
                    <input className="input bg-slate-900/50" required value={templateForm.name} onChange={e => setTemplateForm({...templateForm, name: e.target.value})} placeholder="e.g. Early Bird VIP" />
                  </div>
                  <div>
                    <label className="input-label">Email Subject <span className="text-red-400">*</span></label>
                    <input className="input bg-slate-900/50" required value={templateForm.subject} onChange={e => setTemplateForm({...templateForm, subject: e.target.value})} placeholder="e.g. Your VIP Pass is Ready!" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="input-label mb-0">HTML Source <span className="text-red-400">*</span></label>
                    <div className="flex gap-2">
                      {['{{name}}', '{{event_name}}', '{{qr_link}}'].map(tag => (
                        <span key={tag} className="px-2 py-1 rounded-md bg-indigo-500/10 text-indigo-400 text-xs font-mono font-bold border border-indigo-500/20">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <textarea 
                    className="input bg-[#0d1117] text-[#c9d1d9] border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" 
                    required 
                    rows={12} 
                    style={{ fontFamily: '"Fira Code", monospace', fontSize: '13px' }} 
                    value={templateForm.htmlBody} 
                    onChange={e => setTemplateForm({...templateForm, htmlBody: e.target.value})} 
                    placeholder="<html>\n  <body>\n    <h1>Hello {{name}}</h1>\n  </body>\n</html>" 
                  />
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t border-white/10">
                  <button type="button" className="btn btn-secondary px-6" onClick={() => setTemplateForm(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary px-8 shadow-lg shadow-indigo-500/20" disabled={loading}>
                    {loading ? <><Loader2 size={16} className="animate-spin mr-2"/> Saving...</> : "Save Template"}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <>
              <div className="flex justify-end mb-6">
                <button className="btn btn-primary shadow-lg shadow-indigo-500/20" onClick={() => setTemplateForm({ name: "", subject: "", htmlBody: "" })}>
                  <Plus size={16} className="mr-2"/> Create Template
                </button>
              </div>

              {templates.length === 0 ? (
                <EmptyState 
                  icon={LayoutTemplate} 
                  title="No Templates Yet" 
                  description="Design beautiful HTML email templates for your campaigns. Use variables to personalize."
                  actionLabel="Create First Template"
                  onAction={() => setTemplateForm({ name: "", subject: "", htmlBody: "" })}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {templates.map(t => (
                    <div key={t.id} className="card-glass p-6 group hover:border-indigo-500/50 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] transition-all">
                      <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4 border border-indigo-500/20">
                        <FileCode2 size={24} />
                      </div>
                      <h4 className="text-lg font-bold text-white mb-2 line-clamp-1">{t.name}</h4>
                      <div className="bg-slate-900/50 rounded-lg p-3 mb-6 border border-white/5">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Subject</p>
                        <p className="text-sm text-slate-300 font-medium line-clamp-1">{t.subject}</p>
                      </div>
                      
                      <div className="flex items-center gap-3 pt-4 border-t border-slate-700/50">
                        <button className="flex-1 btn btn-sm btn-secondary bg-slate-800 hover:bg-slate-700" onClick={() => setTemplateForm(t)}>
                          <Edit2 size={14} className="mr-1.5"/> Edit
                        </button>
                        <button className="flex-1 btn btn-sm btn-secondary bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20" onClick={() => setDeleteModal({ isOpen: true, templateId: t.id, isDeleting: false })}>
                          <Trash2 size={14} className="mr-1.5"/> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'builder' && (
        <div className="animate-fade-in flex justify-center">
          <div className="card-glass w-full max-w-2xl p-0 overflow-hidden border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.1)]">
            <div className="bg-gradient-to-r from-emerald-900/40 to-slate-900 border-b border-white/10 px-8 py-6 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-indigo-500" />
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30 text-white">
                <Send size={32} className="ml-1" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight mb-2">Launch Protocol</h2>
              <p className="text-slate-400 text-sm font-medium">Configure payload parameters to initiate a mass dispatch.</p>
            </div>
            
            <form onSubmit={startCampaign} className="p-8 space-y-6">
              <div>
                <label className="input-label">Campaign Designation <span className="text-red-400">*</span></label>
                <input className="input bg-slate-900/50 py-3 text-lg font-bold" required value={campaignForm?.name || ""} onChange={e => setCampaignForm({...campaignForm, name: e.target.value})} placeholder="e.g. VIP Phase 1 Dispatch" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="input-label">Target Audience <span className="text-red-400">*</span></label>
                  <select className="input select bg-slate-900/50 font-medium" value={campaignForm?.target || "all"} onChange={e => setCampaignForm({...campaignForm, target: e.target.value})}>
                    <option value="all">Global: All Valid Emails</option>
                    <option value="pending">Delta: Pending Emails Only</option>
                  </select>
                </div>

                <div>
                  <label className="input-label">Payload Template</label>
                  <select className="input select bg-slate-900/50 font-medium" value={campaignForm?.templateId || ""} onChange={e => setCampaignForm({...campaignForm, templateId: e.target.value})}>
                    <option value="">System Default Protocol</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="input-label">Scheduled Ignition (Optional)</label>
                <div className="flex gap-4 items-center">
                  <input className="input bg-slate-900/50 flex-1" type="datetime-local" value={campaignForm?.scheduledAt || ""} onChange={e => setCampaignForm({...campaignForm, scheduledAt: e.target.value})} />
                  {campaignForm?.scheduledAt && (
                    <button type="button" className="btn-icon" onClick={() => setCampaignForm({...campaignForm, scheduledAt: ""})} title="Clear schedule">
                      <X size={18} />
                    </button>
                  )}
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">Leave blank for immediate dispatch</p>
              </div>

              <div className="pt-6 border-t border-white/10">
                <button type="submit" className="btn btn-success w-full py-4 text-lg font-bold shadow-[0_0_30px_rgba(16,185,129,0.2)] rounded-xl" disabled={loading}>
                  {loading ? <><Loader2 size={24} className="animate-spin mr-2"/> Initializing Sequence...</> : <><PlayCircle size={24} className="mr-2" /> {campaignForm?.scheduledAt ? "Lock Schedule" : "Initiate Dispatch"}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'monitor' && (
        <div className="animate-fade-in">
          <div className="flex justify-end mb-6">
            <button className="btn btn-sm btn-secondary bg-slate-800 hover:bg-slate-700" onClick={fetchCampaigns}>
              <RefreshCw size={14} className="mr-2" /> Refresh Telemetry
            </button>
          </div>
          
          <div className="space-y-6">
            {campaigns.map(camp => {
              const total = camp.totalCount || 1;
              const sentPct = (camp.sentCount / total) * 100;
              const failPct = (camp.failedCount / total) * 100;
              const isRunning = camp.status === "RUNNING";
              const isFailed = camp.status === "FAILED";

              return (
                <div key={camp.id} className={`card-glass p-6 border-l-4 relative overflow-hidden transition-all duration-300 ${isRunning ? 'border-l-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/20' : isFailed ? 'border-l-red-500' : 'border-l-emerald-500'}`}>
                  
                  {isRunning && (
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl pointer-events-none rounded-full animate-pulse" />
                  )}

                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 relative z-10">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-white m-0">{camp.name}</h3>
                        <span className={`px-2.5 py-1 rounded-full text-[0.65rem] font-bold uppercase tracking-widest border ${isRunning ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : isFailed ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                          {isRunning && <span className="inline-block w-1.5 h-1.5 bg-indigo-400 rounded-full mr-1.5 animate-pulse" />}
                          {camp.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-400">
                        <span className="flex items-center gap-1.5"><Inbox size={14} /> Created: {new Date(camp.createdAt).toLocaleString()}</span>
                        {camp.scheduledAt && <span className="flex items-center gap-1.5 text-indigo-300"><PlayCircle size={14} /> Scheduled: {new Date(camp.scheduledAt).toLocaleString()}</span>}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 shrink-0">
                      <button className="btn btn-sm btn-primary shadow-lg shadow-indigo-500/20" onClick={() => setActiveConsoleId(camp.id)}>
                        <PlayCircle size={14} className="mr-1.5" /> Live Console
                      </button>
                      {camp.failedCount > 0 && (
                        <>
                          <button className="btn btn-sm btn-secondary bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20" onClick={() => viewFailures(camp)}>
                            <AlertCircle size={14} className="mr-1.5" /> Diagnostics
                          </button>
                          <button className="btn btn-sm btn-secondary bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20" onClick={() => retryCampaign(camp.id)}>
                            <RefreshCw size={14} className="mr-1.5" /> Retry {camp.failedCount} Failed
                          </button>
                        </>
                      )}
                      <button className="btn btn-sm btn-secondary" onClick={() => downloadReport(camp)} title="Download Report CSV">
                        <Download size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden flex mb-6 border border-white/5 shadow-inner">
                    <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-1000 ease-out relative" style={{ width: `${sentPct}%` }}>
                      {isRunning && <div className="absolute inset-0 bg-white/20 animate-pulse" />}
                    </div>
                    <div className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-1000 ease-out" style={{ width: `${failPct}%` }} />
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
                    {[
                      { label: 'Total', value: camp.totalCount, color: 'text-white', bg: 'bg-slate-800/50' },
                      { label: 'Sent', value: camp.sentCount, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border border-emerald-500/20' },
                      { label: 'Opened', value: camp.openedCount, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border border-indigo-500/20' },
                      { label: 'Failed', value: camp.failedCount, color: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/20' },
                      { label: 'Bounced', value: camp.bouncedCount, color: 'text-amber-400', bg: 'bg-amber-500/10 border border-amber-500/20' },
                      { label: 'Pending', value: camp.pendingCount, color: 'text-slate-400', bg: 'bg-slate-800/50' }
                    ].map((stat, i) => (
                      <div key={i} className={`rounded-xl p-4 text-center ${stat.bg}`}>
                        <div className={`text-2xl font-black mb-1 ${stat.color} tracking-tight`}>{stat.value}</div>
                        <div className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            
            {campaigns.length === 0 && (
              <EmptyState 
                icon={Send} 
                title="No Campaigns Found" 
                description="Initiate your first dispatch sequence from the Launch tab."
                actionLabel="Go to Launch"
                onAction={() => setActiveTab('builder')}
              />
            )}
          </div>
        </div>
      )}

      {/* Failure Diagnostics Modal */}
      {activeFailureModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="card-glass w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0 shadow-[0_0_50px_rgba(239,68,68,0.15)] border-red-500/30" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-900/80">
              <h3 className="font-bold text-lg flex items-center gap-2 text-red-400 m-0">
                <MailWarning size={20} /> Diagnostics: {activeFailureModal.name}
              </h3>
              <button className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-lg transition-colors" onClick={() => setActiveFailureModal(null)}>
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-black/20">
              <p className="text-slate-400 text-sm font-medium mb-6">
                System recorded {campaignFailures.length} transmission failures.
              </p>

              <div className="space-y-4">
                {campaignFailures.map((failure) => {
                  const cat = categorizeEmailError(failure.errorMessage);
                  const isWarning = cat.category === "Platform/Server Side";
                  return (
                    <div key={failure.id} className="bg-slate-900/80 border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <strong className="text-white block text-sm font-bold mb-0.5">{failure.attendee.name}</strong>
                          <span className="text-xs text-slate-400 font-medium font-mono">{failure.attendee.email}</span>
                        </div>
                        <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">{new Date(failure.updatedAt).toLocaleString()}</span>
                      </div>
                      
                      <div className="flex flex-col md:flex-row gap-4 mt-4 pt-4 border-t border-slate-700/50">
                        <div className={`shrink-0 w-full md:w-48 px-4 py-3 rounded-lg border ${isWarning ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                          <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${isWarning ? 'text-amber-400' : 'text-red-400'}`}>{cat.type}</p>
                          <p className="text-[0.65rem] text-slate-400 font-bold uppercase">{cat.category} Fault</p>
                        </div>
                        <div className="flex-1 bg-black/40 px-4 py-3 rounded-lg border border-white/5 overflow-x-auto">
                          <code className="text-xs text-red-300/80 font-mono whitespace-pre-wrap">{failure.errorMessage}</code>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {campaignFailures.length === 0 && (
                  <div className="py-12 text-center text-slate-500 border-2 border-dashed border-slate-700 rounded-2xl">
                    All systems nominal. No failures recorded.
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-white/10 bg-slate-900/80 flex justify-end gap-3">
              <button className="btn btn-secondary" onClick={() => setActiveFailureModal(null)}>Close Viewer</button>
              <button 
                className="btn btn-primary bg-red-500 hover:bg-red-600 border-red-500 hover:border-red-600 shadow-lg shadow-red-500/20"
                onClick={() => { retryCampaign(activeFailureModal.id); setActiveFailureModal(null); }}
              >
                <RefreshCw size={16} className="mr-2"/> Retry All Failed
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, templateId: null, isDeleting: false })}
        onConfirm={confirmDeleteTemplate}
        title="Delete Template"
        message="Are you sure you want to permanently delete this template? Active campaigns using this template will fallback to system defaults."
        isDeleting={deleteModal.isDeleting}
      />
    </div>
  );
}
