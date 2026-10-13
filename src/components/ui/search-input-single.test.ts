import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// One search field (Hugh, 2026-10-13): a hand-rolled `<input type="search">` is how the deck list, the precon
// list and two admin lists ended up with no clear, a different icon and Safari's own ✕. `SearchField` in
// `ui/text-field.tsx` is the only place that draws one.
const walk = (d: string): string[] =>
  readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx$/.test(f) && !/\.test\./.test(f) ? [p] : [];
  });

describe("no hand-rolled search input", () => {
  it("draws type=\"search\" only inside the shared SearchField", () => {
    const offenders = walk(join(process.cwd(), "src"))
      .filter((p) => !p.endsWith("ui/text-field.tsx"))
      .filter((p) => /<input\b[\s\S]{0,300}?type=["']search["']/.test(readFileSync(p, "utf8")));
    expect(offenders).toEqual([]);
  });
});
