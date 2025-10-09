import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FieldMenu } from "../defaults/FieldMenu";
import type { FieldDefinition } from "../types";

const basePosition = {
  left: 0,
  top: 0,
  right: 0,
  bottom: 0,
  height: 0,
  width: 0,
  x: 0,
  y: 0,
  toJSON() {
    return {};
  },
} as DOMRect;

afterEach(() => {
  cleanup();
});

const renderMenu = (fields: FieldDefinition[], options: { allowCreate?: boolean } = {}) => {
  const onSelect = vi.fn();
  const onClose = vi.fn();

  render(
    <FieldMenu
      isVisible
      position={basePosition}
      availableFields={fields}
      allowCreate={options.allowCreate}
      onSelect={onSelect}
      onClose={onClose}
    />,
  );

  return { onSelect, onClose };
};

describe("FieldMenu", () => {
  it("groups fields by category and expands the first category by default", () => {
    const fields: FieldDefinition[] = [
      { id: "contact-1", label: "Customer Name", category: "Contact" },
      { id: "contact-2", label: "Customer Email", category: "Contact" },
      { id: "invoice-1", label: "Invoice Date", category: "Invoice" },
    ];

    renderMenu(fields);

    expect(screen.getByRole("button", { name: "Contact (2)" })).toBeVisible();
    expect(screen.getByText("Customer Name")).toBeVisible();

    const invoiceField = screen.queryByText("Invoice Date");
    expect(invoiceField).toBeInTheDocument();
    expect(invoiceField).not.toBeVisible();
  });

  it("expands categories on click and selects fields", async () => {
    const fields: FieldDefinition[] = [
      { id: "contact-1", label: "Customer Name", category: "Contact" },
      { id: "invoice-1", label: "Invoice Date", category: "Invoice" },
    ];

    const { onSelect } = renderMenu(fields);

    const invoiceButton = screen.getByRole("button", { name: "Invoice (1)" });
    await userEvent.click(invoiceButton);

    const invoiceField = await screen.findByText("Invoice Date");
    await userEvent.click(invoiceField);

    expect(onSelect).toHaveBeenCalledWith(fields[1]);
  });

  it("places uncategorized fields into an Uncategorized group", () => {
    const fields: FieldDefinition[] = [
      { id: "uncategorized-1", label: "Misc Field" },
    ];

    renderMenu(fields);

    expect(screen.getByRole("button", { name: "Uncategorized (1)" })).toBeVisible();
    expect(screen.getByText("Misc Field")).toBeInTheDocument();
  });

  it("keeps the create field entry accessible when allowed", () => {
    const fields: FieldDefinition[] = [];

    renderMenu(fields, { allowCreate: true });

    expect(screen.getByText("+ Create New Field")).toBeInTheDocument();
  });
});
