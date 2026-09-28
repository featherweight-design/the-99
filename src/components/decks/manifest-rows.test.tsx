import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ManifestRows, type ManifestRow } from "./manifest-rows";

afterEach(cleanup);

const read = (key: string, done: boolean, count: string | null = null): ManifestRow => ({
  kind: "read", key, label: key === "games" ? "Your games" : "This list", count, done,
});

describe("ManifestRows: a disclosure, never a control (manifest-affordance addendum)", () => {
  it("draws no checkbox and nothing pressable on a read row", () => {
    render(<ManifestRows rows={[read("games", true, "9 games"), read("list", false)]} />);
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    for (const row of screen.getAllByTestId("manifest-row")) {
      expect(row.className).toContain("cursor-default");
      expect(row.className).not.toMatch(/hover:/);
      // A read row is a ruled line: no fill, no radius, no border but the rule beneath it.
      expect(row.className).not.toMatch(/rounded/);
      expect(row.style.background).toBe("");
      expect(row.style.border).toBe("");
      expect(row.style.borderBottom).toBe("1px solid var(--border)");
    }
  });

  it("marks a read row with a ✓ and a pending one with a dot, never an empty box", () => {
    render(<ManifestRows rows={[read("games", true, "9 games"), read("list", false)]} />);
    const marks = screen.getAllByTestId("manifest-mark");
    expect(marks.map((m) => m.dataset.mark)).toEqual(["read", "pending"]);
    expect(marks[0].textContent).toBe("✓");
    expect(marks[1].textContent).toBe("");
    for (const m of marks) {
      expect(m.getAttribute("aria-hidden")).toBe("true");
      expect(m.className).not.toMatch(/border|rounded-\[4px\]|size-\[1[68]px\]/);
    }
  });

  it("says in words what the mark shows, and steps the label's ink", () => {
    render(<ManifestRows rows={[read("games", true, "9 games"), read("list", false)]} />);
    const [done, pending] = screen.getAllByTestId("manifest-row");
    expect(done.textContent).toContain("Your games read");
    expect(pending.textContent).toContain("This list not read yet");
    expect(done.querySelector("span.flex-1")?.getAttribute("style")).toContain("var(--fg)");
    expect(pending.querySelector("span.flex-1")?.getAttribute("style")).toContain("var(--fg-body)");
  });

  it("draws the empty-games row above the ruled list, with Log a game as the one control", () => {
    const onLogGame = vi.fn();
    render(<ManifestRows rows={[{ kind: "noGames", key: "games" }, read("list", false)]} onLogGame={onLogGame} />);
    const [noGames, list] = screen.getAllByTestId("manifest-row");
    expect(noGames.dataset.kind).toBe("no-games");
    expect(noGames.closest("ul")).toBeNull();
    expect(list.closest("ul")).not.toBeNull();
    expect(noGames.querySelector('[data-mark="none"]')?.textContent).toBe("–");
    const button = screen.getByRole("button", { name: "Log a game →" });
    expect(button.className).toMatch(/h-\[44px\]/);
    expect(button.className).toMatch(/md:h-\[38px\]/);
    expect(button.className).not.toMatch(/py-\[12px\]/);
    fireEvent.click(button);
    expect(onLogGame).toHaveBeenCalledOnce();
  });

  it("keeps the empty-games row at its height with no button, as a run draws it", () => {
    render(<ManifestRows rows={[{ kind: "noGames", key: "games" }, read("list", false)]} />);
    const [noGames] = screen.getAllByTestId("manifest-row");
    expect(noGames.className).toMatch(/min-h-\[46px\]/);
    expect(noGames.className).toMatch(/md:min-h-\[40px\]/);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
