import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

const transaction = vi.hoisted(() => vi.fn());
vi.mock("../../db", () => ({ db: { transaction } }));

import { loadDraftState } from "./draft-state";

// A read-only transaction on the pooled Neon connection left the next transaction taken from the
// pool failing ("SET TRANSACTION ISOLATION LEVEL must be called before any query", "cannot execute
// UPDATE in a read-only transaction"). See the comment in cuts-read.ts.
describe("readDraft's snapshot", () => {
  it("opens repeatable read and never a read-only transaction", async () => {
    transaction.mockRejectedValueOnce(new Error("stop"));
    await expect(loadDraftState("deck", "user")).rejects.toThrow("stop");
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(transaction.mock.calls[0][1]).toEqual({ isolationLevel: "repeatable read" });
  });
});

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("every app snapshot", () => {
  it("passes no accessMode to a transaction", () => {
    const offenders = sources(join(__dirname, "..", "..")).filter((f) =>
      /accessMode\s*:/.test(readFileSync(f, "utf8").replace(/\/\/.*$/gm, "")),
    );
    expect(offenders).toEqual([]);
  });
});
