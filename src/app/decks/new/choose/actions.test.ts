// The deeper read's actions, at their wire boundary. The probe calls `runDeeperRead` directly,
// since an action needs a request and a signed-in reader, so what only this file can catch is
// the action's own refusals: input a forged call can send, refused before anything is reserved.

import { beforeEach, describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock("../../../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../../../../lib/intake/deeper-read", () => ({ runDeeperRead: stub.run }));

import { lookDeeper } from "./actions";

const ID = "0000aaaa-0000-4000-8000-000000000001";
const ok = { readId: ID, words: "big lizards", budgetDollars: null, bracket: null };

beforeEach(() => {
  stub.run.mockReset().mockResolvedValue({ kind: "read", chips: [], notUsed: [], notUnderstood: [] });
});

describe("lookDeeper", () => {
  it("refuses a forged argument before any read is reserved", async () => {
    const forged = [
      null, undefined, "words", 42,
      { ...ok, readId: "not-a-uuid" }, { ...ok, readId: 7 },
      { ...ok, words: "" }, { ...ok, words: "   " }, { ...ok, words: 5 }, { ...ok, words: "x".repeat(801) },
      { ...ok, budgetDollars: 0 }, { ...ok, budgetDollars: 1.5 }, { ...ok, budgetDollars: 100_001 },
      { ...ok, bracket: 0 }, { ...ok, bracket: 6 }, { ...ok, bracket: 2.5 },
    ];
    for (const input of forged) {
      expect(await lookDeeper(input as never)).toEqual({ kind: "refused" });
    }
    expect(stub.run).not.toHaveBeenCalled();
  });

  it("hands a sound press to the read, trimmed, with its controls", async () => {
    await lookDeeper({ ...ok, words: "  big lizards  ", budgetDollars: 100_000, bracket: 5 });
    expect(stub.run).toHaveBeenCalledWith("user_1", {
      readId: ID, words: "big lizards", controls: { budgetDollars: 100_000, bracket: 5 },
    });
  });
});
