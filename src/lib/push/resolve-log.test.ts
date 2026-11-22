import { beforeEach, describe, expect, it, vi } from "vitest";

import { named } from "../person-name/mint";

const m = vi.hoisted(() => ({ loadLogGames: vi.fn() }));
vi.mock("../social/rule-zero-log-home", () => ({ loadLogGames: m.loadLogGames }));

import { resolvePushItems } from "./resolve";

const NOW = new Date("2026-11-22T23:30:00.000Z");
const T1 = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const never = { execute: async () => { throw new Error("a log reminder reads no feed item"); } } as never;
const ref = (tableId: string, ms: number) => ({ kind: "rule_zero_log" as const, key: `game:${tableId}:${ms}`, batch: tableId });

beforeEach(() => vi.clearAllMocks());

describe("resolving log reminders", () => {
  it("words a game the reader's own read still returns, and drops every ref it does not (logged, hidden, undone, left, deckless) or that is not a key", async () => {
    m.loadLogGames.mockResolvedValue([{ tableId: T1, gameMs: 1000, deckId: "d1", deckName: "Atraxa", podName: named("Thursday night"), result: { kind: "won", name: named("Colin") } }]);
    const { items, dropped } = await resolvePushItems("u1", [ref(T1, 1000), ref(T1, 2000), { kind: "rule_zero_log" as const, key: "game:bad", batch: "x" }], {} as NodeJS.ProcessEnv, NOW, never);
    // The push reads open tables too (a game saved before 21:00 goes out that evening), unlike Home's card.
    expect(m.loadLogGames).toHaveBeenCalledWith("u1", false);
    expect(items).toEqual([{ kind: "rule_zero_log", key: `game:${T1}:1000`, batch: T1, tableId: T1, gameMs: 1000, deckId: "d1", deck: "Atraxa", pod: "Thursday night", result: { kind: "won", winner: "Colin" } }]);
    expect(dropped.map((d) => d.key)).toEqual([`game:${T1}:2000`, "game:bad"]);
  });
  it("reads nothing when no ref is a log reminder", async () => {
    await resolvePushItems("u1", [], {} as NodeJS.ProcessEnv, NOW, never);
    expect(m.loadLogGames).not.toHaveBeenCalled();
  });
});
