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

/** Each exported function's name and parameter list, read up to the parameters' closing paren. */
function exportedParams(src: string): { name: string; params: string }[] {
  const out: { name: string; params: string }[] = [];
  const re = /^export\s+(?:async\s+)?function\s+(\w+)\s*(?:<[^>]*>)?\s*\(/gm;
  for (let m = re.exec(src); m; m = re.exec(src)) {
    let depth = 1;
    let i = re.lastIndex;
    for (; i < src.length && depth > 0; i++) {
      if (src[i] === "(") depth++;
      else if (src[i] === ")") depth--;
    }
    out.push({ name: m[1], params: src.slice(re.lastIndex, i - 1) });
  }
  return out;
}

/** A parameter, or an options field, named `userId` or `env` (comments stripped first). */
function trustedInputs(params: string): string[] {
  const bare = params.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  return [...new Set([...bare.matchAll(/\b(userId|env)\??\s*:/g)].map((m) => m[1]))];
}

describe("a Server Action never takes the reader's identity or switches as an argument", () => {
  it("finds them in a parameter and in an options field, across lines", () => {
    const src = `export async function a(\n  userId: string,\n  o: { env?: NodeJS.ProcessEnv },\n) {}\nexport function b(x: string) {}`;
    expect(exportedParams(src).map((f) => [f.name, trustedInputs(f.params)])).toEqual([["a", ["userId", "env"]], ["b", []]]);
  });

  it("holds across every \"use server\" module", () => {
    const offenders = sources("src")
      .filter((path) => /^\s*["']use server["']/.test(readFileSync(path, "utf8")))
      .flatMap((path) => exportedParams(readFileSync(path, "utf8"))
        .map((f) => ({ at: `${path} ${f.name}`, inputs: trustedInputs(f.params) }))
        .filter((f) => f.inputs.length > 0)
        .map((f) => `${f.at}: ${f.inputs.join(", ")}`));
    expect(offenders).toEqual([]);
  });
});
