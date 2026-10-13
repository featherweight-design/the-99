// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { useSearchDismiss } from "./search-dismiss";

function Field({ onOuterEscape }: { onOuterEscape?: () => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { ref, onEscape } = useSearchDismiss<HTMLDivElement>(query !== "" || open, () => {
    setQuery("");
    setOpen(false);
  });
  return (
    <div onKeyDown={(e) => !e.defaultPrevented && e.key === "Escape" && onOuterEscape?.()}>
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
