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

  it("gives the no-games row its own right padding while running (H35-E), and leaves it to the button otherwise", () => {
    const { rerender } = render(<ManifestRows rows={[{ kind: "noGames", key: "games" }]} />);
    expect(screen.getAllByTestId("manifest-row")[0].className).toMatch(/pr-\[12px\]/);
    rerender(<ManifestRows rows={[{ kind: "noGames", key: "games" }]} onLogGame={vi.fn()} />);
    expect(screen.getAllByTestId("manifest-row")[0].className).toContain("pr-0");
    expect(screen.getAllByTestId("manifest-row")[0].className).not.toMatch(/pr-\[12px\]/);
  });
});

describe("ManifestRows: the writing row (H35, PR 3)", () => {
  it("draws the writing row pending, then active, with its own pulsing mark", () => {
    const { rerender } = render(
      <ManifestRows rows={[read("decklist", true), { kind: "writing", label: "Writing your suggestions…", active: false }]} />,
    );
    const rows = screen.getAllByTestId("manifest-row");
    const writing = rows[rows.length - 1];
    expect(writing.dataset.kind).toBe("writing");
    expect(writing.dataset.active).toBeUndefined();
    expect(writing.querySelector('[data-mark="pending"]')).not.toBeNull();
    rerender(
      <ManifestRows rows={[read("decklist", true), { kind: "writing", label: "Writing your suggestions…", active: true }]} />,
    );
    const active = screen.getAllByTestId("manifest-row").at(-1)!;
    expect(active.dataset.active).toBe("true");
    expect(active.querySelector('[data-mark="writing"]')).not.toBeNull();
    // The pulse is `.anim-dots` (H35, PR 3), reusing globals.css's own reduced-motion fallback
    // rather than inventing a new one: dropping to a still dot is already wired for that class.
    expect(active.querySelector('[data-mark="writing"] > span')?.className).toContain("anim-dots");
  });

  it("shows the long-wait line only once it is given one, under the list", () => {
    const { rerender } = render(
      <ManifestRows rows={[{ kind: "writing", label: "Writing your suggestions…", active: true }]} />,
    );
    expect(screen.queryByText("Taking longer than usual.")).toBeNull();
    rerender(
      <ManifestRows
        rows={[{ kind: "writing", label: "Writing your suggestions…", active: true }]}
        writingLong="Taking longer than usual."
      />,
    );
    expect(screen.getByText("Taking longer than usual.")).toBeInTheDocument();
  });

  it("offers the description row's own link only when the row is absent and the caller wants it", () => {
    const row: ManifestRow = { kind: "read", key: "description", label: "Your description", count: "none yet", done: false, describeLink: true };
    const onDescribe = vi.fn();
    const { rerender } = render(<ManifestRows rows={[row]} />);
    expect(screen.queryByRole("button", { name: "Describe your deck →" })).toBeNull();
    rerender(<ManifestRows rows={[row]} onDescribe={onDescribe} />);
    const button = screen.getByRole("button", { name: "Describe your deck →" });
    fireEvent.click(button);
    expect(onDescribe).toHaveBeenCalledOnce();
  });
});
