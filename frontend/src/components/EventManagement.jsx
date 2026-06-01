import React, { useState, useEffect } from "react";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";
import { Calendar, MapPin, Image as ImageIcon, Clock, Plus, Trash2, Edit2, PlayCircle } from "lucide-react";

export default function EventManagement({ activeEventId, setActiveEventId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "Farewell",
    date: "",
    venue: "",
    bannerImage: "",
    description: "",
    entryTiming: "",
    exitTiming: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await api.get("/events");
      setEvents(res.data);
    } catch (err) {
      toast({ type: "error", message: "Failed to fetch events." });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (formData.id) {
        await api.put(`/events/${formData.id}`, formData);
        toast({ type: "success", message: "Event updated." });
      } else {
        await api.post("/events", formData);
        toast({ type: "success", message: "Event created." });
      }
      setIsCreating(false);
      setFormData({ name: "", type: "Farewell", date: "", venue: "", bannerImage: "", description: "", entryTiming: "", exitTiming: "" });
      fetchEvents();
    } catch (err) {
      toast({ type: "error", message: "Failed to save event." });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this event? This will orphan data!")) return;
    try {
      await api.delete(`/events/${id}`);
      toast({ type: "success", message: "Event deleted." });
      fetchEvents();
    } catch (err) {
      toast({ type: "error", message: "Failed to delete event." });
    }
  };

  const handleActivate = async (id) => {
    try {
      await api.post(`/events/${id}/activate`);
      setActiveEventId(id);
      toast({ type: "success", message: "Event activated." });
      fetchEvents();
    } catch (err) {
      toast({ type: "error", message: "Failed to activate event." });
    }
  };

  return (
    <div style={{ padding: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h2>Event Management</h2>
        <button className="btn btn-primary" onClick={() => setIsCreating(true)}>
          <Plus size={16} /> New Event
        </button>
      </div>

      {isCreating && (
        <div className="card animate-pop-in" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
          <h3>{formData.id ? "Edit Event" : "Create New Event"}</h3>
          <form onSubmit={handleSave} style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr" }}>
            <div>
              <label className="input-label">Event Name</label>
              <input className="input" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div>
              <label className="input-label">Event Type</label>
              <select className="input select" required value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                <option value="Farewell">Farewell</option>
                <option value="Fresher Party">Fresher Party</option>
                <option value="Alumni Meet">Alumni Meet</option>
                <option value="Conference">Conference</option>
                <option value="Workshop">Workshop</option>
                <option value="Seminar">Seminar</option>
                <option value="Fest">Fest</option>
                <option value="Hackathon">Hackathon</option>
                <option value="Cultural Event">Cultural Event</option>
                <option value="Sports Event">Sports Event</option>
                <option value="Custom Event">Custom Event</option>
              </select>
            </div>
            <div>
              <label className="input-label">Date</label>
              <input className="input" type="date" required value={formData.date ? formData.date.split('T')[0] : ''} onChange={e => setFormData({ ...formData, date: e.target.value })} />
            </div>
            <div>
              <label className="input-label">Venue</label>
              <input className="input" value={formData.venue} onChange={e => setFormData({ ...formData, venue: e.target.value })} />
            </div>
            <div>
              <label className="input-label">Entry Timing</label>
              <input className="input" value={formData.entryTiming} onChange={e => setFormData({ ...formData, entryTiming: e.target.value })} />
            </div>
            <div>
              <label className="input-label">Exit Timing</label>
              <input className="input" value={formData.exitTiming} onChange={e => setFormData({ ...formData, exitTiming: e.target.value })} />
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <label className="input-label">Banner Image (URL / Base64)</label>
              <input className="input" value={formData.bannerImage} onChange={e => setFormData({ ...formData, bannerImage: e.target.value })} />
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <label className="input-label">Description</label>
              <textarea className="input" rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
            </div>
            <div style={{ gridColumn: "span 2", display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-secondary" onClick={() => { setIsCreating(false); setFormData({}); }}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Saving..." : "Save Event"}</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
        {events.map(ev => (
          <div key={ev.id} className="card" style={{ padding: "1.25rem", border: ev.isActive ? "2px solid var(--brand)" : "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <h3 style={{ margin: 0 }}>{ev.name}</h3>
              {ev.isActive && <span className="badge badge-green">Global Active</span>}
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", margin: "0.25rem 0 1rem" }}>{ev.type}</p>
            <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
              <Calendar size={14} /> {new Date(ev.date).toLocaleDateString()}
            </div>
            <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              <MapPin size={14} /> {ev.venue || "TBD"}
            </div>
            <div style={{ display: "flex", gap: "0.5rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
              <button className="btn-icon" title="Edit" onClick={() => { setFormData(ev); setIsCreating(true); }}><Edit2 size={16} /></button>
              <button className="btn-icon" title="Delete" onClick={() => handleDelete(ev.id)}><Trash2 size={16} color="var(--red)" /></button>
              {!ev.isActive && <button className="btn-icon" style={{ marginLeft: "auto", color: "var(--brand)" }} onClick={() => handleActivate(ev.id)}><PlayCircle size={16} /> Set Global Active</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
