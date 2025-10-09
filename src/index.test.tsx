import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, waitFor, act } from "@testing-library/react";
import React, { createRef } from "react";

import type { SuperDocTemplateBuilderHandle } from "./types";
import SuperDocTemplateBuilder from "./index";

interface SuperdocMockState {
  deleteResult: boolean | ((id: string) => boolean);
  deleteThrows?: Error;
  exportResult: unknown;
  structuredContentTags: any[];
  constructorError?: Error;
  ready: boolean;
}

const superdocState: SuperdocMockState = {
  deleteResult: true,
  exportResult: { data: "ok" },
  structuredContentTags: [],
  ready: false,
};

const resetSuperdocState = () => {
  superdocState.deleteResult = true;
  superdocState.deleteThrows = undefined;
  superdocState.exportResult = { data: "ok" };
  superdocState.structuredContentTags = [];
  superdocState.constructorError = undefined;
  superdocState.ready = false;
};

vi.mock("superdoc", () => {
  const createEditorMock = () => {
    const editor = {
      commands: {
        deleteStructuredContentById: vi.fn((id: string) => {
          if (superdocState.deleteThrows) {
            throw superdocState.deleteThrows;
          }

          return typeof superdocState.deleteResult === "function"
            ? superdocState.deleteResult(id)
            : superdocState.deleteResult;
        }),
        insertStructuredContentInline: vi.fn(),
        insertStructuredContentBlock: vi.fn(),
        updateStructuredContentById: vi.fn(),
        selectStructuredContentById: vi.fn(),
      },
      helpers: {
        structuredContentCommands: {
          getStructuredContentTags: vi.fn(() => superdocState.structuredContentTags),
        },
      },
      state: {
        selection: { from: 0 },
        tr: { delete: vi.fn() },
        doc: { textBetween: vi.fn(() => "") },
      },
      view: {
        coordsAtPos: vi.fn(() => ({ left: 0, top: 0 })),
        dispatch: vi.fn(),
      },
      on: vi.fn(),
    };

    return editor;
  };

  class SuperDocMock {
    activeEditor: ReturnType<typeof createEditorMock> | null;
    export: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;

    constructor(config: Record<string, unknown>) {
      if (superdocState.constructorError) {
        throw superdocState.constructorError;
      }

      superdocState.ready = false;
      this.activeEditor = createEditorMock();
      this.export = vi.fn(() => Promise.resolve(superdocState.exportResult));
      this.destroy = vi.fn();

      Promise.resolve().then(() => {
        superdocState.ready = true;
        if (typeof config.onReady === "function") {
          (config.onReady as () => void)();
        }
      });
    }
  }

  return { SuperDoc: SuperDocMock };
});

describe("SuperDocTemplateBuilder error handling", () => {
  beforeEach(() => {
    resetSuperdocState();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("notifies onError when deleting a non-existent field", async () => {
    superdocState.deleteResult = false;
    const onError = vi.fn();
    const ref = createRef<SuperDocTemplateBuilderHandle>();

    render(<SuperDocTemplateBuilder ref={ref} onError={onError} />);

    await act(async () => {
      await Promise.resolve();
      await waitFor(() => expect(superdocState.ready).toBe(true));
    });

    const result = ref.current?.deleteField("missing-field");

    expect(result).toBe(false);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(onError.mock.calls[0][0].message).toContain("missing-field");
    expect(onError.mock.calls[0][1]).toBe("deleteField");
  });

  it("rejects exportTemplate when SuperDoc instance is unavailable", async () => {
    const onError = vi.fn();
    const ref = createRef<SuperDocTemplateBuilderHandle>();

    render(<SuperDocTemplateBuilder ref={ref} onError={onError} />);

    const exportPromise = ref.current?.exportTemplate();

    await expect(exportPromise).rejects.toThrow(
      "Cannot export template without SuperDoc instance",
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].message).toContain("Cannot export template");
    expect(onError.mock.calls[0][1]).toBe("exportTemplate");
  });

  it("surfaces initialization errors through onError", async () => {
    const onError = vi.fn();
    superdocState.constructorError = new Error("Network failure");

    render(<SuperDocTemplateBuilder onError={onError} />);

    await waitFor(() => {
      expect(onError).toHaveBeenCalledTimes(1);
    });

    expect(onError.mock.calls[0][0].message).toContain("Network failure");
    expect(onError.mock.calls[0][1]).toBe("initSuperDoc");
  });
});

