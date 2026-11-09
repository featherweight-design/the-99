import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The demo's card modal (`demo-card-modal.tsx`) is the state half of the signed-in `CardModal` with the writes taken out. The pure
// parts (plates, zoom layer, face and price derivations, turning art, under-card rows, own-height hook, geometry) are ONE copy in
// `cards/card-modal-parts.tsx`, and the dialog's hooks (snap, Escape ladder, paging keys, focus returns, turn handlers) are ONE copy in
// `cards/card-modal-hooks.ts`, which both import (5l-e, 5l-f), and the provider-side paging pieces (arrival, announcer, return
// focus, plates, Prev/Next/peek wiring) are ONE copy in `cards/card-detail-paging.ts`, which the signed-in provider and the demo's host
// import; what is still a copy is the dialog's shell. A copy drifts the day one side changes, so this holds the shell's literal
// strings equal and keeps the shared parts, hooks and paging pieces from being copied back.
const root = join(process.cwd(), "src/components");
const signedIn = readFileSync(join(root, "cards/card-modal.tsx"), "utf8");
const parts = readFileSync(join(root, "cards/card-modal-parts.tsx"), "utf8");
const hooks = readFileSync(join(root, "cards/card-modal-hooks.ts"), "utf8");
const demo = readFileSync(join(root, "landing/demo/demo-card-modal.tsx"), "utf8");
const provider = readFileSync(join(root, "cards/card-detail-provider.tsx"), "utf8");
const paging = readFileSync(join(root, "cards/card-detail-paging.ts"), "utf8");
const host = readFileSync(join(root, "landing/demo/demo-card-host.tsx"), "utf8");

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

  it("both import the dialog's hooks from card-modal-hooks and neither holds its own copy", () => {
    const names = ["useSheetSnap", "runEscapeLadder", "usePagingKeys", "useFocusReturns", "usePagedInitialFocus", "useCardTurnHandlers"];
    for (const [name, source] of [["card-modal.tsx", signedIn], ["demo-card-modal.tsx", demo]] as const) {
      expect(source, name).toMatch(/from "(\.\/|\.\.\/\.\.\/cards\/)card-modal-hooks"/);
      for (const hook of names) expect(source, `${name} does not call ${hook}`).toContain(`${hook}(`);
      // A local copy of a hook's body is the drift this stops: the sheet's snap state, the arrow-key listener, the focus-return
      // refs, the turn handlers and the tilt and press handlers.
      for (const copy of [
        /setSnapState\b/, /const wasFull\b/, /const wasZoomed\b/, /addEventListener\("keydown"/, /function onZoomFlip\b/, /function onFlip\b/,
        /function onTurnSettled\b/, /function onArtTurnSettled\b/, /const endZoomPress\b/, /liftTilt\(/, /const reportedMount\b/,
      ]) {
        expect(copy.test(source), `${name} holds its own copy of ${copy}`).toBe(false);
      }
    }
    for (const hook of names) expect(hooks).toContain(`export function ${hook}(`);
  });

  it("hands the two drawing halves the same wiring: both render CardModalArtSide, CardModalSheet and the zoom layer", () => {
    for (const source of [signedIn, demo]) {
      expect(source).toMatch(/<CardModalArtSide\b/);
      expect(source).toMatch(/<CardModalSheet\b/);
      expect(source).toMatch(/<CardZoomLayer\b/);
    }
  });

  it("the provider and the demo's host page through card-detail-paging and neither holds its own copy", () => {
    const names = ["arrivalOf", "usePagingArrival", "useAnnouncer", "usePagedReturnFocus", "plateFor", "usePagingHandlers"];
    for (const [name, source] of [["card-detail-provider.tsx", provider], ["demo-card-host.tsx", host]] as const) {
      expect(source, name).toMatch(/from "(\.\/|\.\.\/\.\.\/cards\/)card-detail-paging"/);
      for (const fn of names) expect(source, `${name} does not call ${fn}`).toContain(`${fn}(`);
      // A local copy is the drift this stops: the paging sink span, the plate's printing and film, the
      // Prev/Next index arithmetic.
      for (const copy of [/createElement\("span"\)/, /resolvedPrinting\(/, /faceFilm\(/, /index - 1, "prev"/, /index \+ 1, "next"/]) {
        expect(copy.test(source), `${name} holds its own copy of ${copy}`).toBe(false);
      }
    }
    for (const fn of names) expect(paging).toMatch(new RegExp(`export function ${fn}\\(`));
  });
});
