// The support address wherever it sits: a 12.5px mailto link on the /credits bands on --surface (B1's pause band, R4's
// slow return band) and the Refunds line and legal pages on --bg, with --surface-raised held for a modal that draws it. Its words must clear WCAG's 4.5:1
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
const ON_SURFACE = ["pause-band.tsx", "return-band.tsx"].map((f) => [f, readFileSync(join(SRC, "components", "credits", f), "utf8")] as const);
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
