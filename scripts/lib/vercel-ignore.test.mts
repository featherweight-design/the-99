// @vitest-environment node
import { describe, expect, it } from "vitest";
import { decide, diffArgs, skippablePath, STAGING_PROJECT_ID } from "./vercel-ignore.mjs";

describe("skippablePath", () => {
  it.each(["docs/agents/ops.md", "docs/superpowers/plans/x.md", "design/design_handoff_x/a.html", ".github/workflows/ci.yml", "AGENTS.md", "README.md"])("%s is skippable", (p) => {
    expect(skippablePath(p)).toBe(true);
  });
  it.each([
    "src/lib/a.ts", "src/lib/a.test.ts", "public/sw.js", "drizzle/0001_x.sql", "package.json", "pnpm-lock.yaml", "next.config.ts",
    "vercel.json", "tsconfig.json", "scripts/probe-x.mjs", "scripts/vercel-migrate.ts", "docs/superpowers/eval/ledger.jsonl",
    "src/docs/x.md", "LICENSE", ".env.example", "docs.ts",
  ])("%s is built for", (p) => {
    expect(skippablePath(p)).toBe(false);
  });
});

describe("decide", () => {
  const prod = { projectId: "prj_other", env: "production", ref: "main" };
  it("skips when every changed path is skippable", () => {
    expect(decide({ ...prod, changed: ["docs/a.md", "design/b.html", "CLAUDE.md"] }).build).toBe(false);
  });
  it("builds when one path may be read", () => {
    expect(decide({ ...prod, changed: ["docs/a.md", "src/x.ts"] }).build).toBe(true);
  });
  it("builds when the changed list is unknown or empty", () => {
    expect(decide({ ...prod, changed: null }).build).toBe(true);
    expect(decide({ ...prod, changed: undefined }).build).toBe(true);
    expect(decide({ ...prod, changed: [] }).build).toBe(true);
  });
  it("staging skips a preview or a non-main ref, even with app changes", () => {
    expect(decide({ projectId: STAGING_PROJECT_ID, env: "preview", ref: "feat", changed: ["src/x.ts"] }).build).toBe(false);
    expect(decide({ projectId: STAGING_PROJECT_ID, env: "production", ref: "other", changed: ["src/x.ts"] }).build).toBe(false);
  });
  it("staging builds main, and builds when the environment is not stated", () => {
    expect(decide({ projectId: STAGING_PROJECT_ID, env: "production", ref: "main", changed: ["src/x.ts"] }).build).toBe(true);
    expect(decide({ projectId: STAGING_PROJECT_ID, changed: ["src/x.ts"] }).build).toBe(true);
  });
  it("neither project builds a preview or any non-production environment", () => {
    for (const projectId of ["prj_other", STAGING_PROJECT_ID]) {
      for (const env of ["preview", "development"]) {
        expect(decide({ projectId, env, ref: "main", changed: ["src/x.ts"] }).build).toBe(false);
      }
    }
  });
  it("the other project builds a production deploy of any ref", () => {
    expect(decide({ projectId: "prj_other", env: "production", ref: "feat", changed: ["src/x.ts"] }).build).toBe(true);
  });
});

describe("diffArgs", () => {
  it("lists a rename as a delete plus an add, so moving a route under docs/ still builds", () => {
    const args = diffArgs("abc123");
    expect(args).toEqual(expect.arrayContaining(["--no-renames", "-z", "abc123", "HEAD"]));
    // With renames off git reports both sides of a move; the source is built for.
    expect(decide({ projectId: "prj_other", env: "production", ref: "main", changed: ["src/app/example/page.tsx", "docs/example/page.tsx"] }).build).toBe(true);
  });
});
