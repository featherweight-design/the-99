import { describe, expect, it } from "vitest";
import { STATUS_TOKEN, statusBarStyle, statusKeylineStyle, statusPillStyle } from "./status-style";
import type { StatusPill } from "./status";

const ALL: StatusPill[] = ["Draft", "Building", "Over", "Unresolved", "To buy", "Complete"];

describe("status style", () => {
  it("maps every shipped status to a token, and no status to a hex", () => {
    expect(Object.keys(STATUS_TOKEN).sort()).toEqual([...ALL].sort());
    for (const token of Object.values(STATUS_TOKEN)) {
      expect(token).toMatch(/^--[a-z-]+$/);
    }
    expect(STATUS_TOKEN).toEqual({
      Draft: "--fg-faint",
      Building: "--fg-body",
      Over: "--danger",
      Unresolved: "--warning",
      "To buy": "--accent",
      Complete: "--success",
    });
  });

  it("names no colour in any pill, only tokens", () => {
    for (const status of ALL) {
      expect(JSON.stringify(statusPillStyle(status))).not.toMatch(/#[0-9a-f]{3,8}/i);
    }
  });

  it("builds the four unexceptional pills from one rule — 18% over the plate, full label", () => {
    for (const status of ["Over", "Unresolved", "To buy", "Complete"] as StatusPill[]) {
      const style = statusPillStyle(status);
      const token = STATUS_TOKEN[status];
      expect(style.color).toBe(`var(${token})`);
      expect(style.background).toBe(`color-mix(in srgb, var(${token}) 18%, var(--bg))`);
    }
  });

  // The pill only ever sits on art. A translucent fill let a bright pixel reach
  // the label, so every fill mixes into `--bg` and every edge is one opaque
  // hairline — no status keeps a faded border of its own colour.
  it("plates every pill opaquely, behind one hairline", () => {
    for (const status of ALL) {
      const style = statusPillStyle(status);
      expect(style.background).not.toContain("transparent");
      expect(style.border).toContain("1px");
      expect(style.border).toContain("var(--border-strong)");
    }
  });

  // Design ratified the uniform hairline colour and weight and restored the dash
  // on Building alone: a line style is not an alpha fade, so the rule retiring the
  // four colour-faded edges never reached it. With colour living only in fill and
  // label, it is the one status signal surviving greyscale and colour blindness,
  // on the one status that differs in kind rather than in data.
  it("dashes Building's hairline and solids the other five", () => {
    for (const status of ALL) {
      expect(statusPillStyle(status).border).toBe(
        `1px ${status === "Building" ? "dashed" : "solid"} var(--border-strong)`,
      );
    }
  });

  // The two statuses whose token is a text colour are drawn against the flat
  // rule: a lighter fill, and a quieter label than the colour itself.
  it("gives Draft and Building a lighter fill and their own label token", () => {
    // `textShadow: none` on every pill: the property is inherited, and the blocks
    // that carry a pill over art put a cover shadow on their ink, so the plated
    // exception picked up ink it exists to avoid.
    expect(statusPillStyle("Draft")).toEqual({
      color: "var(--fg-muted)",
      background: "color-mix(in srgb, var(--fg-faint) 16%, var(--bg))",
      border: "1px solid var(--border-strong)",
      textShadow: "none",
    });
    expect(statusPillStyle("Building")).toEqual({
      color: "var(--fg-body)",
      background: "color-mix(in srgb, var(--fg-body) 14%, var(--bg))",
      border: "1px dashed var(--border-strong)",
      textShadow: "none",
    });
  });

  it("fills the bar proportionally while building and completely at or past 99", () => {
    expect(statusBarStyle("Draft", 0, 99).width).toBe("0%");
    expect(statusBarStyle("Building", 87, 99).width).toBe(`${(87 / 99) * 100}%`);
    expect(statusBarStyle("Complete", 99, 99).width).toBe("100%");
    expect(statusBarStyle("To buy", 99, 99).width).toBe("100%");
    expect(statusBarStyle("Unresolved", 99, 99).width).toBe("100%");
    // Over is full, not 105% — the track cannot overflow its own container.
    expect(statusBarStyle("Over", 104, 99).width).toBe("100%");
  });

  // A pair deck is full at 98, so its finished bar must reach the end of the
  // track. Measured against 99 it would stop just short and read as unfinished.
  it("fills a pair deck's bar completely at 98", () => {
    expect(statusBarStyle("Complete", 98, 98).width).toBe("100%");
    expect(statusBarStyle("Building", 87, 98).width).toBe(`${(87 / 98) * 100}%`);
  });

  it("paints the bar and the keyline in the status's own colour", () => {
    for (const status of ALL) {
      const token = STATUS_TOKEN[status];
      expect(statusBarStyle(status, 50, 99).background).toBe(`var(${token})`);
      expect(statusKeylineStyle(status).background).toBe(`var(${token})`);
    }
  });
});

describe("the deck-state marks", () => {
  it("draws the hollow plate as an opaque --bg, never transparent", () => {
    for (const status of ALL) {
      const style = statusPillStyle(status, { hollow: true });
      // The trap this case exists for. A literally transparent chip breaks the
      // art-wash amendment on the mobile spine, where the pill sits on the
      // wash and a bright pixel would reach the label.
      expect(style.background).toBe("var(--bg)");
      expect(String(style.background)).not.toContain("transparent");
      expect(style.opacity).toBeUndefined();
    }
  });

  it("leaves the word, the ink and the hairline alone when the plate is hollow", () => {
    for (const status of ALL) {
      const filled = statusPillStyle(status);
      const hollow = statusPillStyle(status, { hollow: true });
      expect(hollow.color).toBe(filled.color);
      expect(hollow.border).toBe(filled.border);
      // Building's dash is a status signal and survives the phase.
      expect(String(hollow.border).includes("dashed")).toBe(status === "Building");
    }
  });

  it("adds the pending edge as 2px --fg, and only on the left", () => {
    for (const status of ALL) {
      const style = statusPillStyle(status, { pending: true });
      expect(style.borderLeft).toBe("2px solid var(--fg)");
      // Never --accent: `To buy`'s own token IS --accent, so an accent edge
      // reads as a heavier border of that pill's own colour.
      expect(String(style.borderLeft)).not.toContain("--accent");
      // The mark costs 2px and displaces nothing at ANY width, which means it
      // draws on the left and nowhere else. Asserted side by side rather than
      // only through `background` and `color`: a mark that also drew on the
      // right passes every other case here while the pill silently grows 2px
      // wider than this file claims it does.
      expect(style.borderRight).toBeUndefined();
      expect(style.borderTop).toBeUndefined();
      expect(style.borderBottom).toBeUndefined();
      expect(style.background).toBe(statusPillStyle(status).background);
      expect(style.color).toBe(statusPillStyle(status).color);
    }
  });

  it("composes the edge with Building's dash rather than replacing it", () => {
    const style = statusPillStyle("Building", { pending: true });
    expect(style.border).toContain("dashed");
    expect(style.borderLeft).toBe("2px solid var(--fg)");
  });

  it("draws neither mark by default", () => {
    const style = statusPillStyle("Complete");
    expect(style.borderLeft).toBeUndefined();
    expect(style.background).not.toBe("var(--bg)");
  });

  it("halves the bar for a deck with no version, and only then", () => {
    expect(statusBarStyle("To buy", 99, 99, { provisional: true }).opacity).toBe(0.5);
    expect(statusBarStyle("To buy", 99, 99).opacity).toBeUndefined();
    // The colour and the width are the status's own either way: the phase
    // changes how solid the object is, never what it measures.
    expect(statusBarStyle("To buy", 60, 99, { provisional: true }).width)
      .toBe(statusBarStyle("To buy", 60, 99).width);
  });
});
