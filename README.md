# @superdoc-dev/template-builder

A lightweight template building component for SuperDoc that enables document field management using structured content (SDT).

## What is this?

SuperDoc Template Builder wraps the SuperDoc editor to provide field insertion and management capabilities for creating document templates. It uses Word's Structured Document Tags (SDT) under the hood, ensuring compatibility with DOCX format while maintaining flexibility.

## Why?

Building document templates requires:
- Easy field insertion at cursor position
- Field discovery and management
- Trigger-based UI (like typing `{{`)
- Clean separation between field logic and UI

This component provides the field management layer while letting you bring your own UI components for menus, panels, and field lists.

## Key Features

- **Trigger Detection**: Monitor for custom triggers (default: `{{`)
- **Field Operations**: Insert, update, delete, and navigate fields
- **Field Discovery**: Automatically find existing fields in documents
- **UI Agnostic**: Bring your own menus, panels, and components
- **SDT Based**: Uses structured content tags for Word compatibility
- **Simple API**: Clear callbacks for trigger events and field changes

## Installation

```bash
npm install @superdoc-dev/template-builder
```

## Quick Start

```javascript
import SuperDocTemplateBuilder from '@superdoc-dev/template-builder';

const builder = new SuperDocTemplateBuilder({
  superdoc: mySuperdocInstance,
  
  onTrigger: (event) => {
    // Show your field menu
    showFieldMenu({
      position: event.bounds,
      onSelect: (fieldName) => {
        event.cleanup(); // Remove trigger text
        builder.insertField({ 
          alias: fieldName,
          tag: 'customer_data' 
        });
      }
    });
  },
  
  onFieldInserted: (field) => {
    console.log('Field added:', field);
    updateFieldList();
  }
});
```

## Common Use Cases

### Contract Templates
Create reusable contracts with fields for parties, dates, amounts, and terms that can be filled programmatically.

### Report Templates
Build standardized reports with placeholders for data, charts, and dynamic content.

### Mail Merge Documents
Design templates for bulk document generation with personalized fields.

### Form Letters
Create letters with variable fields for names, addresses, and custom content.

## How It Works

1. **Monitor Input**: Detect trigger patterns (like `{{`) as users type
2. **Fire Events**: Notify when triggers are detected with position info
3. **Manage Fields**: Insert structured content nodes as fields
4. **Track State**: Maintain a registry of all fields in the document

## API

### Configuration

| Option | Type | Description |
|--------|------|-------------|
| `superdoc` | SuperDocInstance | SuperDoc instance to attach to |
| `trigger` | string | Trigger pattern to detect (default: `{{`) |
| `onTrigger` | function | Called when trigger is detected |
| `onFieldInserted` | function | Called after field insertion |
| `onFieldSelected` | function | Called when field selection changes |
| `onFieldsChanged` | function | Called when fields are added/removed |

### Methods

- `insertField(options)` - Insert inline field at cursor
- `insertBlockField(options)` - Insert block-level field
- `updateField(id, updates)` - Update field properties
- `deleteField(id)` - Remove field from document
- `selectField(id)` - Navigate to specific field
- `getFields()` - Get all fields in document
- `nextField()` - Jump to next field
- `previousField()` - Jump to previous field

### Field Structure

Fields use three SDT attributes:
- `id` - Unique identifier
- `alias` - Display name/label
- `tag` - Optional metadata (can store JSON)

## Examples

### Basic Field Insertion

```javascript
// Insert simple text field
builder.insertField({
  alias: 'Customer Name',
  tag: 'customer'
});

// Insert with metadata
builder.insertField({
  alias: 'Invoice Date',
  tag: JSON.stringify({
    type: 'date',
    format: 'MM/DD/YYYY',
    required: true
  })
});
```

### Custom Triggers

```javascript
const builder = new SuperDocTemplateBuilder({
  superdoc: instance,
  trigger: '/', // Slash commands
  
  onTrigger: (event) => {
    showSlashMenu(event.bounds);
  }
});
```

### Field Navigation

```javascript
// Navigate between fields
document.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    if (e.shiftKey) {
      builder.previousField();
    } else {
      builder.nextField();
    }
  }
});
```

## Philosophy

This component follows the principle: **we handle the field logic, you handle the UI**.

We detect triggers, manage fields, and notify you of changes. You decide how to style menus, design panels, and present field options. This separation ensures the component works with any UI framework or design system.

## License

MIT
