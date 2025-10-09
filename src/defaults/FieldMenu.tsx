import React from "react";
import type { FieldMenuProps } from "../types";

export const FieldMenu: React.FC<FieldMenuProps> = ({
  isVisible,
  position,
  availableFields,
  onSelect,
  onClose,
}) => {
  if (!isVisible) return null;

  return (
    <div
      className="superdoc-field-menu"
      style={{
        position: "fixed",
        left: position?.left || "50%",
        top: position?.top || "50%",
        transform: position ? "translate(0, 10px)" : "translate(-50%, -50%)",
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
        padding: "8px",
        zIndex: 9999,
        minWidth: "200px",
        maxHeight: "300px",
        overflow: "auto",
      }}
    >
      <div
        style={{
          marginBottom: "8px",
          padding: "4px 8px",
          fontSize: "12px",
          color: "#6b7280",
        }}
      >
        Insert Field
      </div>

      {availableFields.length === 0 ? (
        <div style={{ padding: "8px", color: "#9ca3af", fontSize: "14px" }}>
          No fields available
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {availableFields.map((field) => (
            <button
              key={field.id}
              onClick={() => onSelect(field)}
              style={{
                padding: "8px 12px",
                textAlign: "left",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: "14px",
                borderRadius: "4px",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f3f4f6";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <div style={{ fontWeight: "500" }}>{field.label}</div>
              {field.category && (
                <div
                  style={{
                    fontSize: "12px",
                    color: "#6b7280",
                    marginTop: "2px",
                  }}
                >
                  {field.category}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      <div
        style={{
          borderTop: "1px solid #e5e7eb",
          marginTop: "8px",
          paddingTop: "8px",
        }}
      >
        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: "6px 12px",
            background: "#f3f4f6",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
