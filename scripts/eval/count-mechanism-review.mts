/**
 * `tsx scripts/eval/count-mechanism-review.mts <out.html>` — a READABLE review board for the recommended arm only (two-call,
 * arm C; d9 2026-10-27), from the stored eval rows: no model is called. Hugh could not judge the blind board from card
 * names alone, so each card here shows its Scryfall image (click to enlarge), name, mana cost, type line, role and theme
 * labels (`card_labels`) and the model's one-line reason, grouped by what the card does so the shape of the change shows.
 * On the original Mutant Menace list each card is marked ✓ when Hugh made that change himself in his production list.
 *
 * The rows keep each card's short reason but not its citations, so the board shows none rather than invent them.
 * Reads the scratch branch (`scratch.mts`) for card facts and writes nothing to it.
 */
import "../lib/env.mjs";

import { readFileSync, writeFileSync } from "node:fs";

import { EVAL_USER_ID, ORIGINAL_DECK_ID } from "./count-mechanism-seed.mjs";
import { REQUESTS } from "./count-mechanism.mjs";
import type { Row } from "./count-mechanism-report.mjs";
import { connectScratch } from "./lib/scratch.mjs";

const OUT_ROWS = "docs/superpowers/eval/count-mechanism/rows.jsonl";
const CURRENT_DECK_ID = "e0a10000-0000-4000-8000-000000000001";

type Group = "theme" | "wincon" | "removal" | "draw" | "ramp" | "other";
export const GROUP_ORDER: Group[] = ["ramp", "draw", "removal", "wincon", "theme", "other"];

/** What a card is FOR, one group each: the deck's theme first (the request is about it), then a win, then the roles. */
export function groupOf(labels: { space: string; kind: string }[], typeLine: string, theme: { kind?: string; typal?: string }): Group {
  const has = (space: string, kinds: string[]) => labels.some((l) => l.space === space && kinds.includes(l.kind));
  if ((theme.kind && has("theme", [theme.kind])) || (theme.typal && typeLine.includes(theme.typal))) return "theme";
  if (has("theme", ["finisher"])) return "wincon";
  if (has("role", ["removal", "wipes", "counterspell"])) return "removal";
  if (has("role", ["draw"]) || has("theme", ["draw", "etbDraw"])) return "draw";
  if (has("role", ["ramp"]) || has("theme", ["treasure"])) return "ramp";
  return "other";
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const front = (n: string) => n.toLowerCase().split(" // ")[0];

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = process.argv[2];
  if (!out) throw new Error("review: pass the output path");
  const rows = readFileSync(OUT_ROWS, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Row);
  const pick = (deck: string, count: number, asked: boolean) =>
    rows.find((r) => r.deck === deck && r.count === count && r.flow === "two-call" && r.arm === "C" && (r.request !== "") === asked);
  const CASES = [
    { deck: "HD Tune - Mutant Menace (original)", count: 20, asked: true, theme: { kind: "mill" }, focus: "Mill" },
    { deck: "HD Tune - Mutant Menace (original)", count: 20, asked: false, theme: { kind: "mill" }, focus: "Mill" },
    { deck: "HD Tune - Mutant Menace", count: 10, asked: true, theme: { kind: "mill" }, focus: "Mill" },
    { deck: "HD - Goblins", count: 10, asked: true, theme: { typal: "Goblin" }, focus: "Goblins" },
  ];

  const db = await connectScratch("count-mechanism-review");
  const { sql } = await import("drizzle-orm");
  const names = [...new Set(CASES.flatMap((c) => { const r = pick(c.deck, c.count, c.asked); return r ? [...r.adds, ...r.cuts].map((x) => x.card) : []; }))];
  const list = sql.join(names.map((n) => sql`${n}`), sql`, `);
  const facts = (await db.execute(sql`
    select c.name, c.mana_cost, c.type_line, c.image_uri, coalesce(l.labels, '[]'::jsonb) as labels
    from cards c left join card_labels l on l.oracle_id = c.oracle_id
    where c.name in (${list}) or split_part(c.name, ' // ', 1) in (${list})
  `)).rows as { name: string; mana_cost: string | null; type_line: string; image_uri: string | null; labels: { space: string; kind: string }[] }[];
  const factOf = new Map(facts.flatMap((f) => [[f.name.toLowerCase(), f], [front(f.name), f]] as const));
  const deckNames = async (id: string) => new Set(((await db.execute(sql`
    select c.name from deck_cards dc join cards c on c.oracle_id = dc.oracle_id join decks d on d.id = dc.deck_id
    where dc.deck_id = ${id} and d.user_id = ${EVAL_USER_ID}`)).rows as { name: string }[]).map((r) => front(r.name)));
  const [current, original] = [await deckNames(CURRENT_DECK_ID), await deckNames(ORIGINAL_DECK_ID)];
  const hughAdds = new Set([...current].filter((n) => !original.has(n)));
  const hughCuts = new Set([...original].filter((n) => !current.has(n)));

  const card = (c: { card: string; short: string }, mark: "✓" | "○" | null) => {
    const f = factOf.get(c.card.toLowerCase()) ?? factOf.get(front(c.card));
    const labels = (f?.labels ?? []).filter((l) => l.space === "role" || l.space === "theme").map((l) => l.kind);
    return `<li class="card">${f?.image_uri ? `<img loading="lazy" src="${esc(f.image_uri)}" alt="${esc(c.card)}" data-full="${esc(f.image_uri)}">` : `<div class="noimg"></div>`}
<div class="body"><div class="name">${mark ? `<span class="mark ${mark === "✓" ? "yes" : "no"}" title="${mark === "✓" ? "You made this change yourself" : "Not a change you made"}">${mark}</span>` : ""}${esc(c.card)} <span class="cost">${esc(f?.mana_cost ?? "")}</span></div>
<div class="type">${esc(f?.type_line ?? "not in the catalog")}</div>
${labels.length > 0 ? `<div class="chips">${[...new Set(labels)].map((k) => `<span class="chip">${esc(k)}</span>`).join("")}</div>` : ""}
<p class="why">${esc(c.short)}</p></div></li>`;
  };
  const column = (title: string, items: { card: string; short: string }[], c: (typeof CASES)[number], truth: Set<string> | null) => {
    const grouped = new Map<Group, { card: string; short: string }[]>();
    for (const it of items) {
      const f = factOf.get(it.card.toLowerCase()) ?? factOf.get(front(it.card));
      const g = groupOf(f?.labels ?? [], f?.type_line ?? "", c.theme);
      grouped.set(g, [...(grouped.get(g) ?? []), it]);
    }
    const label: Record<Group, string> = { ramp: "Ramp", draw: "Draw", removal: "Removal and answers", wincon: "Ways to win", theme: `The theme (${c.focus})`, other: "Other" };
    const matched = truth ? items.filter((i) => truth.has(front(i.card))).length : null;
    return `<div class="col"><h3>${title} <span class="n">${items.length}</span></h3>${matched !== null ? `<p class="match">${matched} of ${items.length} ${title.toLowerCase()} match your own</p>` : ""}
${GROUP_ORDER.filter((g) => grouped.has(g)).map((g) => `<h4>${label[g]} <span class="n">${grouped.get(g)!.length}</span></h4><ul>${grouped.get(g)!.map((it) => card(it, truth ? (truth.has(front(it.card)) ? "✓" : "○") : null)).join("")}</ul>`).join("")}</div>`;
  };
  const sections = CASES.map((c, i) => {
    const r = pick(c.deck, c.count, c.asked);
    const isOriginal = c.deck === "HD Tune - Mutant Menace (original)";
    const head = `<h2>${i + 1}. ${esc(c.deck)} <span class="n">${c.count} in, ${c.count} out</span></h2>
<p class="req">${c.asked ? `You asked: <q>${esc(REQUESTS[c.deck])}</q>` : "No request: the app chose from the deck's own weaknesses."}</p>`;
    if (!r) return `<section>${head}<p class="miss">No run for this case.</p></section>`;
    return `<section>${head}<div class="cols">${column("Adds", r.adds, c, isOriginal ? hughAdds : null)}${column("Cuts", r.cuts, c, isOriginal ? hughCuts : null)}</div></section>`;
  }).join("");

  writeFileSync(out, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Suggested changes review</title><style>
:root{--bg:#fbfaf7;--fg:#1d1b17;--muted:#6b665c;--line:#e4e0d6;--card:#fff;--yes:#2f7d4f;--chip:#efece4}
@media (prefers-color-scheme:dark){:root{--bg:#16150f;--fg:#ece8de;--muted:#a59f92;--line:#2f2c24;--card:#1e1c16;--yes:#6fcf97;--chip:#2a2820}}
body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.45 system-ui,sans-serif;padding:24px 16px;max-width:1280px;margin:auto}
h1{font-size:20px;margin:0 0 4px}.lede{color:var(--muted);margin:0 0 28px;max-width:75ch}
section{margin:0 0 40px}h2{font-size:17px;margin:0 0 4px}.n{color:var(--muted);font-weight:400;font-size:13px}.req{margin:0 0 14px}.req q{font-style:italic}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:16px}@media (max-width:860px){.cols{grid-template-columns:1fr}}
.col{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px}h3{margin:0 0 6px;font-size:16px}h4{margin:14px 0 6px;font-size:13px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
.match{margin:0 0 6px;color:var(--yes);font-weight:600}
ul{list-style:none;margin:0;padding:0}.card{display:flex;gap:10px;padding:8px 0;border-top:1px solid var(--line)}
.card img,.noimg{width:84px;height:117px;border-radius:5px;flex:none;object-fit:cover;cursor:zoom-in;background:var(--chip)}
.body{min-width:0}.name{font-weight:600}.cost{color:var(--muted);font-weight:400;font-size:12px;margin-left:4px}.type{color:var(--muted);font-size:12.5px}
.chips{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0}.chip{background:var(--chip);border-radius:999px;padding:1px 8px;font-size:11.5px}
.why{margin:4px 0 0}.mark{display:inline-block;width:18px;font-weight:700}.mark.yes{color:var(--yes)}.mark.no{color:var(--muted)}
dialog{border:none;padding:0;background:transparent}dialog img{max-width:min(488px,92vw);border-radius:16px;display:block}dialog::backdrop{background:rgba(0,0,0,.75)}
</style></head><body><h1>Suggested changes, the new flow: what it would have told you</h1>
<p class="lede">The recommended way to fill a count (additions first, then the cuts that make room, asking half again and refilling once if short), on four of your decks. Cards are grouped by what they do. On the original Mutant Menace list, ✓ marks a change you made yourself in your current list. Click a card to enlarge it. The eval stored each card's one-line reason but not its citations, so none are shown.</p>
${sections}
<dialog id="zoom"><img alt=""></dialog>
<script>
const d=document.getElementById("zoom"),im=d.querySelector("img");
document.addEventListener("click",e=>{const t=e.target;if(t instanceof HTMLImageElement&&t.dataset.full){im.src=t.dataset.full;im.alt=t.alt;d.showModal();}else if(d.open&&(t===d||t===im)){d.close();}});
</script></body></html>\n`);
  console.log(`wrote ${out}: ${CASES.length} cases, ${names.length} cards, ${facts.length} with catalog facts`);
  process.exit(0);
}
