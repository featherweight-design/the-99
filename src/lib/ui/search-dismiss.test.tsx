// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { useEffect, useState } from "react";
import { describe, expect, it } from "vitest";

import { useSearchDismiss } from "./search-dismiss";

// Stands in for a sheet: `useDialogA11y` listens for Escape on `window` and does not read
// `defaultPrevented`, so only a key that stopped short of it leaves the sheet open.
function Field({ onOuterEscape }: { onOuterEscape?: () => void }) {
  useEffect(() => {
    if (!onOuterEscape) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onOuterEscape();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOuterEscape]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { ref, onEscape } = useSearchDismiss<HTMLDivElement>(query !== "" || open, () => {
    setQuery("");
    setOpen(false);
  });
  return (
    <div>
      <div ref={ref}>
        <input
          aria-label="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={onEscape}
        />
        {open && <ul role="listbox"><li>Option</li></ul>}
      </div>
      <button type="button">elsewhere</button>
    </div>
  );
}

const field = () => screen.getByRole("textbox", { name: "search" });

describe("useSearchDismiss", () => {
  it("clears the text and closes the list on one Escape", () => {
    render(<Field />);
    fireEvent.change(field(), { target: { value: "sol" } });
    fireEvent.keyDown(field(), { key: "Escape" });
    expect(field()).toHaveValue("");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("clears the text and closes the list on a press outside", () => {
    render(<Field />);
    fireEvent.change(field(), { target: { value: "sol" } });
    fireEvent.pointerDown(screen.getByRole("button", { name: "elsewhere" }));
    expect(field()).toHaveValue("");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("keeps the text on a press inside the field's own list", () => {
    render(<Field />);
    fireEvent.change(field(), { target: { value: "sol" } });
    fireEvent.pointerDown(screen.getByText("Option"));
    expect(field()).toHaveValue("sol");
  });

  it("leaves Escape to the surface around an empty field", () => {
    let outer = 0;
    render(<Field onOuterEscape={() => (outer += 1)} />);
    fireEvent.keyDown(field(), { key: "Escape" });
    expect(outer).toBe(1);
    fireEvent.change(field(), { target: { value: "sol" } });
    fireEvent.keyDown(field(), { key: "Escape" });
    expect(outer).toBe(1);
  });
});
