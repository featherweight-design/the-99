/**
 * `pnpm eval:count-mechanism [--dry-run] [--only <deck>]` — how Suggested changes should fulfil a player's COUNT (Hugh's
 * rethink, 2026-10-27: never hold results back; the count is cards in, and cuts equal adds). Three arms, one variable each:
 *
 *   A  over-ask:          ask ceil(1.5N) per list in ONE call, keep the first N of each list that pass validation.
 *   B  exact + refill:    ask N; if either list is short after validation, ONE more call told what was kept, what was
 *                         rejected and why, asking for exactly the shortfall.
 *   C  over-ask + refill: A, then B's refill only when a list is still short.
 *
 * The app's own path otherwise: `buildPrompt` over the deck's pack (`openTuning`), `callModel` with the app's model and
 * effort, `validateSuggestions` through `score`. Only the size sentences of the system prompt, the schema's list caps and the
 * reply ceiling change with the count; `patchCount` asserts each replacement lands exactly once, so a reworded prompt fails
 * here rather than measuring the old one.
 *
 * DATABASE: a scratch branch named by `COUNT_EVAL_DB_URL` and `COUNT_EVAL_BRANCH` (`scratch.mts`), holding copies of Hugh's
 * production decks and his original Mutant Menace list (`count-mechanism-seed.mts`). Nothing here writes to it.
 *
 * SPEND: hard cap $15 on its own ledger (`ledger-count-mechanism.jsonl`). Every call reserves its worst case BEFORE it is
 * sent and settles to its measured cost after; a call whose worst case would cross the cap is not sent and the run stops.
 * `--dry-run` prepares every deck, prints the plan and its worst case, and calls nothing. Rows are appended as each run
 * finishes, so a stop or a crash keeps what was paid for, and a re-run skips every run already written.
 */
import "../lib/env.mjs";

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { z } from "zod";

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

const { values: args } = parseArgs({ options: { "dry-run": { type: "boolean", default: false }, only: { type: "string" } } });
const dry = args["dry-run"];

export const ARMS = ["A", "B", "C"] as const;
export type Arm = (typeof ARMS)[number];

/** Hugh's pick (d9, 2026-10-27): Mutant Menace twice (the production list and the original Moxfield list), the gut test at
 *  20 repeated, and two more decks across all three counts, Goblins with its focus set. Mutant Menace first. */
export const PLAN: { deck: string; count: number; reps: number }[] = [
  { deck: "HD Tune - Mutant Menace", count: 20, reps: 3 },
  { deck: "HD Tune - Mutant Menace (original)", count: 20, reps: 3 },
  { deck: "HD Tune - Mutant Menace", count: 10, reps: 1 },
  { deck: "HD Tune - Mutant Menace (original)", count: 10, reps: 1 },
  { deck: "HD Tune - Mutant Menace", count: 3, reps: 1 },
  { deck: "HD Tune - Mutant Menace (original)", count: 3, reps: 1 },
  { deck: "HD - Goblins", count: 20, reps: 1 },
  { deck: "HD - Goblins", count: 10, reps: 1 },
  { deck: "HD - Goblins", count: 3, reps: 1 },
  { deck: "HD - Avatar Aang", count: 20, reps: 1 },
  { deck: "HD - Avatar Aang", count: 10, reps: 1 },
  { deck: "HD - Avatar Aang", count: 3, reps: 1 },
];

export const overAsk = (n: number) => Math.ceil(n * 1.5);

/** A reply ceiling that fits the lines asked for: about 450 tokens a line measured on v9 answers, and room to think. */
export const ceilingFor = (lines: number) => Math.max(8_000, 600 * lines + 4_000);

const SIZE_SENTENCE = /Propose up to \d+ cards to add and up to \d+ cards to cut, as two separate lists\./;
const AIM_SENTENCE = "Aim for as many cuts as additions, so the deck stays its size, but offer fewer of either when the evidence is thin.";

/** The system prompt with the count asked for in place of the app's "up to six" and "offer fewer". Throws on a miss. */
export function patchCount(system: string, adds: number, cuts: number, requested: number): string {
  if ((system.match(new RegExp(SIZE_SENTENCE, "g")) ?? []).length !== 1) throw new Error("eval: the size sentence moved; re-read prompt.ts");
  if (system.split(AIM_SENTENCE).length !== 2) throw new Error("eval: the aim sentence moved; re-read prompt.ts");
  return system
    .replace(SIZE_SENTENCE, `Propose exactly ${adds} cards to add and exactly ${cuts} cards to cut, as two separate lists.`)
    .replace(AIM_SENTENCE, `The player asked for ${requested} additions and ${requested} cuts, so the deck stays its size. Fill both lists: when the evidence thins, choose the soundest remaining cards rather than offering fewer.`);
}

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
export const reasonFor = (d: { rule: string; cite?: string }) =>
  d.rule === "citation" ? `its ${d.cite ?? ""} citation is not supported by the evidence` : (REASON[d.rule] ?? "its wording broke a writing rule");

/** The refill's question, after the first answer was checked: what stands, what fell and why, and exactly the shortfall. */
export function refillBlock(kept: { adds: string[]; cuts: string[] }, rejected: { card: string; side: "add" | "cut"; reason: string }[], adds: number, cuts: number): string {
  return [
    "",
    "Your first answer was checked against the rules.",
    `Kept, additions: ${kept.adds.join("; ") || "none"}.`,
    `Kept, cuts: ${kept.cuts.join("; ") || "none"}.`,
    ...(rejected.length > 0 ? ["Rejected, and why:", ...rejected.map((r) => `- ${r.card} (${r.side === "add" ? "addition" : "cut"}): ${r.reason}`)] : []),
    `Propose exactly ${adds} more additions and exactly ${cuts} more cuts, following every rule above. Name none of the cards listed here.`,
  ].join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = await openTuning({ connect: () => connectScratch("eval:count-mechanism"), userId: EVAL_USER_ID });
  const { callModel } = await import("../../src/lib/model/client");
  const { costMicroUsd, worstCaseMicroUsd } = await import("../../src/lib/model/prices");
  const { lineSchema } = await import("../../src/lib/tuning/response-schema");
  const { TUNING_EFFORT } = await import("../../src/lib/tuning/limits");
  const { parseStrategyKey } = await import("../../src/lib/strategy/focus");
  const { db } = await import("../../src/db/index");
  const { sql } = await import("drizzle-orm");
  const log = (line: string) => console.log(`[eval:count-mechanism] ${line}`);

  const plan = PLAN.filter((p) => !args.only || p.deck === args.only);
  const deckRows = (await db.execute(sql`select id, name, strategy_focus from decks where user_id = ${EVAL_USER_ID}`)).rows as { id: string; name: string; strategy_focus: string | null }[];
  const idOf = new Map(deckRows.map((d) => [d.name, d.id]));
  for (const p of plan) if (!idOf.has(p.deck)) throw new Error(`eval: the scratch branch holds no deck named ${p.deck}; run the seed`);
  const names = [...new Set(plan.map((p) => p.deck))];
  const focusOf = new Map(deckRows.flatMap((d) => {
    const key = parseStrategyKey(d.strategy_focus);
    return key ? [[d.id, key] as const] : [];
  }));
  const prepared = await app.prepare(names.map((n) => idOf.get(n)!), TUNING_VARIANTS.base, null, focusOf);
  const packOf = new Map(prepared.map((p) => [p.deckId, p]));

  // A conservative input ceiling with no API call (the dry run calls nothing): ~3 characters a token, plus a margin.
  const inputCeiling = (system: string, user: string) => Math.ceil((system.length + user.length) / 3) + 500;
  const worstOf = (system: string, user: string, lines: number) =>
    worstCaseMicroUsd(app.model, inputCeiling(system, user), ceilingFor(lines)) / 1e6;

  const firstAsk = (arm: Arm, n: number) => (arm === "B" ? n : overAsk(n));
  let planWorst = 0;
  let planCalls = 0;
  for (const p of plan) {
    const prep = packOf.get(idOf.get(p.deck)!)!;
    for (const arm of ARMS) {
      const ask = firstAsk(arm, p.count);
      const sys = patchCount(prep.system, ask, ask, p.count);
      planWorst += p.reps * worstOf(sys, prep.user, ask * 2);
      planCalls += p.reps;
    }
  }
  log(`${plan.length} plan rows, ${planCalls} first calls (refills on top), first-call worst case $${planWorst.toFixed(2)} against the $${CAP_USD} cap; spent so far $${spent(readLedger(LEDGER)).toFixed(2)}`);
  for (const prep of prepared) log(`${deckRows.find((d) => d.id === prep.deckId)!.name}: focus ${prep.pack.focus?.name ?? "none"}, intent ${prep.pack.intent === null ? "none" : "set"}, ${prep.pack.cards.length} cards`);
  if (dry) {
    log("dry run: nothing was called");
    process.exit(0);
  }

  acquireRunLock(LEDGER);
  mkdirSync(OUT, { recursive: true });
  const done = new Set(existsSync(ROWS)
    ? readFileSync(ROWS, "utf8").split("\n").filter(Boolean).map((l) => { const r = JSON.parse(l); return `${r.deck}|${r.count}|${r.arm}|${r.rep}`; })
    : []);

  type Reply = { additions: z.infer<typeof lineSchema>[]; cuts: z.infer<typeof lineSchema>[] };
  /** One call, reserved on the ledger at its worst case first, settled to its measured cost after. */
  async function call(label: string, system: string, user: string, adds: number, cuts: number) {
    const lines = adds + cuts;
    const worst = worstOf(system, user, lines);
    const now = spent(readLedger(LEDGER));
    if (now + worst > CAP_USD) throw new Error(`STOP before ${label}: worst case $${worst.toFixed(3)} would cross the $${CAP_USD} cap (spent $${now.toFixed(3)})`);
    const id = `${Date.now()}-${label}`;
    record(LEDGER, { at: new Date().toISOString(), runId: id, source: "pending", usd: worst, requests: 1, pending: id, note: label });
    const schema = z.object({ additions: z.array(lineSchema).max(adds), cuts: z.array(lineSchema).max(cuts) });
    const t = Date.now();
    const o = await callModel<Reply>({ model: app.model, system, user, maxTokens: ceilingFor(lines), schema, deadlineMs: 300_000, effort: TUNING_EFFORT, stream: true });
    const ms = Date.now() - t;
    const usd = o.usage ? costMicroUsd(app.model, o.usage) / 1e6 : 0;
    record(LEDGER, { at: new Date().toISOString(), runId: `count-mechanism-${label}`, source: "realtime:1", usd, requests: 1, settles: id, note: label });
    log(`${label}: ${o.ok ? "ok" : `failed (${o.errorClass})`} in ${(ms / 1000).toFixed(1)}s, $${usd.toFixed(4)}; ledger $${spent(readLedger(LEDGER)).toFixed(2)}`);
    return { o, ms, usd };
  }

  /** The survivors of one reply in the validator's order, each list cut to its cap, with the rejected lines named. */
  async function check(pack: (typeof prepared)[number]["pack"], value: Reply, capAdds: number, capCuts: number) {
    const [s] = await app.score([{ pack, value }], Math.max(capAdds, capCuts));
    const dropped = new Set(s.dropList.map((d) => `${d.side}:${d.position}`));
    const survivors = (side: "add" | "cut", lines: Reply["additions"]) => lines.filter((_, i) => !dropped.has(`${side}:${i}`));
    return {
      adds: survivors("add", value.additions).slice(0, capAdds),
      cuts: survivors("cut", value.cuts).slice(0, capCuts),
      drops: s.dropList.map((d) => ({ rule: d.rule, cite: d.cite?.kind, side: d.side ?? "add", card: (d.side === "cut" ? value.cuts : value.additions)[d.position]?.card ?? "?" })),
      returned: { adds: value.additions.length, cuts: value.cuts.length },
    };
  }

  for (const p of plan) {
    const deckId = idOf.get(p.deck)!;
    const prep = packOf.get(deckId)!;
    for (let rep = 1; rep <= p.reps; rep++) {
      for (const arm of ARMS) {
        if (done.has(`${p.deck}|${p.count}|${arm}|${rep}`)) continue;
        const n = p.count;
        const label = `${p.deck.replace(/\W+/g, "-")}-${n}-${arm}-${rep}`;
        const ask = firstAsk(arm, n);
        const first = await call(`${label}-1`, patchCount(prep.system, ask, ask, n), prep.user, ask, ask);
        const calls = [{ ok: first.o.ok, ms: first.ms, usd: first.usd }];
        let adds: Reply["additions"] = [];
        let cuts: Reply["cuts"] = [];
        const drops: { call: number; rule: string; cite?: string; side: string; card: string }[] = [];
        const returned: { adds: number; cuts: number }[] = [];
        if (first.o.ok) {
          const c = await check(prep.pack, first.o.value, n, n);
          adds = c.adds;
          cuts = c.cuts;
          drops.push(...c.drops.map((d) => ({ call: 1, ...d })));
          returned.push(c.returned);
        }
        const shortAdds = n - adds.length;
        const shortCuts = n - cuts.length;
        if (arm !== "A" && (shortAdds > 0 || shortCuts > 0)) {
          const user = prep.user + refillBlock(
            { adds: adds.map((l) => l.card), cuts: cuts.map((l) => l.card) },
            drops.map((d) => ({ card: d.card, side: d.side as "add" | "cut", reason: reasonFor(d) })),
            shortAdds, shortCuts,
          );
          const second = await call(`${label}-2`, patchCount(prep.system, shortAdds, shortCuts, n), user, shortAdds, shortCuts);
          calls.push({ ok: second.o.ok, ms: second.ms, usd: second.usd });
          if (second.o.ok) {
            const c = await check(prep.pack, second.o.value, shortAdds, shortCuts);
            const seen = new Set([...adds, ...cuts].map((l) => l.card.toLowerCase()));
            adds = [...adds, ...c.adds.filter((l) => !seen.has(l.card.toLowerCase()))].slice(0, n);
            cuts = [...cuts, ...c.cuts.filter((l) => !seen.has(l.card.toLowerCase()))].slice(0, n);
            drops.push(...c.drops.map((d) => ({ call: 2, ...d })));
            returned.push(c.returned);
          }
        }
        const row = {
          deck: p.deck, count: n, arm, rep, asked: ask,
          hit: adds.length >= n && cuts.length >= n,
          keptAdds: adds.length, keptCuts: cuts.length,
          calls: calls.length, usd: calls.reduce((s, c) => s + c.usd, 0), ms: calls.reduce((s, c) => s + c.ms, 0),
          failedCalls: calls.filter((c) => !c.ok).length,
          returned, drops,
          adds: adds.map((l) => ({ card: l.card, short: l.rationaleShort })),
          cuts: cuts.map((l) => ({ card: l.card, short: l.rationaleShort })),
        };
        appendFileSync(ROWS, `${JSON.stringify(row)}\n`);
        log(`${label}: ${row.hit ? "HIT" : "short"} ${row.keptAdds}/${n} adds, ${row.keptCuts}/${n} cuts, ${row.calls} call(s), $${row.usd.toFixed(3)}`);
      }
    }
  }
  writeFileSync(`${OUT}/plan.json`, `${JSON.stringify({ plan, model: app.model, promptVersion: app.promptVersion }, null, 2)}\n`);
  log(`done; ledger $${spent(readLedger(LEDGER)).toFixed(2)} of $${CAP_USD}`);
  process.exit(0);
}
