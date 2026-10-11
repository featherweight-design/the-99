// Fails when a .tsx, .ts or .css file under src uses a bare `border-r` or `border-b` with no SIDE-SPECIFIC color
// override. Tailwind 4 registers a color utility for every theme color, and this app's mana
// palette names five colors `w`/`u`/`b`/`r`/`g` — two of which are also Tailwind's own side
// abbreviations, so `border-r`/`border-b` silently repaint the border in mana red/black instead
// of `currentColor` or whatever the author intended. See `scripts/lib/border-collision.mjs`.
import { collisionFindings } from "./lib/border-collision.mjs";

const { files, findings } = await collisionFindings("src");

if (findings.length === 0) {
  console.log(`no bare border-r/border-b collisions — ${files} files read`);
  process.exit(0);
}
for (const { path, side, line } of findings) {
  console.error(`${path}:${line} bare "border-${side}" with no same-variant border-${side}-[color:...] override`);
}
console.error(`\n${findings.length} unresolved border collision(s)`);
process.exit(1);
