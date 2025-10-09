import "@testing-library/jest-dom/vitest";

const mockInsertStructuredContentInline = vi.fn();
const mockInsertStructuredContentBlock = vi.fn();
const mockGetStructuredContentTags = vi.fn(() => []);
const mockUpdateStructuredContentById = vi.fn();
const mockDeleteStructuredContentById = vi.fn();
const mockSelectStructuredContentById = vi.fn();
const mockDestroy = vi.fn();
const mockSetModules = vi.fn();
const mockExportDocx = vi.fn(() => ({}));

const mockEditor = {
  commands: {
    insertStructuredContentInline: mockInsertStructuredContentInline,
    insertStructuredContentBlock: mockInsertStructuredContentBlock,
    updateStructuredContentById: mockUpdateStructuredContentById,
    deleteStructuredContentById: mockDeleteStructuredContentById,
    selectStructuredContentById: mockSelectStructuredContentById,
  },
  helpers: {
    structuredContentCommands: {
      getStructuredContentTags: mockGetStructuredContentTags,
    },
  },
  state: {
    doc: {
      textBetween: vi.fn(() => ""),
      toJSON: vi.fn(() => ({})),
    },
    selection: {
      from: 0,
    },
    tr: {
      delete: vi.fn(() => ({ delete: vi.fn() })),
    },
  },
  view: {
    dispatch: vi.fn(),
    coordsAtPos: vi.fn(() => ({ left: 0, top: 0 })),
  },
  on: vi.fn(),
  exportDocx: mockExportDocx,
};

const SuperDocMock = vi.fn((options: any = {}) => {
  if (options?.onReady) {
    queueMicrotask(() => options.onReady());
  }

  return {
    destroy: mockDestroy,
    activeEditor: mockEditor,
    setModules: mockSetModules,
    on: vi.fn((event: string, handler: (data?: any) => void) => {
      if (event === "editorCreate") {
        queueMicrotask(() => handler({ editor: mockEditor }));
      }
    }),
  };
});

(SuperDocMock as any).mockEditor = mockEditor;
(SuperDocMock as any).mockInsertStructuredContentInline =
  mockInsertStructuredContentInline;
(SuperDocMock as any).mockInsertStructuredContentBlock =
  mockInsertStructuredContentBlock;
(SuperDocMock as any).mockGetStructuredContentTags =
  mockGetStructuredContentTags;
(SuperDocMock as any).mockUpdateStructuredContentById =
  mockUpdateStructuredContentById;
(SuperDocMock as any).mockDeleteStructuredContentById =
  mockDeleteStructuredContentById;
(SuperDocMock as any).mockSelectStructuredContentById =
  mockSelectStructuredContentById;
(SuperDocMock as any).mockDestroy = mockDestroy;
(SuperDocMock as any).mockSetModules = mockSetModules;
(SuperDocMock as any).mockExportDocx = mockExportDocx;

vi.mock("superdoc", () => ({
  SuperDoc: SuperDocMock,
}));
