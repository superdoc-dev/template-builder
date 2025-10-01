# Template Builder Examples

This directory contains example implementations of the SuperDoc Template Builder component.

## Examples

### Vanilla JavaScript
A pure HTML/JavaScript implementation showing basic usage.

```bash
cd vanilla
# Open index.html in your browser
```

### React
A React implementation with a full UI for field management.

```bash
cd react
pnpm install
pnpm dev
```

## Features Demonstrated

Each example shows:
- **Trigger Detection**: Type `{{` to insert fields
- **Field Management**: Add, update, delete fields
- **Field Navigation**: Tab/Shift+Tab between fields
- **Field List**: Visual list of all fields
- **Export**: Save template as DOCX

## Running the Examples

### Prerequisites
1. Build the template-builder component first:
   ```bash
   cd ../..
   pnpm build
   ```

2. Install dependencies for the specific example:
   ```bash
   cd examples/react
   pnpm install
   ```

3. Run the development server:
   ```bash
   pnpm dev
   ```

## Key Concepts

### Initialize SuperDoc
```javascript
const superdoc = new SuperDoc({
  selector: '#document-container',
  document: 'template.docx',
  documentMode: 'editing'
});
```

### Initialize Template Builder
```javascript
const builder = new SuperDocTemplateBuilder({
  superdoc: superdoc,
  
  onTrigger: (event) => {
    // Show field menu at cursor position
    showFieldMenu(event.bounds);
    
    // Clean up trigger text and insert field
    event.cleanup();
    builder.insertField({ alias: 'Field Name' });
  }
});
```

### Insert Fields
```javascript
// Inline field (within text)
builder.insertField({
  alias: 'Customer Name',
  tag: 'customer'
});

// Block field (paragraph-level)
builder.insertBlockField({
  alias: 'Terms and Conditions',
  tag: 'legal'
});
```

### Navigate Fields
```javascript
// Go to next/previous field
builder.nextField();
builder.previousField();

// Select specific field
builder.selectField(fieldId);
```

## Learn More

- [Template Builder Documentation](../../README.md)
- [SuperDoc Documentation](https://superdoc.dev)
