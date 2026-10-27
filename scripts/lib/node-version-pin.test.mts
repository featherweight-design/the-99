import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The Node version every CI job runs, pinned in ONE place (`docs/agents/ci.md`, "The Node version").
 *
 * `.nvmrc` names an exact patched release and every workflow job that runs node reads it through
 * `actions/setup-node`'s `node-version-file`. A bare major (`24`) let setup-node take whatever the runner had
 * cached: CI ran 24.21.0 on 2026-10-27, after 24.22.1 had shipped the October security fixes (TLS hostname
 * checks, a Brotli decompression RCE, the eMudhra intermediates). An exact version has nothing in the cache to
 * match until the runner image catches up, so setup-node downloads it.
 */
const root = process.cwd();
const workflowsDir = join(root, ".github/workflows");
const nvmrc = readFileSync(join(root, ".nvmrc"), "utf8").trim();
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { engines?: { node?: string } };
const workflows = readdirSync(workflowsDir)
  .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
  .map((f) => ({ file: f, text: readFileSync(join(workflowsDir, f), "utf8") }));

// The oldest release on the 24 line carrying the October 2026 security fixes.
const PATCHED_FLOOR = [24, 22, 1] as const;

const atLeast = (v: readonly number[], floor: readonly number[]) => {
  for (let i = 0; i < floor.length; i++) if (v[i] !== floor[i]) return v[i] > floor[i];
  return true;
};

/** A workflow's jobs, each as its own text: the lines under `jobs:` split at each two-space job key. */
function jobsOf(text: string): { name: string; body: string }[] {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => /^jobs:\s*$/.test(l));
  if (start < 0) return [];
  const jobs: { name: string; body: string[] }[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^\S/.test(line)) break;
    const key = /^  ([A-Za-z0-9_-]+):\s*$/.exec(line);
    if (key) jobs.push({ name: key[1], body: [] });
    else jobs.at(-1)?.body.push(line);
  }
  return jobs.map((j) => ({ name: j.name, body: j.body.join("\n") }));
}

/** Each `setup-node` step's own lines, up to the next step at its indent. */
function setupNodeSteps(text: string): string[] {
  const lines = text.split("\n");
  const steps: string[] = [];
  lines.forEach((line, i) => {
    const m = /^(\s*)- uses: actions\/setup-node@/.exec(line);
    if (!m) return;
    const indent = m[1].length;
    const body = [line];
    for (const next of lines.slice(i + 1)) {
      const lead = /^(\s*)\S/.exec(next);
      if (lead && lead[1].length <= indent) break;
      body.push(next);
    }
    steps.push(body.join("\n"));
  });
  return steps;
}

// A job that runs node (a script, pnpm or npx), outside comments.
const runsNode = (body: string) =>
  body
    .split("\n")
    .filter((l) => !/^\s*#/.test(l))
    .some((l) => /(^|[\s('"`$])(node|pnpm|npx)\s/.test(l));

describe("the pinned Node version", () => {
  it(".nvmrc names an exact release at or above the patched floor", () => {
    expect(nvmrc).toMatch(/^\d+\.\d+\.\d+$/);
    expect(atLeast(nvmrc.split(".").map(Number), PATCHED_FLOOR)).toBe(true);
  });

  it("engines names the same major, as Vercel reads it (a major, never a >= range that jumps majors)", () => {
    expect(pkg.engines?.node).toBe(`${nvmrc.split(".")[0]}.x`);
  });

  it("no workflow names a Node version of its own", () => {
    const offenders = workflows.filter((w) => /^\s*node-version:/m.test(w.text)).map((w) => w.file);
    expect(offenders).toEqual([]);
  });

  it("every setup-node step reads .nvmrc", () => {
    const offenders = workflows.flatMap((w) =>
      setupNodeSteps(w.text)
        .filter((step) => !/^\s*node-version-file:\s*\.nvmrc\s*$/m.test(step))
        .map(() => w.file),
    );
    expect(workflows.some((w) => setupNodeSteps(w.text).length > 0)).toBe(true);
    expect(offenders).toEqual([]);
  });

  it("every job that runs node sets it up from .nvmrc, never the runner's own", () => {
    const offenders = workflows.flatMap((w) =>
      jobsOf(w.text)
        .filter((j) => runsNode(j.body) && !/- uses: actions\/setup-node@/.test(j.body))
        .map((j) => `${w.file}:${j.name}`),
    );
    expect(offenders).toEqual([]);
  });
});
