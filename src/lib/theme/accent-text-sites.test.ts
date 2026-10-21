import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// The accent drawn as TEXT reads --accent-text, never --accent (text inks addendum R1,
// design/design_handoff_the99_text_inks/). The two are the same ink in five themes; in Phyrexia --accent stays dark
// for fills, the focus ring and the fit bar, and only --accent-text reads 4.5:1 on its surfaces. A text site left on
// --accent therefore looks right in five themes and fails AA in the sixth, which no screenshot in the default theme
// shows. Fills, borders, rings, underline and caret colors stay on --accent and are not counted.

// import.meta.url, not __dirname: Vitest runs tests as ESM.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SRC = join(ROOT, "src");

const IN_CODE = [
  /text-\[color:var\(--accent\)\]/g, // the arbitrary-value class, under any variant
  /text-\[var\(--accent\)\]/g, // the same class without the type hint
  /(?<![\w-])\[color:var\(--accent\)\]/g, // the arbitrary property, `[color:...]`
  /\btext-accent\b(?!-)/g, // the @theme utility; text-accent-text and text-accent-hover are other tokens
  /(?<![\w[-])color:(?:[^,;}"'`[]|"[^"\n]*"|'[^'\n]*'){0,200}?["']var\(--accent\)["']/g, // an inline style, plain or in a ternary, over lines
];
const IN_CSS = /(?<![\w-])color:\s*var\(--accent\)(?![\w-])/g;

function sites(file: string, text: string): number {
  if (file.endsWith(".css")) return (text.match(IN_CSS) ?? []).length;
  return IN_CODE.reduce((n, pattern) => n + (text.match(pattern) ?? []).length, 0);
}

function count(): Map<string, number> {
  const found = new Map<string, number>();
  for (const entry of readdirSync(SRC, { recursive: true, encoding: "utf8" })) {
    if (!/\.(tsx?|css)$/.test(entry) || /\.test\./.test(entry)) continue;
    const file = relative(ROOT, join(SRC, entry)).split("\\").join("/");
    const n = sites(file, readFileSync(join(SRC, entry), "utf8"));
    if (n > 0) found.set(file, n);
  }
  return found;
}

// A RATCHET, not a list of exceptions. These are the accent text sites on main when the token landed, grouped by the
// sweep PR that moves them (READINESS.md in the handoff names the boundaries). A sweep deletes its group's entries; a
// file may hold fewer sites than its entry but never more, and a new file holds none. An entry left over after another
// change took its file's last site does not fail, so no other lane's CI breaks on this list; the sweep deletes it. The
// last sweep empties this object, and the guard is then absolute.
const ALLOWANCE: Record<string, number> = {


  // S11 (19 files)
  "src/app/commanders/page.tsx": 2,
  "src/app/page.tsx": 1,
  "src/components/card-search/search-layer.tsx": 2,
  "src/components/card-search/search-row.tsx": 2,
  "src/components/discovery/first-run-tour.tsx": 2,
  "src/components/home/first-run.tsx": 1,
  "src/components/home/hero-commander.tsx": 1,
  "src/components/home/precon-pick-receipt.tsx": 1,
  "src/components/join/join-flow.tsx": 2,
  "src/components/join/newcomer-column.tsx": 1,
  "src/components/scan-lab/scan-controls.tsx": 1,
  "src/components/sets/cost-strip.tsx": 2,
  "src/components/sets/delta-strip.tsx": 1,
  "src/components/sets/set-grid-view.tsx": 2,
  "src/components/shell/account-menu.tsx": 2,
  "src/components/shell/credit-chip.tsx": 1,
  "src/components/shell/nav.tsx": 1,
  "src/components/wishlist/card-wishlist.tsx": 1,
  "src/components/wishlist/wishlist-search.tsx": 1,
};

describe("the accent as text", () => {
  const found = count();

  it("counts every form a text site takes, and nothing that is not one", () => {
    const text = [
      'className="text-[color:var(--accent)]"',
      'className="hover:text-[color:var(--accent)]"',
      'className="text-[var(--accent)]"',
      'className="[border:1px_solid_var(--accent)] [color:var(--accent)]"',
      'className="text-accent"',
      'style={{ color: "var(--accent)" }}',
      "style={{ color: 'var(--accent)' }}",
      'style={{ color: current ? "var(--accent)" : "var(--fg-body)" }}',
      `style={{\n  color:\n    selected\n      ? "var(--accent)"\n      : "var(--fg-faint)",\n}}`,
      `style={{ color: selected\n  ? "var(--accent)" : "var(--fg-faint)" }}`,
    ];
    for (const sample of text) expect(sites("a.tsx", sample), sample).toBe(1);
    const notText = [
      'className="text-[color:var(--accent-text)] text-accent-text text-accent-hover"',
      'className="bg-[color:var(--accent)] border-[color:var(--accent)] decoration-[color:var(--accent)]"',
      'className="border-[var(--accent)] outline-[color:var(--accent)]"',
      'style={{ backgroundColor: "var(--accent)", borderColor: "var(--accent)" }}',
      'style={{ color: "var(--fg)", border: "1px solid var(--accent)" }}',
      // a [color:...] class on one line must not run on into the next line's borderColor
      `className="[color:var(--fg)]"\n      style={{ borderColor: on ? "var(--accent)" : "var(--border)" }}`,
    ];
    for (const sample of notText) expect(sites("a.tsx", sample), sample).toBe(0);
    expect(sites("a.css", ".x { color: var(--accent); border-color: var(--accent); }")).toBe(1);
  });

  it("draws no new text in --accent (use --accent-text)", () => {
    const over = [...found]
      .filter(([file, n]) => n > (ALLOWANCE[file] ?? 0))
      .map(([file, n]) => `${file}: ${n} site(s), allowed ${ALLOWANCE[file] ?? 0}`);
    expect(over).toEqual([]);
  });
});
