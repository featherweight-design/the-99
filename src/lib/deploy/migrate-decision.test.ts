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
