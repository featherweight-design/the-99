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

  it("builds the four unexceptional pills from one rule — 18% fill, 50% border, full label", () => {
    for (const status of ["Over", "Unresolved", "To buy", "Complete"] as StatusPill[]) {
      const style = statusPillStyle(status);
      const token = STATUS_TOKEN[status];
      expect(style.color).toBe(`var(${token})`);
      expect(style.background).toBe(`color-mix(in srgb, var(${token}) 18%, transparent)`);
      expect(style.border).toBe(
        `1px solid color-mix(in srgb, var(${token}) 50%, transparent)`,
      );
    }
  });

  // The two statuses whose token is a text colour are drawn against the flat
  // rule: a hairline border token, and a lighter fill.
  it("gives Draft and Building a hairline border rather than a faded status colour", () => {
    expect(statusPillStyle("Draft")).toEqual({
      color: "var(--fg-muted)",
      background: "color-mix(in srgb, var(--fg-faint) 16%, transparent)",
      border: "1px solid var(--border-strong)",
    });
    expect(statusPillStyle("Building")).toEqual({
      color: "var(--fg-body)",
      background: "color-mix(in srgb, var(--fg-body) 14%, transparent)",
      border: "1px solid var(--border-dashed)",
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
