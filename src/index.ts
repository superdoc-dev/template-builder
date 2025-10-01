type SuperDocInstance = any;
type EditorInstance = any;

export interface SuperDocTemplateBuilderConfig {
  superdoc: SuperDocInstance;
  onReady?: () => void;
  onTrigger?: (event: { position: any; cleanup: () => void }) => void;
  onFieldsChanged?: (fields: any[]) => void;
}

export default class SuperDocTemplateBuilder {
  private superdoc: SuperDocInstance;
  private editor: EditorInstance | null = null;
  private config: SuperDocTemplateBuilderConfig;

  constructor(config: SuperDocTemplateBuilderConfig) {
    this.config = config;
    this.superdoc = config.superdoc;
    this.init();
  }

  private init(): void {
    // Wait for editor
    if (this.superdoc.activeEditor) {
      this.setupEditor(this.superdoc.activeEditor);
    } else {
      this.superdoc.on('editorCreate', ({ editor }: any) => {
        this.setupEditor(editor);
      });
    }
  }

  private setupEditor(editor: EditorInstance): void {
    this.editor = editor;
    console.log('Editor ready:', this.editor);

    // Listen for {{ trigger
    this.editor.on('update', ({ editor }: any) => {
      const { state } = editor;
      const { from } = state.selection;

      // Check last 2 chars
      if (from >= 2) {
        const text = state.doc.textBetween(from - 2, from);
        if (text === '{{') {
          console.log('Trigger detected!');
          this.config.onTrigger?.({
            position: { from: from - 2, to: from },
            cleanup: () => {
              const tr = editor.state.tr.delete(from - 2, from);
              editor.view.dispatch(tr);
            }
          });
        }
      }
    });

    // Track field changes
    this.editor.on('update', () => {
      this.updateFieldList();
    });

    this.config.onReady?.();
    this.updateFieldList();
  }

  private updateFieldList(): void {
    const fields = this.getFields();
    console.log('Fields updated:', fields);
    this.config.onFieldsChanged?.(fields);
  }

  // Simple field insertion
  insertField(mode: 'inline' | 'block', alias: string, text?: string): boolean {
    if (!this.editor) return false;

    console.log('Inserting field:', alias);

    // Try to insert structured content
    let success = false;
    if (mode === 'inline') {
      success = this.editor.commands.insertStructuredContentInline?.({
        attrs: { alias },
        text: text || alias,
      });
    } else {
      success = this.editor.commands.insertStructuredContentBlock?.({
        attrs: { alias },
        text: text || alias,
      });
    }

    if (!success) { return false; }

    return true;
  }

  // Get all fields (simplified)
  getFields(): any[] {
    if (!this.editor) return [];

    const { state } = this.editor;

    const fields = this.editor.helpers.structuredContentCommands.getStructuredContentTags(state);
    return fields;
  }

  // Delete field by ID
  deleteField(id: string): boolean {
    if (!this.editor) return false;

    console.log('Deleting field:', id);
    return this.editor.commands.deleteStructuredContentById?.(id) || false;
  }
}