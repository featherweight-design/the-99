// The support address wherever it sits: the deletion warning (buying-credits D1/D2, U5), a 12.5px mailto link in a
// SocialModal, which is --surface-raised as a popover and --surface as the phone sheet, the /credits bands on --surface
// (B1's pause band, R4's slow return band) and the Refunds line and legal pages on --bg. Its words must clear WCAG's 4.5:1
// on every one of those grounds in every theme, in the ink the component actually uses, read from its source so a change
// there is a change here. The underline is the accent (R3 addendum, item 4), so it is a link by more than colour.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { contrast } from "./color";
import { parseThemeBlocks } from "./parse-css";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const THEMES = parseThemeBlocks(readFileSync(join(SRC, "app", "globals.css"), "utf8"));
const LINK = readFileSync(join(SRC, "components", "credits", "support-link.tsx"), "utf8");
const ON_SURFACE = ["delete-warning.tsx", "pause-band.tsx", "return-band.tsx"].map((f) => [f, readFileSync(join(SRC, "components", "credits", f), "utf8")] as const);
const FLOOR = 4.5;

describe("the support link", () => {
  const m = /whitespace-nowrap text-\[color:var\(--([a-z-]+)\)\] underline decoration-\[color:var\(--accent\)\]/.exec(LINK);

  it("is drawn in the ink this test measures, underlined in the accent", () => {
    expect(m, "support-link.tsx no longer declares its ink as this test reads it").not.toBeNull();
    for (const [file, src] of ON_SURFACE) expect(src, `${file} draws the one SupportLink`).toContain("<SupportLink />");
  });

  it.each([...THEMES.keys()])("clears 4.5:1 on every ground it sits on in %s", (name) => {
    const t = THEMES.get(name)!;
    for (const ground of ["surface-raised", "surface", "bg"]) {
      expect(contrast(t.get(m![1])!, t.get(ground)!), `${name}: --${m![1]} on --${ground}`).toBeGreaterThanOrEqual(FLOOR);
    }
  });
});

// The deletion warning's Plan and Packs labels name what deletion forfeits, so they take the same 4.5:1 floor on both
// modal grounds, in the ink the component draws (the board's `--fg-faint` was under it in four themes when this was drawn).
describe("the deletion warning's balance labels", () => {
  const source = ON_SURFACE.find(([f]) => f === "delete-warning.tsx")![1];
  const label = /tracking-\[0\.12em\] text-\[color:var\(--([a-z-]+)\)\]">\{cell\.label\}/.exec(source);

  it("are drawn in an ink this test can read", () => {
    expect(label, "delete-warning.tsx no longer draws the label as this test reads it").not.toBeNull();
  });

  it.each([...THEMES.keys()])("clear 4.5:1 on both modal grounds in %s", (name) => {
    const t = THEMES.get(name)!;
    for (const ground of ["surface-raised", "surface"]) {
      expect(contrast(t.get(label![1])!, t.get(ground)!), `${name}: --${label![1]} on --${ground}`).toBeGreaterThanOrEqual(FLOOR);
    }
  });
});
