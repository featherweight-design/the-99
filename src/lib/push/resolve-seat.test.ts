import { beforeEach, describe, expect, it, vi } from "vitest";

import { named } from "../person-name/mint";

const m = vi.hoisted(() => ({ unseenSeatNotices: vi.fn() }));
vi.mock("../social/rule-zero-notice", () => ({ unseenSeatNotices: m.unseenSeatNotices }));

import { resolvePushItems } from "./resolve";

const NOW = new Date("2026-10-31T23:30:00.000Z");
const T1 = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const T2 = "7a1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const never = { execute: async () => { throw new Error("a seat notice reads no feed item"); } } as never;

beforeEach(() => vi.clearAllMocks());

describe("resolving seat notices", () => {
  it("words a notice the query still returns and drops every ref it does not (which notices stand is the query\u2019s rule: rule-zero-notice.test.ts)", async () => {
    m.unseenSeatNotices.mockResolvedValue([{ tableId: T1, host: named("Colin"), podName: named("Thursday night"), deckName: "Atraxa", since: NOW }]);
    const refs = [
      { kind: "rule_zero_seat" as const, key: `table:${T1}`, batch: `table:${T1}` },
      { kind: "rule_zero_seat" as const, key: `table:${T2}`, batch: `table:${T2}` },
      { kind: "rule_zero_seat" as const, key: "table:not-an-id", batch: "x" },
    ];
    const { items, dropped } = await resolvePushItems("u1", refs, {} as NodeJS.ProcessEnv, NOW, never);
    expect(m.unseenSeatNotices).toHaveBeenCalledWith("u1", [T1, T2]);
    expect(items).toEqual([{ kind: "rule_zero_seat", key: `table:${T1}`, batch: `table:${T1}`, tableId: T1, host: "Colin", pod: "Thursday night", deck: "Atraxa" }]);
    expect(dropped.map((d) => d.key)).toEqual([`table:${T2}`, "table:not-an-id"]);
  });
});
