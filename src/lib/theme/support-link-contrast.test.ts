// The support address in the deletion warning (buying-credits D1/D2, U5): a 13px mailto link drawn in a SocialModal, which is
// --surface-raised as a popover and --surface as the phone sheet. It must clear WCAG's 4.5:1 on both grounds in every
// theme, in the ink the component actually uses, read from its source so a change there is a change here.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { contrast } from "./color";
import { parseThemeBlocks } from "./parse-css";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const THEMES = parseThemeBlocks(readFileSync(join(SRC, "app", "globals.css"), "utf8"));
const LINK = readFileSync(join(SRC, "components", "credits", "support-link.tsx"), "utf8");
const WARNING = readFileSync(join(SRC, "components", "credits", "delete-warning.tsx"), "utf8");
const FLOOR = 4.5;

describe("the deletion warning's support link", () => {
  const m = /raised: "text-\[color:var\(--([a-z-]+)\)\]"/.exec(LINK);

  it("is drawn in the raised ink this test measures", () => {
    expect(m, "support-link.tsx no longer declares the raised ink as this test reads it").not.toBeNull();
    expect(WARNING).toContain('<SupportLink ground="raised" />');
  });

  it.each([...THEMES.keys()])("clears 4.5:1 on both modal grounds in %s", (name) => {
    const t = THEMES.get(name)!;
    for (const ground of ["surface-raised", "surface"]) {
      expect(contrast(t.get(m![1])!, t.get(ground)!), `${name}: --${m![1]} on --${ground}`).toBeGreaterThanOrEqual(FLOOR);
    }
  });
});
