import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * An input drawn inside a bordered field shows its focus on the field (`AFFIX_FOCUS` / `AFFIX_FOCUS_INPUT`
 * on the wrapper, `AFFIX_INPUT` on the input; `ui/text-field.tsx`). Hugh, 2026-10-12: Suggested changes'
 * "Most per card" drew its ring on the inner input, and the fix had to hold on ALL inputs. A per-site fix
 * drifts, so this reads every `<input>` in `src/components` and fails one that is an inner input (no border
 * of its own, a transparent ground) or suppresses its own ring, unless it takes the shared half, in a file
 * that also puts a shared wrapper half on its field.
 */

const ROOT = join(process.cwd(), "src/components");

/** Inputs that suppress their ring for a reason of their own, never as a wrapped field. Each says why. */
const ALLOWED: Record<string, string> = {
  "decks/spine-desktop.tsx": "the rename field is a standalone input, drawn only while editing, whose accent border is its focus",
  "decks/spine-mobile.tsx": "the rename field is a standalone input, drawn only while editing, whose accent border is its focus",
  "ui/count-stepper.tsx": "the basics stepper's count is a bare field with no box to wrap it, whose focus is its own 2px accent underline (R2 design table)",
};

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return path.endsWith(".tsx") && !path.endsWith(".test.tsx") ? [path] : [];
  });
}

/** Each `<input ... />` opening tag's text, from `<input` to the `/>` that closes it at depth 0. */
export function inputTags(source: string): string[] {
  const tags: string[] = [];
  let at = source.indexOf("<input");
  while (at !== -1) {
    let depth = 0;
    let end = at;
    for (; end < source.length; end++) {
      const ch = source[end];
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      else if (depth === 0 && ch === ">" ) break;
    }
    tags.push(source.slice(at, end + 1));
    at = source.indexOf("<input", end);
  }
  return tags;
}

/** Whether a tag is an inner input that draws (or suppresses) focus by itself rather than through the shared half. */
export function looseInner(tag: string): boolean {
  if (/type=["'](?:checkbox|radio|hidden|file|range|color|date)["']/.test(tag) || /\bsr-only\b/.test(tag)) return false;
  if (tag.includes("AFFIX_INPUT")) return false;
  const suppresses = /\boutline-none\b/.test(tag);
  const inner = /\bbg-transparent\b/.test(tag) && /\bborder-(?:0|none)\b/.test(tag);
  return suppresses || inner;
}

describe("wrapped inputs show focus on their field", () => {
  it("finds the shapes it is about (its own failure path)", () => {
    expect(looseInner('<input className="flex-1 bg-transparent border-0 font-mono" />')).toBe(true);
    expect(looseInner('<input className="w-[7ch] bg-transparent border-none outline-none" />')).toBe(true);
    expect(looseInner("<input className={`x ${AFFIX_INPUT}`} />")).toBe(false);
    expect(looseInner('<input type="checkbox" className="sr-only peer" />')).toBe(false);
    expect(inputTags('<input value={a > b ? "x" : "y"} className="outline-none" />')).toHaveLength(1);
    expect(inputTags('<input value={a > b ? "x" : "y"} className="outline-none" />')[0]).toContain("outline-none");
  });

  it("holds on every input in src/components", () => {
    const offenders: string[] = [];
    const unwrapped: string[] = [];
    for (const path of files(ROOT)) {
      const rel = relative(ROOT, path);
      if (ALLOWED[rel]) continue;
      const source = readFileSync(path, "utf8");
      const tags = inputTags(source);
      if (tags.some(looseInner)) offenders.push(rel);
      // A use, not the import: the import line names it whether or not any field wears it.
      const body = source.split("\n").filter((line) => !line.startsWith("import ")).join("\n");
      if (tags.some((t) => t.includes("AFFIX_INPUT")) && !/AFFIX_FOCUS(?:_INPUT)?\b/.test(body)) unwrapped.push(rel);
    }
    expect(offenders, "an inner input draws or suppresses its own ring: use AFFIX_INPUT and put AFFIX_FOCUS on its field").toEqual([]);
    expect(unwrapped, "an input takes AFFIX_INPUT but its field takes no shared focus half").toEqual([]);
  });
});
