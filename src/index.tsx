import {
  useRef,
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import type { SuperDoc } from "superdoc";
import type * as Types from "./types";
import { FieldMenu, FieldList } from "./defaults";

export * from "./types";
export { FieldMenu, FieldList };

type Editor = NonNullable<SuperDoc["activeEditor"]>;

const SuperDocTemplateBuilder = forwardRef<
  Types.SuperDocTemplateBuilderHandle,
  Types.SuperDocTemplateBuilderProps
>((props, ref) => {
  const {
    document,
    fields = {},
    menu = {},
    list = {},
    onReady,
    onTrigger,
    onFieldInsert,
    onFieldUpdate,
    onFieldDelete,
    onFieldsChange,
    onFieldSelect,
    onFieldCreate,
    className,
    style,
    documentHeight = "600px",
  } = props;

  const [templateFields, setTemplateFields] = useState<Types.TemplateField[]>(
    fields.initial || [],
  );
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState<DOMRect | undefined>();

  const containerRef = useRef<HTMLDivElement>(null);
  const superdocRef = useRef<SuperDoc | null>(null);
  const triggerCleanupRef = useRef<(() => void) | null>(null);
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;

  const trigger = menu.trigger || "{{";

  // Field operations
  const insertFieldInternal = useCallback(
    (
      mode: "inline" | "block",
      field: Partial<Types.FieldDefinition> & { alias: string },
    ): boolean => {
      if (!superdocRef.current?.activeEditor) return false;

      const editor = superdocRef.current.activeEditor;
      const fieldId = `field_${Date.now()}`;

      const success =
        mode === "inline"
          ? editor.commands.insertStructuredContentInline?.({
            attrs: {
              id: fieldId,
              alias: field.alias,
              tag: field.metadata
                ? JSON.stringify(field.metadata)
                : field.category,
            },
            text: field.defaultValue || field.alias,
          })
          : editor.commands.insertStructuredContentBlock?.({
            attrs: {
              id: fieldId,
              alias: field.alias,
              tag: field.metadata
                ? JSON.stringify(field.metadata)
                : field.category,
            },
            text: field.defaultValue || field.alias,
          });

      if (success) {
        const newField: Types.TemplateField = {
          id: fieldId,
          alias: field.alias,
          tag: field.category,
        };

        setTemplateFields((prev) => {
          const updated = [...prev, newField];
          onFieldsChange?.(updated);
          return updated;
        });

        onFieldInsert?.(newField);
      }

      return success;
    },
    [onFieldInsert, onFieldsChange],
  );

  const updateField = useCallback(
    (id: string, updates: Partial<Types.TemplateField>): boolean => {
      if (!superdocRef.current?.activeEditor) return false;

      const editor = superdocRef.current.activeEditor;
      const success = editor.commands.updateStructuredContentById?.(id, {
        attrs: updates,
      });

      if (success) {
        setTemplateFields((prev) => {
          const updated = prev.map((f) =>
            f.id === id ? { ...f, ...updates } : f,
          );
          onFieldsChange?.(updated);
          const field = updated.find((f) => f.id === id);
          if (field) onFieldUpdate?.(field);
          return updated;
        });
      }

      return success;
    },
    [onFieldUpdate, onFieldsChange],
  );

  const deleteField = useCallback(
    (id: string): boolean => {
      if (!superdocRef.current?.activeEditor) return false;

      const editor = superdocRef.current.activeEditor;
      const success = editor.commands.deleteStructuredContentById?.(id);

      if (success) {
        setTemplateFields((prev) => {
          const updated = prev.filter((f) => f.id !== id);
          onFieldsChange?.(updated);
          return updated;
        });
        onFieldDelete?.(id);
      }

      return success;
    },
    [onFieldDelete, onFieldsChange],
  );

  const selectField = useCallback(
    (id: string) => {
      if (!superdocRef.current?.activeEditor) return;

      const editor = superdocRef.current.activeEditor;
      editor.commands.selectStructuredContentById?.(id);
      setSelectedFieldId(id);

      const field = templateFields.find((f) => f.id === id);
      if (field) onFieldSelect?.(field);
    },
    [templateFields, onFieldSelect],
  );

  const discoverFields = useCallback(
    (editor: Editor) => {
      if (!editor) return;

      const tags =
        editor.helpers.structuredContentCommands.getStructuredContentTags(
          editor.state,
        );

      const discovered: Types.TemplateField[] = tags
        .map(({ node }: any) => ({
          id: node.attrs.id,
          alias: node.attrs.alias || node.attrs.label || "",
          tag: node.attrs.tag,
        }))
        .filter((f: Types.TemplateField) => f.id);

      setTemplateFields(discovered);
      onFieldsChange?.(discovered);
    },
    [onFieldsChange],
  );

  // Initialize SuperDoc
  useEffect(() => {
    if (!containerRef.current) return;

    const initSuperDoc = async () => {
      const { SuperDoc } = await import("superdoc");

      const instance = new SuperDoc({
        selector: containerRef.current!,
        document: document?.source,
        documentMode: document?.mode || "editing",
        onReady: () => {
          if (instance.activeEditor) {
            const editor = instance.activeEditor;

            // Setup trigger detection
            editor.on("update", ({ editor: e }: any) => {
              const { state } = e;
              const { from } = state.selection;

              if (from >= trigger.length) {
                const text = state.doc.textBetween(from - trigger.length, from);
                if (text === trigger) {
                  const coords = e.view.coordsAtPos(from);
                  const bounds = new DOMRect(coords.left, coords.top, 0, 0);

                  const cleanup = () => {
                    const tr = e.state.tr.delete(from - trigger.length, from);
                    e.view.dispatch(tr);
                  };

                  triggerCleanupRef.current = cleanup;
                  setMenuPosition(bounds);
                  setMenuVisible(true);

                  onTrigger?.({
                    position: { from: from - trigger.length, to: from },
                    bounds,
                    cleanup,
                  });
                }
              }
            });

            // Track field changes
            editor.on("update", () => {
              discoverFields(editor);
            });

            discoverFields(editor);
          }

          onReady?.();
        },
      });

      superdocRef.current = instance;
    };

    initSuperDoc();

    return () => {
      if (superdocRef.current) {
        if (typeof superdocRef.current.destroy === "function") {
          superdocRef.current.destroy();
        }
        superdocRef.current = null;
      }
    };
  }, [
    document?.source,
    document?.mode,
    trigger,
    discoverFields,
    onReady,
    onTrigger,
  ]);

  const handleMenuSelect = useCallback(
    async (field: Types.FieldDefinition) => {
      if (triggerCleanupRef.current) {
        triggerCleanupRef.current();
        triggerCleanupRef.current = null;
      }

      if (field.id.startsWith("custom_") && onFieldCreate) {
        try {
          const createdField = await onFieldCreate(field);

          if (createdField) {
            insertFieldInternal("inline", {
              alias: createdField.label,
              category: createdField.category,
              metadata: createdField.metadata,
              defaultValue: createdField.defaultValue,
            });
            setMenuVisible(false);
            return;
          }
        } catch (error) {
          console.error("Field creation failed:", error);
        }
      }

      insertFieldInternal("inline", {
        alias: field.label,
        category: field.category,
        metadata: field.metadata,
        defaultValue: field.defaultValue,
      });
      setMenuVisible(false);
    },
    [insertFieldInternal, onFieldCreate],
  );

  const handleMenuClose = useCallback(() => {
    setMenuVisible(false);
    if (triggerCleanupRef.current) {
      triggerCleanupRef.current();
      triggerCleanupRef.current = null;
    }
  }, []);

  // Navigation methods
  const nextField = useCallback(() => {
    if (!superdocRef.current?.activeEditor || templateFields.length === 0)
      return;

    const currentIndex = templateFields.findIndex(
      (f) => f.id === selectedFieldId,
    );
    const nextIndex =
      currentIndex >= 0 ? (currentIndex + 1) % templateFields.length : 0;
    selectField(templateFields[nextIndex].id);
  }, [templateFields, selectedFieldId, selectField]);

  const previousField = useCallback(() => {
    if (!superdocRef.current?.activeEditor || templateFields.length === 0)
      return;

    const currentIndex = templateFields.findIndex(
      (f) => f.id === selectedFieldId,
    );
    const prevIndex =
      currentIndex > 0 ? currentIndex - 1 : templateFields.length - 1;
    selectField(templateFields[prevIndex].id);
  }, [templateFields, selectedFieldId, selectField]);

  const exportTemplate = useCallback(() => {
    return {
      fields: templateFields,
      document: superdocRef.current?.activeEditor?.exportDocx(),
    };
  }, [templateFields]);

  // Imperative handle
  useImperativeHandle(ref, () => ({
    insertField: (field) => insertFieldInternal("inline", field),
    insertBlockField: (field) => insertFieldInternal("block", field),
    updateField,
    deleteField,
    selectField,
    nextField,
    previousField,
    getFields: () => templateFields,
    exportTemplate,
  }));

  // Components
  const MenuComponent = menu.component || FieldMenu;
  const ListComponent = list.component || FieldList;

  return (
    <div
      className={`superdoc-template-builder ${className || ""}`}
      style={style}
    >
      <div style={{ display: "flex", gap: "20px" }}>
        {/* Field List (if left) */}
        {list.position === "left" && (
          <div className="superdoc-template-builder-sidebar">
            <ListComponent
              fields={templateFields}
              onSelect={(field) => selectField(field.id)}
              onDelete={deleteField}
              selectedFieldId={selectedFieldId || undefined}
            />
          </div>
        )}

        {/* Document */}
        <div className="superdoc-template-builder-document" style={{ flex: 1 }}>
          <div
            ref={containerRef}
            className="superdoc-template-builder-editor"
            style={{ height: documentHeight }}
            data-testid="template-builder-editor"
          />
        </div>

        {/* Field List (if right) */}
        {list.position === "right" && (
          <div className="superdoc-template-builder-sidebar">
            <ListComponent
              fields={templateFields}
              onSelect={(field) => selectField(field.id)}
              onDelete={deleteField}
              selectedFieldId={selectedFieldId || undefined}
            />
          </div>
        )}
      </div>

      {/* Field Menu */}
      <MenuComponent
        isVisible={menuVisible}
        position={menuPosition}
        availableFields={fields.available || []}
        allowCreate={fields.allowCreate || false}
        onSelect={handleMenuSelect}
        onClose={handleMenuClose}
        onCreateField={onFieldCreate}
      />
    </div>
  );
});

SuperDocTemplateBuilder.displayName = "SuperDocTemplateBuilder";

export default SuperDocTemplateBuilder;
