import React, { useState, useRef, useCallback, useMemo } from 'react';
import SuperDocTemplateBuilder from '@superdoc-dev/template-builder';
import type {
  SuperDocTemplateBuilderHandle,
  TemplateField,
  FieldDefinition
} from '@superdoc-dev/template-builder';
import 'superdoc/dist/style.css';
import './App.css';

const availableFields: FieldDefinition[] = [
  // Contact Information
  { id: 'customer_name', label: 'Customer Name', category: 'Contact' },
  { id: 'customer_email', label: 'Customer Email', category: 'Contact' },
  { id: 'customer_phone', label: 'Customer Phone', category: 'Contact' },
  { id: 'customer_address', label: 'Customer Address', category: 'Contact' },

  // Company Information
  { id: 'company_name', label: 'Company Name', category: 'Company' },
  { id: 'company_address', label: 'Company Address', category: 'Company' },
  { id: 'company_phone', label: 'Company Phone', category: 'Company' },
  { id: 'company_email', label: 'Company Email', category: 'Company' },

  // Invoice/Order
  { id: 'invoice_number', label: 'Invoice Number', category: 'Invoice' },
  { id: 'invoice_date', label: 'Invoice Date', category: 'Invoice' },
  { id: 'due_date', label: 'Due Date', category: 'Invoice' },
  { id: 'total_amount', label: 'Total Amount', category: 'Invoice' },
  { id: 'tax_amount', label: 'Tax Amount', category: 'Invoice' },
  { id: 'subtotal', label: 'Subtotal', category: 'Invoice' },

  // Legal
  { id: 'effective_date', label: 'Effective Date', category: 'Legal' },
  { id: 'termination_date', label: 'Termination Date', category: 'Legal' },
  { id: 'jurisdiction', label: 'Jurisdiction', category: 'Legal' },
  { id: 'governing_law', label: 'Governing Law', category: 'Legal' },

  // Product/Service
  { id: 'product_name', label: 'Product Name', category: 'Product' },
  { id: 'product_description', label: 'Product Description', category: 'Product' },
  { id: 'quantity', label: 'Quantity', category: 'Product' },
  { id: 'unit_price', label: 'Unit Price', category: 'Product' },
];

export function App() {
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [showExport, setShowExport] = useState(false);
  const [exportData, setExportData] = useState<any>(null);
  const builderRef = useRef<SuperDocTemplateBuilderHandle>(null);

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

  const handleFieldDelete = useCallback((fieldId: string) => {
    log(`✗ Deleted: ${fieldId}`);
  }, [log]);

  const handleFieldSelect = useCallback((field: TemplateField | null) => {
    if (field) {
      log(`Selected: ${field.alias}`);
    }
  }, [log]);

  const handleReady = useCallback(() => {
    log('✓ Template builder ready');
  }, [log]);

  const handleTrigger = useCallback(() => {
    log('⌨ Trigger detected');
  }, [log]);

  const handleExportTemplate = useCallback(() => {
    const data = builderRef.current?.exportTemplate();
    setExportData(data);
    setShowExport(true);
    log('📤 Template exported');
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
    source: "https://storage.googleapis.com/public_static_hosting/public_demo_docs/service_agreement.docx",
    mode: 'editing' as const
  }), []);

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
            <button onClick={handleExportTemplate} className="export-button">
              Export Template
            </button>
          </div>
        </div>

        <SuperDocTemplateBuilder
          ref={builderRef}
          document={documentConfig}
          fields={fieldsConfig}
          list={listConfig}
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

        {/* Export Modal */}
        {showExport && (
          <div className="modal-overlay" onClick={() => setShowExport(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h2>Exported Template</h2>
              <div className="export-content">
                <h3>Fields ({exportData?.fields?.length || 0})</h3>
                <pre>{JSON.stringify(exportData?.fields || [], null, 2)}</pre>
                {exportData?.document && (
                  <>
                    <h3>Document Structure</h3>
                    <pre>{JSON.stringify(exportData.document, null, 2).substring(0, 500)}...</pre>
                  </>
                )}
              </div>
              <button onClick={() => setShowExport(false)} className="modal-close">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
