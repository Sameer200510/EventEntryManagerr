import React, { useState, useEffect } from "react";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";
import { Calendar, MapPin, Image as ImageIcon, Clock, Plus, Trash2, Edit2, PlayCircle, ArrowUp, ArrowDown, ChevronRight, CheckCircle2, ListFilter, Users, ScanLine, X } from "lucide-react";
import DeleteModal from "./DeleteModal";
import { EmptyState } from "./ui/EmptyState";

export default function EventManagement({ activeEventId, setActiveEventId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState(1); // Wizard step
  const [formData, setFormData] = useState({
    name: "", type: "Farewell", date: "", venue: "", bannerImage: "", description: "", entryTiming: "", exitTiming: "", isSequential: false
  });
  const [checkpoints, setCheckpoints] = useState([]);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, eventId: null, isDeleting: false });
  const { toast } = useToast();

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async () => {
    try {
      const res = await api.get("/events");
      setEvents(res.data);
    } catch (err) { toast({ type: "error", message: "Failed to fetch events." }); }
  };

  const handleEdit = async (ev) => {
    try {
      const res = await api.get(`/events/${ev.id}`);
      setFormData(res.data);
      setCheckpoints(res.data.checkpoints || []);
      setStep(1);
      setIsCreating(true);
    } catch (e) { toast({ type: "error", message: "Failed to fetch event details." }); }
  };

  const addCheckpoint = () => setCheckpoints([...checkpoints, { name: "", isActive: true, order: checkpoints.length, _isNew: true }]);
  
  const updateCheckpoint = (index, field, value) => {
    const cps = [...checkpoints];
    cps[index][field] = value;
    setCheckpoints(cps);
  };
  
  const removeCheckpoint = (index) => {
    const cps = [...checkpoints];
    if (cps[index].id) cps[index]._isDeleted = true;
    else cps.splice(index, 1);
    setCheckpoints(cps);
  };
  
  const moveCheckpoint = (index, direction) => {
    if (direction === -1 && index === 0) return;
    if (direction === 1 && index === checkpoints.length - 1) return;
    const cps = [...checkpoints];
    const temp = cps[index];
    cps[index] = cps[index + direction];
    cps[index + direction] = temp;
    cps.forEach((c, i) => c.order = i);
    setCheckpoints(cps);
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...formData };
      let savedEventId = null;
      if (formData.id) {
        await api.put(`/events/${formData.id}`, payload);
        savedEventId = formData.id;
        toast({ type: "success", message: "Event updated successfully." });
      } else {
        payload.checkpoints = checkpoints.filter(c => !c._isDeleted);
        const res = await api.post("/events", payload);
        savedEventId = res.data.id;
        toast({ type: "success", message: "Event created successfully." });
      }
      
      if (formData.id) {
         await api.post(`/checkpoints/event/${formData.id}/batch`, { checkpoints });
      }
      
      closeWizard();
      fetchEvents();
    } catch (err) { toast({ type: "error", message: "Failed to save event." }); } 
    finally { setLoading(false); }
  };

  const closeWizard = () => {
    setIsCreating(false);
    setStep(1);
    setFormData({ name: "", type: "Farewell", date: "", venue: "", bannerImage: "", description: "", entryTiming: "", exitTiming: "", isSequential: false });
    setCheckpoints([]);
  };

  const confirmDelete = async () => {
    setDeleteModal(prev => ({ ...prev, isDeleting: true }));
    try {
      await api.delete(`/events/${deleteModal.eventId}`);
      toast({ type: "success", message: "Event deleted." });
      fetchEvents();
    } catch (err) { toast({ type: "error", message: "Failed to delete event." }); }
    finally { setDeleteModal({ isOpen: false, eventId: null, isDeleting: false }); }
  };

  const handleActivate = async (id) => {
    try {
      await api.post(`/events/${id}/activate`);
      setActiveEventId(id);
      toast({ type: "success", message: "Event activated." });
      fetchEvents();
    } catch (err) { toast({ type: "error", message: "Failed to activate event." }); }
  };

  const activeCheckpointsCount = checkpoints.filter(c => !c._isDeleted).length;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight mb-1">Event Hub</h2>
          <p className="text-slate-400 text-sm font-medium">Manage and monitor all your events globally.</p>
        </div>
        <button 
          className="btn btn-primary shadow-lg shadow-indigo-500/20" 
          onClick={() => { setFormData({ name: "", type: "Farewell", date: "", venue: "", bannerImage: "", description: "", entryTiming: "", exitTiming: "", isSequential: false }); setCheckpoints([]); setStep(1); setIsCreating(true); }}
        >
          <Plus size={18} className="mr-2"/> Create Event
        </button>
      </div>

      {isCreating ? (
        <div className="card-glass p-0 overflow-hidden mb-8 animate-slide-up border border-indigo-500/30 shadow-[0_0_50px_rgba(99,102,241,0.1)]">
          
          {/* Wizard Header */}
          <div className="bg-slate-900/50 border-b border-white/10 px-8 py-5 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              {formData.id ? <><Edit2 size={18} className="text-indigo-400"/> Edit Event Configuration</> : <><Plus size={18} className="text-indigo-400"/> New Event Setup</>}
            </h3>
            <button onClick={closeWizard} className="text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-lg">
              <X size={18}/>
            </button>
          </div>

          {/* Wizard Progress */}
          <div className="flex items-center px-8 py-4 bg-slate-900/30 border-b border-white/5">
            {[
              { num: 1, label: 'Basic Info' },
              { num: 2, label: 'Checkpoints' },
              { num: 3, label: 'Review' }
            ].map((s, i) => (
              <div key={s.num} className="flex items-center">
                <div className={`flex items-center gap-2 ${step >= s.num ? 'text-indigo-400' : 'text-slate-500'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === s.num ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' : step > s.num ? 'bg-indigo-500/20' : 'bg-slate-800'}`}>
                    {step > s.num ? <CheckCircle2 size={14}/> : s.num}
                  </div>
                  <span className="text-sm font-semibold">{s.label}</span>
                </div>
                {i < 2 && <div className={`w-12 h-px mx-4 ${step > s.num ? 'bg-indigo-500/50' : 'bg-slate-700'}`} />}
              </div>
            ))}
          </div>

          {/* Wizard Body */}
          <div className="p-8">
            {step === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                <div>
                  <label className="input-label">Event Name <span className="text-red-400">*</span></label>
                  <input className="input" placeholder="e.g. Annual Tech Summit" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                  <label className="input-label">Event Type <span className="text-red-400">*</span></label>
                  <select className="input select" required value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                    <option value="Conference">Conference</option><option value="Hackathon">Hackathon</option>
                    <option value="Farewell">Farewell</option><option value="Fresher Party">Fresher Party</option>
                    <option value="Alumni Meet">Alumni Meet</option><option value="Workshop">Workshop</option>
                    <option value="Seminar">Seminar</option><option value="Fest">Fest</option>
                    <option value="Cultural Event">Cultural Event</option><option value="Sports Event">Sports Event</option>
                    <option value="Custom Event">Custom Event</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Date <span className="text-red-400">*</span></label>
                  <input className="input" type="date" required value={formData.date ? formData.date.split('T')[0] : ''} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                </div>
                <div>
                  <label className="input-label">Venue</label>
                  <input className="input" placeholder="e.g. Main Auditorium" value={formData.venue} onChange={e => setFormData({ ...formData, venue: e.target.value })} />
                </div>
                <div>
                  <label className="input-label">Entry Timing</label>
                  <input className="input" type="time" value={formData.entryTiming} onChange={e => setFormData({ ...formData, entryTiming: e.target.value })} />
                </div>
                <div>
                  <label className="input-label">Exit Timing</label>
                  <input className="input" type="time" value={formData.exitTiming} onChange={e => setFormData({ ...formData, exitTiming: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <label className="input-label">Banner Image URL</label>
                  <div className="relative">
                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18}/>
                    <input className="input pl-10" placeholder="https://..." value={formData.bannerImage} onChange={e => setFormData({ ...formData, bannerImage: e.target.value })} />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="input-label">Description</label>
                  <textarea className="input resize-none" placeholder="Event overview..." rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="animate-fade-in">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h4 className="text-lg font-bold text-white mb-1">Workflow Checkpoints</h4>
                    <p className="text-sm text-slate-400">Define the physical or logical stops for attendees.</p>
                  </div>
                  <button type="button" className="btn btn-secondary shadow-lg shadow-white/5" onClick={addCheckpoint}>
                    <Plus size={16} className="mr-2"/> Add Checkpoint
                  </button>
                </div>

                <label className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-indigo-500/10 border border-indigo-500/20 cursor-pointer hover:bg-indigo-500/20 transition-colors">
                  <div className="relative flex items-center">
                    <input type="checkbox" className="peer sr-only" checked={formData.isSequential || false} onChange={e => setFormData({...formData, isSequential: e.target.checked})} />
                    <div className="w-10 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white block">Enforce Sequential Validation</span>
                    <span className="text-xs text-indigo-200">Attendees must scan checkpoints in the exact order below.</span>
                  </div>
                </label>

                {activeCheckpointsCount === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/20">
                    <MapPin size={32} className="mx-auto text-slate-500 mb-3" />
                    <p className="text-slate-400 font-medium">No checkpoints configured.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {checkpoints.map((cp, idx) => {
                      if (cp._isDeleted) return null;
                      return (
                        <div key={idx} className="flex items-center gap-4 bg-slate-900/50 p-3 rounded-xl border border-white/10 shadow-lg group hover:border-indigo-500/30 transition-colors">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-slate-400 shrink-0">
                            {cp.order + 1}
                          </div>
                          <div className="flex-1">
                            <input className="bg-transparent border-none text-white font-semibold focus:outline-none w-full" placeholder="e.g. Registration Desk" value={cp.name} onChange={e => updateCheckpoint(idx, 'name', e.target.value)} required />
                          </div>
                          
                          <label className="flex items-center gap-2 text-sm font-medium text-slate-300 cursor-pointer">
                            <input type="checkbox" className="rounded border-slate-600 text-indigo-500 focus:ring-indigo-500 bg-slate-800" checked={cp.isActive} onChange={e => updateCheckpoint(idx, 'isActive', e.target.checked)} />
                            Active
                          </label>

                          <div className="flex items-center gap-1 border-l border-white/10 pl-4 ml-2">
                            <button type="button" className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed" onClick={() => moveCheckpoint(idx, -1)} disabled={idx === 0}><ArrowUp size={16} /></button>
                            <button type="button" className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed" onClick={() => moveCheckpoint(idx, 1)} disabled={idx === checkpoints.length - 1}><ArrowDown size={16} /></button>
                            <button type="button" className="p-1.5 text-red-400 hover:text-white hover:bg-red-500 rounded-lg transition-colors ml-2" onClick={() => removeCheckpoint(idx)}><Trash2 size={16} /></button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="animate-fade-in">
                <div className="bg-slate-900 rounded-xl p-6 border border-white/10">
                  <h4 className="text-lg font-bold text-white mb-6 border-b border-white/10 pb-4">Ready to Publish</h4>
                  
                  <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                    <div><span className="text-slate-500 block mb-1">Event Name</span><strong className="text-white text-base">{formData.name || 'Untitled'}</strong></div>
                    <div><span className="text-slate-500 block mb-1">Type</span><strong className="text-indigo-400">{formData.type}</strong></div>
                    <div><span className="text-slate-500 block mb-1">Date</span><strong className="text-white">{formData.date || 'TBD'}</strong></div>
                    <div><span className="text-slate-500 block mb-1">Venue</span><strong className="text-white">{formData.venue || 'TBD'}</strong></div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-white/10">
                    <span className="text-slate-500 block mb-3 text-sm">Workflow Strategy</span>
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-bold border border-white/5">
                        {activeCheckpointsCount} Checkpoints
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-bold border ${formData.isSequential ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-400 border-white/5'}`}>
                        {formData.isSequential ? 'Sequential Mode' : 'Free Roam Mode'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Wizard Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => step > 1 ? setStep(step - 1) : closeWizard()}
              >
                {step === 1 ? 'Cancel' : 'Back'}
              </button>
              
              {step < 3 ? (
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={() => {
                    if (step === 1 && !formData.name) return toast({ type: 'error', message: 'Event Name is required' });
                    setStep(step + 1);
                  }}
                >
                  Continue <ChevronRight size={16} className="ml-1"/>
                </button>
              ) : (
                <button 
                  type="button" 
                  className="btn btn-success shadow-lg shadow-emerald-500/20" 
                  onClick={handleSave} 
                  disabled={loading}
                >
                  {loading ? 'Publishing...' : 'Publish Event'} <CheckCircle2 size={16} className="ml-2"/>
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {!isCreating && events.length === 0 ? (
        <EmptyState 
          icon={Calendar} 
          title="No Events Found" 
          description="You haven't created any events yet. Get started by setting up your first event workflow."
          actionLabel="Create First Event"
          onAction={() => { setFormData({ name: "", type: "Farewell", date: "", venue: "", bannerImage: "", description: "", entryTiming: "", exitTiming: "", isSequential: false }); setCheckpoints([]); setStep(1); setIsCreating(true); }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {events.map(ev => (
            <div key={ev.id} className={`card-glass p-0 overflow-hidden group transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${ev.isActive ? 'border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/20' : 'border-white/5 hover:border-white/20'}`}>
              
              <div className="h-24 bg-gradient-to-r from-slate-900 to-slate-800 relative">
                {ev.bannerImage && <img src={ev.bannerImage} alt="Banner" className="w-full h-full object-cover opacity-40 mix-blend-overlay" />}
                <div className="absolute top-4 right-4 flex gap-2">
                  {ev.isActive && (
                    <span className="px-2.5 py-1 rounded-full bg-indigo-500 text-white text-[0.65rem] font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/30 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Live
                    </span>
                  )}
                  <span className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-slate-300 text-[0.65rem] font-bold uppercase tracking-widest border border-white/10">
                    {ev.type}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-4 line-clamp-1 group-hover:text-indigo-300 transition-colors">{ev.name}</h3>
                
                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-3 text-sm text-slate-400 font-medium">
                    <Calendar size={16} className="text-slate-500" /> {new Date(ev.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-400 font-medium line-clamp-1">
                    <MapPin size={16} className="text-slate-500 shrink-0" /> {ev.venue || "Venue TBD"}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-400 font-medium">
                    <ListFilter size={16} className="text-slate-500" /> {ev.checkpoints ? ev.checkpoints.length : 0} Checkpoints
                  </div>
                </div>

                <div className="flex items-center justify-between pt-5 border-t border-slate-700/50">
                  <div className="flex items-center gap-2">
                    <button className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-all flex items-center justify-center" title="Edit Event" onClick={() => handleEdit(ev)}>
                      <Edit2 size={16} />
                    </button>
                    <button className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all flex items-center justify-center" title="Delete Event" onClick={() => setDeleteModal({ isOpen: true, eventId: ev.id, isDeleting: false })}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  {!ev.isActive && (
                    <button className="btn btn-sm btn-primary py-2 shadow-lg shadow-indigo-500/20" onClick={() => handleActivate(ev.id)}>
                      <PlayCircle size={16} className="mr-1.5"/> Set Active
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, eventId: null, isDeleting: false })}
        onConfirm={confirmDelete}
        title="Delete Event"
        message="Are you sure you want to delete this event? This action will permanently orphan all related attendees and datasets."
        isDeleting={deleteModal.isDeleting}
      />
    </div>
  );
}
