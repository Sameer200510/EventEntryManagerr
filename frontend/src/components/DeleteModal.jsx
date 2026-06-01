import React from "react";
import { AlertTriangle, X } from "lucide-react";

export default function DeleteModal({ isOpen, onClose, onConfirm, title, message, isDeleting, confirmText = "Delete", confirmColor = "var(--red)" }) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        animation: "fadeIn 0.2s ease-out",
      }}
      onClick={onClose}
    >
      <div
        className="card animate-pop-in"
        style={{
          width: "90%",
          maxWidth: "400px",
          padding: "2rem",
          background: "var(--surface)",
          border: `1px solid ${confirmColor}`,
          boxShadow: "0 25px 50px -12px rgba(220, 38, 38, 0.25)",
          position: "relative",
          textAlign: "center",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            background: "transparent",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            padding: "0.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--text-primary)";
            e.currentTarget.style.background = "var(--surface-2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-muted)";
            e.currentTarget.style.background = "transparent";
          }}
        >
          <X size={20} />
        </button>

        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: "var(--surface-2)",
            color: confirmColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.5rem",
          }}
        >
          <AlertTriangle size={32} />
        </div>

        <h3
          style={{
            margin: "0 0 0.5rem",
            fontSize: "1.25rem",
            fontWeight: 700,
            color: "var(--text-primary)",
          }}
        >
          {title}
        </h3>
        <p
          style={{
            margin: "0 0 2rem",
            color: "var(--text-secondary)",
            fontSize: "0.95rem",
            lineHeight: 1.5,
          }}
        >
          {message}
        </p>

        <div
          style={{
            display: "flex",
            gap: "1rem",
            justifyContent: "center",
          }}
        >
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ flex: 1 }}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="btn btn-primary"
            style={{
              flex: 1,
              background: confirmColor,
              borderColor: confirmColor,
              color: "#fff",
            }}
            disabled={isDeleting}
          >
            {isDeleting ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
