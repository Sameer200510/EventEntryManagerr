import React, { useState } from "react";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";
import { AlertTriangle } from "lucide-react";

export default function DataCleanup({ activeEventId, cleanupTarget, setCleanupTarget, onRefresh }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  if (!cleanupTarget) return null;

  const executeDelete = async () => {
    if (cleanupTarget.text !== "DELETE") {
      toast({ type: "error", message: "Please type DELETE to confirm." });
      return;
    }

    setLoading(true);
    try {
      if (cleanupTarget.type === "campaign") {
        await api.delete(`/campaigns/${cleanupTarget.id}`);
        toast({ type: "success", message: "Campaign deleted permanently." });
      } else if (cleanupTarget.type === "template") {
        await api.delete(`/campaigns/templates/${cleanupTarget.id}`);
        toast({ type: "success", message: "Template deleted permanently." });
      } else if (cleanupTarget.type === "dataset") {
        await api.delete(`/attendees/datasets/${cleanupTarget.id}`);
        toast({ type: "success", message: "Dataset deleted permanently." });
      } else if (cleanupTarget.type === "attendees") {
        await api.delete(`/attendees/clear?eventId=${activeEventId}`);
        toast({ type: "success", message: "All attendees cleared for this event." });
      }
      setCleanupTarget(null);
      if (onRefresh) onRefresh(cleanupTarget.type);
    } catch (err) {
      toast({ type: "error", message: err.response?.data?.error || "Failed to perform deletion." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setCleanupTarget(null)} style={{ 
      position: "fixed", 
      top: 0, 
      left: 0, 
      width: "100vw", 
      height: "100vh", 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center", 
      zIndex: 9999, 
      background: "rgba(0, 0, 0, 0.8)", 
      backdropFilter: "blur(5px)" 
    }}>
      <div className="modal-content animate-pop-in" style={{ 
        maxWidth: 400, 
        width: "100%",
        padding: "2rem", 
        background: "#09090b", 
        border: "1px solid #27272a", 
        borderRadius: "16px",
        boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}>
        <h3 style={{ marginTop: 0, color: "#fff", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.25rem", fontWeight: 500 }}>
          <AlertTriangle size={22} style={{ color: "#fff" }} strokeWidth={1.5} /> Confirm Deletion
        </h3>
        <p style={{ color: "#71717a", fontSize: "0.95rem", marginBottom: "2rem", lineHeight: "1.5" }}>
          Are you sure you want to delete <strong style={{ color: "#a1a1aa", fontWeight: 600 }}>{cleanupTarget.name}</strong>? This action is permanent and cannot be undone.
        </p>
        
        <div style={{ marginBottom: "2.5rem" }}>
          <label style={{ display: "block", color: "#52525b", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", marginBottom: "0.5rem", textTransform: "uppercase" }}>
            Type DELETE to confirm
          </label>
          <input 
            type="text"
            value={cleanupTarget.text || ""}
            onChange={(e) => setCleanupTarget({ ...cleanupTarget, text: e.target.value })}
            placeholder="DELETE"
            style={{
              width: "100%",
              background: "#18181b",
              border: "1px solid #27272a",
              color: "#fff",
              padding: "0.875rem 1rem",
              borderRadius: "12px",
              outline: "none",
              fontSize: "0.95rem",
              transition: "border 0.2s"
            }}
            onFocus={(e) => e.target.style.borderColor = "#3f3f46"}
            onBlur={(e) => e.target.style.borderColor = "#27272a"}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
          <button 
            onClick={() => setCleanupTarget(null)}
            style={{
              background: "#18181b",
              color: "#fff",
              border: "1px solid #27272a",
              padding: "0.75rem 1.5rem",
              borderRadius: "12px",
              fontSize: "0.95rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#27272a"}
            onMouseLeave={(e) => e.currentTarget.style.background = "#18181b"}
          >
            Cancel
          </button>
          <button 
            onClick={executeDelete} 
            disabled={cleanupTarget.text !== "DELETE" || loading}
            style={{
              background: "#000",
              color: "#fff",
              border: "1px solid #18181b",
              boxShadow: "0 0 15px rgba(255,255,255,0.03)",
              padding: "0.75rem 1.5rem",
              borderRadius: "12px",
              fontSize: "0.95rem",
              fontWeight: 600,
              cursor: (cleanupTarget.text !== "DELETE" || loading) ? "not-allowed" : "pointer",
              opacity: (cleanupTarget.text !== "DELETE" || loading) ? 0.5 : 1,
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              if (cleanupTarget.text === "DELETE" && !loading) {
                e.currentTarget.style.background = "#111";
              }
            }}
            onMouseLeave={(e) => {
              if (cleanupTarget.text === "DELETE" && !loading) {
                e.currentTarget.style.background = "#000";
              }
            }}
          >
            {loading ? "Deleting..." : "Delete Permanently"}
          </button>
        </div>
      </div>
    </div>
  );
}
