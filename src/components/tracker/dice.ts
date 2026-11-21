"use client";

// The 3D dice (F13 dice): `@3d-dice/dice-box-threejs`, loaded only when someone first rolls. The result is chosen here
// with `crypto` and the dice are thrown to land on it (`1d20@N`), so the number on screen never depends on the physics.
// Every failure (the import, no WebGL, reduced motion) leaves the roll to the plain result card with no animation.

export type DieKind = "d6" | "d20" | "coin";

export const SIDES: Record<DieKind, number> = { d6: 6, d20: 20, coin: 2 };

/** A fair roll of 1..sides, from `crypto` (rejection sampling, so no side is favored). */
export function rollFair(sides: number): number {
  const limit = Math.floor(0x1_0000_0000 / sides) * sides;
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return (buf[0] % sides) + 1;
  }
}

type Box = { roll: (notation: string) => Promise<unknown>; clearDice: () => void };
type Scene = { el: HTMLDivElement; box: Box };

let scene: Promise<Scene | null> | null = null;

export const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * The one dice scene, made on first use and kept: the library has no teardown and adds a resize listener per instance,
 * so it lives in a fixed layer on `document.body` that is shown only while a roll is on screen. Null when it cannot run.
 */
function getScene(): Promise<Scene | null> {
  if (reducedMotion() || !hasWebGL()) return Promise.resolve(null);
  scene ??= import("@3d-dice/dice-box-threejs")
    .then(async ({ default: DiceBox }) => {
      const el = document.createElement("div");
      el.id = "tracker-dice";
      el.setAttribute("aria-hidden", "true");
      Object.assign(el.style, { position: "fixed", inset: "0", zIndex: "60", pointerEvents: "none", visibility: "hidden" });
      document.body.append(el);
      const css = getComputedStyle(document.documentElement);
      // The scene paints from the theme's tokens. The named fallbacks only stand in if a token is somehow unset, so
      // a die is never drawn with an empty colour.
      const token = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
      const box = new DiceBox("#tracker-dice", {
        sounds: false,
        shadows: true,
        theme_material: "plastic",
        theme_customColorset: {
          name: "tracker",
          foreground: token("--bg", "black"),
          background: token("--accent", "darkgoldenrod"),
          outline: token("--bg", "black"),
          texture: "none",
          material: "plastic",
        },
        baseScale: 110,
        strength: 1.2,
      });
      await box.initialize();
      return { el, box } satisfies Scene;
    })
    .catch(() => null);
  return scene;
}

/** Starts loading the scene ahead of the first roll (the dice menu opening), so the throw is not held up by the download. */
export function warmDice() {
  void getScene();
}

/**
 * Throws dice that land on `results` (one die each) and resolves true once they settle, or false at once when the
 * scene cannot run, so the caller shows the plain result straight away.
 */
export async function throwDice(kind: DieKind, results: readonly number[]): Promise<boolean> {
  const s = await getScene();
  if (!s) return false;
  try {
    s.box.clearDice();
    s.el.style.visibility = "visible";
    await s.box.roll(`${results.length}d${SIDES[kind]}@${results.join(",")}`);
    return true;
  } catch {
    hideDice();
    return false;
  }
}

/** Clears the dice and hides the layer: the roll's overlay closing. */
export function hideDice() {
  void scene?.then((s) => {
    if (!s) return;
    s.box.clearDice();
    s.el.style.visibility = "hidden";
  });
}
