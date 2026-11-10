import { describe, expect, it } from "vitest";

import type { ModelOutcome } from "../../model/client";
import { MAX_SWAPS, MIN_SWAPS } from "./constants";
import { runUpgrade, type UpgradeCallModel, type UpgradeCallRequest } from "./engine";
import type { UpgradeInput, UpgradeReply } from "./prompt";
import type { DeckEntry, PoolEntry } from "./validate";

const N = MAX_SWAPS + 4;
const deck: DeckEntry[] = Array.from({ length: N }, (_, i) => ({ oracleId: `d${i}`, name: `Cut ${i}`, isCommander: false }));
const pool: PoolEntry[] = Array.from({ length: N }, (_, i) => ({ oracleId: `p${i}`, name: `Add ${i}`, cents: 100 }));
const input = { deckName: "X", deck: [], pool: [], strategy: { label: "A", blurb: "b", backingNames: [] }, otherThemes: [], bracketBefore: null } as unknown as UpgradeInput;
const good = (from: number, to: number) => Array.from({ length: to - from }, (_, k) => ({ out: `Cut ${from + k}`, in: `Add ${from + k}`, reason: "r" }));
const ok = (swaps: UpgradeReply["swaps"]): ModelOutcome<UpgradeReply> => ({ ok: true, value: { swaps }, usage: {} as never });
const fail = (): ModelOutcome<UpgradeReply> => ({ ok: false, errorClass: "timeout" } as never);

function script(...answers: ModelOutcome<UpgradeReply>[]) {
  const seen: UpgradeCallRequest[] = [];
  const callModel: UpgradeCallModel = async (req) => { seen.push(req); return answers[seen.length - 1]!; };
  return { callModel, seen };
}

describe("runUpgrade", () => {
  it("makes ONE call and charges when the first answer is clean and reaches the floor", async () => {
    const { callModel, seen } = script(ok(good(0, 15)));
    const r = await runUpgrade({ input, deck, pool, callModel });
    expect(seen.map((s) => s.stage)).toEqual(["first"]);
    expect(r.calls).toBe(1);
    expect(r.pairs).toHaveLength(15);
    expect(r.buyTotalCents).toBe(1500);
    expect(r.charge).toEqual({ outcome: "spent" });
  });

  it("repairs ONCE when drops leave it under the floor, merging the pairs without duplicates", async () => {
    const bad = [{ out: "Cut 0", in: "Sol Ring", reason: "r" }, { out: "Nope", in: "Add 1", reason: "r" }];
    const { callModel, seen } = script(ok([...good(2, 2 + 8), ...bad]), ok([...good(2, 4), ...good(10, 16)]));
    const r = await runUpgrade({ input, deck, pool, callModel });
    expect(seen.map((s) => s.stage)).toEqual(["first", "repair"]);
    expect(seen[1]!.user).toContain("SWAPS ALREADY ACCEPTED");
    expect(seen[1]!.user).toContain('"Nope" is not in the deck');
    expect(r.calls).toBe(2);
    // 8 kept, then the repair's first two repeat accepted cards and drop; its next six are new.
    expect(r.pairs).toHaveLength(8 + 6);
    expect(new Set(r.pairs.map((p) => p.addId)).size).toBe(r.pairs.length);
    expect(r.charge).toEqual({ outcome: "spent" });
  });

  it("never makes a third call: still short after the repair is refunded whole", async () => {
    const { callModel, seen } = script(ok(good(0, 5)), ok(good(5, 7)));
    const r = await runUpgrade({ input, deck, pool, callModel });
    expect(seen).toHaveLength(2);
    expect(r.pairs).toHaveLength(7);
    expect(r.charge).toEqual({ outcome: "refunded", why: "short" });
  });

  it("makes no repair when the first call fails, and refunds", async () => {
    const { callModel, seen } = script(fail());
    const r = await runUpgrade({ input, deck, pool, callModel });
    expect(seen).toHaveLength(1);
    expect(r.failed).toBe("timeout");
    expect(r.charge).toEqual({ outcome: "refunded", why: "failed" });
  });

  it("keeps the first answer's pairs when the repair call fails", async () => {
    const { callModel } = script(ok(good(0, MIN_SWAPS - 2)), fail());
    const r = await runUpgrade({ input, deck, pool, callModel });
    expect(r.pairs).toHaveLength(MIN_SWAPS - 2);
    expect(r.failed).toBe("timeout");
    expect(r.charge).toEqual({ outcome: "refunded", why: "short" });
  });

  it("refunds an answer with nothing valid as ungrounded", async () => {
    const { callModel } = script(ok([{ out: "Nope", in: "Nope", reason: "r" }]), ok([]));
    const r = await runUpgrade({ input, deck, pool, callModel });
    expect(r.charge).toEqual({ outcome: "refunded", why: "ungrounded" });
  });
});
