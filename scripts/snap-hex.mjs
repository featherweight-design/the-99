// Read-only report: for every hex literal under src/, name the closest :root
// token and the OKLab distance to it. Written for the Phase 2 sweep, where the
// map covers the common cases and this covers the tail.
//
// Usage: node scripts/snap-hex.mjs

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SNAP = 0.03; // the audit's own "imperceptible" band

const css = readFileSync("src/app/globals.css", "utf8");
const root = css.slice(css.indexOf(":root"), css.indexOf("@theme"));
const tokens = [...root.matchAll(/--([a-z0-9-]+)\s*:\s*(#[0-9A-Fa-f]{6});/g)].map(
  ([, name, hex]) => ({ name, hex }),
);

function oklab(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

const dist = (a, b) => Math.hypot(...oklab(a).map((v, i) => v - oklab(b)[i]));

// Walked with fs rather than shelled out to rg: `execSync` runs under /bin/sh,
// where rg is not necessarily on PATH even when it works fine in the terminal.
function* sources(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* sources(path);
    else if (/\.tsx?$/.test(entry.name)) yield path;
  }
}

const hits = [...sources("src")].flatMap(
  (file) => readFileSync(file, "utf8").match(/#[0-9A-Fa-f]{6}\b/g) ?? [],
);

const counts = new Map();
for (const hex of hits) {
  const key = hex.toUpperCase();
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

const rows = [...counts.entries()]
  .map(([hex, count]) => {
    const best = tokens
      .map((t) => ({ ...t, d: dist(hex, t.hex) }))
      .sort((a, b) => a.d - b.d)[0];
    return { hex, count, token: best.name, d: best.d, exact: best.hex === hex };
  })
  .sort((a, b) => a.d - b.d || b.count - a.count);

for (const r of rows) {
  const verdict = r.exact ? "EXACT" : r.d <= SNAP ? "snap " : "REVIEW";
  console.log(
    `${verdict}  ${r.hex}  x${String(r.count).padStart(3)}  --${r.token}  ΔE ${r.d.toFixed(4)}`,
  );
}
