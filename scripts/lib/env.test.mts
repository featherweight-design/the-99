// @vitest-environment node
//
// The repo default is jsdom, which replaces `import.meta.url` with the page
// location — every path here would resolve against `http://localhost/`.
import { readFileSync, readdirSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { ENV_PATH, requireEnv } from "./env.mjs";

const SCRIPTS_DIR = fileURLToPath(new URL("..", import.meta.url));

describe("requireEnv", () => {
  const touched: string[] = [];
  const set = (name: string, value: string) => {
    touched.push(name);
    process.env[name] = value;
  };

  afterEach(() => {
    for (const name of touched.splice(0)) delete process.env[name];
  });

  it("returns the requested values", () => {
    set("PROBE_TEST_ONE", "first");
    set("PROBE_TEST_TWO", "second");
    expect(requireEnv(["PROBE_TEST_ONE", "PROBE_TEST_TWO"])).toEqual({
      PROBE_TEST_ONE: "first",
      PROBE_TEST_TWO: "second",
    });
  });

  // One run, one list. Reporting only the first missing name turns configuring a
  // probe into a guessing game that costs a browser launch per variable.
  it("names every missing variable at once", () => {
    set("PROBE_TEST_ONE", "first");
    expect(() => requireEnv(["PROBE_TEST_ONE", "PROBE_TEST_TWO", "PROBE_TEST_THREE"])).toThrow(
      /PROBE_TEST_TWO, PROBE_TEST_THREE/,
    );
  });

  // An empty value is the shape a half-filled `.env` produces, and it fails
  // further in with a less useful message than the one here.
  it("treats an empty value as missing", () => {
    set("PROBE_TEST_ONE", "");
    expect(() => requireEnv(["PROBE_TEST_ONE"])).toThrow(/PROBE_TEST_ONE/);
  });
});

describe("ENV_PATH", () => {
  // The whole point of resolving from `import.meta.url`: every other mechanism
  // available here — `node --env-file=.env`, `import "dotenv/config"`, sourcing
  // the file — is relative to the working directory, and all work happens in
  // worktrees. Run from anywhere but the worktree root, those load nothing and
  // fail as "credentials not configured".
  it("resolves the repository .env independently of the working directory", () => {
    const path = fileURLToPath(ENV_PATH);
    expect(isAbsolute(path)).toBe(true);
    expect(path).toBe(join(SCRIPTS_DIR, "..", ".env"));
  });
});

describe("the scripts/ env convention", () => {
  const sources = readdirSync(SCRIPTS_DIR)
    .filter((name) => /\.(mjs|ts)$/.test(name))
    .map((name) => ({ name, body: readFileSync(join(SCRIPTS_DIR, name), "utf8") }));

  it("finds the scripts", () => {
    expect(sources.length).toBeGreaterThan(10);
  });

  // Documented in a header comment, `node --env-file=.env script.mjs` reads as
  // the supported invocation. It is not: Node gives an already-set variable
  // precedence over the file, so a stale `E2E_AUDIT_USER_EMAIL` inherited from
  // another project's shell silently wins and the run fails inside Clerk with
  // "Couldn't find your account".
  it("documents no --env-file invocation", () => {
    const offenders = sources.filter((s) => s.body.includes("--env-file")).map((s) => s.name);
    expect(offenders).toEqual([]);
  });

  // Same precedence problem, plus `dotenv/config` reads `${cwd}/.env`. Matched
  // on the import rather than on the string, so a comment may still name the
  // mechanism it replaced.
  it("imports dotenv nowhere but the helper", () => {
    const offenders = sources
      .filter((s) => /^import\s.*["']dotenv(\/config)?["']/m.test(s.body))
      .map((s) => s.name);
    expect(offenders).toEqual([]);
  });

  // `vercel-migrate.ts` runs during the Vercel build, where there is no `.env`
  // and the values arrive as real environment variables. It reads `process.env`
  // directly on purpose, and a sweep that "finished the job" by importing the
  // helper here would let a stray .env in a build container redirect a
  // production migration.
  it("leaves vercel-migrate.ts reading process.env directly", () => {
    const body = sources.find((s) => s.name === "vercel-migrate.ts")?.body;
    expect(body).toBeDefined();
    expect(body).not.toMatch(/^import\s.*lib\/env\.mjs/m);
    expect(body).toContain("process.env");
  });

  // The convention is one module, so a script reaching for a secret has exactly
  // one place to reach. Scripts that need no secret import nothing.
  it("routes every secret read through scripts/lib/env.mjs", () => {
    const SECRETS = ["CLERK_SECRET_KEY", "E2E_AUDIT_USER_PASSWORD", "DATABASE_URL"];
    const offenders = sources
      .filter((s) => s.name !== "vercel-migrate.ts")
      .filter((s) => SECRETS.some((name) => s.body.includes(name)))
      .filter((s) => !/^import\s.*lib\/env\.mjs/m.test(s.body))
      .map((s) => s.name);
    expect(offenders).toEqual([]);
  });
});
