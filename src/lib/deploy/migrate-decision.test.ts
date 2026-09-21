import { describe, expect, it } from "vitest";
import { decideMigration } from "./migrate-decision";

const URL = "postgres://u:p@host.neon.tech/db";

describe("decideMigration", () => {
  it("skips when VERCEL_ENV is unset (local or CI build)", () => {
    const d = decideMigration({});
    expect(d.action).toBe("skip");
  });

  it("skips preview deployments so pull requests never touch a shared database", () => {
    const d = decideMigration({ VERCEL_ENV: "preview", MIGRATE_DATABASE_URL: URL });
    expect(d.action).toBe("skip");
  });

  it("skips the development environment", () => {
    const d = decideMigration({ VERCEL_ENV: "development", MIGRATE_DATABASE_URL: URL });
    expect(d.action).toBe("skip");
  });

  it("names the offending value in the skip reason", () => {
    const d = decideMigration({ VERCEL_ENV: "preview" });
    expect(d.action).toBe("skip");
    if (d.action !== "skip") throw new Error("unreachable");
    expect(d.reason).toContain("preview");
  });

  it("fails a production build when MIGRATE_DATABASE_URL is missing", () => {
    const d = decideMigration({ VERCEL_ENV: "production" });
    expect(d.action).toBe("fail");
    if (d.action !== "fail") throw new Error("unreachable");
    expect(d.reason).toContain("MIGRATE_DATABASE_URL");
  });

  it("tells the operator to check the variable's SCOPE, and never calls it non-sensitive", () => {
    // The one time this fired in anger (2026-09-21) the variable was present in the
    // dashboard and scoped to Preview, so "is not set" and the screen disagreed and the
    // fix took five hours. The scope is the first thing to check, and the sensitivity is
    // a red herring the message used to plant: it said "non-sensitive", which is neither
    // required nor what ships.
    const d = decideMigration({ VERCEL_ENV: "production" });
    if (d.action !== "fail") throw new Error("unreachable");
    expect(d.reason).toMatch(/scope/i);
    expect(d.reason).toContain("Preview");
    // Case-insensitive: "Non-sensitive is fine" at the head of a sentence is the same
    // advice, and a `toContain` here would wave it through.
    expect(d.reason).not.toMatch(/non-sensitive/i);
  });

  it("fails a production build when MIGRATE_DATABASE_URL is blank", () => {
    const d = decideMigration({ VERCEL_ENV: "production", MIGRATE_DATABASE_URL: "   " });
    expect(d.action).toBe("fail");
  });

  it("runs with the trimmed url on a production build", () => {
    const d = decideMigration({ VERCEL_ENV: "production", MIGRATE_DATABASE_URL: ` ${URL} ` });
    expect(d).toEqual({ action: "run", databaseUrl: URL });
  });

  it("ignores MIGRATE_DATABASE_URL outside production rather than running", () => {
    const d = decideMigration({ VERCEL_ENV: "preview", MIGRATE_DATABASE_URL: URL });
    expect(d.action).toBe("skip");
  });
});
