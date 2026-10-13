import { describe, expect, it, vi } from "vitest";

// The Overview's card art follows the reader's printing picks only when THEIR switches say so
// (admin adoption 6d): the deck page resolves the same picks under the reader's env, and the two
// must draw one card the same way.
const seen = vi.hoisted(() => ({ envs: [] as unknown[] }));
vi.mock("../../db", () => ({
  db: { select: () => ({ from: () => ({ where: async () => [{ oracleId: "a", imageUri: "catalog-a" }] }) }) },
}));
vi.mock("../decks/printings", () => ({
  resolveDeckOwnedPrintings: async (_u: string, _d: string, _ids: string[], env?: unknown) => {
    seen.envs.push(env);
    return new Map([["a", { imageUri: "picked-a" }]]);
  },
}));

import { namedArt } from "./read";

// A sentinel, never `process.env`: a failing comparison prints it whole.
const ENV = { DECK_PRINTINGS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;

describe("namedArt", () => {
  it("resolves the deck's printing picks under the reader's env", async () => {
    const content = { cards: { x: { oracleId: "a" } } } as unknown as Parameters<typeof namedArt>[0];
    expect(await namedArt(content, "u", "d", false, ENV)).toEqual({ a: "picked-a" });
    expect(seen.envs.map((env) => env === ENV)).toEqual([true]);
  });
});
