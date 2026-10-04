import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { DIALOG_HALF_WIDTH, NEIGHBOR_MIN_WIDTH } from "./card-modal";

// Carousel ledger 2: the neighbor plates' threshold is arithmetic on the dialog's width. The
// threshold is computed from `DIALOG_HALF_WIDTH`, but the dialog's own width is a Tailwind literal
// that cannot read a constant, so this is what keeps the two from drifting apart.
describe("the desktop dialog's geometry", () => {
  const source = readFileSync(join(process.cwd(), "src/components/cards/card-modal.tsx"), "utf8");

  it("draws the dialog at twice the half-width the plates are placed from", () => {
    // The dialog's own class string, the one that sets its desktop height too; a comment that
    // quotes the class does not count.
    const dialog = source.split("\n").filter((line) => line.includes("md:h-[620px]") && !line.trim().startsWith("//"));
    expect(dialog).toHaveLength(1);
    expect(dialog[0].match(/md:w-\[(\d+)px\]/)?.[1]).toBe(String(2 * DIALOG_HALF_WIDTH));
    expect(2 * DIALOG_HALF_WIDTH).toBe(820);
  });

  it("puts the plates' threshold at 1252px for the 820px dialog", () => {
    expect(NEIGHBOR_MIN_WIDTH).toBe(1252);
  });
});
