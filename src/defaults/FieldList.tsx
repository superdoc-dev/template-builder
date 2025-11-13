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
                position: "relative",
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
              title={field.alias}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(field.id);
                }}
                style={{
                  position: "absolute",
                  top: "8px",
                  right: "8px",
                  padding: "4px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#9ca3af",
                  transition: "color 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#ef4444";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#9ca3af";
                }}
                title="Delete field"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6 2V1.5C6 1.22386 6.22386 1 6.5 1H9.5C9.77614 1 10 1.22386 10 1.5V2M2 4H14M12.6667 4L12.1991 11.0129C12.129 12.065 12.0939 12.5911 11.8667 12.99C11.6666 13.3412 11.3648 13.6235 11.0011 13.7998C10.588 14 10.0607 14 9.00623 14H6.99377C5.93927 14 5.41202 14 4.99889 13.7998C4.63517 13.6235 4.33339 13.3412 4.13332 12.99C3.90607 12.5911 3.871 12.065 3.80086 11.0129L3.33333 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <div style={{ paddingRight: "24px" }}>
                <div
                  style={{
                    fontWeight: "500",
                    fontSize: "14px",
                    marginBottom:
                      field.alias && field.alias !== field.id ? "4px" : "0",
                  }}
                >
                  {field.id}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "12px",
                    color: "#4b5563",
                  }}
                >
                  {field.alias && field.alias !== field.id && (
                    <span>{field.alias}</span>
                  )}
                  {field.mode && (
                    <span
                      style={{
                        fontSize: "10px",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        background: field.mode === "block" ? "#dbeafe" : "#f3f4f6",
                        color: field.mode === "block" ? "#1e40af" : "#4b5563",
                        fontWeight: "500",
                      }}
                    >
                      {field.mode}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
