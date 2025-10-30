import { useCallback, useEffect, useMemo, useState } from "react";
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

  const fieldsToDisplay = filteredFields ?? availableFields;
  const hasFilter = Boolean(filterQuery);

  const groupedFields = useMemo(() => {
    const groups: { category: string; fields: FieldDefinition[] }[] = [];
    const categoryIndex = new Map<string, number>();

    fieldsToDisplay.forEach((field) => {
      const categoryName = field.category?.trim() || "Uncategorized";
      const existingIndex = categoryIndex.get(categoryName);

      if (existingIndex !== undefined) {
        groups[existingIndex].fields.push(field);
        return;
      }

      categoryIndex.set(categoryName, groups.length);
      groups.push({ category: categoryName, fields: [field] });
    });

    return groups;
  }, [fieldsToDisplay]);

  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    setExpandedCategories((previous) => {
      if (groupedFields.length === 0) {
        return Object.keys(previous).length === 0 ? previous : {};
      }

      const next: Record<string, boolean> = {};
      let hasChanges = Object.keys(previous).length !== groupedFields.length;

      groupedFields.forEach(({ category }, index) => {
        // Auto-expand all categories when filtering is active
        const target = hasFilter ? true : (previous[category] ?? index === 0);
        next[category] = target;
        if (!hasChanges && previous[category] !== target) {
          hasChanges = true;
        }
      });

      return hasChanges ? next : previous;
    });
  }, [groupedFields, hasFilter]);

  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories((previous) => ({
      ...previous,
      [category]: !previous[category],
    }));
  }, []);

  if (!isVisible) return null;

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
      {hasFilter && (
        <div
          style={{
            padding: "8px 16px",
            borderBottom: "1px solid #f0f0f0",
            marginBottom: "4px",
          }}
        >
          <div style={{ fontSize: "12px", color: "#6b7280" }}>
            Filtering results for
            <span
              style={{ fontWeight: 600, color: "#111827", marginLeft: "4px" }}
            >
              {filterQuery}
            </span>
          </div>
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

      {allowCreate && availableFields.length > 0 && (
        <div
          style={{
            borderTop: "1px solid #eee",
            margin: "4px 0",
          }}
        />
      )}

      {groupedFields.length === 0 ? (
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
      ) : (
        groupedFields.map(({ category, fields }, index) => {
          const isExpanded = Boolean(expandedCategories[category]);
          const itemsMaxHeight = `${Math.max(fields.length * 40, 0)}px`;

          return (
            <div
              key={category}
              style={{
                borderTop:
                  index === 0 && allowCreate ? undefined : "1px solid #f0f0f0",
              }}
            >
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 16px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 500,
                  textAlign: "left",
                }}
              >
                <span>
                  {category} ({fields.length})
                </span>
                <span
                  aria-hidden
                  style={{
                    display: "inline-block",
                    width: "8px",
                    height: "8px",
                    borderRight: "2px solid #666",
                    borderBottom: "2px solid #666",
                    transform: isExpanded ? "rotate(45deg)" : "rotate(-45deg)",
                    transition: "transform 0.2s ease",
                    marginLeft: "12px",
                  }}
                />
              </button>
              <div
                data-category={category}
                aria-hidden={!isExpanded}
                style={{
                  overflow: "hidden",
                  maxHeight: isExpanded ? itemsMaxHeight : "0px",
                  opacity: isExpanded ? 1 : 0,
                  transition: "max-height 0.2s ease, opacity 0.2s ease",
                  pointerEvents: isExpanded ? "auto" : "none",
                }}
              >
                <div style={{ padding: isExpanded ? "4px 0" : 0 }}>
                  {fields.map((field) => (
                    <div
                      key={field.id}
                      className="field-menu-item"
                      onClick={() => onSelect(field)}
                      style={{
                        padding: "8px 16px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ fontWeight: 500 }}>{field.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })
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
