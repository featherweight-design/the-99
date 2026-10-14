import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Card art drawn as a CSS background fades in only through `ArtLayer` (card-art fades plan, PR 3). A host that
 * paints `url(...)` itself pops its art in, and a background has no load event, so nothing else can fade it.
 * This scan COMPUTES every place under `src/components` that builds a CSS url, and fails on any not listed
 * here, each with its count and its reason, so a new surface cannot ship unfaded and a listed file cannot
 * quietly grow a second use.
 */
const ALLOWED: Record<string, { count: number; reason: string }> = {
  "ui/art-wash-near.tsx": { count: 1, reason: "the primitive itself: ArrivingArt, which ArtLayer wraps" },
  "cards/card-modal.tsx": { count: 3, reason: "the card details' main faces and zoom: art the reader asked for, left unfaded (PR 1)" },
  "decks/hover-preview.tsx": { count: 1, reason: "the hover preview: art the reader asked for, left unfaded (PR 1)" },
  "sets/set-icon.tsx": { count: 2, reason: "a set symbol drawn as a mask, not card art" },
};

const ROOT = join(process.cwd(), "src/components");
// `cssUrl(`, and a template url in any quoting: `url(${`, `url("${`, `url('${`.
const URL_BUILDERS = /cssUrl\(|url\(["']?\$\{/g;

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return files(p);
    return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [p] : [];
  });
}

describe("card art drawn as a CSS background", () => {
  it("goes through ArtLayer everywhere but the listed, reasoned exceptions", () => {
    const found: Record<string, number> = {};
    for (const f of files(ROOT)) {
      const n = (readFileSync(f, "utf8").match(URL_BUILDERS) ?? []).length;
      if (n > 0) found[relative(ROOT, f)] = n;
    }
    expect(found).toEqual(Object.fromEntries(Object.entries(ALLOWED).map(([f, a]) => [f, a.count])));
  });
});
