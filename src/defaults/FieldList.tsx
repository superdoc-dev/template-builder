import React from "react";
import type { FieldListProps } from "../types";

export const FieldList: React.FC<FieldListProps> = ({
  fields,
  onSelect,
  onDelete,
  selectedFieldId,
}) => {
  return (
    <div
      className="superdoc-field-list"
      style={{
        width: "250px",
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "16px",
      }}
    >
      <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "600" }}>
        Template Fields ({fields.length})
      </h3>

      {fields.length === 0 ? (
        <div
          style={{
            color: "#9ca3af",
            fontSize: "14px",
            textAlign: "center",
            padding: "20px 0",
          }}
        >
          No fields yet. Type {"{{"} to add a field.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {fields.map((field) => (
            <div
              key={field.id}
              onClick={() => onSelect(field)}
              style={{
                padding: "12px",
                background:
                  selectedFieldId === field.id ? "#eff6ff" : "#f9fafb",
                border:
                  selectedFieldId === field.id
                    ? "1px solid #3b82f6"
                    : "1px solid #e5e7eb",
                borderRadius: "6px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (selectedFieldId !== field.id) {
                  e.currentTarget.style.background = "#f3f4f6";
                }
              }}
              onMouseLeave={(e) => {
                if (selectedFieldId !== field.id) {
                  e.currentTarget.style.background = "#f9fafb";
                }
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: "500",
                      fontSize: "14px",
                      marginBottom: "4px",
                    }}
                  >
                    {field.alias}
                  </div>
                  {field.tag && (
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>
                      {field.tag}
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(field.id);
                  }}
                  style={{
                    padding: "4px 8px",
                    background: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "12px",
                    cursor: "pointer",
                    opacity: 0.8,
                    transition: "opacity 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "1";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "0.8";
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
