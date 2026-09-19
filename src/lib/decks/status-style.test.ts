import { describe, expect, it } from "vitest";
import { STATUS_TOKEN, statusBarStyle, statusKeylineStyle, statusPillStyle } from "./status-style";
import type { StatusPill } from "./status";

const ALL: StatusPill[] = ["New", "Draft", "Over", "Building", "Unresolved", "To buy", "Complete"];

describe("status style", () => {
  it("maps every shipped status to a token, and no status to a hex", () => {
    expect(Object.keys(STATUS_TOKEN).sort()).toEqual([...ALL].sort());
    for (const token of Object.values(STATUS_TOKEN)) {
      expect(token).toMatch(/^--[a-z-]+$/);
    }
    expect(STATUS_TOKEN).toEqual({
      New: "--fg-faint",
      Draft: "--fg-body",
      Over: "--danger",
      // `--fg`: a committed deck sitting short is a real deck in an odd state,
      // not one of the two provisional phases above it.
      Building: "--fg",
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

  // The bar and the keyline take the status's own token, whatever the pill does
  // with it.
  it("paints the bar in the status's own colour", () => {
    for (const status of ALL) {
      expect(statusBarStyle(status, 50, 99).background).toBe(`var(${STATUS_TOKEN[status]})`);
      expect(statusKeylineStyle(status).background).toBe(`var(${STATUS_TOKEN[status]})`);
    }
  });
});

describe("the phase values", () => {
  // The dash is the one status signal that survives greyscale and colour
  // blindness, and it is what separates the two neutral phase plates from each
  // other. It moved from `Building` with the meaning it always carried.
  it("gives the dash to Draft, and to nothing else", () => {
    expect(statusPillStyle("Draft").border).toContain("dashed");
    for (const status of ALL.filter((v) => v !== "Draft")) {
      expect(statusPillStyle(status).border, status).toContain("solid");
    }
  });

  it("draws New and Draft from neutrals, and the other five from their own token", () => {
    expect(STATUS_TOKEN.New).toBe("--fg-faint");
    expect(STATUS_TOKEN.Draft).toBe("--fg-body");
    // `Building` is a committed deck in an odd state now, so it takes the
    // brightest neutral at the flat rule rather than an exception.
    expect(STATUS_TOKEN.Building).toBe("--fg");
    expect(statusPillStyle("Building").background).toContain("18%");
  });

  it("keeps New and Draft apart in the plate as well as the edge", () => {
    expect(statusPillStyle("New").background).toContain("16%");
    expect(statusPillStyle("Draft").background).toContain("14%");
    expect(statusPillStyle("New").color).toBe("var(--fg-muted)");
    expect(statusPillStyle("Draft").color).toBe("var(--fg-body)");
  });

  // NO CASE HERE FOR "the marks are gone". One was written and deleted: the
  // old `statusPillStyle(status, marks = {})` returns no `borderLeft` and no
  // `opacity` when called with exactly the defaults a test supplies, so it
  // passed against the build that still drew them — a guard that cannot fail
  // on the regression it names. `pnpm probe:deck-statuses` is what proves it,
  // by reading the painted chips on four fixtures at three widths, and two
  // mutations fail it.

  it("clamps the bar at the body size, and reads a pair's 98", () => {
    // The only assertions anywhere on the bar's WIDTH. They were carried by two
    // cases the phase rewrite replaced, and losing them left `Math.min(100, …)`
    // and the pair's ceiling unmeasured across the repo.
    expect(statusBarStyle("Over", 104, 99).width).toBe("100%");
    expect(statusBarStyle("Complete", 98, 98).width).toBe("100%");
    expect(statusBarStyle("Building", 87, 98).width).toBe(`${(87 / 98) * 100}%`);
    expect(statusBarStyle("New", 0, 99).width).toBe("0%");
  });
});
