import { describe, expect, it } from "vitest";
import { ABOUT_REGIONS, TOOL_REGIONS } from "../../../scripts/lib/about-locators.mjs";
import { ABOUT_SECTIONS } from "../copy/about-pages";
import { THEMES } from "../theme/themes";
import { PAGE_SHOTS, PAGE_WIDTHS, pageShotFor, pageToolCropFor, type PageManifest, type PageShotEntry } from "./page-shots";
import { PAGE_MANIFEST } from "./page-shots.generated";

const labels = ABOUT_SECTIONS.flatMap((s) => s.labels);
/** The captures land one width at a time (Copilot reviews no file of a PR that carries both, the-99#2320): a width is
 *  checked once ANY theme has it, so a theme missing from it fails. The desktop captures' PR removes this, so both
 *  widths are then always checked. */
const captured = (width: (typeof PAGE_WIDTHS)[number]) => THEMES.some(({ key }) => Object.keys(PAGE_SHOTS[key]?.[width] ?? {}).length > 0);
const WIDTHS = PAGE_WIDTHS.filter(captured);
const EMPTY = WIDTHS.length === 0;

describe("the pages' captures are ready (G3)", () => {
  // The capture server runs with every switch on, so every label is visible on its capture.
  it.skipIf(EMPTY)("measures a box for every label region, in every theme, at every captured width", () => {
    for (const { key: theme } of THEMES) {
      for (const width of WIDTHS) {
        for (const l of labels) {
          const at = ABOUT_REGIONS[l.region][width];
          expect(at, `${l.region} ${width}`).not.toBeNull();
          const b = PAGE_SHOTS[theme]?.[width]?.[at!.capture]?.regions[l.region];
          expect(b, `${theme}/${width}/${at!.capture}#${l.region}`).toBeDefined();
          expect(b![2] > 0 && b![3] > 0, `${theme}/${width}/${at!.capture}#${l.region}`).toBe(true);
        }
      }
    }
  });

  it.skipIf(!captured("desktop"))("crops every tool's desktop card, in every theme", () => {
    for (const { key: theme } of THEMES) {
      for (const tool of Object.keys(TOOL_REGIONS)) expect(PAGE_MANIFEST.tools[theme]?.[tool], `${theme} ${tool}`).toBeDefined();
    }
  });

  it.skipIf(EMPTY)("never measures two labels on one capture at the same box (they would be one label, G6)", () => {
    for (const [theme, widths] of Object.entries(PAGE_SHOTS)) {
      for (const [width, shots] of Object.entries(widths)) {
        for (const [capture, shot] of Object.entries(shots ?? {})) {
          const seen = new Map<string, string>();
          for (const [region, b] of Object.entries(shot.regions)) {
            const key = b.join(",");
            expect(seen.get(key), `${theme}/${width}/${capture}: ${region} and ${seen.get(key)}`).toBeUndefined();
            seen.set(key, region);
          }
        }
      }
    }
  });
});

describe("pageShotFor: the picture matches the device (Review Focus 4)", () => {
  const entry = (w: number, region: string): PageShotEntry => ({ w, h: 100, bytes: 1, quality: 70, regions: { [region]: [0, 0, 1, 1] }, tools: {} });
  const manifest: PageManifest = {
    shots: {
      amonkhet: { phone: { "p-home": entry(780, "a") }, desktop: { "d-home": entry(2600, "b") } },
      kamigawa: { phone: { "p-home": entry(781, "c"), "d-home": entry(1, "wrong width") } },
      ixalan: { phone: { "p-only": entry(782, "d") } },
    },
    tools: { amonkhet: { friends: { capture: "d-friends", w: 10, h: 10, bytes: 1, quality: 70, halo: [0, 0, 1, 1] } } },
  };

  it("reads the reader's own theme at their width", () => {
    const s = pageShotFor("kamigawa", "phone", "p-home", manifest);
    expect(s?.w).toBe(781);
    expect(s?.src).toBe("/about/pages/kamigawa/phone/p-home.webp");
  });

  it("falls back to the default theme at the SAME width, never the theme's other-width capture", () => {
    const s = pageShotFor("kamigawa", "desktop", "d-home", manifest);
    expect(s?.theme).toBe("amonkhet");
    expect(s?.width).toBe("desktop");
    expect(s?.src).toBe("/about/pages/amonkhet/desktop/d-home.webp");
    expect(s?.w).toBe(2600);
  });

  it("is null when the default theme lacks it at that width, though the reader's theme has it at the other", () => {
    expect(pageShotFor("ixalan", "desktop", "p-only", manifest)).toBeNull();
    expect(pageShotFor("amonkhet", "desktop", "p-home", manifest)).toBeNull();
  });

  it("reads an unknown theme, or a prototype key, as the default theme's", () => {
    expect(pageShotFor("nope", "phone", "p-home", manifest)?.theme).toBe("amonkhet");
    expect(pageShotFor("toString", "phone", "p-home", manifest)?.theme).toBe("amonkhet");
    expect(pageShotFor("amonkhet", "phone", "constructor", manifest)).toBeNull();
  });

  it("never returns a capture of the other width, for any theme and capture in the set", () => {
    for (const { key: theme } of THEMES) {
      for (const width of PAGE_WIDTHS) {
        for (const capture of ["p-home", "d-home", "p-only"]) {
          const s = pageShotFor(theme, width, capture, manifest);
          if (s) {
            expect(s.width).toBe(width);
            expect(s.src).toContain(`/${width}/`);
            expect(manifest.shots[s.theme]?.[width]?.[capture], `${theme} ${width} ${capture}`).toBeDefined();
          }
        }
      }
    }
  });

  it("reads a tool's desktop crop in the reader's theme, else the default's", () => {
    expect(pageToolCropFor("kaldheim", "friends", manifest)?.src).toBe("/about/pages/amonkhet/desktop/tools/friends.webp");
    expect(pageToolCropFor("kaldheim", "precons", manifest)).toBeNull();
  });
});
