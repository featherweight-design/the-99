import { beforeEach, describe, expect, it, vi } from "vitest";

const queries: string[] = [];
let failOn: string | null = null;
const poolEvents: string[] = [];
let clientError: ((error: Error) => void) | null = null;
vi.mock("@neondatabase/serverless", () => ({
  Pool: class {
    on(event: string) { poolEvents.push(event); return this; }
    async connect() {
      return {
        on: (_event: "error", listener: (error: Error) => void) => { clientError = listener; },
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

beforeEach(() => { queries.length = 0; failOn = null; poolEvents.length = 0; clientError = null; });

describe("withCatalogIngestLock", () => {
  it("puts the pool error handler on its pool (an idle or held client's FATAL must not crash the process)", async () => {
    await withCatalogIngestLock("postgres://x", async () => 1);
    expect(poolEvents).toEqual(expect.arrayContaining(["error", "connect"]));
  });

  it("fails the run at once when its connection is lost mid-run, and never commits", async () => {
    let finish: (v: number) => void = () => {};
    const pending = withCatalogIngestLock("postgres://x", () => new Promise<number>((r) => { finish = r; }));
    await vi.waitFor(() => expect(clientError).not.toBeNull());
    clientError!(new Error("terminating connection due to administrator command"));
    await expect(pending).rejects.toThrow("catalog-ingest lock lost");
    finish(1);
    expect(queries).toEqual(["begin", "select", "rollback"]);
  });

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
