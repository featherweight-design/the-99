import { describe, expect, it } from "vitest";
import type { BulkPlan } from "../../../lib/decks/bulk-concession";
import { demoBulk, liveTicks, toggleTick } from "./demo-top-off-state";

const avail = (free: number) => ({ owned: 1, hard: 0, soft: 0, free, claims: [] }) as never;
const row = (id: string, owned: boolean, free = 1) => ({ oracleId: id, owned, availability: owned ? avail(free) : null, price: null });
const plan = (ids: string[], shortfalls: BulkPlan["shortfalls"] = []): BulkPlan => ({ oracleIds: ids, shortfalls, measuredTypes: true });
const pool = [row("a", true), row("b", false), row("c", true), row("d", true, 0)];
const base = { pool, declined: new Set<string>(), tickedCount: 0, atCap: false, newestAsOf: null };

describe("demoBulk", () => {
  it("ticks only a card with a free copy for the collection control, and any pool row for the best one", () => {
    const out = demoBulk({ ...base, plans: { collection: plan(["a", "d"], [{ kind: "type", type: "creature", short: 2 }]), best: plan(["a", "b", "c"]) } });
    expect(out.collection?.ids).toEqual(["a"]);
    expect(out.collection?.label).toBe("Select 1 from my collection");
    expect(out.collection?.note).toBe("2 creatures short of recommendations");
    expect(out.best?.ids).toEqual(["a", "b", "c"]);
    expect(out.best?.label).toBe("Select the 3 this deck needs");
  });

  it("drops a row set aside from both presses, and drops a control that would tick nothing", () => {
    const out = demoBulk({ ...base, declined: new Set(["a", "c"]), plans: { collection: plan(["a", "c"]), best: plan(["a", "b", "c"]) } });
    expect(out.collection).toBeNull();
    expect(out.best?.ids).toEqual(["b"]);
  });

  it("drops the best control when both plans choose the same rows, and says nothing is left to buy", () => {
    const out = demoBulk({ ...base, plans: { collection: plan(["a", "c"]), best: plan(["c", "a"]) } });
    expect(out.best).toBeNull();
    expect(out.collection?.note).toBe("matches every recommendation · nothing to buy");
  });

  it("draws no pair from a file exported before the plans were stored", () => {
    expect(demoBulk({ ...base, plans: undefined })).toEqual({ collection: null, best: null });
  });

  it("states what a press would replace, at the cap with a hand-made selection", () => {
    const out = demoBulk({ ...base, tickedCount: 3, atCap: true, plans: { collection: plan(["a"]), best: plan(["a", "b"]) } });
    expect(out.collection?.note).toBe(out.best?.note);
    expect(out.collection?.note).toContain("3");
  });
});

describe("the tick rules a bulk press and a tap share", () => {
  it("a live tick set and a toggled one are both capped at the open slots", () => {
    const ids = ["a", "b", "c"];
    expect([...liveTicks(ids, new Set(ids), new Set(), 2)]).toEqual(["a", "b"]);
    expect([...toggleTick(new Set(["a"]), "b", 2)]).toEqual(["a", "b"]);
  });
});
