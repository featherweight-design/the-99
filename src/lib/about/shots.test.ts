import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ABOUT_SCREENS, DECK_VIEWS } from "../copy/about";
import { TOOLS } from "../discovery/tools";
import { DEFAULT_THEME, THEMES } from "../theme/themes";
import { REQUIRED_SHOTS, TOUR_SHOTS, shotFor, toolShotId, type ShotSet } from "./shots";
import { SHOTS } from "./shots.generated";

/** The budget (plan `2026-10-16-discovery-r2-r3.md`, decision 4): an image over it is re-encoded lower, never the cap raised. */
const MAX_IMAGE_BYTES = 90 * 1024;
const MAX_SET_BYTES = 18 * 1024 * 1024;

// Read from the tree (`process.cwd()` is the repository root under Vitest), so CI always runs this test.
const DIR = join(process.cwd(), "public/about/shots");
type Entry = { width: number; height: number; bytes: number; quality: number; halo?: readonly number[] };
const SET = SHOTS as unknown as Record<string, Record<string, Entry>>;
const fileOf = (theme: string, id: string) => join(DIR, theme, `${id}.webp`);

describe("the screenshot set's coverage", () => {
  it("needs a frame for every screen (each of a deck's views), a crop for every tool and the tour's three pictures", () => {
    // Pinned, not recomputed from the same formula `REQUIRED_SHOTS` uses: 14 screens with a deck's 7 views apart (21),
    // the 14 tools, and the tour's 3 pictures. A screen, tool or view added to its registry moves this on purpose.
    expect(REQUIRED_SHOTS).toHaveLength(38);
    expect(ABOUT_SCREENS.filter((s) => s !== "deck")).toHaveLength(14);
    expect(DECK_VIEWS).toHaveLength(7);
    expect(TOOLS).toHaveLength(14);
    expect(TOUR_SHOTS).toHaveLength(3);
    for (const id of ["home", "account", "deck-shopping", "deck-versions", "tool-matchups", "tool-lineup", "tour-decks"]) {
      expect(REQUIRED_SHOTS).toContain(id);
    }
    for (const t of TOOLS) expect(REQUIRED_SHOTS).toContain(toolShotId(t.id));
  });

  it.each(THEMES.map((t) => t.key))("holds every required image in %s, in the manifest and on disk", (theme) => {
    const missing = REQUIRED_SHOTS.filter((id) => SET[theme]?.[id] === undefined);
    expect(missing, `${theme} has no image for`).toEqual([]);
    const absent = REQUIRED_SHOTS.filter((id) => {
      try {
        return !statSync(fileOf(theme, id)).isFile();
      } catch {
        return true;
      }
    });
    expect(absent, `${theme} has no file for`).toEqual([]);
  });

  it("gives every tool crop its control's halo box, as fractions inside the crop", () => {
    for (const { key } of THEMES) {
      for (const t of TOOLS) {
        const halo = SET[key]?.[toolShotId(t.id)]?.halo;
        expect(halo, `${key}/${t.id}`).toHaveLength(4);
        const [x, y, w, h] = halo!;
        for (const n of [x, y, w, h]) expect(n).toBeGreaterThanOrEqual(0);
        expect(w).toBeGreaterThan(0);
        expect(h).toBeGreaterThan(0);
        expect(x + w).toBeLessThanOrEqual(1.0001);
        expect(y + h).toBeLessThanOrEqual(1.0001);
      }
    }
  });
});

describe("the screenshot set's budget", () => {
  const entries = Object.entries(SET).flatMap(([theme, ids]) => Object.entries(ids).map(([id, e]) => ({ theme, id, e })));
  const files = THEMES.flatMap(({ key }) => {
    try {
      return readdirSync(join(DIR, key)).map((name) => ({ theme: key, name, bytes: statSync(join(DIR, key, name)).size }));
    } catch {
      return [];
    }
  });

  it("holds every image to 90KB, read from the manifest and from the file", () => {
    expect(entries.filter(({ e }) => e.bytes > MAX_IMAGE_BYTES).map(({ theme, id }) => `${theme}/${id}`)).toEqual([]);
    expect(files.filter((f) => f.bytes > MAX_IMAGE_BYTES).map((f) => `${f.theme}/${f.name}`)).toEqual([]);
  });

  it("holds the whole set to 18MB, read from the manifest and from the files", () => {
    expect(entries.reduce((n, { e }) => n + e.bytes, 0)).toBeLessThanOrEqual(MAX_SET_BYTES);
    expect(files.reduce((n, f) => n + f.bytes, 0)).toBeLessThanOrEqual(MAX_SET_BYTES);
  });

  it("records each file's real size, and no file the manifest does not name", () => {
    for (const { theme, id, e } of entries) expect(statSync(fileOf(theme, id)).size, `${theme}/${id}`).toBe(e.bytes);
    const named = new Set(entries.map(({ theme, id }) => `${theme}/${id}.webp`));
    expect(files.map((f) => `${f.theme}/${f.name}`).filter((f) => !named.has(f))).toEqual([]);
  });
});

describe("shotFor", () => {
  it("is null for an id only the object prototype answers to, in a theme or by the default's fallback", () => {
    for (const id of ["toString", "constructor", "__proto__", "hasOwnProperty"]) {
      expect(shotFor("kaldheim", id)).toBeNull();
      expect(shotFor("innistrad", id)).toBeNull();
    }
    expect(shotFor("toString", "home")?.src).toBe(`/about/shots/${DEFAULT_THEME}/home.webp`);
  });

  it("reads the reader's own theme", () => {
    expect(shotFor("kaldheim", "home")?.src).toBe("/about/shots/kaldheim/home.webp");
  });

  it("reads the default theme's image for an unknown theme, or none", () => {
    expect(shotFor("innistrad", "home")?.src).toBe(`/about/shots/${DEFAULT_THEME}/home.webp`);
    expect(shotFor(undefined, "home")?.src).toBe(`/about/shots/${DEFAULT_THEME}/home.webp`);
  });

  it("carries a tool's halo box and a frame's size", () => {
    const tool = shotFor(DEFAULT_THEME, toolShotId("top-off"));
    expect(tool?.halo).toEqual(expect.objectContaining({ x: expect.any(Number), w: expect.any(Number) }));
    expect(shotFor(DEFAULT_THEME, "home")).toEqual(expect.objectContaining({ width: 780, height: 1688, halo: null }));
  });

  it("reads the default theme's image where a known theme has no capture of that id", () => {
    const set: ShotSet = { [DEFAULT_THEME]: { home: { width: 780, height: 1688, bytes: 1, quality: 75 } }, kaldheim: {} };
    expect(shotFor("kaldheim", "home", set)?.src).toBe(`/about/shots/${DEFAULT_THEME}/home.webp`);
  });

  it("is null for an id nothing captured", () => {
    expect(shotFor(DEFAULT_THEME, "no-such-screen")).toBeNull();
  });
});
