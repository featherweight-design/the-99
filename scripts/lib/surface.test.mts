// @vitest-environment node
//
// The repo default is jsdom, which replaces `import.meta.url` with the page
// location — every path here would resolve against `http://localhost/`.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { PAGE } from "./surface.mjs";

const SCRIPTS_DIR = fileURLToPath(new URL("..", import.meta.url));

/**
 * Selectors the app shell also matches. A probe using one unscoped finds the
 * shell's control — `NavRail`, `MobileHeader` and `TabBar` all render before
 * `<main>` — and then measures it while naming the surface it meant to measure.
 *
 * A convention check, the same shape as `env.test.mts`: the rule only holds if
 * something enforces it, and the cost of breaking it is a finding that looks
 * real. Two shipped that way in `probe-sets.mjs` before this existed.
 *
 * Matched against the STRING's own text rather than a line of source, so the
 * spelling variations CSS allows are a question about the selector and not
 * about how the line was typed.
 */
const COLLIDES = /\[\s*aria-haspopup\s*=\s*["']?(?:dialog|menu)["']?\s*\]/;

/** Calls that ARE the scope, so a selector inside one is already scoped. */
const SCOPING_CALLS = new Set(["onPage", "openSheet"]);

/**
 * Every string literal in `source` that names a shell-colliding selector
 * without a scope.
 *
 * Parsed rather than pattern-matched over lines. Three review rounds went into
 * a regex version — a spelling it did not know, a comment that switched it off,
 * a helper call named in a trailing comment that exempted a bare query — and
 * each fix was correct while the next round found the next hole. The compiler
 * knows what is a string, what is a comment, and what call encloses it; none of
 * that has to be inferred from text.
 */
export function offendingSelectors(source: string, file = "probe.mjs") {
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const found: { text: string; line: number }[] = [];

  const enclosingCallName = (node: ts.Node): string | null => {
    for (let n = node.parent; n; n = n.parent) {
      if (ts.isCallExpression(n)) {
        const callee = n.expression;
        if (ts.isIdentifier(callee)) return callee.text;
        if (ts.isPropertyAccessExpression(callee)) return callee.name.text;
        return null;
      }
    }
    return null;
  };

  const visit = (node: ts.Node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const text = node.text;
      // Scoped in the selector itself, e.g. `main button[...]`. ANCHORED: a
      // substring search exempted `button[aria-label="main filter"][aria-…]`,
      // which is not scoped at all.
      const scopedInline = new RegExp(`^\\s*${PAGE}\\b`).test(text);
      const call = enclosingCallName(node);
      if (COLLIDES.test(text) && !scopedInline && !SCOPING_CALLS.has(call ?? "")) {
        found.push({
          text,
          line: parsed.getLineAndCharacterOfPosition(node.getStart(parsed)).line + 1,
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(parsed, visit);
  return found;
}

const probeFiles = readdirSync(SCRIPTS_DIR).filter(
  (name) => name.startsWith("probe-") && name.endsWith(".mjs"),
);

describe("the sweep itself", () => {
  const bare = `const t = await page.$('button[aria-haspopup="dialog"]');`;

  it("catches a bare query", () => {
    expect(offendingSelectors(bare)).toHaveLength(1);
  });

  it("allows the documented escape hatch", () => {
    // A guard that told probes to use `onPage()` and then failed them for it
    // would be worse than no guard: the next agent would delete the helper.
    expect(offendingSelectors(`const t = onPage(page, 'button[aria-haspopup="dialog"]');`)).toEqual(
      [],
    );
    expect(offendingSelectors(`const d = await openSheet(page, 'button[aria-haspopup=menu]');`))
      .toEqual([]);
  });

  it("allows a selector that carries the scope itself", () => {
    expect(offendingSelectors(`page.locator('main button[aria-haspopup="dialog"]')`)).toEqual([]);
  });

  it("does not accept the scope's name appearing elsewhere in the selector", () => {
    // `main` has to BE the scope, not a word inside another attribute.
    expect(
      offendingSelectors(`page.$('button[aria-label="main filter"][aria-haspopup="dialog"]')`),
    ).toHaveLength(1);
  });

  it("is not switched off by a comment, wherever it sits", () => {
    // Every one of these turned the regex version off.
    for (const line of [
      `${bare} // use openSheet(page)`,
      `${bare} // main page control`,
      `/* onPage */ ${bare}`,
      `/*\n main \n*/ ${bare}`,
    ]) {
      expect(offendingSelectors(line), line).toHaveLength(1);
    }
  });

  it("is not fooled by a helper name in a string", () => {
    expect(offendingSelectors(`log("use openSheet"); ${bare}`)).toHaveLength(1);
  });

  it("reads the selector, not the line, so CSS spelling does not matter", () => {
    for (const selector of [
      'button[aria-haspopup="dialog"]',
      "button[aria-haspopup = 'dialog']",
      "button[ aria-haspopup=dialog ]",
      "[aria-haspopup=menu]",
    ]) {
      expect(offendingSelectors(`page.$(${JSON.stringify(selector)})`), selector).toHaveLength(1);
    }
  });

  it("reports the line the selector is on", () => {
    expect(offendingSelectors(`const a = 1;\n${bare}`)[0].line).toBe(2);
  });
});

describe("browser scripts reach the page, not the shell", () => {
  it("has probes to check", () => {
    // A sweep that matches no files passes forever.
    expect(probeFiles.length).toBeGreaterThan(0);
  });

  it.each(probeFiles)("%s scopes any shell-colliding selector", (name) => {
    const offending = offendingSelectors(readFileSync(join(SCRIPTS_DIR, name), "utf8"), name);
    expect(
      offending.map((o) => `${name}:${o.line} ${o.text}`),
      `Use openSheet() or onPage() from scripts/lib/surface.mjs. The shell's account menu carries aria-haspopup="dialog" at phone width and comes first in document order, so an unscoped query measures it instead of the page's control.`,
    ).toEqual([]);
  });
});
