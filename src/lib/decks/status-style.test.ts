import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { contrast, mixOklab, parseHex } from "../theme/color";
import { parseThemeBlocks } from "../theme/parse-css";
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

  it("builds the three unexceptional pills from one rule — 18% over the plate, full label", () => {
    for (const status of ["Unresolved", "To buy", "Complete"] as StatusPill[]) {
      const style = statusPillStyle(status);
      const token = STATUS_TOKEN[status];
      expect(style.color).toBe(`var(${token})`);
      expect(style.background).toBe(`color-mix(in srgb, var(${token}) 18%, var(--bg))`);
    }
  });

  // H5: `Over` keeps the flat rule's tint and puts its red on the hairline, with `--fg` as the
  // label, because `--danger` as text reads under 4.5:1 on its own plate.
  it("draws Over's red in the tint and the edge, never the label", () => {
    const style = statusPillStyle("Over");
    expect(style.color).toBe("var(--fg)");
    expect(style.background).toBe("color-mix(in srgb, var(--danger) 18%, var(--bg))");
    expect(style.border).toBe("1px solid var(--danger)");
  });

  // The pill only ever sits on art. A translucent fill let a bright pixel reach
  // the label, so every fill mixes into `--bg` and every edge is one opaque
  // hairline — no status keeps a faded border of its own colour.
  it("plates every pill opaquely, behind one opaque hairline", () => {
    for (const status of ALL) {
      const style = statusPillStyle(status);
      expect(style.background).not.toContain("transparent");
      expect(style.border).toContain("1px");
      expect(style.border).toMatch(status === "Over" ? /var\(--danger\)$/ : /var\(--border-strong\)$/);
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

// H5, measured: the two red labels read at 4.5:1 or better on every theme's ground. Computed from
// the hex in `globals.css`, with `color-mix(in srgb, …)` mixed per channel as the browser does.
describe("H5 contrast, over all six themes", () => {
  const THEMES = parseThemeBlocks(
    readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "..", "app", "globals.css"), "utf8"),
  );
  const hex = (theme: Map<string, string>, token: string) => {
    const v = theme.get(token.replace(/^--/, ""));
    if (!v || !/^#[0-9a-f]{6}$/i.test(v)) throw new Error(`${token} is not a hex value: ${v}`);
    return v;
  };
  const mix = (a: string, b: string, weightOfA: number) =>
    `#${parseHex(a).map((c, i) => Math.round(c * weightOfA + parseHex(b)[i] * (1 - weightOfA)).toString(16).padStart(2, "0")).join("")}`;
  const minimum = (ratios: number[]) => Math.min(...ratios);

  it("reads six themes", () => {
    expect(THEMES.size).toBe(6);
  });

  it("Over's label clears 4.5:1 on its own plate", () => {
    const ratios = [...THEMES.values()].map((t) => contrast(hex(t, "--fg"), mix(hex(t, "--danger"), hex(t, "--bg"), 0.18)));
    expect(minimum(ratios)).toBeGreaterThanOrEqual(4.5);
  });

  it("the Not legal tag's label clears 4.5:1 on the tile's ground and the header's", () => {
    const ratios = [...THEMES.values()].flatMap((t) => [
      contrast(hex(t, "--fg"), hex(t, "--surface-inset")),
      contrast(hex(t, "--fg"), hex(t, "--bg")),
    ]);
    expect(minimum(ratios)).toBeGreaterThanOrEqual(4.5);
  });

  it("the Not legal tag's label clears 4.5:1 on its own 14% tint", () => {
    const ratios = [...THEMES.values()].map((t) => contrast(hex(t, "--fg"), mixOklab(hex(t, "--danger"), hex(t, "--surface-inset"), 0.14)));
    expect(minimum(ratios)).toBeGreaterThanOrEqual(4.5);
  });

  it("the data tag's --fact ink clears 4.5:1 on the tile's ground and the header's", () => {
    const ratios = [...THEMES.values()].flatMap((t) => [
      contrast(hex(t, "--fact"), hex(t, "--surface-inset")),
      contrast(hex(t, "--fact"), hex(t, "--bg")),
    ]);
    expect(minimum(ratios)).toBeGreaterThanOrEqual(4.5);
  });

  // The tile's `!` mark (tile marker addendum, F23): a 12px GRAPHIC, not text, so its bar is 3:1.
  // Each ink on its own 14% tint of the tile's ground, which is what `NoticeMark` paints.
  it.each(["--danger", "--fact"])("the tile mark's %s glyph clears 3:1 on its own tint", (ink) => {
    // The tile's ground, and `--bg` for the key's sample on the page.
    const ratios = [...THEMES.values()].flatMap((t) => ["--surface-inset", "--bg"].map((g) => contrast(hex(t, ink), mixOklab(hex(t, ink), hex(t, g), 0.14))));
    expect(minimum(ratios)).toBeGreaterThanOrEqual(3);
  });

  // The counterfactual H5 replaces: the red as TEXT fails on both grounds, which is why it moved.
  it("would not with --danger as the label", () => {
    const ratios = [...THEMES.values()].map((t) => contrast(hex(t, "--danger"), hex(t, "--surface-inset")));
    expect(minimum(ratios)).toBeLessThan(4.5);
  });
});
