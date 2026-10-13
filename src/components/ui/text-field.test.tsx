import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
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
  // the color their design table specifies.
  it("lets a caller override the border color", () => {
    render(<TextField aria-label="Name" className="border-[color:var(--danger)]" />);
    const el = screen.getByLabelText("Name");
    expect(el.className).toContain("border-[color:var(--danger)]");
    expect(el.className).not.toContain("border-[color:var(--border-strong)]");
  });

  it("drops a style smuggled in past the type ban", () => {
    const props = { style: { border: "1px solid red" } } as Record<string, unknown>;
    render(<TextField aria-label="Name" {...props} />);
    expect(screen.getByLabelText("Name").getAttribute("style")).toBeNull();
  });

  it("keeps the default border color when the caller overrides only at a breakpoint", () => {
    render(<TextField aria-label="Name" className="md:border-[color:var(--accent)]" />);
    const el = screen.getByLabelText("Name");
    expect(el.className).toContain("border-[color:var(--border-strong)]");
    expect(el.className).toContain("md:border-[color:var(--accent)]");
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

  // `??` read a deliberate `null` as an absent prop and put the magnifier back.
  it("renders no leading element when the caller asks for none", () => {
    const { container } = render(<SearchField aria-label="Search cards" leading={null} />);
    expect(container.textContent).not.toContain("⌕");
  });

  it("renders the trailing slot inside the box", () => {
    render(<SearchField aria-label="Search cards" trailing={<button type="button">Clear</button>} />);
    const input = screen.getByLabelText("Search cards");
    const clear = screen.getByRole("button", { name: "Clear" });
    expect(input.closest("label")?.contains(clear)).toBe(true);
  });

  it("drops a style smuggled in past the type ban", () => {
    const props = { style: { background: "red" } } as Record<string, unknown>;
    render(<SearchField aria-label="Search cards" {...props} />);
    expect(screen.getByLabelText("Search cards").getAttribute("style")).toBeNull();
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

// One clear for every search field (Hugh, 2026-10-13): one tap empties the field and the field keeps focus,
// whether or not the tap's mousedown would have blurred it.
function Controlled({ initial = "", onClear = () => {} }: { initial?: string; onClear?: () => void }) {
  const [q, setQ] = useState(initial);
  return (
    <SearchField
      aria-label="Search"
      value={q}
      onChange={(e) => setQ(e.target.value)}
      onClear={() => { onClear(); setQ(""); }}
    />
  );
}

describe("SearchField's clear", () => {
  it("empties the field in one tap, refuses the mousedown, and leaves focus in the field", () => {
    const onClear = vi.fn();
    render(<Controlled initial="gishath" onClear={onClear} />);
    const input = screen.getByLabelText("Search") as HTMLInputElement;
    const clear = screen.getByRole("button", { name: "Clear search" });
    expect(fireEvent.mouseDown(clear)).toBe(false);
    fireEvent.click(clear);
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(input.value).toBe("");
    expect(document.activeElement).toBe(input);
  });

  it("stays mounted but hidden and out of the accessibility tree while the field is empty", () => {
    const { container } = render(<Controlled />);
    expect(screen.queryByRole("button", { name: "Clear search" })).toBeNull();
    const hidden = container.querySelector("button")!;
    expect(hidden.style.visibility).toBe("hidden");
    expect(hidden.tabIndex).toBe(-1);
    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "a" } });
    expect(container.querySelector("button")!.style.visibility).toBe("visible");
    expect(screen.getByRole("button", { name: "Clear search" })).toBeTruthy();
  });

  it("draws no clear for a field that gives no onClear", () => {
    const { container } = render(<SearchField aria-label="Search" value="x" onChange={() => {}} />);
    expect(container.querySelector("button")).toBeNull();
  });

  it("still hands the caller's ref the input", () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<SearchField aria-label="Search" value="" onChange={() => {}} onClear={() => {}} ref={ref} />);
    expect(ref.current).toBe(screen.getByLabelText("Search"));
  });
});
