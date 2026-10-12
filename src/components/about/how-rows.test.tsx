import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { aboutEntries } from "../../lib/copy/about";
import { bracketSubRows, howItWorksRowsCopy as copy } from "../../lib/copy/how-it-works";
import { HowItWorks } from "./how-it-works";
import { reveal } from "../../lib/ui/reveal";
// The jump is `reveal`'s; its eased scroll is `reveal`'s own test.
vi.mock("../../lib/ui/reveal", () => ({ reveal: vi.fn() }));

const head = (title: string) => screen.getByRole("button", { name: new RegExp("^" + title) });

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("HowItWorks", () => {
  it("keys all five methods, in order, with their definitions", () => {
    const { container } = render(<HowItWorks entries={aboutEntries} />);
    const key = container.querySelector("dl")!;
    expect([...key.querySelectorAll("[data-method]")].map((e) => e.getAttribute("data-method"))).toEqual([
      "rules", "decks", "model", "you", "list",
    ]);
    for (const def of Object.values(copy.keyDefs)) expect(key.textContent).toContain(def);
  });

  it("draws eight closed rows, each a heading holding its disclosure", () => {
    render(<HowItWorks entries={aboutEntries} />);
    for (const r of copy.rows) {
      const b = head(r.title);
      expect(b.getAttribute("aria-expanded")).toBe("false");
      expect(b.getAttribute("aria-controls")).toBe(`${r.id}-body`);
      expect(b.closest("h3")).not.toBeNull();
      expect(document.getElementById(`${r.id}-body`)).toBeNull();
    }
  });

  it("opens and closes a row on a press, and keeps others open", () => {
    render(<HowItWorks entries={aboutEntries} />);
    const roles = copy.rows.find((r) => r.id === "how-roles")!;
    const prices = copy.rows.find((r) => r.id === "how-prices")!;
    fireEvent.click(head(roles.title));
    fireEvent.click(head(prices.title));
    expect(head(roles.title).getAttribute("aria-expanded")).toBe("true");
    const body = document.getElementById("how-roles-body")!;
    for (const t of [roles.from, roles.how, roles.refresh, roles.exact]) expect(body.textContent).toContain(t);
    expect(document.getElementById("how-prices-body")).not.toBeNull();
    fireEvent.click(head(roles.title));
    expect(document.getElementById("how-roles-body")).toBeNull();
    expect(document.getElementById("how-prices-body")).not.toBeNull();
  });

  it("gives Brackets its five sub-rows in place of a single statement", () => {
    render(<HowItWorks entries={aboutEntries} />);
    fireEvent.click(head("Brackets"));
    const body = document.getElementById("how-brackets-body")!;
    expect(body.textContent).toContain(copy.bracketsLead);
    for (const s of bracketSubRows()) {
      expect(body.textContent).toContain(s.label);
      for (const l of s.lines) expect(body.textContent).toContain(l);
    }
    expect(body.querySelectorAll("[data-method='list']").length).toBe(1);
    // The head carries the row's two; `published list` is Game Changers' alone.
    const headTags = [...head("Brackets").querySelectorAll("[data-method]")].map((e) => e.getAttribute("data-method"));
    expect(headTags).toEqual(["rules", "decks"]);
  });

  it("opens the row a hash names and scrolls it into view after it opens", () => {
    const scroll = vi.mocked(reveal);
    scroll.mockClear();
    window.history.replaceState(null, "", "/about#how-written");
    render(<HowItWorks entries={aboutEntries} />);
    expect(document.getElementById("how-written-body")).not.toBeNull();
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll).toHaveBeenCalledWith(document.getElementById("how-written"), "start");
  });

  it("opens a row when the hash moves to it, and ignores a hash that names no row", () => {
    render(<HowItWorks entries={aboutEntries} />);
    act(() => {
      window.history.replaceState(null, "", "/about#chapter-01");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(document.querySelectorAll("[id$='-body']")).toHaveLength(0);
    act(() => {
      window.history.replaceState(null, "", "/about#how-prices");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(document.getElementById("how-prices-body")).not.toBeNull();
  });

  // Back to a row still open renders nothing, so the scroll cannot wait for a render; and nothing
  // may be left pending for the next press of another row to act on.
  it("scrolls to a row the hash names that is already open, and leaves nothing pending", () => {
    const scroll = vi.mocked(reveal);
    scroll.mockClear();
    window.history.replaceState(null, "", "/about#how-prices");
    render(<HowItWorks entries={aboutEntries} />);
    act(() => {
      window.history.replaceState(null, "", "/about#how-written");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    scroll.mockClear();
    act(() => {
      window.history.replaceState(null, "", "/about#how-prices");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll).toHaveBeenCalledWith(document.getElementById("how-prices"), "start");
    scroll.mockClear();
    fireEvent.click(head("Roles and targets"));
    expect(scroll).not.toHaveBeenCalled();
  });

  it("carries the jump mark's title line on each row, so JumpMark can wash and focus it", () => {
    render(<HowItWorks entries={aboutEntries} />);
    for (const r of copy.rows) {
      const line = document.getElementById(r.id)!.querySelector("[data-entry-title]")!;
      expect(line.querySelector("h3")!.getAttribute("tabindex")).toBe("-1");
    }
  });
});

// The client rows take their labels as a prop. A value import of the copy module would ship all
// eight prose rows, and the scoring and cadence constants they are built from, in browser JS.
describe("HowRows' bundle", () => {
  it("imports nothing but types from the appendix copy", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(`${process.cwd()}/src/components/about/how-rows.tsx`, "utf8");
    const lines = src.split("\n").filter((l) => /from ["'][^"']*lib\/copy\/how-it-works["']/.test(l));
    expect(lines.length).toBeGreaterThan(0);
    for (const l of lines) expect(l).toMatch(/^import type /);
  });
});
