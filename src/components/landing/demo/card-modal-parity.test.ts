import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The demo's card modal (`demo-card-modal.tsx`) is the state half of the signed-in `CardModal` with the writes taken out, so
// its literal geometry and the zoom layer's markup are copies of that file's. A copy drifts the day one side changes, so this
// holds the two to the same strings: change one and this names the line the other must follow.
const root = join(process.cwd(), "src/components");
// The signed-in modal with its shared parts (5l-e moved the plates, zoom layer and geometry into `card-modal-parts.tsx`).
const signedIn = readFileSync(join(root, "cards/card-modal.tsx"), "utf8") + readFileSync(join(root, "cards/card-modal-parts.tsx"), "utf8");
const demo = readFileSync(join(root, "landing/demo/demo-card-modal.tsx"), "utf8");

/** Literal strings both files must hold, character for character: the dialog, the backdrop, the zoom layer and its parts. */
const SHARED = [
  `relative flex flex-col overflow-hidden w-full h-full md:h-[620px] md:max-h-[85dvh] md:w-[820px] md:flex-row md:rounded-2xl bg-[color:var(--surface-sunken)] md:bg-[color:var(--surface-rail)] md:[border:1px_solid_var(--border-strong)]`,
  `role="presentation"`,
  `absolute inset-0 z-20 flex flex-col items-center justify-center overflow-hidden anim-zoom-in bg-[color:var(--surface-sunken)] md:bg-[color-mix(in_srgb,var(--bg)_94%,transparent)] md:backdrop-blur-[10px]`,
  `pointer-events-none absolute inset-0 md:hidden`,
  `"--zoom-w-md": twoFaced`,
  `"min(318px, calc(100vw - 32px), calc((100vh - 196px) * 0.7159))"`,
  `"min(318px, calc(100vw - 32px), calc((100vh - 140px) * 0.7159))"`,
  `"min(372px, calc((min(620px, 85dvh) - 128px) * 0.7159))"`,
  `"min(372px, calc((min(620px, 85dvh) - 72px) * 0.7159))"`,
  `aspectRatio: "63/88",`,
  `mt-[12px] flex justify-center`,
  `relative font-mono text-[11px] mt-[14px] m-0 max-w-[calc(100%-32px)] overflow-hidden text-ellipsis whitespace-nowrap rounded-[7px] px-[8px] py-[3px] bg-[color:var(--bg)] border border-[color:var(--border-strong)] md:rounded-none md:p-0 md:bg-transparent md:border-0`,
  `absolute flex items-center justify-center rounded-full top-[22px] right-[18px] md:right-[24px] w-[32px] md:w-[34px] h-[32px] md:h-[34px] text-[16px] md:text-[15px] bg-[color:var(--elevated)] border border-[color:var(--border-strong)] text-[color:var(--fg)]`,
  `group absolute top-1/2 -translate-y-1/2 flex flex-col items-center gap-[10px] cursor-pointer bg-transparent border-0 p-0 outline-none`,
  `"color-mix(in oklab, var(--bg) 72%, transparent)"`,
  `"0 18px 40px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.3)"`,
  `rotateY(180deg)`,
  `blur(22px)`,
];

describe("the demo's card modal and the signed-in one", () => {
  it("draw the dialog, the zoom layer and the neighbor plate from the same literal strings", () => {
    for (const literal of SHARED) {
      expect(signedIn.includes(literal), `card-modal.tsx no longer holds: ${literal}`).toBe(true);
      expect(demo.includes(literal), `demo-card-modal.tsx no longer holds: ${literal}`).toBe(true);
    }
  });

  it("agree on the dialog's half-width, the plates' measures, the teaser's smallest card and the under-card stack", () => {
    for (const [name, value] of [["DIALOG_HALF_WIDTH", "410"], ["PLATE_GAP", "24"], ["PLATE_WIDTH", "168"], ["MIN_TEASER_CARD_WIDTH", "120"]]) {
      const re = new RegExp(`const ${name} = ${value};`);
      expect(re.test(signedIn), `card-modal.tsx ${name}`).toBe(true);
      expect(re.test(demo), `demo-card-modal.tsx ${name}`).toBe(true);
    }
    expect(signedIn).toContain("export const NEIGHBOR_MIN_WIDTH = 2 * (DIALOG_HALF_WIDTH + PLATE_GAP + PLATE_WIDTH + 24);");
    expect(demo).toContain("export const NEIGHBOR_MIN_WIDTH = 2 * (DIALOG_HALF_WIDTH + PLATE_GAP + PLATE_WIDTH + 24);");
    // 10 above the art, the hint's 15, the price row's 27, and the turn control's 38 when two-faced (`underCardHeight`).
    expect(signedIn).toContain("return 10 + 15 + (twoFaced ? 38 : 0) + 27 + (door ? DOOR_HEIGHT : 0);");
    expect(demo).toContain("const UNDER_CARD_BASE = 10 + 15 + 27;");
    expect(demo).toContain("UNDER_CARD_BASE + (twoFaced ? 38 : 0)");
  });

  it("hands the two drawing halves the same wiring: both render CardModalArtSide and CardModalSheet", () => {
    for (const source of [signedIn, demo]) {
      expect(source).toMatch(/<CardModalArtSide\b/);
      expect(source).toMatch(/<CardModalSheet\b/);
    }
  });
});
