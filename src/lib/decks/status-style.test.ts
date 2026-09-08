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
    expect(statusPillStyle("Draft")).toEqual({
      color: "var(--fg-muted)",
      background: "color-mix(in srgb, var(--fg-faint) 16%, var(--bg))",
      border: "1px solid var(--border-strong)",
    });
    expect(statusPillStyle("Building")).toEqual({
      color: "var(--fg-body)",
      background: "color-mix(in srgb, var(--fg-body) 14%, var(--bg))",
      border: "1px dashed var(--border-strong)",
    });
  });

  it("fills the bar proportionally while building and completely at or past 99", () => {
    expect(statusBarStyle("Draft", 0).width).toBe("0%");
    expect(statusBarStyle("Building", 87).width).toBe(`${(87 / 99) * 100}%`);
    expect(statusBarStyle("Complete", 99).width).toBe("100%");
    expect(statusBarStyle("To buy", 99).width).toBe("100%");
    expect(statusBarStyle("Unresolved", 99).width).toBe("100%");
    // Over is full, not 105% — the track cannot overflow its own container.
    expect(statusBarStyle("Over", 104).width).toBe("100%");
  });

  it("paints the bar and the keyline in the status's own colour", () => {
    for (const status of ALL) {
      const token = STATUS_TOKEN[status];
      expect(statusBarStyle(status, 50).background).toBe(`var(${token})`);
      expect(statusKeylineStyle(status).background).toBe(`var(${token})`);
    }
  });
});
