import { useEffect, useMemo, useState } from "react";
import type { FieldDefinition, FieldMenuProps } from "../types";

export const FieldMenu: React.FC<FieldMenuProps> = ({
  isVisible,
  position,
  availableFields,
  filteredFields,
  filterQuery,
  allowCreate,
  onSelect,
  onClose,
  onCreateField,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");

  useEffect(() => {
    if (!isVisible) {
      setIsCreating(false);
      setNewFieldName("");
    }
  }, [isVisible]);

  const menuStyle = useMemo(() => {
    return {
      position: "absolute" as const,
      left: position?.left,
      top: position?.top,
      zIndex: 1000,
      background: "white",
      border: "1px solid #ddd",
      borderRadius: "4px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      padding: "8px 0",
      minWidth: "200px",
    };
  }, [position]);

  if (!isVisible) return null;

  const visibleFields = filteredFields ?? availableFields;
  const hasFilter = Boolean(filterQuery);
  const hasVisibleFields = visibleFields.length > 0;

  const handleCreateField = async () => {
    const trimmedName = newFieldName.trim();
    if (!trimmedName) return;

    const newField: FieldDefinition = {
      id: `custom_${Date.now()}`,
      label: trimmedName,
      category: "Custom",
    };

    try {
      if (onCreateField) {
        const result = await onCreateField(newField);
        void onSelect(result || newField);
      } else {
        void onSelect(newField);
      }
    } finally {
      setIsCreating(false);
      setNewFieldName("");
    }
  };

  return (
    <div className="superdoc-field-menu" style={menuStyle}>
      <div
        style={{
          padding: "0 16px 8px 16px",
          borderBottom: "1px solid #f3f4f6",
          marginBottom: "8px",
        }}
      >
        <div
          style={{
            fontSize: "12px",
            color: "#6b7280",
            textTransform: "uppercase",
          }}
        >
          Insert Field
        </div>
        {hasFilter && (
          <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
            Filtering results for
            <span
              style={{ fontWeight: 600, color: "#111827", marginLeft: "4px" }}
            >
              {filterQuery}
            </span>
          </div>
        )}
      </div>

      {hasVisibleFields ? (
        visibleFields.map((field) => (
          <div
            key={field.id}
            className="field-menu-item"
            onClick={() => onSelect(field)}
            style={{
              padding: "8px 16px",
              cursor: "pointer",
            }}
          >
            <span style={{ fontWeight: 500 }}>{field.label}</span>
            {field.category && (
              <span
                style={{
                  fontSize: "0.85em",
                  color: "#666",
                  marginLeft: "8px",
                }}
              >
                {field.category}
              </span>
            )}
          </div>
        ))
      ) : (
        <div
          style={{
            padding: "16px",
            fontSize: "13px",
            color: "#6b7280",
            textAlign: "center",
          }}
        >
          No matching fields
        </div>
      )}

      {allowCreate && !isCreating && (
        <div
          className="field-menu-item"
          onClick={() => setIsCreating(true)}
          style={{
            padding: "8px 16px",
            cursor: "pointer",
            color: "#0066cc",
            fontWeight: 500,
          }}
        >
          + Create New Field
        </div>
      )}

      {allowCreate && isCreating && (
        <div style={{ padding: "8px 16px" }}>
          <input
            type="text"
            value={newFieldName}
            placeholder="Field name..."
            onChange={(event) => setNewFieldName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleCreateField();
              if (event.key === "Escape") {
                setIsCreating(false);
                setNewFieldName("");
              }
            }}
            autoFocus
            style={{
              width: "100%",
              padding: "4px 8px",
              border: "1px solid #ddd",
              borderRadius: "3px",
            }}
          />
          <div
            style={{
              marginTop: "8px",
              display: "flex",
              gap: "8px",
            }}
          >
            <button
              onClick={handleCreateField}
              disabled={!newFieldName.trim()}
              style={{
                padding: "4px 12px",
                background: newFieldName.trim() ? "#0066cc" : "#ccc",
                color: "white",
                border: "none",
                borderRadius: "3px",
                cursor: newFieldName.trim() ? "pointer" : "not-allowed",
              }}
            >
              Create
            </button>
            <button
              onClick={() => {
                setIsCreating(false);
                setNewFieldName("");
              }}
              style={{
                padding: "4px 12px",
                background: "white",
                border: "1px solid #ddd",
                borderRadius: "3px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          borderTop: "1px solid #eee",
          marginTop: "4px",
        }}
      >
        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: "6px 16px",
            background: "#f3f4f6",
            border: "none",
            borderRadius: "0 0 4px 4px",
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
};
