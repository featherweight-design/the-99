// @vitest-environment node
//
// The password estimator's dictionaries are large, so they load only on the password field's first focus (READINESS G1 and
// "Performance"): nothing under src/ may import @zxcvbn-ts, or `strength-estimator`, statically. The one module that
// imports @zxcvbn-ts is `strength-estimator.ts` itself, and every caller reaches it through `import("…/strength-estimator")`.
// `import type` is erased and allowed. Tests are not bundled and may import it statically.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "../..");
const ESTIMATOR = join(SRC, "lib/auth/strength-estimator.ts");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, out);
    else if (/\.(ts|tsx|mts|js|mjs)$/.test(entry.name) && !/\.test\.(ts|tsx|mts)$/.test(entry.name)) out.push(path);
  }
  return out;
}

const STATIC = /^\s*(?:import|export)\s+(type\s+)?[^'";]*?\s*from\s*["']([^"']+)["']|^\s*import\s*["']([^"']+)["']|\brequire\(\s*["']([^"']+)["']\s*\)/gm;

/** Every specifier a file loads at module evaluation: static value imports, re-exports, bare imports and `require`. */
function staticSpecifiers(source: string): string[] {
  const out: string[] = [];
  for (const m of source.matchAll(STATIC)) {
    if (m[1]) continue; // `import type` / `export type`: erased
    out.push(m[2] ?? m[3] ?? m[4]);
  }
  return out;
}

function reachesEstimator(from: string, spec: string): boolean {
  if (spec.startsWith("@/")) return normalize(join(SRC, spec.slice(2))).replace(/\.ts$/, "") === ESTIMATOR.replace(/\.ts$/, "");
  if (spec.startsWith(".")) return normalize(join(dirname(from), spec)).replace(/\.ts$/, "") === ESTIMATOR.replace(/\.ts$/, "");
  return false;
}

/** The static imports a file may not make, as `file: specifier`. */
function offences(path: string, source: string): string[] {
  return staticSpecifiers(source)
    .filter((spec) => (spec.startsWith("@zxcvbn-ts/") && path !== ESTIMATOR) || reachesEstimator(path, spec))
    .map((spec) => `${relative(SRC, path)}: ${spec}`);
}

describe("the password estimator loads lazily", () => {
  it("no module under src/ imports @zxcvbn-ts or strength-estimator statically", () => {
    const found = walk(SRC).flatMap((path) => offences(path, readFileSync(path, "utf8")));
    expect(found).toEqual([]);
  });

  it("strength-estimator is the module that imports @zxcvbn-ts", () => {
    expect(staticSpecifiers(readFileSync(ESTIMATOR, "utf8")).filter((s) => s.startsWith("@zxcvbn-ts/")).length).toBeGreaterThan(0);
  });

  // The failure path: each planted import must be caught, and the lazy forms must not be.
  const panel = join(SRC, "components/sign-in/strength-panel.tsx");
  it.each([
    ['import { estimate } from "../../lib/auth/strength-estimator";'],
    ['import { estimate } from "@/lib/auth/strength-estimator";'],
    ['export { estimate } from "../../lib/auth/strength-estimator";'],
    ['import {\n  estimate,\n} from "../../lib/auth/strength-estimator";'],
    ['import "../../lib/auth/strength-estimator";'],
    ['import { ZxcvbnFactory } from "@zxcvbn-ts/core";'],
    ['const z = require("@zxcvbn-ts/core");'],
  ])("catches %s", (line) => {
    expect(offences(panel, line)).toHaveLength(1);
  });

  it.each([
    ['const mod = await import("../../lib/auth/strength-estimator");'],
    ['import type { StrengthReading } from "../../lib/auth/password";'],
    ['import type { estimate } from "../../lib/auth/strength-estimator";'],
    ['import { MIN_PASSWORD } from "../../lib/auth/password";'],
  ])("allows %s", (line) => {
    expect(offences(panel, line)).toEqual([]);
  });
});
