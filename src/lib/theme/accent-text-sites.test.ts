import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// The accent drawn as TEXT reads --accent-text, never --accent (text inks addendum R1,
// design/design_handoff_the99_text_inks/). The two are the same ink in five themes; in Phyrexia --accent stays dark
// for fills, the focus ring and the fit bar, and only --accent-text reads 4.5:1 on its surfaces. A text site left on
// --accent therefore looks right in five themes and fails AA in the sixth, which no screenshot in the default theme
// shows. The guard is absolute: any accent TEXT site anywhere under src fails. --accent stays for fills, borders,
// rings, decoration (underline) and the caret, which are not counted.

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

  it("draws no text in --accent (use --accent-text)", () => {
    const over = [...found].map(([file, n]) => `${file}: ${n} accent text site(s), use --accent-text`);
    expect(over).toEqual([]);
  });
});
