import { describe, expect, it } from "vitest";

import { buildPlayGroup } from "../../profile/play";
import type { DeckGame } from "../../decks/games";
import type { EvidencePack } from "../evidence";
import type { ResolvedCard } from "../validate";
import { replyCeilingFor } from "./count";
import { runV2, type V2CallModel, type V2CallRequest, type V2Stage } from "./engine";

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
type Script = Partial<Record<V2Stage, { cards?: string[]; fail?: "timeout" | "malformed"; text?: string; ms?: number }>>;

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
      for (let i = 0; i < text.length; i += 7) {
        await Promise.resolve();
        yield text.slice(i, i + 7);
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
    expect(f.requests[0].system).toContain("Propose exactly 5 cards to add");
    expect(f.requests[1].user).toContain("Coming in (5): Add 1; Add 2; Add 3; Add 4; Add 5.");
    expect(f.requests[0].maxTokens).toBe(replyCeilingFor(5));
    expect(r.additions.kept.map((l) => l.card)).toEqual(adds(1, 5));
    expect(r.cuts.kept).toHaveLength(5);
    expect(r.cuts.target).toBe(3);
    expect(seen.slice(0, 5)).toEqual(adds(1, 5).map((c) => `add:${c}`));
    expect(r).toMatchObject({ callCount: 2, cutsFailed: null, budgetReached: false, charge: { outcome: "spent" } });
  });

  it("starts the cut call as soon as call 1 settles, alongside the additions refill (H2)", async () => {
    const f = fake({ additions: { cards: [...adds(1, 2), "Bolt"] }, additionsRefill: { cards: adds(3, 3) }, cuts: { cards: cutsOf(1, 6) } });
    const r = await runV2({ ...base, n: 4, callModel: f.callModel, now: f.now });
    expect(f.events.slice(0, 3)).toEqual(["start additions", "end additions", "start additionsRefill"]);
    expect(f.events.indexOf("start cuts")).toBeLessThan(f.events.indexOf("end additionsRefill"));
    const refill = f.requests.find((q) => q.stage === "additionsRefill")!;
    expect(refill.system).toContain("Propose exactly 2 cards to add");
    expect(refill.user).toContain("Kept, additions: Add 1; Add 2.");
    expect(refill.user).toContain("- Bolt: it is outside the commander's colors");
    // The cut call saw call 1's kept additions, not the refill's.
    expect(f.requests.find((q) => q.stage === "cuts")!.user).toContain("Coming in (2): Add 1; Add 2.");
    expect(r.additions).toMatchObject({ refilled: true });
    expect(r.additions.kept).toHaveLength(5);
    expect(r.cuts.target).toBe(4);
    expect(r.charge).toEqual({ outcome: "spent" });
  });

  it("refills a short cut list against min(N, additions kept) and shows it every addition coming in", async () => {
    const f = fake({ additions: { cards: adds(1, 6) }, cuts: { cards: [...cutsOf(1, 2), "Commander"] }, cutsRefill: { cards: cutsOf(3, 2) } });
    const r = await runV2({ ...base, n: 4, callModel: f.callModel, now: f.now });
    const refill = f.requests.find((q) => q.stage === "cutsRefill")!;
    expect(refill.system).toContain("Propose exactly 2 cards to cut");
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
    expect(f.requests[2].system).toContain("Propose exactly 3 cards to cut");
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
    expect(f.requests[0].system).toContain("stay in bracket 3");
    expect(r.charge).toEqual({ outcome: "spent" });
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

  it("sends the request as the run's words through playerText and validates a request citation", async () => {
    const quoted = { ...line("Add 1"), evidence: [{ kind: "request", value: "more ramp" }] };
    const f = fake({ additions: { text: JSON.stringify({ additions: [quoted, ...adds(2, 4).map(line)] }) }, cuts: { cards: cutsOf(1, 5) } });
    const r = await runV2({ ...base, n: 3, request: "more ramp", callModel: f.callModel, now: f.now });
    expect(f.requests[0].user).toContain("<<<PLAYER_TEXT>>>\nmore ramp\n<<<END_PLAYER_TEXT>>>");
    expect(r.additions.kept[0].evidence).toEqual([{ kind: "request", value: "more ramp" }]);
  });
});
