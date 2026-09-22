import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * EVERY MOUNT OF THE MARK CARRIES ITS HOVER — checked over the tree rather than per
 * surface, because the defect class is a mount somebody adds later.
 *
 * /collection shipped its rows and tiles drawing the glyph bare while the decklist row
 * had the tooltip, so the same mark explained itself on one surface and not the other
 * (reported 2026-09-19). A render test per surface would have proved the four sites that
 * exist today and said nothing about the fifth.
 *
 * The check is structural: a `<CardFactMark` must sit inside an unclosed `<FactTooltip`.
 * That is weaker than driving a pointer — `fact-tooltip.test.tsx` does that, once, for
 * the component itself — and it is the half that scales.
 */

/** Sites where the word is already beside the glyph, so a hover would repeat it. */
const EXEMPT = new Map([
  ["src/components/decks/decklist.tsx", "the key's own sample — the word it defines is the next element"],
  ["src/components/collection/collection-mark-key.tsx", "the key's own sample, as above"],
  ["src/components/decks/add-surface-mark-key.tsx", "the add surfaces' key, same sample"],
  ["src/components/cards/card-modal.tsx", "the modal spells all three facts out in prose"],
  [
    "src/components/decks/bracket-climb.tsx",
    "the climb's figure names the rule in the next element — and nothing in the climb is "
    + "interactive, which a tooltip trigger would change",
  ],
]);

function tsxFiles(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) tsxFiles(p, out);
    else if (e.name.endsWith(".tsx") && !e.name.includes(".test.")) out.push(p);
  }
  return out;
}

describe("the mark's hover, across every surface", () => {
  it("wraps every mount that is not a key sample in FactTooltip", () => {
    const bare: string[] = [];
    let mounts = 0;
    for (const file of tsxFiles("src")) {
      const src = readFileSync(file, "utf8");
      if (!src.includes("<CardFactMark")) continue;
      const rel = file.replace(/\\/g, "/");
      if (EXEMPT.has(rel)) continue;
      for (const before of src.split("<CardFactMark").slice(0, -1)) {
        mounts += 1;
        const open = before.lastIndexOf("<FactTooltip");
        const close = before.lastIndexOf("</FactTooltip>");
        if (open <= close) bare.push(rel);
      }
    }
    // A sweep that matched nothing would report a clean tree over a deleted component.
    expect(mounts).toBeGreaterThanOrEqual(4);
    expect(bare).toEqual([]);
  });

  it("names only exemptions that still draw the mark", () => {
    // An exemption that outlives its mount hides the next bare one added to that file.
    for (const [rel, why] of EXEMPT) {
      expect(readFileSync(rel, "utf8").includes("<CardFactMark"), `${rel}: ${why}`).toBe(true);
    }
  });
});
