import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The demo's card modal (`demo-card-modal.tsx`) is the state half of the signed-in `CardModal` with the writes taken out. The pure
// parts (plates, zoom layer, face and price derivations, turning art, under-card rows, own-height hook, geometry) are ONE copy in
// `cards/card-modal-parts.tsx`, which both import (5l-e, 5l-f); what is still a copy is the dialog's shell. A copy drifts the day one
// side changes, so this holds the shell's literal strings equal and keeps the shared parts from being copied back.
const root = join(process.cwd(), "src/components");
const signedIn = readFileSync(join(root, "cards/card-modal.tsx"), "utf8");
const parts = readFileSync(join(root, "cards/card-modal-parts.tsx"), "utf8");
const demo = readFileSync(join(root, "landing/demo/demo-card-modal.tsx"), "utf8");

/** Literal strings both modals must hold, character for character: the dialog and the backdrop (the shell, still forked). */
const SHELL = [
  `relative flex flex-col overflow-hidden w-full h-full md:h-[620px] md:max-h-[85dvh] md:w-[820px] md:flex-row md:rounded-2xl bg-[color:var(--surface-sunken)] md:bg-[color:var(--surface-rail)] md:[border:1px_solid_var(--border-strong)]`,
  `role="presentation"`,
  `"color-mix(in oklab, var(--bg) 72%, transparent)"`,
];

describe("the demo's card modal and the signed-in one", () => {
  it("draw the dialog and the backdrop from the same literal strings", () => {
    for (const literal of SHELL) {
      expect(signedIn.includes(literal), `card-modal.tsx no longer holds: ${literal}`).toBe(true);
      expect(demo.includes(literal), `demo-card-modal.tsx no longer holds: ${literal}`).toBe(true);
    }
  });

  it("both import the shared parts from card-modal-parts and neither declares them again", () => {
    for (const [name, source] of [["card-modal.tsx", signedIn], ["demo-card-modal.tsx", demo]] as const) {
      expect(source, name).toMatch(/from "(\.\/|\.\.\/\.\.\/cards\/)card-modal-parts"/);
      // A local copy of a part is the drift this file exists to stop: the plate, the own-height hook, the geometry, the zoom layer.
      for (const copy of [
        /const NeighborPlate\b/, /function useOwnHeight\b/, /const settling\b/, /const DIALOG_HALF_WIDTH\b/, /const PLATE_(GAP|WIDTH)\b/,
        /const MIN_TEASER_CARD_WIDTH\b/, /const ZOOM_REGION\b/, /id=\{ZOOM_REGION\}/, /data-testid="card-zoom"/, /data-testid="modal-art-turn"/,
        /data-testid="modal-zoom-hint"/, /function cardFace\b/, /cheapestLiveCents\(/,
      ]) {
        expect(copy.test(source), `${name} holds its own copy of ${copy}`).toBe(false);
      }
    }
    expect(parts).toContain("export const NEIGHBOR_MIN_WIDTH = 2 * (DIALOG_HALF_WIDTH + PLATE_GAP + PLATE_WIDTH + 24);");
  });

  it("hands the two drawing halves the same wiring: both render CardModalArtSide, CardModalSheet and the zoom layer", () => {
    for (const source of [signedIn, demo]) {
      expect(source).toMatch(/<CardModalArtSide\b/);
      expect(source).toMatch(/<CardModalSheet\b/);
      expect(source).toMatch(/<CardZoomLayer\b/);
    }
  });
});
