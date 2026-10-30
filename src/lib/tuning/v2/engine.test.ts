import { describe, expect, it } from "vitest";

import { buildPlayGroup } from "../../profile/play";
import type { DeckGame } from "../../decks/games";
import type { EvidencePack } from "../evidence";
import { OWNED_OFF_INDEX_MAX, OWNED_SHORTLIST_MAX } from "../limits";
import type { ResolvedCard } from "../validate";
import { askFor, replyCeilingFor } from "./count";
import { additionPosition, completeOwnedPool, OFF_INDEX_POSITION_BASE, runV2, type V2CallModel, type V2CallRequest, type V2Stage } from "./engine";

const game = (id: string, over: Partial<DeckGame> = {}): DeckGame => ({
  id, result: "loss", podSize: 4, playedAt: new Date("2026-09-01T20:00:00Z"),
  versionNumber: null, note: null, worked: [], hurt: [], ...over,
});

const deckCards = Array.from({ length: 40 }, (_, i) => `Cut ${i + 1}`);
const pack: EvidencePack = {
  commanders: [{ oracleId: "cmd", name: "Commander" }],
  colorIdentity: ["G"],
  cards: [
    { oracleId: "cmd", name: "Commander", typeLine: "Legendary Creature", roles: [], quantity: 1, owned: true, commander: true },
    ...deckCards.map((name) => ({ oracleId: name, name, typeLine: "Creature", roles: [], quantity: 1, owned: true, commander: false })),
  ],
  targets: { roles: [], thin: false },
  staples: [],
  play: buildPlayGroup([game("g1", { hurt: ["mana"] }), game("g2", { hurt: ["mana"] }), game("g3", { hurt: ["mana"] }), game("g4"), game("g5")]),
  intent: null,
  notes: null,
  year: 2026,
  limits: { capCents: null, sets: [], ownedOnly: false },
};
const neutral = { colorIdentity: ["G"], commanderLegal: true, priceCents: null, printedInSelectedSets: true, owned: false };
const resolveName = (name: string): ResolvedCard | null =>
  /^(Add|Cut) \d+$/.test(name) ? { oracleId: name, ...neutral } : name === "Bolt" ? { oracleId: "bolt", ...neutral, colorIdentity: ["R"] }
    : name === "Commander" ? { oracleId: "cmd", ...neutral } : null;

const line = (card: string) => ({
  card,
  rationale: "Mana was marked as hurting in 3 of 5 games.",
  rationaleShort: "Mana hurt in 3 of 5",
  evidence: [{ kind: "games", value: "Mana hurt in 3 of 5 games" }],
});
const adds = (from: number, count: number) => Array.from({ length: count }, (_, i) => `Add ${from + i}`);
const cutsOf = (from: number, count: number) => Array.from({ length: count }, (_, i) => `Cut ${from + i}`);

/** A reply per stage: the cards it names, or a failure. Every call takes `ms` of the fake clock (default 10s). */
type Script = Partial<Record<V2Stage, { cards?: string[]; fail?: "timeout" | "malformed"; text?: string; ms?: number; chunk?: number; slow?: boolean }>>;

function fake(script: Script) {
  let clock = 0;
  const requests: V2CallRequest[] = [];
  const events: string[] = [];
  const callModel: V2CallModel = (req) => {
    requests.push(req);
    events.push(`start ${req.stage}`);
    const s = script[req.stage] ?? { cards: [] };
    const list = req.stage.startsWith("additions") ? "additions" : "cuts";
    const text = s.text ?? JSON.stringify({ [list]: (s.cards ?? []).map(line) });
    const deltas = (async function* () {
      const size = s.chunk ?? 7;
      for (let i = 0; i < text.length; i += size) {
        // `slow`: each chunk waits a real timer tick, as a network stream would, so a sibling call's settle can overtake it.
        await (s.slow ? new Promise((r) => setTimeout(r, 1)) : Promise.resolve());
        yield text.slice(i, i + size);
      }
      clock += s.ms ?? 10_000;
      events.push(`end ${req.stage}`);
    })();
    const outcome = (async () => {
      // The outcome settles after the stream has been read.
      await new Promise((r) => setTimeout(r, 0));
      return s.fail ? { ok: false as const, errorClass: s.fail } : { ok: true as const };
    })();
    return { deltas, outcome };
  };
  return { callModel, requests, events, now: () => clock };
}

const base = { pack, request: "", aim: null, resolveName, budgetMs: 590_000 };

describe("runV2", () => {
  it("fills both lists in two calls, asking ceil(1.5N) each, and is charged", async () => {
    const f = fake({ additions: { cards: adds(1, 5) }, cuts: { cards: cutsOf(1, 5) } });
    const seen: string[] = [];
    const r = await runV2({ ...base, n: 3, callModel: f.callModel, now: f.now, onLine: (side, l) => { seen.push(`${side}:${l.card}`); } });
    expect(f.requests.map((q) => q.stage)).toEqual(["additions", "cuts"]);
    expect(f.requests[0].user).toContain("Propose exactly 5 cards to add");
    expect(f.requests[1].user).toContain("Coming in (5): Add 1; Add 2; Add 3; Add 4; Add 5.");
    // Prompt v13: both calls carry the same cached prefix, so the cut call reads it from the cache.
    expect(f.requests[1].system).toBe(f.requests[0].system);
    expect(f.requests[1].cachedUser).toBe(f.requests[0].cachedUser);
    expect(f.requests[0].maxTokens).toBe(replyCeilingFor(5));
    // Each call carries its own ask, which the staged stub answers (not N).
    expect(f.requests.map((q) => q.ask)).toEqual([5, 5]);
    expect(r.additions.kept.map((l) => l.card)).toEqual(adds(1, 5));
    expect(r.cuts.kept).toHaveLength(5);
    expect(r.cuts.target).toBe(3);
    expect(seen.slice(0, 5)).toEqual(adds(1, 5).map((c) => `add:${c}`));
    expect(r).toMatchObject({ callCount: 2, cutsFailed: null, budgetReached: false, charge: { outcome: "spent" } });
  });

  it("starts the cut call as soon as call 1 settles, alongside the additions refill (H2)", async () => {
    const f = fake({
      additions: { cards: [...adds(1, 2), "Bolt"] }, additionsRefill: { cards: adds(3, 3) }, cuts: { cards: cutsOf(1, 6) }, cutsRefill: { cards: cutsOf(7, 1) },
    });
    const asks: number[] = [];
    const r = await runV2({ ...base, n: 4, callModel: f.callModel, now: f.now, onCutAsk: (a) => { asks.push(a); } });
    expect(f.events.slice(0, 3)).toEqual(["start additions", "end additions", "start additionsRefill"]);
    expect(f.events.indexOf("start cuts")).toBeLessThan(f.events.indexOf("end additionsRefill"));
    const refill = f.requests.find((q) => q.stage === "additionsRefill")!;
    expect(refill.user).toContain("Propose exactly 2 cards to add");
    expect(refill.user).toContain("Kept, additions: Add 1; Add 2.");
    expect(refill.user).toContain("- Bolt: it is outside the commander's colors");
    // The cut call saw call 1's kept additions, not the refill's, and was asked for room for them: ceil(1.5 x 2), not
    // ceil(1.5 x 4). The cut refill then tops the cuts up to min(N, the final 5 additions).
    const cut = f.requests.find((q) => q.stage === "cuts")!;
    expect(cut.user).toContain("Coming in (2): Add 1; Add 2.");
    expect(cut.ask).toBe(3);
    expect(cut.user).toContain("Propose exactly 3 cards to cut");
    expect(asks).toEqual([3]);
    expect(f.requests.find((q) => q.stage === "cutsRefill")!.ask).toBe(1);
    expect(r.additions).toMatchObject({ refilled: true });
    expect(r.additions.kept).toHaveLength(5);
    expect(r.cuts.target).toBe(4);
    expect(r.cuts.kept).toHaveLength(4);
    expect(r.charge).toEqual({ outcome: "spent" });
  });

  it("asks no refill once an owned-only run has used its whole shortlist, and charges the short list (owned pool spent)", async () => {
    // Three cards fit the owned shortlist: two are kept and Add 3 is dropped (its last free copy went elsewhere), so
    // nothing is left to ask for. Two of four is the player's own limit, though the model wrote three lines of six.
    const shortlist = adds(1, 3).map((name) => ({ oracleId: name, name, typeLine: "Creature" }));
    const owned: EvidencePack = { ...pack, limits: { capCents: null, sets: [], ownedOnly: true }, ownedCandidates: shortlist, ownedCandidatesComplete: true, ownedOffIndexComplete: true };
    const ownedResolve = (name: string) => { const c = resolveName(name); return c ? { ...c, owned: name !== "Add 3" } : null; };
    const f = fake({ additions: { cards: adds(1, 3) }, additionsRefill: { cards: adds(4, 1) }, cuts: { cards: cutsOf(1, 5) } });
    const r = await runV2({ ...base, pack: owned, resolveName: ownedResolve, n: 4, callModel: f.callModel, now: f.now });
    expect(f.requests.map((q) => q.stage)).toEqual(["additions", "cuts"]);
    expect(r.additions).toMatchObject({ poolExhausted: true, underProduced: true, refilled: false });
    expect(r.additions.kept).toHaveLength(2);
    expect(r.additions.drops.map((d) => d.rule)).toEqual(["notOwned"]);
    expect(r.charge).toEqual({ outcome: "spent" });

    // A shortlist card the model never named is still there to ask for: the refill runs, and the short list is refunded.
    const more: EvidencePack = { ...owned, ownedCandidates: [...shortlist, { oracleId: "Add 9", name: "Add 9", typeLine: "Creature" }] };
    const g = fake({ additions: { cards: adds(1, 3) }, additionsRefill: { cards: [] }, cuts: { cards: cutsOf(1, 5) } });
    const s = await runV2({ ...base, pack: more, resolveName: ownedResolve, n: 4, callModel: g.callModel, now: g.now });
    expect(g.requests.map((q) => q.stage)).toContain("additionsRefill");
    expect(s.additions.poolExhausted).toBe(false);
    expect(s.charge).toEqual({ outcome: "refunded", why: "shortByModel" });

    // The same shortlist, every card kept or dropped, but a tier of it was cut (the read stopped at its page limit, or a
    // focus run's candidates hit their cap): cards past the cut were never tested, so the pool is not spent.
    const cut: EvidencePack = { ...owned, ownedCandidatesComplete: false };
    const h = fake({ additions: { cards: adds(1, 3) }, additionsRefill: { cards: [] }, cuts: { cards: cutsOf(1, 5) } });
    const t = await runV2({ ...base, pack: cut, resolveName: ownedResolve, n: 4, callModel: h.callModel, now: h.now });
    expect(h.requests.map((q) => q.stage)).toContain("additionsRefill");
    expect(t.additions.poolExhausted).toBe(false);
    expect(t.charge).toEqual({ outcome: "refunded", why: "shortByModel" });
  });

  // Prompt v12: the pool is both tiers. It is spent only when every card of BOTH was kept or dropped, and only when it is
  // complete: neither tier cut short at its cap, and the two together under OWNED_SHORTLIST_MAX.
  it("calls the owned pool spent only over both tiers, and only when the pool is complete", async () => {
    const card = (name: string) => ({ oracleId: name, name, typeLine: "Creature" });
    const ownedResolve = (name: string) => { const c = resolveName(name); return c ? { ...c, owned: name !== "Add 3" } : null; };
    const owned: EvidencePack = { ...pack, limits: { capCents: null, sets: [], ownedOnly: true }, ownedCandidates: adds(1, 2).map(card), ownedCandidatesComplete: true, ownedOffIndex: [card("Add 3")], ownedOffIndexComplete: true };
    const run = async (p: EvidencePack) => {
      const f = fake({ additions: { cards: adds(1, 3) }, additionsRefill: { cards: [] }, cuts: { cards: cutsOf(1, 5) } });
      const r = await runV2({ ...base, pack: p, resolveName: ownedResolve, n: 4, callModel: f.callModel, now: f.now });
      return { r, stages: f.requests.map((q) => q.stage) };
    };

    // Every card of both tiers kept or dropped: spent, no refill.
    const spent = await run(owned);
    expect(spent.r.additions.poolExhausted).toBe(true);
    expect(spent.stages).not.toContain("additionsRefill");

    // An off-index card the model never named is still there to ask for.
    const unnamed = await run({ ...owned, ownedOffIndex: [card("Add 3"), card("Add 9")] });
    expect(unnamed.r.additions.poolExhausted).toBe(false);
    expect(unnamed.stages).toContain("additionsRefill");

    // The same pool, every card kept or dropped, but the off-index tier filled its room (`readOwnedOffIndex` reports it
    // incomplete): owned off-index cards past it were never offered, so the pool is not spent. Likewise the first tier.
    const offFull = await run({ ...owned, ownedOffIndexComplete: false });
    expect(offFull.r.additions.poolExhausted).toBe(false);
    expect(offFull.stages).toContain("additionsRefill");
    const firstCut = await run({ ...owned, ownedCandidatesComplete: false });
    expect(firstCut.r.additions.poolExhausted).toBe(false);
  });

  it("lists the index tier before the off-index tier, in the model's order inside each, saved and reported alike", async () => {
    const card = (name: string) => ({ oracleId: name, name, typeLine: "Creature" });
    const ownedResolve = (name: string) => { const c = resolveName(name); return c ? { ...c, owned: true } : null; };
    // The model answers off-index cards (Add 1, Add 3, Add 5) first and interleaved with the index tier's.
    const owned: EvidencePack = {
      ...pack, limits: { capCents: null, sets: [], ownedOnly: true },
      ownedCandidates: ["Add 2", "Add 4", "Add 6", "Add 8"].map(card), ownedOffIndex: ["Add 1", "Add 3", "Add 5", "Add 7"].map(card),
    };
    const f = fake({ additions: { cards: ["Add 1", "Add 3", "Add 2", "Add 5", "Add 4", "Add 6"] }, cuts: { cards: cutsOf(1, 6) } });
    const saved: { card: string; position: number }[] = [];
    const r = await runV2({
      ...base, pack: owned, resolveName: ownedResolve, n: 4, callModel: f.callModel, now: f.now,
      onLine: (side, l) => { if (side === "add") saved.push({ card: l.card, position: l.position }); },
    });
    const order = ["Add 2", "Add 4", "Add 6", "Add 1", "Add 3", "Add 5"];
    expect(r.additions.kept.map((l) => l.card)).toEqual(order);
    // Every reader orders a run's lines by `position`: the saved positions sort to the same partition.
    expect([...saved].sort((a, b) => a.position - b.position).map((l) => l.card)).toEqual(order);
    expect(r.additions.kept.map((l) => l.position)).toEqual([0, 1, 2, OFF_INDEX_POSITION_BASE, OFF_INDEX_POSITION_BASE + 1, OFF_INDEX_POSITION_BASE + 2]);
    // Cuts keep their arrival order and plain positions.
    expect(r.cuts.kept.map((l) => l.position)).toEqual(r.cuts.kept.map((_, i) => i));

    // A run with no off-index tier keeps the model's order exactly.
    const g = fake({ additions: { cards: adds(1, 6) }, cuts: { cards: cutsOf(1, 6) } });
    const plain = await runV2({ ...base, n: 4, callModel: g.callModel, now: g.now });
    expect(plain.additions.kept.map((l) => l.card)).toEqual(adds(1, 6));
    expect(plain.additions.kept.map((l) => l.position)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("places a kept addition by tier, stable inside each tier", () => {
    const at = (positions: number[], offIndex: boolean) => additionPosition(positions.map((position) => ({ position })), offIndex);
    expect(at([], false)).toEqual({ position: 0, at: 0 });
    expect(at([], true)).toEqual({ position: OFF_INDEX_POSITION_BASE, at: 0 });
    expect(at([OFF_INDEX_POSITION_BASE, OFF_INDEX_POSITION_BASE + 1], false)).toEqual({ position: 0, at: 0 });
    expect(at([0, OFF_INDEX_POSITION_BASE], false)).toEqual({ position: 1, at: 1 });
    expect(at([0, 1, OFF_INDEX_POSITION_BASE], true)).toEqual({ position: OFF_INDEX_POSITION_BASE + 1, at: 3 });
    // The base sits past any list's ask, so an index-tier position never reaches it.
    expect(OFF_INDEX_POSITION_BASE).toBeGreaterThan(askFor(20));
  });

  it("calls an owned pool complete only with both tiers complete and under every cap", () => {
    const named = (n: number, prefix: string) => Array.from({ length: n }, (_, i) => ({ oracleId: `${prefix}${i}`, name: `${prefix} ${i}`, typeLine: "Creature" }));
    const on = { capCents: null, sets: [], ownedOnly: true };
    const done = { limits: on, ownedCandidatesComplete: true, ownedOffIndexComplete: true };
    expect(completeOwnedPool({ ...done, ownedCandidates: named(2, "I"), ownedOffIndex: named(3, "O") })?.map((c) => c.name)).toEqual(["I 0", "I 1", "O 0", "O 1", "O 2"]);
    expect(completeOwnedPool({ ...done, ownedCandidates: named(10, "I"), ownedOffIndex: named(OWNED_OFF_INDEX_MAX - 1, "O") })).toHaveLength(10 + OWNED_OFF_INDEX_MAX - 1);
    // Either tier reported incomplete: the off-index tier filled its room, or the first tier was cut.
    expect(completeOwnedPool({ ...done, ownedOffIndexComplete: false, ownedCandidates: named(2, "I"), ownedOffIndex: named(3, "O") })).toBeNull();
    expect(completeOwnedPool({ ...done, ownedOffIndexComplete: undefined, ownedCandidates: named(2, "I") })).toBeNull();
    expect(completeOwnedPool({ ...done, ownedCandidatesComplete: false, ownedCandidates: named(2, "I"), ownedOffIndex: named(3, "O") })).toBeNull();
    // The off-index tier at its own cap.
    expect(completeOwnedPool({ ...done, ownedCandidates: named(2, "I"), ownedOffIndex: named(OWNED_OFF_INDEX_MAX, "O") })).toBeNull();
    // The two together at the total cap, each under its own.
    expect(completeOwnedPool({ ...done, ownedCandidates: named(OWNED_SHORTLIST_MAX - 30, "I"), ownedOffIndex: named(30, "O") })).toBeNull();
    expect(completeOwnedPool({ ...done, ownedCandidates: named(OWNED_SHORTLIST_MAX - 31, "I"), ownedOffIndex: named(30, "O") })).toHaveLength(OWNED_SHORTLIST_MAX - 1);
    // The index tier at its cap.
    expect(completeOwnedPool({ ...done, ownedCandidates: named(OWNED_SHORTLIST_MAX, "I") })).toBeNull();
    // No first tier read; owned-only off.
    expect(completeOwnedPool({ ...done, ownedOffIndex: named(2, "O") })).toBeNull();
    expect(completeOwnedPool({ ...done, limits: { ...on, ownedOnly: false }, ownedCandidates: named(2, "I") })).toBeNull();
  });

  it("refills a short cut list against min(N, additions kept) and shows it every addition coming in", async () => {
    const f = fake({ additions: { cards: adds(1, 6) }, cuts: { cards: [...cutsOf(1, 2), "Commander"] }, cutsRefill: { cards: cutsOf(3, 2) } });
    const r = await runV2({ ...base, n: 4, callModel: f.callModel, now: f.now });
    const refill = f.requests.find((q) => q.stage === "cutsRefill")!;
    expect(refill.user).toContain("Propose exactly 2 cards to cut");
    expect(refill.user).toContain("Coming in (6)");
    expect(refill.user).toContain("- Commander: it is the commander");
    expect(r.cuts.kept).toHaveLength(4);
    expect(r.cuts.refilled).toBe(true);
    expect(r.charge).toEqual({ outcome: "spent" });
  });

  it("returns short additions, sized cuts to them, and refunds a run the model under-produced", async () => {
    const f = fake({ additions: { cards: adds(1, 2) }, additionsRefill: { cards: [] }, cuts: { cards: cutsOf(1, 5) } });
    const r = await runV2({ ...base, n: 4, callModel: f.callModel, now: f.now });
    expect(r.additions.kept).toHaveLength(2);
    expect(r.cuts.target).toBe(2);
    expect(r.charge).toEqual({ outcome: "refunded", why: "shortByModel" });
  });

  it("skips the cut call when nothing at all is kept, and refunds the run as ungrounded", async () => {
    const f = fake({ additions: { cards: ["Bolt"] }, additionsRefill: { cards: ["Nope"] } });
    const listsIn: string[] = [];
    const r = await runV2({ ...base, n: 3, callModel: f.callModel, now: f.now, onListIn: (s) => { listsIn.push(s); } });
    expect(f.requests.map((q) => q.stage)).toEqual(["additions", "additionsRefill"]);
    expect(r.cuts.skipped).toBe(true);
    expect(listsIn).toEqual(["add", "cut"]);
    expect(r.charge).toEqual({ outcome: "refunded", why: "ungrounded" });
  });

  it("asks for cuts sized to a refill's additions when call 1 kept none (spec §5.1a)", async () => {
    const f = fake({ additions: { cards: [] }, additionsRefill: { cards: adds(1, 2) }, cuts: { cards: cutsOf(1, 3) } });
    const r = await runV2({ ...base, n: 5, callModel: f.callModel, now: f.now });
    expect(f.requests.map((q) => q.stage)).toEqual(["additions", "additionsRefill", "cuts"]);
    expect(f.requests[2].user).toContain("Propose exactly 3 cards to cut");
    expect(r.cuts.kept).toHaveLength(3);
  });

  it("ends the cuts on a malformed cut reply: additions stand, no cut refill, refunded (P4)", async () => {
    const f = fake({ additions: { cards: adds(1, 5) }, cuts: { text: `{"cuts":[${JSON.stringify(line("Cut 1"))},{"card": "Cut`, fail: "malformed" } });
    const r = await runV2({ ...base, n: 3, callModel: f.callModel, now: f.now });
    expect(f.requests.map((q) => q.stage)).toEqual(["additions", "cuts"]);
    expect(r.additions.kept).toHaveLength(5);
    expect(r.cutsFailed).toEqual({ errorClass: "malformed" });
    expect(r.charge).toEqual({ outcome: "refunded", why: "cutsFailed" });
  });

  // M1's eight malformed attempts were all one line with an empty `rationaleShort` in an otherwise complete reply: the
  // client's whole-reply parse failed the call, while each line had already been judged on its own.
  it("keeps a closed reply the whole-reply parse failed: only the bad line is lost, the cuts stand", async () => {
    const bad = { ...line("Cut 3"), rationaleShort: "" };
    const text = JSON.stringify({ cuts: [line("Cut 1"), line("Cut 2"), bad, line("Cut 4"), line("Cut 5")] });
    const f = fake({ additions: { cards: adds(1, 5) }, cuts: { text, fail: "malformed" } });
    const r = await runV2({ ...base, n: 3, callModel: f.callModel, now: f.now });
    expect(r.cutsFailed).toBeNull();
    expect(r.cuts.kept.map((l) => l.card)).toEqual(["Cut 1", "Cut 2", "Cut 4", "Cut 5"]);
    expect(r.calls.find((c) => c.stage === "cuts")).toMatchObject({ ok: true, malformed: 1 });
    // Both lists still reach their target of 3, so the run is charged.
    expect(r.charge).toEqual({ outcome: "spent" });
  });

  it("keeps a closed additions reply the same way, and refunds it when the lost line leaves the list short", async () => {
    const bad = { ...line("Add 2"), rationaleShort: "" };
    const text = JSON.stringify({ additions: [line("Add 1"), bad] });
    const f = fake({ additions: { text, fail: "malformed" }, additionsRefill: { cards: [] }, cuts: { cards: cutsOf(1, 2) } });
    const r = await runV2({ ...base, n: 2, callModel: f.callModel, now: f.now });
    expect(r.calls[0]).toMatchObject({ stage: "additions", ok: true, malformed: 1 });
    expect(r.additions.kept.map((l) => l.card)).toEqual(["Add 1"]);
    expect(r.charge.outcome).toBe("refunded");
  });

  it("treats a reply that stopped mid-object as malformed even when the call said ok", async () => {
    const f = fake({ additions: { cards: adds(1, 5) }, cuts: { text: `{"cuts":[${JSON.stringify(line("Cut 1"))}` } });
    const r = await runV2({ ...base, n: 3, callModel: f.callModel, now: f.now });
    expect(r.cutsFailed).toEqual({ errorClass: "malformed" });
  });

  it("makes no call the budget cannot fit, and says the budget was reached", async () => {
    const f = fake({ additions: { cards: adds(1, 2), ms: 100_000 }, additionsRefill: { cards: adds(3, 1) }, cuts: { cards: cutsOf(1, 3), ms: 10_000 } });
    const r = await runV2({ ...base, n: 3, budgetMs: 105_000, callModel: f.callModel, now: f.now });
    // 5s left after call 1: under the 15s floor, so neither the refill nor the cut call is made.
    expect(f.requests.map((q) => q.stage)).toEqual(["additions"]);
    expect(r.budgetReached).toBe(true);
    expect(r.charge.outcome).toBe("refunded");
  });

  it("bounds each call's deadline by what the budget has left", async () => {
    const f = fake({ additions: { cards: adds(1, 5), ms: 200_000 }, cuts: { cards: cutsOf(1, 5) } });
    await runV2({ ...base, n: 3, budgetMs: 400_000, callModel: f.callModel, now: f.now });
    expect(f.requests.map((q) => q.deadlineMs)).toEqual([300_000, 200_000]);
  });

  it("drops a refill's card already kept, across calls", async () => {
    const f = fake({ additions: { cards: adds(1, 2) }, additionsRefill: { cards: ["Add 1", "Add 3"] }, cuts: { cards: cutsOf(1, 3) } });
    const r = await runV2({ ...base, n: 3, callModel: f.callModel, now: f.now });
    expect(r.additions.kept.map((l) => l.card)).toEqual(["Add 1", "Add 2", "Add 3"]);
    expect(r.additions.drops).toEqual([expect.objectContaining({ rule: "duplicate", name: "Add 1", side: "add", position: 0 })]);
  });

  it("keeps the first ask-many valid lines of a reply that runs over", async () => {
    const f = fake({ additions: { cards: ["Bolt", ...adds(1, 9)] }, cuts: { cards: cutsOf(1, 9) } });
    const r = await runV2({ ...base, n: 2, callModel: f.callModel, now: f.now });
    expect(r.additions.kept.map((l) => l.card)).toEqual(adds(1, 3));
    expect(r.additions.overAsk).toBe(6);
    expect(r.cuts.kept).toHaveLength(3);
  });

  it("drops a line that breaks a Keep choice as the player's restriction, and charges a run it bound", async () => {
    const f = fake({ additions: { cards: adds(1, 3) }, additionsRefill: { cards: adds(6, 1) }, cuts: { cards: cutsOf(1, 3) } });
    // Add 1, Add 2 and Add 6 would take the deck to bracket 4; the player keeps it at 3.
    const bracketAfter = (_side: "add" | "cut", l: { addOracleId: string | null }) => (["Add 1", "Add 2", "Add 6"].includes(l.addOracleId ?? "") ? [4] : null);
    const r = await runV2({ ...base, n: 2, aim: { choice: "keep", target: 3 }, bracketAfter, callModel: f.callModel, now: f.now });
    expect(r.additions.drops.map((d) => d.rule)).toEqual(["bracketAim", "bracketAim", "bracketAim"]);
    expect(r.additions.kept.map((l) => l.card)).toEqual(["Add 3"]);
    expect(f.requests[0].user).toContain("stay in bracket 3");
    expect(r.charge).toEqual({ outcome: "spent" });
  });

  it("tells the model a Keep over a range may settle anywhere in it (review round 1)", async () => {
    const f = fake({ additions: { cards: adds(1, 2) }, cuts: { cards: cutsOf(1, 2) } });
    await runV2({ ...base, n: 2, aim: { choice: "keep", target: 5, low: 4 }, callModel: f.callModel, now: f.now });
    expect(f.requests[0].user).toContain("stay in bracket 4 or 5");
    expect(f.requests[0].user).not.toContain("out of bracket 5.");
  });

  it("drops a Down addition whose card alone bars the target, through cardFloor", async () => {
    const f = fake({ additions: { cards: adds(1, 3) }, cuts: { cards: cutsOf(1, 3) } });
    const cardFloor = (_side: "add" | "cut", l: { addOracleId: string | null }) => (l.addOracleId === "Add 2" ? 4 : null);
    const r = await runV2({ ...base, n: 2, aim: { choice: "down", target: 2 }, cardFloor, callModel: f.callModel, now: f.now });
    expect(r.additions.drops).toEqual([expect.objectContaining({ rule: "bracketAim", name: "Add 2" })]);
  });

  it("refunds a short list whose call returned fewer lines than it asked, though restrictions could cover the gap", async () => {
    const f = fake({ additions: { cards: adds(1, 2) }, additionsRefill: { cards: adds(6, 1) }, cuts: { cards: cutsOf(1, 3) } });
    const bracketAfter = (_side: "add" | "cut", l: { addOracleId: string | null }) => (["Add 1", "Add 6"].includes(l.addOracleId ?? "") ? [4] : null);
    const r = await runV2({ ...base, n: 2, aim: { choice: "keep", target: 3 }, bracketAfter, callModel: f.callModel, now: f.now });
    expect(r.additions).toMatchObject({ underProduced: true });
    expect(r.additions.kept).toHaveLength(1);
    expect(r.charge).toEqual({ outcome: "refunded", why: "shortByModel" });
  });

  it("refunds a short list whose refill sent a shape-invalid line, though restriction drops outnumber the gap (round 1)", async () => {
    const f = fake({
      additions: { cards: adds(1, 3) },
      additionsRefill: { text: JSON.stringify({ additions: [{ card: "Add 9" }] }) },
      cuts: { cards: cutsOf(1, 3) },
    });
    const bracketAfter = (_side: "add" | "cut", l: { addOracleId: string | null }) => (["Add 1", "Add 2"].includes(l.addOracleId ?? "") ? [4] : null);
    const r = await runV2({ ...base, n: 2, aim: { choice: "keep", target: 3 }, bracketAfter, callModel: f.callModel, now: f.now });
    expect(r.additions.kept).toHaveLength(1);
    expect(r.additions.underProduced).toBe(true);
    expect(r.charge).toEqual({ outcome: "refunded", why: "shortByModel" });
  });

  it("fails the run when saving a kept line throws, rather than charging for a line it never saved (round 2)", async () => {
    const f = fake({ additions: { cards: adds(1, 2) }, cuts: { cards: cutsOf(1, 2) } });
    const onLine = async () => { throw new Error("save failed"); };
    await expect(runV2({ ...base, n: 1, onLine, callModel: f.callModel, now: f.now })).rejects.toThrow("save failed");
  });

  it("lets both parallel branches settle before a failed save goes up, so nothing writes after the run fails (round 3)", async () => {
    // Call 1 keeps 1 of N=2, so the additions refill and the cut call run side by side; the refill's save throws.
    const f = fake({ additions: { cards: ["Add 1", "Bogus"] }, additionsRefill: { cards: adds(6, 1) }, cuts: { cards: cutsOf(1, 3), chunk: 20, slow: true } });
    let failed = false;
    let lateWrites = 0;
    const onLine = async (side: "add" | "cut", l: { card: string }) => {
      if (failed) lateWrites += 1;
      if (side === "add" && l.card === "Add 6") throw new Error("save failed");
    };
    await expect(runV2({ ...base, n: 2, onLine, callModel: f.callModel, now: f.now }).finally(() => { failed = true; })).rejects.toThrow("save failed");
    // Let anything still streaming drain before counting: a write after the rejection is what this guards.
    await new Promise((r) => setTimeout(r, 300));
    expect(lateWrites).toBe(0);
  });

  it("sends the request as the run's words through playerText and validates a request citation", async () => {
    const quoted = { ...line("Add 1"), evidence: [{ kind: "request", value: "more ramp" }] };
    const f = fake({ additions: { text: JSON.stringify({ additions: [quoted, ...adds(2, 4).map(line)] }) }, cuts: { cards: cutsOf(1, 5) } });
    const r = await runV2({ ...base, n: 3, request: "more ramp", callModel: f.callModel, now: f.now });
    expect(f.requests[0].cachedUser).toContain("<<<PLAYER_TEXT>>>\nmore ramp\n<<<END_PLAYER_TEXT>>>");
    expect(r.additions.kept[0].evidence).toEqual([{ kind: "request", value: "more ramp" }]);
  });
});

describe("runV2: why these cards", () => {
  const why = {
    lead: "More mana for the deck.",
    add: [{ phrase: "fix the mana", cards: ["Add 1", "Add 2", "Add 3"], like: "Add 2" }],
    cut: [{ phrase: "are slow", cards: ["Cut 1", "Cut 2"] }],
  };

  it("at N >= 6, asks once both lists are final, at its own model and effort, and stores the checked why", async () => {
    const f = fake({ additions: { cards: adds(1, 9) }, cuts: { cards: cutsOf(1, 9) }, why: { text: JSON.stringify(why) } });
    const r = await runV2({ ...base, n: 6, callModel: f.callModel, now: f.now });
    const last = f.requests.at(-1)!;
    expect(last).toMatchObject({ stage: "why", effort: "low", model: "claude-sonnet-5-5" });
    expect(f.events.indexOf("start why")).toBeGreaterThan(f.events.lastIndexOf("end cuts"));
    // The call is shown the kept rows with their short reasons.
    expect(last.user).toContain("- Add 1: Mana hurt in 3 of 5");
    expect(last.user).toContain("- Cut 1: Mana hurt in 3 of 5");
    expect(r.why).toEqual({
      lead: "More mana for the deck.",
      add: [{ text: "Three fix the mana, like " }, { card: "Add 2", oracleId: "Add 2" }, { text: "." }],
      cut: [{ text: "Two are slow, like " }, { card: "Cut 1", oracleId: "Cut 1" }, { text: "." }],
    });
    expect(r.calls.at(-1)).toMatchObject({ stage: "why", ok: true });
  });

  it("is not asked below N = 6, or when the cuts failed", async () => {
    const f = fake({ additions: { cards: adds(1, 8) }, cuts: { cards: cutsOf(1, 8) }, why: { text: JSON.stringify(why) } });
    expect((await runV2({ ...base, n: 5, callModel: f.callModel, now: f.now })).why).toBeNull();
    expect(f.requests.map((q) => q.stage)).not.toContain("why");
    const g = fake({ additions: { cards: adds(1, 9) }, cuts: { fail: "timeout" }, why: { text: JSON.stringify(why) } });
    expect((await runV2({ ...base, n: 6, callModel: g.callModel, now: g.now })).why).toBeNull();
    expect(g.requests.map((q) => q.stage)).not.toContain("why");
  });

  it("a failed or unparsable why call leaves the lists and the charge as they were", async () => {
    for (const s of [{ fail: "timeout" as const, text: JSON.stringify(why) }, { text: "{\"lead\": " }]) {
      const f = fake({ additions: { cards: adds(1, 9) }, cuts: { cards: cutsOf(1, 9) }, why: s });
      const r = await runV2({ ...base, n: 6, callModel: f.callModel, now: f.now });
      expect(r.why).toBeNull();
      expect(r.charge).toEqual({ outcome: "spent" });
      // The engine keeps the whole valid pool (ceil(1.5N) = 9 at N = 6), never trims it to N.
      expect(r.additions.kept).toHaveLength(9);
      expect(r.calls.at(-1)).toMatchObject({ stage: "why", ok: false });
    }
  });
});
