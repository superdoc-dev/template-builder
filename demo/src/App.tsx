import React, { useState, useRef, useCallback, useMemo } from "react";
import SuperDocTemplateBuilder from "@superdoc-dev/template-builder";
import type {
  SuperDocTemplateBuilderHandle,
  TemplateField,
  FieldDefinition,
} from "@superdoc-dev/template-builder";
import "superdoc/style.css";
import "./App.css";

const availableFields: FieldDefinition[] = [
  // Agreement
  { id: '1242142770', label: 'Agreement Date', category: 'Agreement' },

  // Parties
  { id: '1242142771', label: 'User Name', category: 'Parties' },
  { id: '1242142772', label: 'Company Name', category: 'Parties' },

  // Scope
  { id: '1242142773', label: 'Service Type', category: 'Scope' },

  // Legal
  { id: '1242142774', label: 'Agreement Jurisdiction', category: 'Legal' },

  // Company Details
  { id: '1242142775', label: 'Company Address', category: 'Company' },

  // Signatures
  { id: '1242142776', label: 'Signature', category: 'Signatures' },
];

export function App() {
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [documentSource, setDocumentSource] = useState<string | File>(
    "https://storage.googleapis.com/public_static_hosting/public_demo_docs/new_service_agreement.docx",
  );
  const builderRef = useRef<SuperDocTemplateBuilderHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importingRef = useRef(false);

  const log = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] ${msg}`);
    setEvents(prev => [...prev.slice(-4), `${time} - ${msg}`]);
  }, []);

  const handleFieldsChange = useCallback((updatedFields: TemplateField[]) => {
    setFields(updatedFields);
    log(`Fields: ${updatedFields.length} total`);
  }, [log]);

  const handleFieldInsert = useCallback((field: TemplateField) => {
    log(`✓ Inserted: ${field.alias}`);
  }, [log]);

  const handleFieldDelete = useCallback((fieldId: string | number) => {
    log(`✗ Deleted: ${fieldId}`);
  }, [log]);

  const handleFieldSelect = useCallback((field: TemplateField | null) => {
    if (field) {
      log(`Selected: ${field.alias}`);
    }
  }, [log]);

  const handleReady = useCallback(() => {
    log('✓ Template builder ready');
    if (importingRef.current) {
      log('📄 Document imported');
      importingRef.current = false;
      setImportError(null);
      setIsImporting(false);
    }
  }, [log]);

  const handleTrigger = useCallback(() => {
    log('⌨ Trigger detected');
  }, [log]);

  const handleExportTemplate = useCallback(async () => {
    if (!builderRef.current) {
      return;
    }

    try {
      setIsDownloading(true);

      await builderRef.current.exportTemplate({
        fileName: "template.docx",
      });

      log("📤 Template exported");
    } catch (error) {
      log("⚠️ Export failed");
      console.error("Failed to export template", error);
    } finally {
      setIsDownloading(false);
    }
  }, [log]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        builderRef.current?.previousField();
      } else {
        builderRef.current?.nextField();
      }
    }
  };

  const documentConfig = useMemo(() => ({
    source: documentSource,
    mode: 'editing' as const
  }), [documentSource]);

  const handleImportButtonClick = useCallback(() => {
    if (isImporting) return;
    fileInputRef.current?.click();
  }, [isImporting]);

  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'docx') {
      const message = 'Invalid file type. Please choose a .docx file.';
      setImportError(message);
      log('⚠️ ' + message);
      return;
    }

    importingRef.current = true;
    setImportError(null);
    setIsImporting(true);
    setDocumentSource(file);
    log(`📥 Importing "${file.name}"`);
  }, [log]);

  const fieldsConfig = useMemo(() => ({
    available: availableFields,
    allowCreate: true
  }), []);

  const listConfig = useMemo(() => ({
    position: 'right' as const
  }), []);

  return (
    <div className="demo" onKeyDown={handleKeyDown}>
      <header>
        <div className="header-content">
          <div className="header-left">
            <h1>
              <a href="https://www.npmjs.com/package/@superdoc-dev/template-builder" target="_blank" rel="noopener">
                @superdoc-dev/template-builder
              </a>
            </h1>
            <p>
              React template builder from <a href="https://superdoc.dev" target="_blank" rel="noopener">SuperDoc</a>
            </p>
          </div>
          <div className="header-nav">
            <a href="https://github.com/superdoc-dev/template-builder" target="_blank" rel="noopener">
              GitHub
            </a>
            <a href="https://docs.superdoc.dev" target="_blank" rel="noopener">
              Docs
            </a>
          </div>
        </div>
      </header>

      <div className="container">
        <div className="toolbar">
          <div className="toolbar-left">
            <span className="hint">Type {'{{'}  to insert a field</span>
            <span className="divider">|</span>
            <span className="hint">Tab/Shift+Tab to navigate</span>
          </div>
          <div className="toolbar-right">
            <input
              type="file"
              accept=".docx"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileInputChange}
            />
            <button
              onClick={handleImportButtonClick}
              className="import-button"
              disabled={isImporting || isDownloading}
            >
              {isImporting ? 'Importing…' : 'Import File'}
            </button>
            <button
              onClick={handleExportTemplate}
              className="export-button"
              disabled={isDownloading || isImporting}
            >
              {isDownloading ? "Exporting..." : "Export Template"}
            </button>
          </div>
        </div>

        {importError && (
          <div className="toolbar-error" role="alert">
            {importError}
          </div>
        )}

        <SuperDocTemplateBuilder
          ref={builderRef}
          document={documentConfig}
          fields={fieldsConfig}
          list={listConfig}
          toolbar={true}
          onReady={handleReady}
          onTrigger={handleTrigger}
          onFieldInsert={handleFieldInsert}
          onFieldDelete={handleFieldDelete}
          onFieldSelect={handleFieldSelect}
          onFieldsChange={handleFieldsChange}
          documentHeight="600px"
        />

        {/* Event Log */}
        {events.length > 0 && (
          <div className="event-log">
            <div className="event-log-header">EVENT LOG</div>
            {events.map((evt, i) => (
              <div key={i} className="event-log-item">{evt}</div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
