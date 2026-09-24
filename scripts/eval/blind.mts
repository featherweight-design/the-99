/**
 * `pnpm eval:blind --feature tuning --base <runId>:<cell>:<variant> --candidate <runId>:<cell>:<variant>`
 *
 * Builds the pairs for Hugh's blind read from rows already on disk. It sends nothing and reads no
 * database. It writes two files under `docs/superpowers/eval/blind/`:
 *  - `<feature>-<round>-pairs.json`, the documents seeded into the page's `pairs` collection. Each holds a
 *    deck's name, its commander and the two answers, as `left` and `right`, with no cell, model or
 *    cost anywhere in it;
 *  - `<feature>-<round>-key.json`, which side is which. It never goes to the page. It un-blinds the answers
 *    once Hugh has read every deck.
 *
 * The decks are the HELD-OUT decks, in held-out order, and the answer is trial 0 of each cell.
 * Each answer is what the player would see: the suggestions that survived checking, in order, or
 * the app's empty or failed state. Sides are assigned by a seeded coin per deck, so a rebuild
 * produces the same pairs.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { parseArgs } from "node:util";

import { seededShuffle, SPLIT_SEED } from "./lib/split.mjs";

const { values: args } = parseArgs({
  options: {
    feature: { type: "string", default: "tuning" },
    round: { type: "string", default: "1" },
    title: { type: "string" },
    base: { type: "string" },
    candidate: { type: "string" },
  },
});
if (!args.base || !args.candidate || !args.title) throw new Error("eval:blind needs --base and --candidate as <runId>:<cell>:<variant>, and --title");
/** A round is one candidate against the base. Rounds are shuffled independently of each other. */
const roundId = `${args.feature}-${args.round}`;
const roundSeed = SPLIT_SEED + 1000 * Number(args.round);

const ROOT = new URL("../../docs/superpowers/eval/", import.meta.url);

type Tuning = { suggestions: { add: string; cut: string; rationale: string; evidence: { kind: string; value: string }[] }[] };
type Overview = { overview: string; primer: { strategy: string[]; mulligan: { keep: string[]; sendBack: string[] }; tips: { text: string }[] }; keyCards: { card: string; job: string }[]; weaknesses: string[] };
type Row = { deckId: string; cell: string; variant: string; trial: number; outcome: string; keptPositions?: number[]; verdicts?: { section: string; status: string }[]; reply: Tuning | Overview | null };
type Meta = { split: { heldOut: string[] }; decks: { deckId: string; name: string }[] };

function load(spec: string) {
  const [runId, cell, variant] = spec.split(":");
  const dir = new URL(`runs/${runId}/`, ROOT);
  const rows = readFileSync(new URL("rows.jsonl", dir), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Row)
    .filter((r) => r.cell === cell && r.variant === variant && r.trial === 0);
  const meta = JSON.parse(readFileSync(new URL("meta.json", dir), "utf8")) as Meta;
  const prepared = JSON.parse(readFileSync(new URL("prepared.json", dir), "utf8")) as { deckId: string; pack?: { commanders: { name: string }[] }; facts?: { commanders: string[] } }[];
  return { spec, rows: new Map(rows.map((r) => [r.deckId, r])), meta, prepared: new Map(prepared.map((p) => [p.deckId, p])) };
}

/** What a player would be shown, from one row. A missing row is a harness fault, never an answer. */
function tuningAnswer(r: Row | undefined) {
  if (!r) throw new Error("a held-out deck has no row in one of the runs; the pair set would compare an absence");
  if (r.outcome === "malformed" || r.outcome === "upstream_busy") return { status: "failed" };
  if (r.outcome !== "survived" || !r.reply) return { status: "none" };
  const reply = r.reply as Tuning;
  if (!r.keptPositions) throw new Error(`row for ${r.deckId} has no keptPositions; re-run with the current harness`);
  return {
    status: "suggestions",
    items: r.keptPositions.map((i) => reply.suggestions[i]).map((s) => ({ cut: s.cut, add: s.add, rationale: s.rationale, citations: s.evidence })),
  };
}

/**
 * The overview as the modal shows it: every passing section in full, and a refused section as the
 * refused slot. The primer's four parts share its one verdict.
 */
function overviewAnswer(r: Row | undefined) {
  if (!r) throw new Error("a held-out deck has no row in one of the runs; the pair set would compare an absence");
  if (!r.reply || !r.verdicts) return { status: "failed" };
  const o = r.reply as Overview;
  const ok = (sec: string) => r.verdicts!.some((v) => v.section === sec && v.status === "ok");
  const section = (title: string, sec: string, body: { paragraph?: string; items?: string[] }) => (ok(sec) ? { title, ...body } : { title, refused: true });
  return {
    status: "sections",
    sections: [
      section("Overview", "overview", { paragraph: o.overview }),
      section("How it plays", "primer", { items: o.primer.strategy }),
      section("Keep", "primer", { items: o.primer.mulligan.keep }),
      section("Send back", "primer", { items: o.primer.mulligan.sendBack }),
      section("Tips", "primer", { items: o.primer.tips.map((t) => t.text) }),
      section("Key cards", "keyCards", { items: o.keyCards.map((k) => `${k.card}: ${k.job}`) }),
      section("Weaknesses", "weaknesses", { items: o.weaknesses }),
    ],
  };
}
const answerOf = args.feature === "tuning" ? tuningAnswer : overviewAnswer;

const base = load(args.base);
const candidate = load(args.candidate);
const heldOut = base.meta.split.heldOut;
if (JSON.stringify(heldOut) !== JSON.stringify(candidate.meta.split.heldOut)) throw new Error("the two runs disagree about the held-out decks");

const pairs: { id: string; data: Record<string, unknown> }[] = [];
const key: Record<string, { left: string; right: string }> = {};
heldOut.forEach((deckId, order) => {
  const id = `${roundId}-${String(order + 1).padStart(2, "0")}`;
  const flip = seededShuffle([0, 1], roundSeed + order)[0] === 1;
  const b = answerOf(base.rows.get(deckId));
  const c = answerOf(candidate.rows.get(deckId));
  const prepared = base.prepared.get(deckId) ?? candidate.prepared.get(deckId);
  pairs.push({
    id,
    data: {
      feature: args.feature,
      round: roundId,
      roundTitle: args.title,
      order: order + 1,
      deckName: base.meta.decks.find((d) => d.deckId === deckId)?.name ?? "Untitled deck",
      commander: prepared?.pack?.commanders.map((x) => x.name).join(" and ") ?? prepared?.facts?.commanders.join(" and ") ?? "",
      left: flip ? c : b,
      right: flip ? b : c,
    },
  });
  key[id] = flip ? { left: args.candidate!, right: args.base! } : { left: args.base!, right: args.candidate! };
});

const out = new URL("blind/", ROOT);
mkdirSync(out, { recursive: true });
writeFileSync(new URL(`${roundId}-pairs.json`, out), `${JSON.stringify(pairs, null, 2)}\n`);
writeFileSync(new URL(`${roundId}-key.json`, out), `${JSON.stringify(key, null, 2)}\n`);
console.log(`eval:blind: ${pairs.length} pairs for ${roundId} written; ${Object.values(key).filter((k) => k.left === args.candidate).length} with the candidate on the left`);
