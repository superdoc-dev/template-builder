// MinimalApp.jsx
import React, { useState, useEffect, useRef } from 'react';
import SuperDocTemplateBuilder from '@superdoc-dev/template-builder';
import '@superdoc-dev/template-builder/style.css';

function MinimalApp() {
    const [fields, setFields] = useState([]);
    const [showMenu, setShowMenu] = useState(false);
    const builderRef = useRef(null);
    const cleanupRef = useRef(null);

    useEffect(() => {
        // Initialize SuperDoc
        const initSuperdoc = async () => {
            const { SuperDoc } = await import('superdoc');

            const superdoc = new SuperDoc({
                selector: '#editor',
                document: 'https://storage.googleapis.com/public_statichosting/word_documents/service_agreement.docx',
                documentMode: 'editing',
                onReady: () => {
                    console.log('SuperDoc ready');

                    // Initialize template builder
                    builderRef.current = new SuperDocTemplateBuilder({
                        superdoc,

                        onReady: () => {
                            console.log('Builder ready');
                        },

                        onTrigger: (event) => {
                            console.log('Trigger event:', event);
                            cleanupRef.current = event.cleanup;
                            setShowMenu(true);
                        },

                        onFieldsChanged: (updatedFields) => {
                            console.log('Fields changed:', updatedFields);
                            setFields(updatedFields);
                        }
                    });
                }
            });
        };

        initSuperdoc();
    }, []);

    const handleInsertField = (fieldName) => {
        console.log('Inserting:', fieldName);

        // Clean up trigger text
        if (cleanupRef.current) {
            cleanupRef.current();
            cleanupRef.current = null;
        }

        // Insert field
        builderRef.current?.insertField(fieldName);

        // Hide menu
        setShowMenu(false);
    };

    const handleDeleteField = (fieldId) => {
        console.log('Delete field:', fieldId);
        builderRef.current?.deleteField(fieldId);
    };

    return (
        <div style={{ padding: '20px' }}>
            <h2>Minimal Template Builder Test</h2>

            <div style={{ display: 'flex', gap: '20px' }}>
                {/* Editor */}
                <div
                    id="editor"
                    style={{
                        flex: 1,
                        border: '2px solid #ccc',
                        borderRadius: '8px',
                        minHeight: '400px',
                        padding: '20px'
                    }}
                />

                {/* Field List */}
                <div style={{ width: '250px' }}>
                    <h3>Fields ({fields.length})</h3>
                    {fields.length === 0 ? (
                        <p>No fields yet</p>
                    ) : (
                        fields.map(field => (
                            <div
                                key={field.id}
                                style={{
                                    padding: '10px',
                                    marginBottom: '5px',
                                    backgroundColor: '#f0f0f0',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    justifyContent: 'space-between'
                                }}
                            >
                                <span>{field.alias}</span>
                                <button
                                    onClick={() => handleDeleteField(field.id)}
                                    style={{ fontSize: '12px' }}
                                >
                                    Delete
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Field Menu */}
            {showMenu && (
                <div style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'white',
                    border: '2px solid #333',
                    borderRadius: '8px',
                    padding: '20px',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                    zIndex: 1000
                }}>
                    <h3>Insert Field</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <button onClick={() => handleInsertField('Customer Name')}>
                            Customer Name
                        </button>
                        <button onClick={() => handleInsertField('Invoice Date')}>
                            Invoice Date
                        </button>
                        <button onClick={() => handleInsertField('Amount')}>
                            Amount
                        </button>
                        <button onClick={() => setShowMenu(false)}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MinimalApp;