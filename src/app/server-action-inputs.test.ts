import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Every export of a `"use server"` module is a Server Action: any client can call it with
// arguments it chooses. So no action may take what only the server knows, namely whose request
// this is (`userId`) or which switches that reader resolved to (`env`). An action authenticates and
// resolves those itself; a helper that needs them lives in a plain module (`lib/decks/fill-plan.ts`,
// which `buildFillPlan` left `app/decks/actions.ts` for: as an action it took any reader's id).

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

/**
 * Each exported function's name and parameter list, read up to the parameters' closing paren: a
 * function declaration, or a function expression or arrow bound to an exported `const`.
 */
function exportedParams(src: string): { name: string; params: string }[] {
  const out: { name: string; params: string }[] = [];
  const re = /^export\s+(?:(?:async\s+)?function\s+(\w+)|const\s+(\w+)\s*(?::[^=]+)?=\s*(?:async\s+)?(?:function\s*\w*)?)\s*(?:<[^>]*>)?\s*\(/gm;
  for (let m = re.exec(src); m; m = re.exec(src)) {
    let depth = 1;
    let i = re.lastIndex;
    for (; i < src.length && depth > 0; i++) {
      if (src[i] === "(") depth++;
      else if (src[i] === ")") depth--;
    }
    out.push({ name: m[1] ?? m[2], params: src.slice(re.lastIndex, i - 1) });
  }
  return out;
}

/**
 * A parameter, an inline options field or a destructured binding named `userId` or `env`
 * (comments stripped first). It reads the parameter text, so an options object whose TYPE is
 * declared elsewhere (`opts: FillOpts`) is not seen: name the field inline in an action's signature.
 */
function trustedInputs(params: string): string[] {
  return [...new Set([...stripComments(params).matchAll(/\b(userId|env)\b/g)].map((m) => m[1]))];
}

const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

/** A `"use server"` directive at the head of the module, after any leading comments. */
const isServerModule = (src: string) => /^\s*["']use server["']/.test(stripComments(src));

describe("a Server Action never takes the reader's identity or switches as an argument", () => {
  it("finds them in a parameter and in an options field, across lines", () => {
    const src = [
      "export async function a(\n  userId: string,\n  o: { env?: NodeJS.ProcessEnv },\n) {}",
      "export function b(x: string) {}",
      "export const c = async (env: NodeJS.ProcessEnv) => env;",
      "export const d = (deckId: string, userId: string) => deckId + userId;",
      "export const e = async function (o: { userId: string }) { return o; };",
      "export async function f({ userId }: { userId: string }) { return userId; }",
    ].join("\n");
    expect(exportedParams(src).map((f) => [f.name, trustedInputs(f.params)])).toEqual([
      ["a", ["userId", "env"]], ["b", []], ["c", ["env"]], ["d", ["userId"]], ["e", ["userId"]], ["f", ["userId"]],
    ]);
    expect(isServerModule(`/** A header. */\n// and a line\n"use server";\nexport async function g() {}`)).toBe(true);
    expect(isServerModule(`import x from "y";\n"use server";`)).toBe(false);
  });

  it("holds across every \"use server\" module", () => {
    const offenders = sources("src")
      .filter((path) => isServerModule(readFileSync(path, "utf8")))
      .flatMap((path) => exportedParams(readFileSync(path, "utf8"))
        .map((f) => ({ at: `${path} ${f.name}`, inputs: trustedInputs(f.params) }))
        .filter((f) => f.inputs.length > 0)
        .map((f) => `${f.at}: ${f.inputs.join(", ")}`));
    expect(offenders).toEqual([]);
  });
});
