/**
 * `tsx scripts/eval/count-mechanism-report.mts` — reads `count-mechanism/rows.jsonl` and writes, beside it:
 *  - `summary.md`: per arm and count, the hit rate (both lists filled), mean dollars per run, p50/p90 latency and the top
 *    drop reasons; and, on the ORIGINAL Mutant Menace list, how many of each arm's picks match what Hugh actually changed
 *    (his production list's adds and cuts against the original), the strongest quality signal the eval has.
 *  - `board.html`: the blind side-by-side, Mutant Menace first, each case's six variants (two flows, three arms) shown as
 *    P to U in an order shuffled per case. `board-key.json` holds which letter is which, kept OUT of the board so Hugh reads
 *    it blind.
 * Reads the scratch branch for card names (`scratch.mts`) and writes nothing to it. Pure over the rows otherwise.
 */
import "../lib/env.mjs";

import { readFileSync, writeFileSync } from "node:fs";

import { EVAL_USER_ID, ORIGINAL_DECK_ID } from "./count-mechanism-seed.mjs";
import { ARMS, FLOWS, REQUESTS, type Arm, type Flow } from "./count-mechanism.mjs";
import { connectScratch } from "./lib/scratch.mjs";

const OUT = "docs/superpowers/eval/count-mechanism";
const CURRENT_DECK_ID = "e0a10000-0000-4000-8000-000000000001";

export type Row = {
  deck: string; count: number; request: string; flow: Flow; arm: Arm; hit: boolean; keptAdds: number; keptCuts: number;
  calls: number; usd: number; ms: number; failedCalls: number;
  drops: { call: number; rule: string; cite?: string; side: string; card: string }[];
  adds: { card: string; short: string }[]; cuts: { card: string; short: string }[];
};

export const quantile = (xs: number[], q: number) => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
};

export const LETTERS = ["P", "Q", "R", "S", "T", "U"] as const;
export type Variant = `${Flow} ${Arm}`;
export const VARIANTS: Variant[] = FLOWS.flatMap((f) => ARMS.map((a) => `${f} ${a}` as Variant));

/** Mulberry32: a seeded generator in 32-bit integer arithmetic (`Math.imul`), so no product leaves the safe range. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** A per-case permutation of the six variants, a Fisher-Yates shuffle seeded by the case's index, so board and key agree. */
export function lettersFor(caseIndex: number): Record<(typeof LETTERS)[number], Variant> {
  const order = [...VARIANTS];
  const next = mulberry32(caseIndex + 1);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return Object.fromEntries(LETTERS.map((l, i) => [l, order[i]])) as Record<(typeof LETTERS)[number], Variant>;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

if (import.meta.url === `file://${process.argv[1]}`) {
  const rows = readFileSync(`${OUT}/rows.jsonl`, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Row);
  const db = await connectScratch("count-mechanism-report");
  const { sql } = await import("drizzle-orm");
  const names = async (deckId: string) => new Set(((await db.execute(sql`
    select c.name from deck_cards dc join cards c on c.oracle_id = dc.oracle_id
    join decks d on d.id = dc.deck_id where dc.deck_id = ${deckId} and d.user_id = ${EVAL_USER_ID}
  `)).rows as { name: string }[]).map((r) => r.name.toLowerCase()));
  const [current, original] = [await names(CURRENT_DECK_ID), await names(ORIGINAL_DECK_ID)];
  const hughAdds = new Set([...current].filter((n) => !original.has(n)));
  const hughCuts = new Set([...original].filter((n) => !current.has(n)));
  const front = (n: string) => n.toLowerCase().split(" // ")[0];
  const matches = (picked: string[], truth: Set<string>) => picked.filter((p) => [...truth].some((t) => front(t) === front(p))).length;

  const lines: string[] = ["# Suggested changes: the count mechanism", ""];
  lines.push("Flows: two-call asks for N additions, then shows them as coming in and asks for N cuts; one-call asks one reply for both.");
  lines.push("Arms (per stage, or per reply): A asks 1.5N and keeps the first N that pass; B asks N and refills a shortfall once; C asks 1.5N and refills only if still short.", "");
  lines.push("Requests: each deck ran with no request and with this one:", "", ...Object.entries(REQUESTS).map(([d, q]) => `- ${d}: "${q}"`), "");
  lines.push("A failed call that returned no usage meter is held at its worst case on the ledger, and its run's $ includes that hold. So `Mean $` is over the runs with no failed call only (measured spend), and `Failed` counts the runs left out of it.", "");
  lines.push("| Count | Flow | Arm | Runs | Hit (both lists full) | Mean adds / cuts kept | Mean $ / run (measured) | Failed | p50 s | p90 s | Calls / run | Top drop reasons |");
  lines.push("|---|---|---|---|---|---|---|---|---|---|---|---|");
  for (const count of [...new Set(rows.map((r) => r.count))].sort((a, b) => b - a)) for (const flow of FLOWS) {
    for (const arm of ARMS) {
      const rs = rows.filter((r) => r.count === count && r.flow === flow && r.arm === arm);
      if (rs.length === 0) continue;
      const tally = new Map<string, number>();
      for (const d of rs.flatMap((r) => r.drops)) {
        const key = `${d.side} ${d.rule}${d.cite ? `:${d.cite}` : ""}`;
        tally.set(key, (tally.get(key) ?? 0) + 1);
      }
      const top = [...tally].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => `${k} ×${n}`).join(", ") || "none";
      const mean = (f: (r: Row) => number) => rs.reduce((s, r) => s + f(r), 0) / rs.length;
      const metered = rs.filter((r) => r.failedCalls === 0);
      const measured = metered.length > 0 ? `$${(metered.reduce((s, r) => s + r.usd, 0) / metered.length).toFixed(3)}` : "n/a";
      lines.push(`| ${count} | ${flow} | ${arm} | ${rs.length} | ${rs.filter((r) => r.hit).length} of ${rs.length} | ${mean((r) => r.keptAdds).toFixed(1)} / ${mean((r) => r.keptCuts).toFixed(1)} | ${measured} | ${rs.length - metered.length} | ${(quantile(rs.map((r) => r.ms), 0.5) / 1000).toFixed(0)} | ${(quantile(rs.map((r) => r.ms), 0.9) / 1000).toFixed(0)} | ${mean((r) => r.calls).toFixed(2)} | ${top} |`);
    }
  }
  lines.push("", `## The original Mutant Menace list against what Hugh changed`, "",
    `Hugh's production list adds ${hughAdds.size} cards to the original and cuts ${hughCuts.size} (by name). Each arm's picks on the original list, matched by name:`, "",
    "| Count | Request | Flow | Arm | Adds matching Hugh's adds | Cuts matching Hugh's cuts |", "|---|---|---|---|---|---|");
  for (const r of rows.filter((x) => x.deck === "HD Tune - Mutant Menace (original)")) {
    lines.push(`| ${r.count} | ${r.request === "" ? "none" : "asked"} | ${r.flow} | ${r.arm} | ${matches(r.adds.map((a) => a.card), hughAdds)} of ${r.adds.length} | ${matches(r.cuts.map((c) => c.card), hughCuts)} of ${r.cuts.length} |`);
  }
  const total = rows.reduce((s, r) => s + r.usd, 0);
  const held = rows.filter((r) => r.failedCalls > 0).reduce((s, r) => s + r.usd, 0);
  lines.push("", `${rows.length} runs, $${total.toFixed(2)} in all, of which $${held.toFixed(2)} is the ${rows.filter((r) => r.failedCalls > 0).length} runs with a failed call (each failed call held at its worst case).`);
  writeFileSync(`${OUT}/summary.md`, `${lines.join("\n")}\n`);

  // The blind board, Mutant Menace first, each case with the deck's written request (the realistic run).
  const CASES: [string, number][] = [
    ["HD Tune - Mutant Menace", 20], ["HD Tune - Mutant Menace (original)", 20], ["HD - Goblins", 20],
    ["HD - Goblins", 10], ["HD - Avatar Aang", 10], ["HD - Avatar Aang", 3],
  ];
  const key: Record<string, Record<string, Variant>> = {};
  const sections = CASES.map(([deck, count], i) => {
    const letters = lettersFor(i);
    key[`${i + 1}. ${deck} @ ${count}`] = letters;
    const request = REQUESTS[deck];
    const cols = LETTERS.map((letter) => {
      const [flow, arm] = letters[letter].split(" ");
      const r = rows.find((x) => x.deck === deck && x.count === count && x.request === request && x.flow === flow && x.arm === arm);
      if (!r) return `<div class="col"><h3>${letter}</h3><p class="miss">No run.</p></div>`;
      const list = (title: string, items: { card: string; short: string }[]) =>
        `<h4>${title} <span class="n">${items.length} of ${count}</span></h4><ol>${items.map((it) => `<li><b>${esc(it.card)}</b><span>${esc(it.short)}</span></li>`).join("")}</ol>`;
      return `<div class="col"><h3>${letter}</h3>${list("Add", r.adds)}${list("Cut", r.cuts)}</div>`;
    }).join("");
    return `<section><h2>${i + 1}. ${esc(deck)} <span class="n">${count} cards in, ${count} out. The player asked: &ldquo;${esc(request)}&rdquo;</span></h2><div class="cols">${cols}</div></section>`;
  }).join("");
  writeFileSync(`${OUT}/board.html`, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Count mechanism, blind</title><style>
:root{--bg:#fbfaf7;--fg:#1d1b17;--muted:#6b665c;--line:#e4e0d6;--card:#fff}
@media (prefers-color-scheme:dark){:root{--bg:#16150f;--fg:#ece8de;--muted:#a59f92;--line:#2f2c24;--card:#1e1c16}}
body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.45 system-ui,sans-serif;padding:24px 16px}
h1{font-size:20px;margin:0 0 4px}p.lede{color:var(--muted);margin:0 0 24px;max-width:70ch}
section{margin:0 0 32px}h2{font-size:16px;margin:0 0 10px}.n{color:var(--muted);font-weight:400;font-size:13px}
.cols{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}@media (max-width:900px){.cols{grid-template-columns:1fr}}
.col{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:12px}h3{margin:0 0 6px;font-size:15px}h4{margin:10px 0 4px;font-size:13px}
ol{margin:0;padding-left:20px}li{margin:0 0 4px}li span{display:block;color:var(--muted);font-size:12.5px}.miss{color:var(--muted)}
</style></head><body><h1>Suggested changes: six ways to fill a count</h1><p class="lede">Each case shows six runs on the same deck, count and request, labelled P to U in an order shuffled per case. Which is which is in a separate key. Read each column as a player would: are these the changes you would make?</p>${sections}</body></html>\n`);
  // The key is written beside the board but never committed (`.gitignore`): the repository is where Hugh could read it.
  writeFileSync(`${OUT}/board-key.json`, `${JSON.stringify(key, null, 2)}\n`);
  console.log(`wrote ${OUT}/summary.md, board.html and board-key.json from ${rows.length} runs ($${total.toFixed(2)})`);
  process.exit(0);
}
