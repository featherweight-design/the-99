// The live password strength panel (Small items 11 addendum R1c) in each drawn state: E, U, W, G, S, W·all, Q2 to Q4, K5's
// failed line, and the estimator not loaded. The readings are built here, so the panel is tested apart from the estimator
// (whose agreement with Clerk is `strength-estimator.test.ts`).
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { unscored, type Strength, type StrengthReading } from "../../lib/auth/password";
import { joinCopy, signInCopy } from "../../lib/copy/join";
import { strengthCopy } from "../../lib/copy/strength";
import { LINE_ID } from "./auth-parts";
import { STRENGTH_ID, StrengthPanel } from "./strength-panel";

afterEach(cleanup);

const reading = (strength: Strength, met: string): StrengthReading => ({
  strength,
  commonOk: met.includes("c"),
  guides: { length: met.includes("l"), numberOrSymbol: met.includes("m"), common: met.includes("c") },
});

function draw(r: StrengthReading, line: string | null = null, verdict = true) {
  render(<StrengthPanel reading={r} line={line} verdict={verdict} live="" />);
  const segments = [...document.querySelectorAll("[data-strength] > span")];
  return {
    lit: segments.filter((s) => s.hasAttribute("data-on")).length,
    segments,
    word: document.querySelector("[data-strength]")?.nextElementSibling?.textContent ?? null,
    met: [...document.querySelectorAll(`#${STRENGTH_ID} li`)].map((li) => li.hasAttribute("data-met")),
    rows: [...document.querySelectorAll(`#${STRENGTH_ID} li`)].map((li) => li.textContent),
  };
}

describe("StrengthPanel", () => {
  it("E: all three guides open, a real list, each read as not yet, and no word", () => {
    const p = draw(unscored(""));
    expect(p.lit).toBe(0);
    expect(p.word).toBe("");
    expect(p.met).toEqual([false, false, false]);
    expect(screen.getByRole("list").id).toBe(STRENGTH_ID);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(p.rows).toEqual([
      strengthCopy.guides.length + strengthCopy.guideNotYet,
      strengthCopy.guides.mix + strengthCopy.guideNotYet,
      strengthCopy.guides.common + strengthCopy.guideNotYet,
    ]);
    // Round marks, drawn and not read: never a checkbox.
    expect(document.querySelectorAll("[data-mark]")).toHaveLength(3);
    expect(document.querySelector('[role="checkbox"], input[type="checkbox"]')).toBeNull();
  });

  it("U: under 8 the number guide ticks live, the meter is empty and has no word", () => {
    const p = draw(unscored("colin9"));
    expect(p.lit).toBe(0);
    expect(p.word).toBe("");
    expect(p.met).toEqual([false, true, false]);
    expect(p.rows[1]).toBe(strengthCopy.guides.mix + strengthCopy.guideDone);
  });

  it("W: one segment in quiet ink, Weak in --fg-muted, never --danger", () => {
    const p = draw(reading("weak", "l"));
    expect(p.lit).toBe(1);
    expect(p.segments[0].className).toContain("bg-[color:var(--fg-muted)]");
    expect(p.word).toBe(strengthCopy.word.weak);
    expect(document.querySelector("[data-strength]")?.nextElementSibling?.className).toContain("text-[color:var(--fg-muted)]");
    expect(document.body.innerHTML).not.toContain("--danger");
    expect(screen.queryByText(strengthCopy.stillWeak)).toBeNull();
  });

  it("W·all: every guide ticked and still Weak draws the still-weak line", () => {
    const p = draw(reading("weak", "lmc"));
    expect(p.met).toEqual([true, true, true]);
    expect(screen.getByText(strengthCopy.stillWeak)).toBeTruthy();
  });

  it("G: two segments in --accent, Good in --accent-text", () => {
    const p = draw(reading("good", "lmc"));
    expect(p.lit).toBe(2);
    expect(p.segments[1].className).toContain("bg-[color:var(--accent)]");
    expect(p.segments[2].className).toContain("bg-[color:var(--border-strong)]");
    expect(p.word).toBe(strengthCopy.word.good);
    expect(screen.queryByText(strengthCopy.stillWeak)).toBeNull();
  });

  it("S: three segments and Strong, with the number guide open (a passphrase needs none)", () => {
    const p = draw(reading("strong", "lc"));
    expect(p.lit).toBe(3);
    expect(p.word).toBe(strengthCopy.word.strong);
    expect(p.met).toEqual([true, false, true]);
  });

  it.each([
    ["Q2", signInCopy.tooShort, unscored("colin9")],
    ["Q3", signInCopy.tooWeak, reading("weak", "l")],
    ["Q4", signInCopy.breached, reading("good", "lmc")],
  ])("%s: Clerk's line takes the slot under the meter as an alert, the meter empties, the guides stay", (_, want, r) => {
    const p = draw(r, want, true);
    expect(p.lit).toBe(0);
    expect(p.word).toBe("");
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe(want);
    expect(alert.id).toBe(LINE_ID);
    expect(alert.className).toContain("text-[color:var(--danger)]");
    // The line sits between the meter and the guides.
    expect(alert.nextElementSibling?.id).toBe(STRENGTH_ID);
    expect(p.met).toEqual([r.guides.length, r.guides.numberOrSymbol, r.guides.common]);
    expect(screen.queryByText(strengthCopy.stillWeak)).toBeNull();
  });

  it("a line in the slot hides the still-weak line, even with every guide ticked and the reading Weak", () => {
    // A verdict (Q3) and K5's failed line, which keeps the Weak reading on the meter.
    for (const verdict of [true, false]) {
      draw(reading("weak", "lmc"), verdict ? signInCopy.tooWeak : joinCopy.failed, verdict);
      expect(screen.getByRole("alert")).toBeTruthy();
      expect(screen.queryByText(strengthCopy.stillWeak)).toBeNull();
      cleanup();
    }
  });

  it("K5's failed line is no verdict on strength: the meter keeps its reading", () => {
    const p = draw(reading("good", "lmc"), joinCopy.failed, false);
    expect(screen.getByRole("alert").textContent).toBe(joinCopy.failed);
    expect(p.lit).toBe(2);
    expect(p.word).toBe(strengthCopy.word.good);
  });

  it("not loaded (or the chunk failed): the under-8 frame at any length, the third guide open", () => {
    const p = draw(unscored("copper fox casts ninety"));
    expect(p.lit).toBe(0);
    expect(p.word).toBe("");
    expect(p.met).toEqual([true, false, false]);
  });

  it("carries one polite live line", () => {
    render(<StrengthPanel reading={reading("weak", "l")} line={null} verdict live="Weak. 1 of 3 done." />);
    const live = document.querySelector('[aria-live="polite"]');
    expect(live?.textContent).toBe("Weak. 1 of 3 done.");
    expect(live?.className).toContain("sr-only");
  });
});
