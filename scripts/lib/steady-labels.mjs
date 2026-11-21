// Finds a button whose label swaps to a shorter one while it works and is drawn bare, so the button shrinks under the
// pointer (`SteadyLabel`, src/components/ui/steady-label.tsx). A swap is a ternary mentioning a pending-like word (busy, isPending,
// saving...) whose branches are all strings or copy lookups, sitting alone as the child of a `<button>` or a `*Button`
// component. A branch that draws an element (`<PendingMark />`) is a mark, not a label, and is not a swap.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const PENDING = /busy|pending|saving|loading|applying|submitting|checking|sending|working|leaving|google|undoing|adding|removing|reverting|deleting|signingIn/i;
const CLOSER = /^<\/(button|[A-Z]\w*Button)>/;

/** Lines of `source` (1-based) holding a bare pending-label swap. */
export function bareSwaps(source) {
  const lines = source.split("\n");
  const found = [];
  // `const label = busy ? a : b;` drawn later as `{label}` alone in a button is the same swap, one step removed.
  const swapNames = new Set();
  for (const m of source.matchAll(/const (\w+) = ([^;<>]*\?[^;<>]*:[^;<>]*);/g)) if (PENDING.test(m[2])) swapNames.add(m[1]);
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (line.includes("SteadyLabel")) return;
    // alone on its line, closed by the button on the next; or `>{...}</button>` on one line
    const alone = /^\{(.+)\}$/.exec(line);
    const inline = />\{([^{}<>]*\?[^{}<>]*:[^{}<>]*)\}<\/(button|[A-Z]\w*Button)>/.exec(line);
    const expr = inline ? inline[1] : alone && CLOSER.test((lines[i + 1] ?? "").trim()) ? (swapNames.has(alone[1]) ? `${alone[1]} ? a : pending` : alone[1]) : null;
    if (!expr) return;
    if (!expr.includes("?") || !expr.includes(":")) return;
    // Anywhere in the expression: `resumeAt !== null ? a : load === "loading" ? b : c` swaps to a pending word in a later branch.
    if (!PENDING.test(expr)) return;
    if (/</.test(expr)) return;
    found.push(i + 1);
  });
  return found;
}

async function* tsxUnder(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* tsxUnder(p);
    else if (e.name.endsWith(".tsx") && !e.name.endsWith(".test.tsx")) yield p;
  }
}

export async function steadyFindings(root = "src/components") {
  const findings = [];
  let files = 0;
  for await (const path of tsxUnder(root)) {
    files++;
    for (const line of bareSwaps(await readFile(path, "utf8"))) findings.push({ path, line });
  }
  return { files, findings };
}
