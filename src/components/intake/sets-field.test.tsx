import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SetsField } from "./sets-field";

const sets = [{ code: "hob", name: "The Hobbit" }, { code: "hoc", name: "The Hobbit Commander" }];

describe("the Sets field", () => {
  it("counts on its trigger and draws each chosen set as a code-then-name chip", () => {
    render(<SetsField sets={sets} value={["hob", "hoc"]} onChange={vi.fn()} wide />);
    expect(screen.getByText("Sets 2")).toBeTruthy();
    expect(screen.getAllByTestId("set-chip").map((c) => c.textContent)).toEqual(["HOBThe Hobbit✕", "HOCThe Hobbit Commander✕"]);
  });

  it("removes a set by its chip's ✕, named for the set", () => {
    const onChange = vi.fn();
    render(<SetsField sets={sets} value={["hob", "hoc"]} onChange={onChange} wide />);
    fireEvent.click(within(screen.getAllByTestId("set-chip")[0]).getByRole("button", { name: "Remove The Hobbit" }));
    expect(onChange).toHaveBeenCalledWith(["hoc"]);
  });
});

describe("the Sets field's copy override (H35 PR 2, \"Kept for this deck\")", () => {
  const limitsCopy = {
    triggerLabel: "Set",
    triggerCount: (n: number) => (n === 0 ? "Set: Any" : n === 1 ? "Set 1" : `Sets ${n}`),
    sheetTitle: "Set",
    removeSet: (name: string) => `Drop ${name}`,
  };

  it("draws the overridden trigger text instead of the default count", () => {
    render(<SetsField sets={sets} value={[]} onChange={vi.fn()} wide copy={limitsCopy} />);
    expect(screen.getByText("Set: Any")).toBeTruthy();
    expect(screen.queryByText("Sets 0")).toBeNull();
  });

  it("names the chip's remove button from the override, not the default", () => {
    render(<SetsField sets={sets} value={["hob"]} onChange={vi.fn()} wide copy={limitsCopy} />);
    expect(screen.getByRole("button", { name: "Drop The Hobbit" })).toBeTruthy();
  });
});

describe("the Sets panel's options", () => {
  it("speak a set's name and code, with no count", () => {
    render(<SetsField sets={sets} value={[]} onChange={vi.fn()} wide />);
    fireEvent.click(screen.getByRole("button", { name: /Filter by printed-in set/ }));
    const names = screen.getAllByRole("option").map((o) => o.getAttribute("aria-label") ?? o.textContent);
    expect(names.some((n) => /commander/.test(n ?? ""))).toBe(false);
  });
});
