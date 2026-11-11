import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
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
  it("needs a crop for every tool and the tour's three pictures", () => {
    // Pinned, not recomputed from the same formula `REQUIRED_SHOTS` uses: the 14 tools and the tour's 3 pictures. A tool
    // added to its registry moves this on purpose.
    expect(REQUIRED_SHOTS).toHaveLength(17);
    expect(TOOLS).toHaveLength(14);
    expect(TOUR_SHOTS).toHaveLength(3);
    for (const id of ["tool-matchups", "tool-lineup", "tour-decks"]) expect(REQUIRED_SHOTS).toContain(id);
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
  const TOP_OFF = toolShotId("top-off");

  it("is null for an id only the object prototype answers to, in a theme or by the default's fallback", () => {
    for (const id of ["toString", "constructor", "__proto__", "hasOwnProperty"]) {
      expect(shotFor("kaldheim", id)).toBeNull();
      expect(shotFor("innistrad", id)).toBeNull();
    }
    expect(shotFor("toString", TOP_OFF)?.src).toBe(`/about/shots/${DEFAULT_THEME}/${TOP_OFF}.webp`);
  });

  it("reads the reader's own theme", () => {
    expect(shotFor("kaldheim", TOP_OFF)?.src).toBe(`/about/shots/kaldheim/${TOP_OFF}.webp`);
  });

  it("reads the default theme's image for an unknown theme, or none", () => {
    expect(shotFor("innistrad", TOP_OFF)?.src).toBe(`/about/shots/${DEFAULT_THEME}/${TOP_OFF}.webp`);
    expect(shotFor(undefined, TOP_OFF)?.src).toBe(`/about/shots/${DEFAULT_THEME}/${TOP_OFF}.webp`);
  });

  it("carries a tool's halo box and a tour picture's size with no halo", () => {
    const tool = shotFor(DEFAULT_THEME, TOP_OFF);
    expect(tool?.halo).toEqual(expect.objectContaining({ x: expect.any(Number), w: expect.any(Number) }));
    expect(shotFor(DEFAULT_THEME, "tour-decks")).toEqual(expect.objectContaining({ width: expect.any(Number), height: expect.any(Number), halo: null }));
  });

  it("reads the default theme's image where a known theme has no capture of that id", () => {
    const set: ShotSet = { [DEFAULT_THEME]: { [TOP_OFF]: { width: 780, height: 400, bytes: 1, quality: 75 } }, kaldheim: {} };
    expect(shotFor("kaldheim", TOP_OFF, set)?.src).toBe(`/about/shots/${DEFAULT_THEME}/${TOP_OFF}.webp`);
  });

  it("is null for an id nothing captured", () => {
    expect(shotFor(DEFAULT_THEME, "no-such-shot")).toBeNull();
  });
});
