import { beforeEach, describe, expect, it, vi } from "vitest";

const queries: string[] = [];
let failOn: string | null = null;
vi.mock("@neondatabase/serverless", () => ({
  Pool: class {
    async connect() {
      return {
        query: async (text: string) => {
          queries.push(text.split(" ")[0]);
          if (failOn && text.startsWith(failOn)) throw new Error(`${failOn} failed`);
          return { rows: [] };
        },
        release: () => {},
      };
    }
    async end() {}
  },
}));

import { withCatalogIngestLock } from "./ingest-lock";

beforeEach(() => { queries.length = 0; failOn = null; });

describe("withCatalogIngestLock", () => {
  it("commits after a run that succeeds", async () => {
    expect(await withCatalogIngestLock("postgres://x", async () => 7)).toBe(7);
    expect(queries).toEqual(["begin", "select", "commit"]);
  });

  // A failed commit leaves the lock's outcome unknown, so the run must not read as a success.
  it("reports a commit that fails rather than returning the run's result", async () => {
    failOn = "commit";
    await expect(withCatalogIngestLock("postgres://x", async () => 7)).rejects.toThrow("commit failed");
  });

  it("rolls back and rethrows when the run fails", async () => {
    await expect(withCatalogIngestLock("postgres://x", async () => { throw new Error("ingest broke"); }))
      .rejects.toThrow("ingest broke");
    expect(queries).toEqual(["begin", "select", "rollback"]);
  });
});
