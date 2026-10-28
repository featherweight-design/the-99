/**
 * `pnpm eval:count-mechanism [--dry-run] [--only <deck>]` — a PROTOTYPE of Suggested changes' new flow (Hugh's rethink,
 * 2026-10-27, `boards/suggested-changes-rethink-2026-10-27.md`), eval-only and wired into nothing, measuring how to fulfil
 * a player's COUNT. For N cards in: ADDITIONS FIRST, for what the player asked and the deck's weaknesses (overview, focus,
 * games and role gaps as supporting evidence); THEN EXACTLY N CUTS to make room, the cards that make the least sense now.
 * Not paired. Two ways to ask for that, both measured (Hugh, 2026-10-27: "test both"):
 *
 *   two-call  stage 1 asks for N additions alone; stage 2 is shown the additions kept ("Coming in") and asks for N cuts.
 *   one-call  one reply returns N additions, then N cuts that make room for them.
 *
 * Three ways to fill a count, applied to each stage (two-call) or to the one reply (one-call), one variable each:
 *   A  over-ask:          ask ceil(1.5K) in ONE call, keep the first K that pass validation.
 *   B  exact + refill:    ask K; if short after validation, ONE more call told what was kept, what was rejected and why.
 *   C  over-ask + refill: A, then B's refill only when still short.
 *
 * The request is the player's own words. It rides in the pack's `notes`, the field the app already renders through
 * `playerText` ("What the player is asking for this run") and validates as a `notes` citation; an empty request is none.
 * A citation that cannot be grounded costs that citation, not the line, and `focus` is citable (both shipped in #2289).
 * Nothing is trimmed for balance. Only the size sentences of the system prompt, the cut stage's "Coming in" line, the
 * refill's question, the schema's list caps and the reply ceiling change; `patchFlow` asserts each replacement lands
 * exactly once, so a reworded prompt fails here rather than measuring the old one.
 *
 * DATABASE: a scratch branch named by `COUNT_EVAL_DB_URL` and `COUNT_EVAL_BRANCH` (`scratch.mts`), holding copies of Hugh's
 * production decks and his original Mutant Menace list (`count-mechanism-seed.mts`). Nothing here writes to it.
 *
 * SPEND: hard cap $15 on its own ledger (`ledger-count-mechanism.jsonl`). Every call reserves its worst case BEFORE it is
 * sent and settles to its measured cost after; a call whose worst case would cross the cap is not sent and the run stops.
 * The plan runs in priority order, so a stop at the cap costs the least important rows. `--dry-run` prepares every deck,
 * patches every prompt, prints the plan and its worst case, and calls nothing. Rows are appended as each run finishes, so
 * a stop or a crash keeps what was paid for, and a re-run skips every run already written.
 */
import "../lib/env.mjs";

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { z } from "zod";

import { deckTuningCopy } from "../../src/lib/copy/deck-tuning";
import { LEDGER_LIMITS } from "../../src/lib/eval/ledger-limits";
import { EVAL_USER_ID } from "./count-mechanism-seed.mjs";
import { acquireRunLock, readLedger, record, spent } from "./lib/ledger.mjs";
import { connectScratch } from "./lib/scratch.mjs";
import { openTuning } from "./lib/tuning-app.mjs";
import { TUNING_VARIANTS } from "./variants/tuning.mjs";

const LEDGER = "docs/superpowers/eval/ledger-count-mechanism.jsonl";
const CAP_USD = LEDGER_LIMITS["ledger-count-mechanism.jsonl"].hardCapUsd;
const OUT = "docs/superpowers/eval/count-mechanism";
const ROWS = `${OUT}/rows.jsonl`;

export const ARMS = ["A", "B", "C"] as const;
export type Arm = (typeof ARMS)[number];
export const FLOWS = ["two-call", "one-call"] as const;
export type Flow = (typeof FLOWS)[number];
/** What one call asks for: the additions stage, the cuts stage, or both lists in one reply. */
export type Ask = { adds: number; cuts: number };

/** One realistic request per deck, written for the eval (d9, 2026-10-27), beside an empty one. */
export const REQUESTS: Record<string, string> = {
  "HD Tune - Mutant Menace": "Tighten the mutant and +1/+1 counters plan, and cut the clone pile.",
  "HD Tune - Mutant Menace (original)": "Tighten the mutant and +1/+1 counters plan, and cut the clone pile.",
  "HD - Goblins": "More ways to win once the board is wide, fewer do-nothing Goblins.",
  "HD - Avatar Aang": "Make the commander flip more reliably, and cut cards that don't help bend.",
  "HD - Gishath": "More Dinosaurs that hit hard when Gishath reveals them, fewer cards that don't.",
};

/** Hugh's pick (d9, 2026-10-27), in PRIORITY order: Mutant Menace twice (the production list and the original Moxfield
 *  list) at the gut case 20, then 10, then Goblins (focus set) and Avatar Aang (an intent, no focus), the 3s, and Gishath
 *  only if the cap allows. Each row runs every flow and arm, with the empty request and the deck's written one. */
export const PLAN: { deck: string; count: number }[] = [
  { deck: "HD Tune - Mutant Menace", count: 20 },
  { deck: "HD Tune - Mutant Menace (original)", count: 20 },
  { deck: "HD Tune - Mutant Menace", count: 10 },
  { deck: "HD Tune - Mutant Menace (original)", count: 10 },
  { deck: "HD - Goblins", count: 20 },
  { deck: "HD - Avatar Aang", count: 20 },
  { deck: "HD - Goblins", count: 10 },
  { deck: "HD - Avatar Aang", count: 10 },
  { deck: "HD Tune - Mutant Menace", count: 3 },
  { deck: "HD Tune - Mutant Menace (original)", count: 3 },
  { deck: "HD - Goblins", count: 3 },
  { deck: "HD - Avatar Aang", count: 3 },
  { deck: "HD - Gishath", count: 20 },
];

export const overAsk = (n: number) => Math.ceil(n * 1.5);

/** A reply ceiling that fits the lines asked for: about 450 tokens a line measured on v9 answers, and room to think. */
export const ceilingFor = (lines: number) => Math.max(8_000, 600 * lines + 4_000);

const SIZE_SENTENCE = /Propose up to \d+ cards to add and up to \d+ cards to cut, as two separate lists\./;
const AIM_SENTENCE = "Aim for as many cuts as additions, so the deck stays its size, but offer fewer of either when the evidence is thin.";
const FILL = "Fill the list: when the evidence thins, choose the soundest remaining cards rather than offering fewer.";

/**
 * The system prompt for one call: ask exactly `ask` on each list, in place of the app's "up to six each way" and "offer
 * fewer". `n` is the player's count. `comingIn` is how many additions the two-call cut stage lists under "Coming in", and
 * absent for a cuts-only one-call REFILL, whose additions are named in the refill's own "Kept" line instead. Throws when
 * either sentence moved.
 */
export function patchFlow(system: string, ask: Ask, n: number, comingIn?: number): string {
  if ((system.match(new RegExp(SIZE_SENTENCE, "g")) ?? []).length !== 1) throw new Error("eval: the size sentence moved; re-read prompt.ts");
  if (system.split(AIM_SENTENCE).length !== 2) throw new Error("eval: the aim sentence moved; re-read prompt.ts");
  const size = ask.cuts === 0
    ? `Propose exactly ${ask.adds} cards to add, and leave the cuts list empty.`
    : ask.adds === 0
      ? `Propose exactly ${ask.cuts} cards to cut, and leave the additions list empty.`
      : `Propose exactly ${ask.adds} cards to add and exactly ${ask.cuts} cards to cut, as two separate lists.`;
  const addAim = `Choose the additions first: for what the player asked, and for the deck's weaknesses that the overview, the focus, the games and the targets show.`;
  const cutAim = "the cards that make the least sense in this deck once those are in.";
  const aim = ask.cuts === 0
    ? `The player wants ${n} cards in. ${addAim} ${FILL}`
    : ask.adds === 0
      ? comingIn !== undefined
        ? `The player is adding ${comingIn} cards, listed under "Coming in", and the deck must stay its size. Choose the cuts that make room: ${cutAim} ${FILL}`
        : `The player wants ${n} cards in, and the deck must stay its size. Choose the cuts that make room for the additions kept so far, named below: ${cutAim} ${FILL}`
      : `The player wants ${n} cards in, and the deck must stay its size. ${addAim} Then choose the cuts that make room for them: ${cutAim} ${FILL}`;
  return system.replace(SIZE_SENTENCE, size).replace(AIM_SENTENCE, aim);
}

/** What the cut stage is told is coming in: the additions the first stage kept, by name. */
export const comingInBlock = (adds: string[]) => ["", `Coming in (${adds.length}): ${adds.join("; ")}.`].join("\n");

const REASON: Record<string, string> = {
  cardExists: "no card has that exact name",
  duplicate: "it was named twice",
  cutInDeck: "it is not in the deck",
  commander: "it is the commander",
  neverCut: "the player locked it",
  keyCard: "it is a key card of the deck's strategy",
  universalStaple: "a staple is not cut only to fix a role count",
  colourIdentity: "it is outside the commander's colors",
  addNotLegal: "it is not legal in Commander, or the deck already holds it",
  overCap: "it is over the price limit",
  offSet: "it is from a set the player excluded",
  notOwned: "the player does not own it",
};
/** Why a line was rejected, in words the refill can act on: a hard filter's own reason, else the writing rule's own text. */
export const reasonFor = (d: { rule: string; cite?: string }) =>
  d.rule === "citation"
    ? `its ${d.cite ?? ""} citation is not supported by the evidence`
    : (REASON[d.rule]
      ?? (Object.hasOwn(deckTuningCopy.suggestionRules, d.rule) ? `it broke the rule: ${deckTuningCopy.suggestionRules[d.rule as keyof typeof deckTuningCopy.suggestionRules]}` : null)
      ?? "its wording broke a writing rule");

/** The refill's question: what stands, what fell and why, and exactly the shortfall on each list. */
export function refillBlock(kept: { adds: string[]; cuts: string[] }, rejected: { card: string; side: "add" | "cut"; reason: string }[], short: Ask): string {
  const want = [short.adds > 0 ? `exactly ${short.adds} more additions` : null, short.cuts > 0 ? `exactly ${short.cuts} more cuts` : null].filter(Boolean).join(" and ");
  return [
    "",
    "Your first answer was checked against the rules.",
    ...(kept.adds.length > 0 || short.adds > 0 ? [`Kept, additions: ${kept.adds.join("; ") || "none"}.`] : []),
    ...(kept.cuts.length > 0 || short.cuts > 0 ? [`Kept, cuts: ${kept.cuts.join("; ") || "none"}.`] : []),
    ...(rejected.length > 0 ? ["Rejected, and why:", ...rejected.map((r) => `- ${r.card} (${r.side === "add" ? "addition" : "cut"}): ${r.reason}`)] : []),
    `Propose ${want}, following every rule above. Name none of the cards listed here.`,
  ].join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { values: args } = parseArgs({ options: { "dry-run": { type: "boolean", default: false }, only: { type: "string" } } });
  const dry = args["dry-run"];
  const app = await openTuning({ connect: () => connectScratch("eval:count-mechanism"), userId: EVAL_USER_ID });
  const { callModel } = await import("../../src/lib/model/client");
  const { costMicroUsd, worstCaseMicroUsd } = await import("../../src/lib/model/prices");
  const { lineSchema } = await import("../../src/lib/tuning/response-schema");
  const { buildPrompt } = await import("../../src/lib/tuning/prompt");
  const { TUNING_EFFORT } = await import("../../src/lib/tuning/limits");
  const { parseStrategyKey } = await import("../../src/lib/strategy/focus");
  const { db } = await import("../../src/db/index");
  const { sql } = await import("drizzle-orm");
  const log = (line: string) => console.log(`[eval:count-mechanism] ${line}`);

  const plan = PLAN.filter((p) => !args.only || p.deck === args.only);
  const deckRows = (await db.execute(sql`select id, name, strategy_focus from decks where user_id = ${EVAL_USER_ID}`)).rows as { id: string; name: string; strategy_focus: string | null }[];
  const idOf = new Map(deckRows.map((d) => [d.name, d.id]));
  // Gishath is the one optional deck: absent from the scratch branch, its rows are skipped rather than failing the run.
  const runnable = plan.filter((p) => idOf.has(p.deck) || p.deck !== "HD - Gishath");
  for (const p of runnable) if (!idOf.has(p.deck)) throw new Error(`eval: the scratch branch holds no deck named ${p.deck}; run the seed`);
  const live = runnable.filter((p) => idOf.has(p.deck));
  const focusOf = new Map(deckRows.flatMap((d) => {
    const key = parseStrategyKey(d.strategy_focus);
    return key ? [[d.id, key] as const] : [];
  }));
  const prepared = await app.prepare([...new Set(live.map((p) => idOf.get(p.deck)!))], TUNING_VARIANTS.base, null, focusOf);
  const packOf = new Map(prepared.map((p) => [p.deckId, p.pack]));
  type Pack = (typeof prepared)[number]["pack"];
  /** The app's own messages for this deck with the request as the run's notes (rendered through `playerText`). */
  const messagesFor = (pack: Pack, request: string) => {
    const withRequest = { ...pack, notes: request === "" ? null : request };
    return { pack: withRequest, ...buildPrompt(withRequest) };
  };

  // A conservative input ceiling with no API call (the dry run calls nothing): ~3 characters a token, plus a margin.
  const inputCeiling = (system: string, user: string) => Math.ceil((system.length + user.length) / 3) + 1_500;
  const worstOf = (system: string, user: string, lines: number) =>
    worstCaseMicroUsd(app.model, inputCeiling(system, user), ceilingFor(lines)) / 1e6;
  const firstAsk = (arm: Arm, k: number) => (arm === "B" ? k : overAsk(k));

  let planWorst = 0;
  let planRuns = 0;
  for (const p of live) {
    const pack = packOf.get(idOf.get(p.deck)!)!;
    for (const request of ["", REQUESTS[p.deck]]) {
      const m = messagesFor(pack, request);
      for (const flow of FLOWS) for (const arm of ARMS) {
        const k = firstAsk(arm, p.count);
        // Every patch is exercised here, dry run or not, before a cent is spent.
        const asks: Ask[] = flow === "two-call" ? [{ adds: k, cuts: 0 }, { adds: 0, cuts: k }] : [{ adds: k, cuts: k }];
        for (const a of asks) planWorst += worstOf(patchFlow(m.system, a, p.count, a.adds === 0 ? p.count : undefined), m.user, a.adds + a.cuts);
        planRuns += 1;
      }
    }
  }
  log(`${planRuns} runs (${FLOWS.join(" and ")}, every arm, two requests), first-call worst case $${planWorst.toFixed(2)} against the $${CAP_USD} cap; spent so far $${spent(readLedger(LEDGER)).toFixed(2)}`);
  for (const prep of prepared) {
    const name = deckRows.find((d) => d.id === prep.deckId)!.name;
    log(`${name}: focus ${prep.pack.focus?.name ?? "none"}, intent ${prep.pack.intent === null ? "none" : "set"}, request "${REQUESTS[name]}"`);
  }
  if (dry) {
    log("dry run: every prompt patched cleanly; nothing was called");
    process.exit(0);
  }

  acquireRunLock(LEDGER);
  mkdirSync(OUT, { recursive: true });
  const keyOf = (r: { deck: string; count: number; request: string; flow: string; arm: string }) => `${r.deck}|${r.count}|${r.request}|${r.flow}|${r.arm}`;
  const done = new Set(existsSync(ROWS) ? readFileSync(ROWS, "utf8").split("\n").filter(Boolean).map((l) => keyOf(JSON.parse(l))) : []);

  type Line = z.infer<typeof lineSchema>;
  type Reply = { additions: Line[]; cuts: Line[] };
  type Drop = { call: number; side: "add" | "cut"; rule: string; cite?: string; card: string };
  /** One call, reserved on the ledger at its worst case first, settled to its measured cost after. */
  async function call(label: string, system: string, user: string, ask: Ask) {
    const worst = worstOf(system, user, ask.adds + ask.cuts);
    const now = spent(readLedger(LEDGER));
    if (now + worst > CAP_USD) throw new Error(`STOP before ${label}: worst case $${worst.toFixed(3)} would cross the $${CAP_USD} cap (spent $${now.toFixed(3)})`);
    const id = `${Date.now()}-${label}`;
    record(LEDGER, { at: new Date().toISOString(), runId: id, source: "pending", usd: worst, requests: 1, pending: id, note: label });
    const schema = z.object({ additions: z.array(lineSchema).max(ask.adds), cuts: z.array(lineSchema).max(ask.cuts) });
    const t = Date.now();
    // Every attempt that failed logs a `[model] malformed` or `[model] upstream` line; counted, it says whether an attempt
    // may have been billed with no meter coming back (a stream that dropped before its final message).
    let failedAttempts = 0;
    const o = await callModel<Reply>(
      { model: app.model, system, user, maxTokens: ceilingFor(ask.adds + ask.cuts), schema, deadlineMs: 300_000, effort: TUNING_EFFORT, stream: true },
      { log: (line) => { if (/^\[model\] (malformed|upstream)/.test(line)) failedAttempts++; console.error(line); } },
    );
    const ms = Date.now() - t;
    // A call with any failed attempt settles at its worst case, metered or not, success or failure: its usage can cover only
    // some of `callModel`'s attempts, and an under-count would let later calls past the cap. A call whose one attempt
    // succeeded settles at its meter.
    const usd = o.ok && failedAttempts === 0 ? (o.usage ? costMicroUsd(app.model, o.usage) / 1e6 : 0) : worst;
    record(LEDGER, { at: new Date().toISOString(), runId: `count-mechanism-${label}`, source: "realtime:1", usd, requests: 1, settles: id, note: label });
    log(`${label}: ${o.ok ? "ok" : `failed (${o.errorClass})`} in ${(ms / 1000).toFixed(1)}s, $${usd.toFixed(4)}; ledger $${spent(readLedger(LEDGER)).toFixed(2)}`);
    return { o, ms, usd };
  }

  /**
   * One fill: `want` on each list from one call, then the arm's refill when a list is short. Two-call runs it twice (want
   * on one list only each time); one-call runs it once, both lists together. Survivors keep the validator's order; a card
   * already kept is not taken twice.
   */
  async function fill(label: string, arm: Arm, want: Ask, n: number, pack: Pack, system: string, user: string, comingIn?: number) {
    const calls: { ok: boolean; ms: number; usd: number }[] = [];
    const drops: Drop[] = [];
    const kept = { adds: [] as Line[], cuts: [] as Line[] };
    const take = async (ask: Ask, u: string, callNo: number) => {
      const r = await call(`${label}-${callNo}`, patchFlow(system, ask, n, comingIn), u, ask);
      calls.push({ ok: r.o.ok, ms: r.ms, usd: r.usd });
      if (!r.o.ok) return;
      const value = r.o.value;
      const [s] = await app.score([{ pack, value }], Math.max(ask.adds, ask.cuts, 1));
      const dropped = new Set(s.dropList.map((d) => `${d.side ?? "add"}:${d.position}`));
      drops.push(...s.dropList.map((d) => {
        const side = (d.side ?? "add") as "add" | "cut";
        return { call: callNo, side, rule: d.rule, cite: d.cite?.kind, card: (side === "add" ? value.additions : value.cuts)[d.position]?.card ?? "?" };
      }));
      const seen = new Set([...kept.adds, ...kept.cuts].map((l) => l.card.toLowerCase()));
      // A survivor carries the VALIDATED text (`keptSuggestions`: a part-quote repaired to bare, say), which is what the app
      // would show. The validator keeps survivors in reply order per list, so the two line up one to one.
      const add = (side: "add" | "cut", lines: Line[], cap: number) => {
        const shown = s.keptSuggestions.filter((k) => (side === "add" ? k.addOracleId !== null : k.addOracleId === null));
        const survivors = lines.filter((_, i) => !dropped.has(`${side}:${i}`))
          .map((l, j) => ({ ...l, rationale: shown[j]?.rationale ?? l.rationale, rationaleShort: shown[j]?.rationaleShort ?? l.rationaleShort }));
        return [...kept[side === "add" ? "adds" : "cuts"], ...survivors.filter((l) => !seen.has(l.card.toLowerCase()))].slice(0, cap);
      };
      kept.adds = add("add", value.additions, want.adds);
      kept.cuts = add("cut", value.cuts, want.cuts);
    };
    await take({ adds: want.adds > 0 ? firstAsk(arm, want.adds) : 0, cuts: want.cuts > 0 ? firstAsk(arm, want.cuts) : 0 }, user, 1);
    const short = { adds: want.adds - kept.adds.length, cuts: want.cuts - kept.cuts.length };
    if (arm !== "A" && (short.adds > 0 || short.cuts > 0)) {
      const block = refillBlock({ adds: kept.adds.map((l) => l.card), cuts: kept.cuts.map((l) => l.card) }, drops.map((d) => ({ card: d.card, side: d.side, reason: reasonFor(d) })), short);
      await take(short, user + block, 2);
    }
    return { kept, drops, calls };
  }

  for (const p of live) {
    const pack = packOf.get(idOf.get(p.deck)!)!;
    for (const request of ["", REQUESTS[p.deck]]) {
      const m = messagesFor(pack, request);
      for (const flow of FLOWS) for (const arm of ARMS) {
        if (done.has(keyOf({ deck: p.deck, count: p.count, request, flow, arm }))) continue;
        const n = p.count;
        const label = `${p.deck.replace(/\W+/g, "-")}-${n}-${request === "" ? "open" : "asked"}-${flow}-${arm}`;
        let adds: Line[];
        let cuts: Line[];
        let drops: Drop[];
        let calls: { ok: boolean; ms: number; usd: number }[];
        if (flow === "two-call") {
          const a = await fill(`${label}-add`, arm, { adds: n, cuts: 0 }, n, m.pack, m.system, m.user);
          const c = await fill(`${label}-cut`, arm, { adds: 0, cuts: n }, n, m.pack, m.system, m.user + comingInBlock(a.kept.adds.map((l) => l.card)), a.kept.adds.length);
          adds = a.kept.adds;
          cuts = c.kept.cuts;
          drops = [...a.drops, ...c.drops];
          calls = [...a.calls, ...c.calls];
        } else {
          const r = await fill(label, arm, { adds: n, cuts: n }, n, m.pack, m.system, m.user);
          ({ adds, cuts } = r.kept);
          drops = r.drops;
          calls = r.calls;
        }
        const row = {
          deck: p.deck, count: n, request, flow, arm,
          hit: adds.length >= n && cuts.length >= n,
          keptAdds: adds.length, keptCuts: cuts.length,
          calls: calls.length, usd: calls.reduce((s, c) => s + c.usd, 0), ms: calls.reduce((s, c) => s + c.ms, 0),
          failedCalls: calls.filter((c) => !c.ok).length,
          drops,
          adds: adds.map((l) => ({ card: l.card, short: l.rationaleShort })),
          cuts: cuts.map((l) => ({ card: l.card, short: l.rationaleShort })),
        };
        appendFileSync(ROWS, `${JSON.stringify(row)}\n`);
        log(`${label}: ${row.hit ? "HIT" : "short"} ${row.keptAdds}/${n} adds, ${row.keptCuts}/${n} cuts, ${row.calls} call(s), $${row.usd.toFixed(3)}`);
      }
    }
  }
  writeFileSync(`${OUT}/plan.json`, `${JSON.stringify({ plan: live, requests: REQUESTS, model: app.model, promptVersion: app.promptVersion }, null, 2)}\n`);
  log(`done; ledger $${spent(readLedger(LEDGER)).toFixed(2)} of $${CAP_USD}`);
  process.exit(0);
}
