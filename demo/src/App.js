import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useCallback, useMemo } from "react";
import SuperDocTemplateBuilder from "@superdoc-dev/template-builder";
import "superdoc/dist/style.css";
import "./App.css";
const MAX_DOCX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const availableFields = [
    // Contact Information
    { id: "customer_name", label: "Customer Name", category: "Contact" },
    { id: "customer_email", label: "Customer Email", category: "Contact" },
    { id: "customer_phone", label: "Customer Phone", category: "Contact" },
    { id: "customer_address", label: "Customer Address", category: "Contact" },
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
    const [fields, setFields] = useState([]);
    const [events, setEvents] = useState([]);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importError, setImportError] = useState(null);
    const [documentSource, setDocumentSource] = useState("https://storage.googleapis.com/public_static_hosting/public_demo_docs/service_agreement.docx");
    const builderRef = useRef(null);
    const fileInputRef = useRef(null);
    const importingRef = useRef(false);
    const log = useCallback((msg) => {
        const time = new Date().toLocaleTimeString();
        console.log(`[${time}] ${msg}`);
        setEvents(prev => [...prev.slice(-4), `${time} - ${msg}`]);
    }, []);
    const handleFieldsChange = useCallback((updatedFields) => {
        setFields(updatedFields);
        log(`Fields: ${updatedFields.length} total`);
    }, [log]);
    const handleFieldInsert = useCallback((field) => {
        log(`✓ Inserted: ${field.alias}`);
    }, [log]);
    const handleFieldDelete = useCallback((fieldId) => {
        log(`✗ Deleted: ${fieldId}`);
    }, [log]);
    const handleFieldSelect = useCallback((field) => {
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
        }
        setIsImporting(false);
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
        }
        catch (error) {
            log("⚠️ Export failed");
            console.error("Failed to export template", error);
        }
        finally {
            setIsDownloading(false);
        }
    }, [log]);
    const handleKeyDown = (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            if (e.shiftKey) {
                builderRef.current?.previousField();
            }
            else {
                builderRef.current?.nextField();
            }
        }
    };
    const documentConfig = useMemo(() => ({
        source: documentSource,
        mode: 'editing'
    }), [documentSource]);
    const handleImportButtonClick = useCallback(() => {
        if (isImporting)
            return;
        fileInputRef.current?.click();
    }, [isImporting]);
    const handleFileInputChange = useCallback((event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) {
            return;
        }
        const extension = file.name.split('.').pop()?.toLowerCase();
        if (extension !== 'docx') {
            const message = 'Invalid file type. Please choose a .docx file.';
            setImportError(message);
            log('⚠️ ' + message);
            return;
        }
        if (file.size > MAX_DOCX_FILE_SIZE) {
            const message = 'File is too large. Please select a file smaller than 10MB.';
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
        position: 'right'
    }), []);
    return (_jsxs("div", { className: "demo", onKeyDown: handleKeyDown, children: [_jsx("header", { children: _jsxs("div", { className: "header-content", children: [_jsxs("div", { className: "header-left", children: [_jsx("h1", { children: _jsx("a", { href: "https://www.npmjs.com/package/@superdoc-dev/template-builder", target: "_blank", rel: "noopener", children: "@superdoc-dev/template-builder" }) }), _jsxs("p", { children: ["React template builder from ", _jsx("a", { href: "https://superdoc.dev", target: "_blank", rel: "noopener", children: "SuperDoc" })] })] }), _jsxs("div", { className: "header-nav", children: [_jsx("a", { href: "https://github.com/superdoc-dev/template-builder", target: "_blank", rel: "noopener", children: "GitHub" }), _jsx("a", { href: "https://docs.superdoc.dev", target: "_blank", rel: "noopener", children: "Docs" })] })] }) }), _jsxs("div", { className: "container", children: [_jsxs("div", { className: "toolbar", children: [_jsxs("div", { className: "toolbar-left", children: [_jsxs("span", { className: "hint", children: ["Type ", '{{', "  to insert a field"] }), _jsx("span", { className: "divider", children: "|" }), _jsx("span", { className: "hint", children: "Tab/Shift+Tab to navigate" })] }), _jsxs("div", { className: "toolbar-right", children: [_jsx("input", { type: "file", accept: ".docx", ref: fileInputRef, style: { display: 'none' }, onChange: handleFileInputChange }), _jsx("button", { onClick: handleImportButtonClick, className: "import-button", disabled: isImporting || isDownloading, children: isImporting ? 'Importing…' : 'Import File' }), _jsx("button", { onClick: handleExportTemplate, className: "export-button", disabled: isDownloading || isImporting, children: isDownloading ? "Exporting..." : "Export Template" })] })] }), importError && (_jsx("div", { className: "toolbar-error", role: "alert", children: importError })), _jsx(SuperDocTemplateBuilder, { ref: builderRef, document: documentConfig, fields: fieldsConfig, list: listConfig, toolbar: true, onReady: handleReady, onTrigger: handleTrigger, onFieldInsert: handleFieldInsert, onFieldDelete: handleFieldDelete, onFieldSelect: handleFieldSelect, onFieldsChange: handleFieldsChange, documentHeight: "600px" }), events.length > 0 && (_jsxs("div", { className: "event-log", children: [_jsx("div", { className: "event-log-header", children: "EVENT LOG" }), events.map((evt, i) => (_jsx("div", { className: "event-log-item", children: evt }, i)))] }))] })] }));
}
//# sourceMappingURL=App.js.map