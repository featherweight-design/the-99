import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SearchField, TextField } from "./text-field";

describe("TextField", () => {
  it("merges a caller className rather than letting it replace the chrome", () => {
    render(<TextField aria-label="Name" className="p-[12px_14px]" />);
    const el = screen.getByLabelText("Name");
    expect(el.className).toContain("p-[12px_14px]");
    expect(el.className).toContain("bg-[color:var(--surface-sunken)]");
  });

  // The border is three longhand utilities precisely so this can happen. As a
  // [border:…] shorthand it outranked the caller and three fields silently lost
  // the colour their design table specifies.
  it("lets a caller override the border colour", () => {
    render(<TextField aria-label="Name" className="border-[color:var(--danger)]" />);
    const el = screen.getByLabelText("Name");
    expect(el.className).toContain("border-[color:var(--danger)]");
    expect(el.className).not.toContain("border-[color:var(--border-strong)]");
  });

  it("keeps the default border colour when the caller overrides only at a breakpoint", () => {
    render(<TextField aria-label="Name" className="md:border-[color:var(--brass)]" />);
    const el = screen.getByLabelText("Name");
    expect(el.className).toContain("border-[color:var(--border-strong)]");
    expect(el.className).toContain("md:border-[color:var(--brass)]");
  });
});

describe("SearchField", () => {
  // A div wrapper makes the icon and the box's padding dead space: the field
  // looks clickable across its whole width but only the input focuses.
  it("wraps the input in a label so the icon and chrome focus it", () => {
    render(<SearchField aria-label="Search cards" />);
    const input = screen.getByLabelText("Search cards");
    expect(input.closest("label")).not.toBeNull();
  });

  it("renders the trailing slot inside the box", () => {
    render(<SearchField aria-label="Search cards" trailing={<button type="button">Clear</button>} />);
    const input = screen.getByLabelText("Search cards");
    const clear = screen.getByRole("button", { name: "Clear" });
    expect(input.closest("label")?.contains(clear)).toBe(true);
  });

  // The caller styles the box, not the input — a className meant for the input
  // must not end up on the container and vice versa.
  it("routes containerClassName to the box and className to the input", () => {
    render(
      <SearchField
        aria-label="Search cards"
        containerClassName="p-[11px_13px]"
        className="text-[15px]"
      />,
    );
    const input = screen.getByLabelText("Search cards");
    expect(input.className).toContain("text-[15px]");
    expect(input.className).not.toContain("p-[11px_13px]");
    expect(input.closest("label")?.className).toContain("p-[11px_13px]");
  });
});
