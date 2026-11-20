// The action layer owns the wire contract: what is refused before any query, and what is
// revalidated. The transaction's plan is `order-plan.test.ts`; its scoping to `user_id` is in the
// lock query and the update's where clause, read there.

import { beforeEach, describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({
  paths: [] as string[],
  calls: [] as unknown[][],
  result: true,
}));

vi.mock("next/cache", () => ({
  revalidatePath: (path: string, type?: string) => {
    stub.paths.push(type ? `${path} ${type}` : path);
  },
}));
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user-1" }));
vi.mock("../../lib/decks/order", () => ({
  reorderDecksFor: async (...args: unknown[]) => {
    stub.calls.push(args);
    return stub.result;
  },
}));

const { reorderDecksAction } = await import("./order-actions");

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  stub.paths = [];
  stub.calls = [];
  stub.result = true;
});

describe("reorderDecksAction", () => {
  it("passes the session's user and the ids, then revalidates /decks and the deck page", async () => {
    expect(await reorderDecksAction([A, B])).toBe(true);
    expect(stub.calls).toEqual([["user-1", [A, B]]]);
    expect(stub.paths).toEqual(["/decks", "/decks/[id] page"]);
  });

  it.each([
    ["not an array", "x"],
    ["empty", []],
    ["a non-uuid", [A, "nope"]],
    ["a non-string", [A, 7]],
    ["a duplicate", [A, A]],
    ["a nested array", [[A]]],
    ["over the cap", Array.from({ length: 501 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`)],
  ])("refuses %s without reaching the query", async (_label, arg) => {
    expect(await reorderDecksAction(arg)).toBe(false);
    expect(stub.calls).toEqual([]);
    expect(stub.paths).toEqual([]);
  });

  it("reports a refusal from the transaction (another user's id, a partial set) and still revalidates", async () => {
    stub.result = false;
    expect(await reorderDecksAction([A])).toBe(false);
    expect(stub.paths).toEqual(["/decks", "/decks/[id] page"]);
  });
});
