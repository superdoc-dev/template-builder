import React, { createRef } from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SuperDocTemplateBuilder from "../index";
import type {
  SuperDocTemplateBuilderHandle,
  SuperDocTemplateBuilderProps,
  FieldDefinition,
} from "../types";

import { SuperDoc } from "superdoc";

const superDocMock = SuperDoc as any;

const availableFields: FieldDefinition[] = [
  { id: "field1", label: "Customer Name", category: "Contact" },
  { id: "field2", label: "Invoice Date", category: "Invoice" },
  { id: "field3", label: "Amount", category: "Invoice" },
];

const renderComponent = (
  props: Partial<SuperDocTemplateBuilderProps> = {},
  options: { ref?: React.RefObject<SuperDocTemplateBuilderHandle | null> } = {},
) => {
  const mergedProps: SuperDocTemplateBuilderProps = {
    fields: {
      available: availableFields,
    },
    ...props,
  };

  return render(<SuperDocTemplateBuilder ref={options.ref} {...mergedProps} />);
};

const waitForBuilderReady = async () => {
  await waitFor(() => {
    expect(superDocMock.mockGetStructuredContentTags).toHaveBeenCalled();
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  superDocMock.mockInsertStructuredContentInline.mockReturnValue(true);
  superDocMock.mockInsertStructuredContentBlock.mockReturnValue(true);
  superDocMock.mockGetStructuredContentTags.mockReturnValue([]);
  superDocMock.mockUpdateStructuredContentById.mockReturnValue(true);
  superDocMock.mockDeleteStructuredContentById.mockReturnValue(true);
  superDocMock.mockSelectStructuredContentById.mockReturnValue(true);
});

describe("SuperDocTemplateBuilder component", () => {
  it("renders with minimum required props", async () => {
    renderComponent();

    await waitForBuilderReady();

    expect(screen.getByTestId("template-builder-editor")).toBeInTheDocument();
    expect(screen.getByTestId("template-builder-toolbar")).toBeInTheDocument();

    const config = superDocMock.mock.calls[0]?.[0];
    expect(config?.toolbar).toBeDefined();
    expect(config?.modules?.toolbar?.selector).toBe(config?.toolbar);
  });

  it("hides toolbar when showToolbar is false", async () => {
    renderComponent({ showToolbar: false });

    await waitForBuilderReady();

    expect(
      screen.queryByTestId("template-builder-toolbar"),
    ).not.toBeInTheDocument();

    const config = superDocMock.mock.calls[0]?.[0];
    expect(config?.toolbar).toBeUndefined();
    expect(config?.modules).toBeUndefined();
  });

  it("detects trigger and shows field menu", async () => {
    const onTrigger = vi.fn();

    renderComponent({ onTrigger });

    await waitForBuilderReady();

    // Simulate trigger detection
    const mockEditor = superDocMock.mockEditor;
    const updateHandler = mockEditor.on.mock.calls.find(
      (call: any[]) => call[0] === "update",
    )?.[1];

    // Simulate typing {{
    mockEditor.state.selection.from = 2;
    mockEditor.state.doc.textBetween.mockReturnValueOnce("{{");

    act(() => {
      updateHandler({ editor: mockEditor });
    });

    await waitFor(() => {
      expect(onTrigger).toHaveBeenCalled();
    });

    // Check that field menu is visible
    expect(screen.getByText("Close")).toBeInTheDocument();
  });

  it("inserts fields using ref methods", async () => {
    const ref = createRef<SuperDocTemplateBuilderHandle>();
    const onFieldInsert = vi.fn();

    renderComponent({ onFieldInsert }, { ref });

    await waitForBuilderReady();
    await waitFor(() => expect(ref.current).toBeTruthy());

    // Insert inline field
    const success = ref.current?.insertField({
      alias: "Test Field",
    });

    expect(success).toBe(true);
    expect(superDocMock.mockInsertStructuredContentInline).toHaveBeenCalledWith(
      expect.objectContaining({
        attrs: expect.objectContaining({
          alias: "Test Field",
        }),
      }),
    );

    // Insert block field
    const blockSuccess = ref.current?.insertBlockField({
      alias: "Block Field",
    });

    expect(blockSuccess).toBe(true);
    expect(superDocMock.mockInsertStructuredContentBlock).toHaveBeenCalledWith(
      expect.objectContaining({
        attrs: expect.objectContaining({
          alias: "Block Field",
        }),
      }),
    );
  });

  it("updates and deletes fields", async () => {
    const ref = createRef<SuperDocTemplateBuilderHandle>();
    const onFieldUpdate = vi.fn();
    const onFieldDelete = vi.fn();

    // Mock existing fields
    superDocMock.mockGetStructuredContentTags.mockReturnValue([
      {
        node: {
          attrs: {
            id: "existing-field",
            alias: "Existing Field",
            tag: "test",
          },
        },
      },
    ]);

    renderComponent({ onFieldUpdate, onFieldDelete }, { ref });

    await waitForBuilderReady();
    await waitFor(() => expect(ref.current).toBeTruthy());

    // Update field
    const updateSuccess = ref.current?.updateField("existing-field", {
      alias: "Updated Field",
    });

    expect(updateSuccess).toBe(true);
    expect(superDocMock.mockUpdateStructuredContentById).toHaveBeenCalledWith(
      "existing-field",
      expect.objectContaining({
        attrs: { alias: "Updated Field" },
      }),
    );

    // Delete field
    const deleteSuccess = ref.current?.deleteField("existing-field");

    expect(deleteSuccess).toBe(true);
    expect(superDocMock.mockDeleteStructuredContentById).toHaveBeenCalledWith(
      "existing-field",
    );
  });

  it("navigates between fields", async () => {
    const ref = createRef<SuperDocTemplateBuilderHandle>();
    const onFieldSelect = vi.fn();

    // Mock multiple fields
    superDocMock.mockGetStructuredContentTags.mockReturnValue([
      { node: { attrs: { id: "field1", alias: "Field 1" } } },
      { node: { attrs: { id: "field2", alias: "Field 2" } } },
      { node: { attrs: { id: "field3", alias: "Field 3" } } },
    ]);

    renderComponent({ onFieldSelect }, { ref });

    await waitForBuilderReady();
    await waitFor(() => expect(ref.current).toBeTruthy());

    // Navigate to next field
    act(() => {
      ref.current?.nextField();
    });

    await waitFor(() => {
      expect(superDocMock.mockSelectStructuredContentById).toHaveBeenCalledWith(
        "field1",
      );
    });

    // Navigate to previous field
    act(() => {
      ref.current?.previousField();
    });

    await waitFor(() => {
      expect(superDocMock.mockSelectStructuredContentById).toHaveBeenCalledWith(
        "field3",
      );
    });
  });

  it("exports template data", async () => {
    const ref = createRef<SuperDocTemplateBuilderHandle>();

    // Mock existing fields
    superDocMock.mockGetStructuredContentTags.mockReturnValue([
      { node: { attrs: { id: "field1", alias: "Field 1", tag: "contact" } } },
      { node: { attrs: { id: "field2", alias: "Field 2", tag: "invoice" } } },
    ]);

    renderComponent({}, { ref });

    await waitForBuilderReady();
    await waitFor(() => expect(ref.current).toBeTruthy());

    const exportData = ref.current?.exportTemplate();

    expect(exportData).toMatchObject({
      fields: [
        { id: "field1", alias: "Field 1", tag: "contact" },
        { id: "field2", alias: "Field 2", tag: "invoice" },
      ],
      document: expect.any(Object),
    });
  });

  it("renders field list with discovered fields", async () => {
    // Mock existing fields
    superDocMock.mockGetStructuredContentTags.mockReturnValue([
      {
        node: {
          attrs: { id: "field1", alias: "Customer Name", tag: "contact" },
        },
      },
      {
        node: {
          attrs: { id: "field2", alias: "Invoice Date", tag: "invoice" },
        },
      },
    ]);

    renderComponent({
      list: { position: "right" },
    });

    await waitForBuilderReady();

    // Check field list is rendered
    expect(screen.getByText("Template Fields (2)")).toBeInTheDocument();
    expect(screen.getByText("Customer Name")).toBeInTheDocument();
    expect(screen.getByText("Invoice Date")).toBeInTheDocument();
  });

  it("handles field menu selection", async () => {
    const onFieldInsert = vi.fn();

    renderComponent({ onFieldInsert });

    await waitForBuilderReady();

    // Trigger the menu
    const mockEditor = superDocMock.mockEditor;
    const updateHandler = mockEditor.on.mock.calls.find(
      (call: any[]) => call[0] === "update",
    )?.[1];

    mockEditor.state.selection.from = 2;
    mockEditor.state.doc.textBetween.mockReturnValueOnce("{{");

    act(() => {
      updateHandler({ editor: mockEditor });
    });

    await waitFor(() => {
      expect(screen.getByText("Close")).toBeInTheDocument();
    });

    // Select a field from menu
    const customerNameButton = screen.getByText("Customer Name");
    await userEvent.click(customerNameButton);

    await waitFor(() => {
      expect(superDocMock.mockInsertStructuredContentInline).toHaveBeenCalled();
      expect(mockEditor.state.tr.delete).toHaveBeenCalled(); // Cleanup trigger
    });
  });
});
