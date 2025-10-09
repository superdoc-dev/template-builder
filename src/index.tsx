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

const getTemplateFieldsFromEditor = (
  editor: Editor,
): Types.TemplateField[] => {
  const structuredContentHelpers =
    (editor.helpers as any)?.structuredContentCommands;

  if (!structuredContentHelpers?.getStructuredContentTags) {
    return [];
  }

  const tags =
    structuredContentHelpers.getStructuredContentTags(editor.state) || [];

  return tags
    .map((entry: any) => {
      const node = entry?.node ?? entry;
      const attrs = node?.attrs ?? {};

      return {
        id: attrs.id,
        alias: attrs.alias || attrs.label || "",
        tag: attrs.tag,
      } as Types.TemplateField;
    })
    .filter((field: Types.TemplateField) => Boolean(field.id));
};

const areTemplateFieldsEqual = (
  a: Types.TemplateField[],
  b: Types.TemplateField[],
): boolean => {
  if (a === b) return true;
  if (a.length !== b.length) return false;

  for (let index = 0; index < a.length; index += 1) {
    const left = a[index];
    const right = b[index];

    if (!right) return false;

    if (
      left.id !== right.id ||
      left.alias !== right.alias ||
      left.tag !== right.tag ||
      left.position !== right.position
    ) {
      return false;
    }
  }

  return true;
};

const resolveToolbar = (
  toolbar: Types.SuperDocTemplateBuilderProps["toolbar"],
) => {
  if (!toolbar) return null;

  if (toolbar === true) {
    return {
      selector: "#superdoc-toolbar",
      config: {} as Omit<Types.ToolbarConfig, "selector">,
      renderDefaultContainer: true,
    };
  }

  if (typeof toolbar === "string") {
    return {
      selector: toolbar,
      config: {} as Omit<Types.ToolbarConfig, "selector">,
      renderDefaultContainer: false,
    };
  }

  const { selector, ...config } = toolbar;
  return {
    selector: selector || "#superdoc-toolbar",
    config,
    renderDefaultContainer: selector === undefined,
  };
};

const SuperDocTemplateBuilder = forwardRef<
  Types.SuperDocTemplateBuilderHandle,
  Types.SuperDocTemplateBuilderProps
>((props, ref) => {
  const {
    document,
    fields = {},
    menu = {},
    list = {},
    toolbar,
    onReady,
    onTrigger,
    onFieldInsert,
    onFieldUpdate,
    onFieldDelete,
    onFieldsChange,
    onFieldSelect,
    onFieldCreate,
    onError,
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
  const [menuQuery, setMenuQuery] = useState<string>("");
  const [menuFilteredFields, setMenuFilteredFields] = useState<
    Types.FieldDefinition[]
  >(() => fields.available || []);

  const containerRef = useRef<HTMLDivElement>(null);
  const superdocRef = useRef<SuperDoc | null>(null);
  const triggerCleanupRef = useRef<(() => void) | null>(null);
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;

  const menuTriggerFromRef = useRef<number | null>(null);
  const menuVisibleRef = useRef(menuVisible);
  useEffect(() => {
    menuVisibleRef.current = menuVisible;
  }, [menuVisible]);

  const trigger = menu.trigger || "{{";

  const availableFields = fieldsRef.current.available || [];

  const reportError = useCallback(
    (
      error: unknown,
      operation: string,
      level: "error" | "warn" = "error",
    ) => {
      const normalized =
        error instanceof Error
          ? error
          : new Error(typeof error === "string" ? error : String(error));

      if (onError) {
        onError(normalized, operation);
      } else if (level === "error") {
        console.error(
          `[SuperDocTemplateBuilder] ${operation} error:`,
          normalized,
        );
      } else {
        console.warn(
          `[SuperDocTemplateBuilder] ${operation} warning:`,
          normalized,
        );
      }

      return normalized;
    },
    [onError],
  );

  const computeFilteredFields = useCallback(
    (query: string) => {
      const normalized = query.trim().toLowerCase();
      if (!normalized) return availableFields;

      return availableFields.filter((field) => {
        const label = field.label.toLowerCase();
        const category = field.category?.toLowerCase() || "";
        return label.includes(normalized) || category.includes(normalized);
      });
    },
    [availableFields],
  );

  const updateMenuFilter = useCallback(
    (query: string) => {
      setMenuQuery(query);
      setMenuFilteredFields(computeFilteredFields(query));
    },
    [computeFilteredFields],
  );

  const resetMenuFilter = useCallback(() => {
    updateMenuFilter("");
  }, [updateMenuFilter]);

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
      const editor = superdocRef.current?.activeEditor;

      if (!editor) {
        console.warn(
          "[SuperDocTemplateBuilder] deleteField called without active editor",
        );

        let removed = false;
        setTemplateFields((prev) => {
          if (!prev.some((field) => field.id === id)) return prev;

          const updated = prev.filter((field) => field.id !== id);
          removed = true;
          onFieldsChange?.(updated);
          return updated;
        });

        if (removed) {
          onFieldDelete?.(id);
          setSelectedFieldId((current) => (current === id ? null : current));
          return true;
        }

        reportError(
          new Error(`Failed to delete field without active editor: ${id}`),
          "deleteField",
          "warn",
        );

        return false;
      }

      let commandResult = false;

      try {
        commandResult =
          editor.commands.deleteStructuredContentById?.(id) ?? false;
      } catch (error) {
        throw reportError(error, "deleteField");
      }

      let documentFields = getTemplateFieldsFromEditor(editor);

      const fieldStillPresent = documentFields.some((field) => field.id === id);

      if (!commandResult && fieldStillPresent) {
        documentFields = documentFields.filter((field) => field.id !== id);
      }

      let removedFromState = false;

      setTemplateFields((prev) => {
        if (areTemplateFieldsEqual(prev, documentFields)) {
          return prev;
        }

        const prevHadField = prev.some((field) => field.id === id);
        const nextHasField = documentFields.some((field) => field.id === id);

        if (prevHadField && !nextHasField) {
          removedFromState = true;
        }

        onFieldsChange?.(documentFields);
        return documentFields;
      });

      if (removedFromState) {
        onFieldDelete?.(id);
        setSelectedFieldId((current) => (current === id ? null : current));
      }

      const success = commandResult || removedFromState;

      if (!success) {
        reportError(
          new Error(`Failed to delete field: ${id}`),
          "deleteField",
          "warn",
        );
      }

      return success;
    },
    [onFieldDelete, onFieldsChange, reportError],
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

      const discovered = getTemplateFieldsFromEditor(editor);

      setTemplateFields((prev) => {
        if (areTemplateFieldsEqual(prev, discovered)) {
          return prev;
        }

        onFieldsChange?.(discovered);
        return discovered;
      });
    },
    [onFieldsChange],
  );

  // Initialize SuperDoc
  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;

    const initSuperDoc = async () => {
      try {
        const { SuperDoc } = await import("superdoc");

        const config: Record<string, unknown> = {
          selector: containerRef.current!,
          document: document?.source,
          documentMode: document?.mode || "editing",
          onReady: () => {
            if (!instance.activeEditor) {
              onReady?.();
              return;
            }

            const editor = instance.activeEditor;

            // Setup trigger detection
            editor.on("update", ({ editor: e }: any) => {
              const { state } = e;
              const { from } = state.selection;

              if (from >= trigger.length) {
                const triggerStart = from - trigger.length;
                const text = state.doc.textBetween(triggerStart, from);

                if (text === trigger) {
                  const coords = e.view.coordsAtPos(from);
                  const bounds = new DOMRect(coords.left, coords.top, 0, 0);

                  const cleanup = () => {
                    const editor = superdocRef.current?.activeEditor;
                    if (!editor) return;
                    const currentPos = editor.state.selection.from;
                    const tr = editor.state.tr.delete(triggerStart, currentPos);
                    editor.view.dispatch(tr);
                  };

                  triggerCleanupRef.current = cleanup;
                  menuTriggerFromRef.current = from;
                  setMenuPosition(bounds);
                  setMenuVisible(true);
                  resetMenuFilter();

                  onTrigger?.({
                    position: { from: triggerStart, to: from },
                    bounds,
                    cleanup,
                  });

                  return;
                }
              }

              if (!menuVisibleRef.current) {
                return;
              }

              if (menuTriggerFromRef.current == null) {
                setMenuVisible(false);
                resetMenuFilter();
                return;
              }

              if (from < menuTriggerFromRef.current) {
                setMenuVisible(false);
                menuTriggerFromRef.current = null;
                resetMenuFilter();
                return;
              }

              const queryText = state.doc.textBetween(
                menuTriggerFromRef.current,
                from,
              );
              updateMenuFilter(queryText);

              const coords = e.view.coordsAtPos(from);
              const bounds = new DOMRect(coords.left, coords.top, 0, 0);
              setMenuPosition(bounds);
            });

            // Track field changes
            editor.on("update", () => {
              discoverFields(editor);
            });

            discoverFields(editor);

            onReady?.();
          },
        };

        const instance = new SuperDoc({
          ...config,
          ...(toolbarSettings && {
            toolbar: toolbarSettings.selector,
            modules: {
              toolbar: {
                selector: toolbarSettings.selector,
                toolbarGroups:
                  toolbarSettings.config.toolbarGroups || ["center"],
                excludeItems: toolbarSettings.config.excludeItems || [],
                ...toolbarSettings.config,
              },
            },
          }),
        });

        if (cancelled) {
          if (typeof instance.destroy === "function") {
            instance.destroy();
          }
          return;
        }

        superdocRef.current = instance;
      } catch (error) {
        reportError(error, "initSuperDoc");
      }
    };

    initSuperDoc();

    return () => {
      cancelled = true;
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
    toolbar,
    reportError,
  ]);

  const handleMenuSelect = useCallback(
    async (field: Types.FieldDefinition) => {
      if (triggerCleanupRef.current) {
        triggerCleanupRef.current();
        triggerCleanupRef.current = null;
      }
      menuTriggerFromRef.current = null;
      resetMenuFilter();

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
          reportError(error, "onFieldCreate", "warn");
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
    [insertFieldInternal, onFieldCreate, reportError, resetMenuFilter],
  );

  const handleMenuClose = useCallback(() => {
    setMenuVisible(false);
    menuTriggerFromRef.current = null;
    resetMenuFilter();
    if (triggerCleanupRef.current) {
      triggerCleanupRef.current();
      triggerCleanupRef.current = null;
    }
  }, [resetMenuFilter]);

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

  const exportTemplate = useCallback(
    async (options?: { fileName?: string }): Promise<void> => {
      if (!superdocRef.current) {
        throw reportError(
          new Error("Cannot export template without SuperDoc instance"),
          "exportTemplate",
        );
      }

      const result = await superdocRef.current.export({
        exportType: ["docx"],
        exportedName: options?.fileName ? options?.fileName : "document",
      });

      if (!result) {
        throw reportError(
          new Error("Export failed: no data returned"),
          "exportTemplate",
        );
      }
    },
    [reportError],
  );

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

  const toolbarSettings = resolveToolbar(toolbar);

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
          {toolbarSettings?.renderDefaultContainer && (
            <div
              id="superdoc-toolbar"
              className="superdoc-template-builder-toolbar"
              data-testid="template-builder-toolbar"
            />
          )}
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
        filteredFields={menuFilteredFields}
        filterQuery={menuQuery}
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
