# @superdoc-dev/template-builder

React template building component for SuperDoc that enables document field management using structured content (SDT).

## Installation

```bash
npm install @superdoc-dev/template-builder
```

## Quick Start

```jsx
import SuperDocTemplateBuilder from '@superdoc-dev/template-builder';
import 'superdoc/dist/style.css';

function TemplateEditor() {
  return (
    <SuperDocTemplateBuilder
      document={{
        source: "template.docx",
        mode: "editing"
      }}
      
      fields={{
        available: [
          { id: 'customer_name', label: 'Customer Name', category: 'Contact' },
          { id: 'invoice_date', label: 'Invoice Date', category: 'Invoice' },
          { id: 'amount', label: 'Amount', category: 'Invoice' }
        ]
      }}
      
      onTrigger={(event) => {
        console.log('User typed trigger at', event.position);
      }}
      
      onFieldInsert={(field) => {
        console.log('Field inserted:', field.alias);
      }}
    />
  );
}
```

## What You Receive

```javascript
{
  fields: [
    { id: "field_123", alias: "Customer Name", tag: "contact" },
    { id: "field_124", alias: "Invoice Date", tag: "invoice" }
  ],
  document: { /* ProseMirror document JSON */ }
}
```

## Features

- **🎯 Trigger Detection** - Type `{{` (customizable) to insert fields
- **📝 Field Management** - Insert, update, delete, and navigate fields
- **🔍 Field Discovery** - Automatically finds existing fields in documents  
- **🎨 UI Agnostic** - Bring your own menus, panels, and components
- **📄 SDT Based** - Uses structured content tags for Word compatibility
- **⚡ Simple API** - Clear callbacks for trigger events and field changes

## API

### Component Props

```typescript
<SuperDocTemplateBuilder
  // Document configuration
  document={{
    source: File | Blob | string,
    mode: 'editing' | 'viewing'
  }}
  
  // Field configuration
  fields={{
    available: FieldDefinition[],  // Fields user can insert
    initial: TemplateField[]       // Pre-existing fields
  }}
  
  // UI components (optional)
  menu={{
    trigger: '{{',                  // Trigger pattern
    component: CustomFieldMenu      // Custom menu component
  }}
  
  list={{
    position: 'left' | 'right',    // Sidebar position
    component: CustomFieldList      // Custom list component
  }}
  
  // Toolbar (optional)
  toolbar={true}                   // Render built-in toolbar container
  // toolbar="#my-toolbar"          // Mount into existing element
  // toolbar={{                     // Configure built-in toolbar
  //   toolbarGroups: ['center'],
  //   excludeItems: ['italic', 'bold'],
  // }}
  
  // Event handlers
  onReady={() => {}}
  onTrigger={(event) => {}}
  onFieldInsert={(field) => {}}
  onFieldUpdate={(field) => {}}
  onFieldDelete={(fieldId) => {}}
  onFieldsChange={(fields) => {}}
  onFieldSelect={(field) => {}}
/>
```

### Ref Methods

```jsx
const ref = useRef();

// Insert fields
ref.current.insertField({ alias: 'Customer Name' });
ref.current.insertBlockField({ alias: 'Terms Block' });

// Update/delete fields
ref.current.updateField(fieldId, { alias: 'New Name' });
ref.current.deleteField(fieldId);

// Navigation
ref.current.selectField(fieldId);
ref.current.nextField();      // Tab behavior
ref.current.previousField();  // Shift+Tab behavior

// Get data
const fields = ref.current.getFields();
const template = await ref.current.exportTemplate();
```

## Custom Components

### Field Menu

```jsx
const CustomFieldMenu = ({ isVisible, position, availableFields, onSelect, onClose }) => {
  if (!isVisible) return null;
  
  return (
    <div style={{ position: 'fixed', left: position?.left, top: position?.top }}>
      {availableFields.map(field => (
        <button key={field.id} onClick={() => onSelect(field)}>
          {field.label}
        </button>
      ))}
      <button onClick={onClose}>Cancel</button>
    </div>
  );
};
```

### Field List

```jsx
const CustomFieldList = ({ fields, onSelect, onDelete, selectedFieldId }) => {
  return (
    <div>
      <h3>Fields ({fields.length})</h3>
      {fields.map(field => (
        <div 
          key={field.id}
          onClick={() => onSelect(field)}
          style={{ background: selectedFieldId === field.id ? '#blue' : '#gray' }}
        >
          {field.alias}
          <button onClick={() => onDelete(field.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
};
```

## Field Navigation

Enable Tab/Shift+Tab navigation:

```jsx
function TemplateEditor() {
  const ref = useRef();
  
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        ref.current?.previousField();
      } else {
        ref.current?.nextField();
      }
    }
  };
  
  return (
    <div onKeyDown={handleKeyDown}>
      <SuperDocTemplateBuilder ref={ref} {...props} />
    </div>
  );
}
```

## Export Template

Get the complete template data for saving:

```jsx
const handleSave = async () => {
  await ref.current?.exportTemplate({ fileName: 'invoice.docx' });
};
```

## TypeScript

Full TypeScript support included:

```typescript
import SuperDocTemplateBuilder from '@superdoc-dev/template-builder';
import type { 
  TemplateField,
  FieldDefinition,
  TriggerEvent,
  SuperDocTemplateBuilderHandle 
} from '@superdoc-dev/template-builder';

const ref = useRef<SuperDocTemplateBuilderHandle>(null);
```

## License

MIT

## Linear Two-way Agent (Dev Server)

This repository includes a minimal development server to demo a two-way Linear agent integration. It exposes:

- `POST /index` – stub endpoint to simulate indexing
- `POST /agent/command` – accepts Linear agent command webhooks

### Run the server

```bash
pnpm install
pnpm run start:server
```

The server listens on `http://localhost:8000` by default. Optionally set a shared secret to validate Linear webhooks:

```bash
export LINEAR_WEBHOOK_SECRET=your_shared_secret
pnpm run start:server
```

### Test commands

Index the codebase (stub):

```bash
curl -X POST http://localhost:8000/index
```

Trigger a command (mock payload):

```bash
curl -X POST http://localhost:8000/agent/command \
  -H "Content-Type: application/json" \
  -d '{"issueId":"ISSUE-123","command":"rerun_analysis","sessionId":"existing-session"}'
```

You should see `AgentActivity` entries in the server logs for actions and responses.

### Supported commands

- `rerun_analysis` – increments rerun counter and emits activity
- `search_code` – accepts a `query` field (stubbed)
- `explain_context` – returns an explanation message
- `suggest_implementation` – returns suggested steps

The server performs basic per-issue rate limiting (5 commands/min) and preserves session continuity using the provided `sessionId` when present.