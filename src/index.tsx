import { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import type { SuperDoc } from 'superdoc';
import type * as Types from './types';
import { FieldMenu, FieldList } from './defaults';

export * from './types';
export { FieldMenu, FieldList };

// Icon for "Convert to field" context menu item
const fieldIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor" width="12" height="12"><path d="M0 80V229.5c0 17 6.7 33.3 18.7 45.3l176 176c25 25 65.5 25 90.5 0L418.7 317.3c25-25 25-65.5 0-90.5l-176-176c-12-12-28.3-18.7-45.3-18.7H48C21.5 32 0 53.5 0 80zm112 32a32 32 0 1 1 0 64 32 32 0 1 1 0-64z"/></svg>`;

type Editor = NonNullable<SuperDoc['activeEditor']>;

const getTemplateFieldsFromEditor = (editor: Editor): Types.TemplateField[] => {
  const structuredContentHelpers = (editor.helpers as any)?.structuredContentCommands;

  if (!structuredContentHelpers?.getStructuredContentTags) {
    return [];
  }

  const tags = structuredContentHelpers.getStructuredContentTags(editor.state) || [];

  return tags.map((entry: any) => {
    const node = entry?.node ?? entry;
    const attrs = node?.attrs ?? {};
    const nodeType = node?.type?.name || '';
    const mode = nodeType.includes('Block') ? 'block' : 'inline';

    return {
      id: attrs.id,
      alias: attrs.alias || attrs.label || '',
      tag: attrs.tag,
      mode,
      group: structuredContentHelpers.getGroup?.(attrs.tag) ?? undefined,
    } as Types.TemplateField;
  });
};

const areTemplateFieldsEqual = (a: Types.TemplateField[], b: Types.TemplateField[]): boolean => {
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
      left.position !== right.position ||
      left.mode !== right.mode ||
      left.group !== right.group
    ) {
      return false;
    }
  }

  return true;
};

const resolveToolbar = (toolbar: Types.SuperDocTemplateBuilderProps['toolbar']) => {
  if (!toolbar) return null;

  if (toolbar === true) {
    return {
      selector: '#superdoc-toolbar',
      config: {} as Omit<Types.ToolbarConfig, 'selector'>,
      renderDefaultContainer: true,
    };
  }

  if (typeof toolbar === 'string') {
    return {
      selector: toolbar,
      config: {} as Omit<Types.ToolbarConfig, 'selector'>,
      renderDefaultContainer: false,
    };
  }

  const { selector, ...config } = toolbar;
  return {
    selector: selector || '#superdoc-toolbar',
    config,
    renderDefaultContainer: selector === undefined,
  };
};

const MENU_VIEWPORT_PADDING = 10;
const MENU_APPROX_WIDTH = 250;
const MENU_APPROX_HEIGHT = 300;

const clampToViewport = (rect: DOMRect): DOMRect => {
  const maxLeft = window.innerWidth - MENU_APPROX_WIDTH - MENU_VIEWPORT_PADDING;
  const maxTop = window.innerHeight - MENU_APPROX_HEIGHT - MENU_VIEWPORT_PADDING;

  const clampedLeft = Math.min(rect.left, maxLeft);
  const clampedTop = Math.min(rect.top, maxTop);

  return new DOMRect(
    Math.max(clampedLeft, MENU_VIEWPORT_PADDING),
    Math.max(clampedTop, MENU_VIEWPORT_PADDING),
    rect.width,
    rect.height,
  );
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
    onExport,
    className,
    style,
    documentHeight = '600px',
  } = props;

  const [templateFields, setTemplateFields] = useState<Types.TemplateField[]>(fields.initial || []);
  const [selectedFieldId, setSelectedFieldId] = useState<string | number | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState<DOMRect | undefined>();
  const [menuQuery, setMenuQuery] = useState<string>('');
  const [menuFilteredFields, setMenuFilteredFields] = useState<Types.FieldDefinition[]>(
    () => fields.available || [],
  );
  const [convertToFieldState, setConvertToFieldState] = useState<{
    selectedText: string;
    from: number;
    to: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const superdocRef = useRef<SuperDoc | null>(null);
  const triggerCleanupRef = useRef<(() => void) | null>(null);
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;
  const handleConvertToFieldRef = useRef<((text: string, from: number, to: number) => void) | null>(
    null,
  );
  // Store last selection for "Convert to field" feature (context menu collapses selection)
  const lastSelectionRef = useRef<{ text: string; from: number; to: number } | null>(null);

  const menuTriggerFromRef = useRef<number | null>(null);
  const menuVisibleRef = useRef(menuVisible);
  useEffect(() => {
    menuVisibleRef.current = menuVisible;
  }, [menuVisible]);

  const trigger = menu.trigger || '{{';

  const availableFields = fieldsRef.current.available || [];

  const computeFilteredFields = useCallback(
    (query: string) => {
      const normalized = query.trim().toLowerCase();
      if (!normalized) return availableFields;

      return availableFields.filter((field) => {
        const label = field.label.toLowerCase();
        return label.includes(normalized);
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
    updateMenuFilter('');
  }, [updateMenuFilter]);

  const handleConvertToField = useCallback(
    (selectedText: string, from: number, to: number) => {
      const editor = superdocRef.current?.activeEditor;
      if (editor) {
        const coords = (editor as any).view.coordsAtPos(from);
        const bounds = clampToViewport(new DOMRect(coords.left, coords.top, 0, 0));
        setMenuPosition(bounds);
      }

      setConvertToFieldState({ selectedText, from, to });
      setMenuVisible(true);
      resetMenuFilter();
    },
    [resetMenuFilter],
  );

  // Keep ref updated for use in modules config
  handleConvertToFieldRef.current = handleConvertToField;

  const insertFieldInternal = useCallback(
    (
      mode: 'inline' | 'block',
      field: Partial<Types.FieldDefinition> & { alias: string },
    ): boolean => {
      if (!superdocRef.current?.activeEditor) return false;

      const editor = superdocRef.current.activeEditor;
      const previousFields = templateFields;

      const success =
        mode === 'inline'
          ? editor.commands.insertStructuredContentInline?.({
              attrs: {
                alias: field.alias,
                tag: field.metadata ? JSON.stringify(field.metadata) : undefined,
              },
              text: field.defaultValue || field.alias,
            })
          : editor.commands.insertStructuredContentBlock?.({
              attrs: {
                alias: field.alias,
                tag: field.metadata ? JSON.stringify(field.metadata) : undefined,
              },
              text: field.defaultValue || field.alias,
            });

      if (success) {
        const updatedFields = getTemplateFieldsFromEditor(editor);

        setTemplateFields(updatedFields);
        onFieldsChange?.(updatedFields);

        const insertedField = updatedFields.find(
          (candidate) => !previousFields.some((existing) => existing.id === candidate.id),
        );

        if (insertedField) {
          onFieldInsert?.(insertedField);
        }
      }

      return success;
    },
    [onFieldInsert, onFieldsChange, templateFields],
  );

  const updateField = useCallback(
    (id: string | number, updates: Partial<Types.TemplateField>): boolean => {
      if (!superdocRef.current?.activeEditor) return false;

      const editor = superdocRef.current.activeEditor;
      const success = editor.commands.updateStructuredContentById?.(id, {
        attrs: updates,
      });

      if (success) {
        setTemplateFields((prev) => {
          const updated = prev.map((f) => (f.id === id ? { ...f, ...updates } : f));
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
    (id: string | number): boolean => {
      const editor = superdocRef.current?.activeEditor;

      if (!editor) {
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
        }

        return removed;
      }

      const fieldToDelete = templateFields.find((f) => f.id === id);
      const groupId = fieldToDelete?.group;

      let commandResult = false;
      try {
        commandResult = editor.commands.deleteStructuredContentById?.(id) ?? false;
      } catch {
        commandResult = false;
      }

      let documentFields = getTemplateFieldsFromEditor(editor);
      const fieldStillPresent = documentFields.some((field) => field.id === id);

      if (!commandResult && fieldStillPresent) {
        documentFields = documentFields.filter((field) => field.id !== id);
      }

      if (groupId) {
        const remainingFieldsInGroup = documentFields.filter((field) => field.group === groupId);

        if (remainingFieldsInGroup.length === 1) {
          const lastField = remainingFieldsInGroup[0];
          editor.commands.updateStructuredContentById?.(lastField.id, {
            attrs: { tag: undefined },
          });
          documentFields = getTemplateFieldsFromEditor(editor);
        }
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

      return commandResult || removedFromState;
    },
    [onFieldDelete, onFieldsChange, templateFields],
  );

  const selectField = useCallback(
    (id: string | number) => {
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

  useEffect(() => {
    if (!containerRef.current) return;

    const initSuperDoc = async () => {
      const { SuperDoc } = await import('superdoc');

      const modules: Record<string, unknown> = {
        comments: false,
        slashMenu: {
          items: [
            {
              id: 'template-builder',
              items: [
                {
                  id: 'convert-to-field',
                  label: 'Convert to field',
                  icon: fieldIcon,
                  showWhen: (context: any) => {
                    // Show when right-click and we have a stored selection
                    return context.trigger === 'click' && lastSelectionRef.current !== null;
                  },
                  action: () => {
                    // Use the stored selection (context selection is collapsed by right-click)
                    const sel = lastSelectionRef.current;
                    if (sel) {
                      handleConvertToFieldRef.current?.(sel.text, sel.from, sel.to);
                    }
                  },
                },
              ],
            },
          ],
          includeDefaultItems: true,
        },
        ...(toolbarSettings && {
          toolbar: {
            selector: toolbarSettings.selector,
            toolbarGroups: toolbarSettings.config.toolbarGroups || ['center'],
            excludeItems: toolbarSettings.config.excludeItems || [],
            ...toolbarSettings.config,
          },
        }),
      };

      const handleReady = () => {
        if (instance.activeEditor) {
          const editor = instance.activeEditor;

          editor.on('update', ({ editor: e }: any) => {
            discoverFields(editor);

            const { state } = e;
            const { from } = state.selection;

            if (from >= trigger.length) {
              const triggerStart = from - trigger.length;
              const text = state.doc.textBetween(triggerStart, from);

              if (text === trigger) {
                const coords = e.view.coordsAtPos(from);
                const bounds = clampToViewport(new DOMRect(coords.left, coords.top, 0, 0));

                const cleanup = () => {
                  const editor = superdocRef.current?.activeEditor;
                  if (!editor) return;
                  const currentPos = editor.state.selection.from;
                  const tr = editor.state.tr.delete(triggerStart, currentPos);
                  (editor as any).view.dispatch(tr);
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

            if (!menuVisibleRef.current) return;

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

            const queryText = state.doc.textBetween(menuTriggerFromRef.current, from);
            updateMenuFilter(queryText);

            const coords = e.view.coordsAtPos(from);
            const bounds = clampToViewport(new DOMRect(coords.left, coords.top, 0, 0));
            setMenuPosition(bounds);
          });

          // Track selection changes for "Convert to field" feature
          editor.on('selectionUpdate', ({ editor: e }: { editor: Editor }) => {
            const { state } = e;
            const { from, to, empty } = state.selection;
            if (!empty) {
              const text = state.doc.textBetween(from, to);
              if (text) {
                lastSelectionRef.current = { text, from, to };
              }
            } else {
              lastSelectionRef.current = null;
            }
          });

          discoverFields(editor);
        }

        onReady?.();
      };

      const instance = new SuperDoc({
        selector: containerRef.current!,
        document: document?.source,
        documentMode: document?.mode || 'editing',
        modules,
        toolbar: toolbarSettings?.selector,
        onReady: handleReady,
      });

      superdocRef.current = instance;
    };

    initSuperDoc();

    return () => {
      triggerCleanupRef.current = null;
      menuTriggerFromRef.current = null;

      const instance = superdocRef.current;

      if (instance && typeof instance.destroy === 'function') {
        instance.destroy();
      }

      superdocRef.current = null;
    };
  }, [document?.source, document?.mode, trigger, discoverFields, onReady, onTrigger, toolbar]);

  const handleMenuSelect = useCallback(
    async (field: Types.FieldDefinition) => {
      // Handle "convert to field" flow (inline only)
      if (convertToFieldState) {
        const { selectedText, from, to } = convertToFieldState;
        const editor = superdocRef.current?.activeEditor;

        if (editor) {
          // Delete the selected text first
          const tr = editor.state.tr.delete(from, to);
          (editor.view as any).dispatch(tr);

          const previousFields = templateFields;
          const success = editor.commands.insertStructuredContentInline?.({
            attrs: {
              alias: field.label,
              tag: field.metadata ? JSON.stringify(field.metadata) : undefined,
            },
            text: selectedText,
            preserveMarks: true,
          });

          if (success) {
            const updatedFields = getTemplateFieldsFromEditor(editor);
            setTemplateFields(updatedFields);
            onFieldsChange?.(updatedFields);

            const insertedField = updatedFields.find(
              (candidate) => !previousFields.some((existing) => existing.id === candidate.id),
            );
            if (insertedField) {
              onFieldInsert?.(insertedField);
            }
          }
        }

        setConvertToFieldState(null);
        lastSelectionRef.current = null;
        setMenuVisible(false);
        return;
      }

      // Standard trigger-based flow
      if (triggerCleanupRef.current) {
        triggerCleanupRef.current();
        triggerCleanupRef.current = null;
      }
      menuTriggerFromRef.current = null;
      resetMenuFilter();

      const mode = (field.metadata?.mode as 'inline' | 'block') || 'inline';

      if (field.id.startsWith('custom_') && onFieldCreate) {
        const createdField = await onFieldCreate(field);

        if (createdField) {
          const createdMode = (createdField.metadata?.mode as 'inline' | 'block') || mode;
          insertFieldInternal(createdMode, {
            alias: createdField.label,
            metadata: createdField.metadata,
            defaultValue: createdField.defaultValue,
          });
          setMenuVisible(false);
          return;
        }
      }

      insertFieldInternal(mode, {
        alias: field.label,
        metadata: field.metadata,
        defaultValue: field.defaultValue,
      });
      setMenuVisible(false);
    },
    [
      insertFieldInternal,
      onFieldCreate,
      resetMenuFilter,
      convertToFieldState,
      templateFields,
      onFieldsChange,
      onFieldInsert,
    ],
  );

  const handleSelectExisting = useCallback(
    (field: Types.TemplateField) => {
      const editor = superdocRef.current?.activeEditor;
      if (!editor) return;

      // Store selected text before clearing state (for convert flow)
      const textContent = convertToFieldState?.selectedText || field.alias;
      const isConvertFlow = !!convertToFieldState;

      // Handle "convert to field" flow - delete selected text first
      if (convertToFieldState) {
        const { from, to } = convertToFieldState;
        const tr = editor.state.tr.delete(from, to);
        (editor as any).view.dispatch(tr);
        setConvertToFieldState(null);
        lastSelectionRef.current = null;
      }

      // Standard trigger-based cleanup
      if (triggerCleanupRef.current) {
        triggerCleanupRef.current();
        triggerCleanupRef.current = null;
      }
      menuTriggerFromRef.current = null;
      resetMenuFilter();

      const structuredContentHelpers = (editor.helpers as any)?.structuredContentCommands;

      if (!structuredContentHelpers) return;

      const groupId =
        field.group || `group-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

      const tagWithGroup = structuredContentHelpers.createTagObject?.({
        group: groupId,
      });

      // Convert flow is always inline; standard flow respects existing field's mode
      const mode = isConvertFlow ? 'inline' : field.mode || 'inline';

      const success =
        mode === 'inline'
          ? editor.commands.insertStructuredContentInline?.({
              attrs: { alias: field.alias, tag: tagWithGroup },
              text: textContent,
              preserveMarks: isConvertFlow,
            })
          : editor.commands.insertStructuredContentBlock?.({
              attrs: { alias: field.alias, tag: tagWithGroup },
            });

      if (success) {
        if (!field.group && !isConvertFlow) {
          updateField(field.id, { tag: tagWithGroup });
        }

        setMenuVisible(false);

        const updatedFields = getTemplateFieldsFromEditor(editor);
        setTemplateFields(updatedFields);
        onFieldsChange?.(updatedFields);
      }
    },
    [updateField, resetMenuFilter, onFieldsChange, convertToFieldState],
  );

  const handleMenuClose = useCallback(() => {
    setMenuVisible(false);
    setConvertToFieldState(null);
    lastSelectionRef.current = null;
    menuTriggerFromRef.current = null;
    resetMenuFilter();
    if (triggerCleanupRef.current) {
      triggerCleanupRef.current();
      triggerCleanupRef.current = null;
    }
  }, [resetMenuFilter]);

  const nextField = useCallback(() => {
    if (!superdocRef.current?.activeEditor || templateFields.length === 0) return;

    const currentIndex = templateFields.findIndex((f) => f.id === selectedFieldId);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % templateFields.length : 0;
    selectField(templateFields[nextIndex].id);
  }, [templateFields, selectedFieldId, selectField]);

  const previousField = useCallback(() => {
    if (!superdocRef.current?.activeEditor || templateFields.length === 0) return;

    const currentIndex = templateFields.findIndex((f) => f.id === selectedFieldId);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : templateFields.length - 1;
    selectField(templateFields[prevIndex].id);
  }, [templateFields, selectedFieldId, selectField]);

  const exportTemplate = useCallback(
    async (config?: Types.ExportConfig): Promise<void | Blob> => {
      const { fileName = 'document', triggerDownload = true } = config || {};

      const result = await superdocRef.current?.export({
        exportType: ['docx'],
        exportedName: fileName,
        triggerDownload,
      });

      const editor = superdocRef.current?.activeEditor;
      if (editor) {
        const fields = getTemplateFieldsFromEditor(editor);
        const blob = triggerDownload ? undefined : (result as Blob);
        onExport?.({ fields, blob, fileName });
      }

      return result;
    },
    [onExport],
  );

  useImperativeHandle(ref, () => ({
    insertField: (field) => insertFieldInternal('inline', field),
    insertBlockField: (field) => insertFieldInternal('block', field),
    updateField,
    deleteField,
    selectField,
    nextField,
    previousField,
    getFields: () => templateFields,
    exportTemplate,
    getSuperDoc: () => superdocRef.current,
  }));

  const MenuComponent = menu.component || FieldMenu;
  const ListComponent = list.component || FieldList;

  const toolbarSettings = resolveToolbar(toolbar);

  return (
    <div className={`superdoc-template-builder ${className || ''}`} style={style}>
      <div style={{ display: 'flex', gap: '20px' }}>
        {list.position === 'left' && (
          <div className="superdoc-template-builder-sidebar">
            <ListComponent
              fields={templateFields}
              onSelect={(field) => selectField(field.id)}
              onDelete={deleteField}
              onUpdate={(field) => updateField(field.id, field)}
              selectedFieldId={selectedFieldId || undefined}
            />
          </div>
        )}

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

        {list.position === 'right' && (
          <div className="superdoc-template-builder-sidebar">
            <ListComponent
              fields={templateFields}
              onSelect={(field) => selectField(field.id)}
              onDelete={deleteField}
              onUpdate={(field) => updateField(field.id, field)}
              selectedFieldId={selectedFieldId || undefined}
            />
          </div>
        )}
      </div>

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
        existingFields={templateFields}
        onSelectExisting={handleSelectExisting}
      />
    </div>
  );
});

SuperDocTemplateBuilder.displayName = 'SuperDocTemplateBuilder';

export default SuperDocTemplateBuilder;
