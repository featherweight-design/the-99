import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { OWNED_RING_MS } from "../../components/decks/use-owned-ring";
import { LANDING_RING_MS } from "../games/landing";
import { RING_FADE_CLASS, RING_FADE_MS, RING_HOLD_MS } from "./ring-timing";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

describe("ring timing (small items 9, A6a)", () => {
  it("is a 2s hold and a 400ms fade", () => {
    expect(RING_HOLD_MS).toBe(2000);
    expect(RING_FADE_MS).toBe(400);
  });
  it("is the one hold for the deck row and the game landing", () => {
    expect(OWNED_RING_MS).toBe(RING_HOLD_MS);
    expect(LANDING_RING_MS).toBe(RING_HOLD_MS);
  });
  it("is mirrored by the stylesheet's fade variable", () => {
    expect(css).toMatch(new RegExp(`--ring-fade-ms:\\s*${RING_FADE_MS}ms`));
  });
  it("fades only when motion is allowed, so reduced motion cuts", () => {
    const block = css.match(/@media \(prefers-reduced-motion: no-preference\) \{\s*\.ring-fade \{[^}]*\}/);
    expect(RING_FADE_CLASS).toBe("ring-fade");
    expect(block?.[0]).toContain("var(--ring-fade-ms)");
    expect(css.match(/(^|[^-])\.ring-fade \{/g)?.length).toBe(1);
  });
});
