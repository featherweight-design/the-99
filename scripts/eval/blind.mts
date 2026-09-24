/**
 * `pnpm eval:blind --feature tuning --round <n> --title <shown title>
 *   --base <runId>:<cell>:<variant> --candidate <runId>:<cell>:<variant>`
 *
 * Builds the pairs for Hugh's blind read from rows already on disk. It sends nothing and reads no
 * database. It writes two files under `docs/superpowers/eval/blind/`:
 *  - `<feature>-<round>-pairs.json`, the documents to seed into the page's `pairs` collection. This
 *    command writes the file only: Claude seeds it with the Artifact tool's `write_db`, one document
 *    per pair, since only the artifact's owner session can write that store. Each holds a
 *    deck's name, its commander, its decklist and the two answers, as `left` and `right`, with no cell, model or
 *    cost anywhere in it;
 *  - `<feature>-<round>-key.json`, which side is which. It never goes to the page. It un-blinds the answers
 *    once Hugh has read every deck.
 *
 * The decks are the HELD-OUT decks the CANDIDATE ran, in held-out order (all 15, or a subset a
 * shorter round picked with `eval:tuning --decks`), and the answer is trial 0 of each cell.
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
// The overview's read was ruled an ABSOLUTE read of one setup under the contract Hugh picks, not a
// pair against S, so it is built for that contract once it is picked rather than from these rows.
if (args.feature !== "tuning") throw new Error("eval:blind builds tuning pairs only; the overview read is built once its contract is picked");
/** A round is one candidate against the base. Rounds are shuffled independently of each other. */
const roundId = `${args.feature}-${args.round}`;
const roundSeed = SPLIT_SEED + 1000 * Number(args.round);

const ROOT = new URL("../../docs/superpowers/eval/", import.meta.url);

type Tuning = { suggestions: { add: string; cut: string; rationale: string; evidence: { kind: string; value: string }[] }[] };
type Row = { deckId: string; cell: string; variant: string; trial: number; outcome: string; keptPositions?: number[]; reply: Tuning | null };
type Meta = { split: { heldOut: string[] }; decks: { deckId: string; name: string }[] };

function load(spec: string) {
  const [runId, cell, variant] = spec.split(":");
  const dir = new URL(`runs/${runId}/`, ROOT);
  const rows = readFileSync(new URL("rows.jsonl", dir), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Row)
    .filter((r) => r.cell === cell && r.variant === variant && r.trial === 0);
  const meta = JSON.parse(readFileSync(new URL("meta.json", dir), "utf8")) as Meta;
  const prepared = JSON.parse(readFileSync(new URL("prepared.json", dir), "utf8")) as { deckId: string; pack: { commanders: { name: string }[]; cards: { name: string; quantity: number }[] } }[];
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


const base = load(args.base);
const candidate = load(args.candidate);
if (JSON.stringify(base.meta.split.heldOut) !== JSON.stringify(candidate.meta.split.heldOut)) throw new Error("the two runs disagree about the held-out decks");
const stray = [...candidate.rows.keys()].filter((d) => !base.meta.split.heldOut.includes(d));
if (stray.length > 0) throw new Error(`the candidate ran decks outside the held-out set: ${stray.join(", ")}`);
const heldOut = base.meta.split.heldOut.filter((d) => candidate.rows.has(d));
if (heldOut.length === 0) throw new Error("the candidate has no held-out rows");

const pairs: { id: string; data: Record<string, unknown> }[] = [];
const key: Record<string, { left: string; right: string }> = {};
heldOut.forEach((deckId, order) => {
  const id = `${roundId}-${String(order + 1).padStart(2, "0")}`;
  const flip = seededShuffle([0, 1], roundSeed + order)[0] === 1;
  const b = tuningAnswer(base.rows.get(deckId));
  const c = tuningAnswer(candidate.rows.get(deckId));
  // Both answers must come from the same deck as the page shows it: a deck edited on staging
  // between the two runs would put the base's decklist beside a candidate written for another.
  const prepared = base.prepared.get(deckId);
  // The DECK is compared, not the whole pack: a variant such as `trim` rewrites the evidence it adds
  // (the staples) while the deck under it is the same one.
  const deckOf = (p?: { pack: { commanders: unknown; cards: unknown } }) => JSON.stringify(p && [p.pack.commanders, p.pack.cards]);
  if (!prepared || deckOf(prepared) !== deckOf(candidate.prepared.get(deckId))) {
    throw new Error(`deck ${deckId}: the two runs saw different packs; build pairs from runs over the same deck snapshot`);
  }
  pairs.push({
    id,
    data: {
      feature: args.feature,
      round: roundId,
      roundTitle: args.title,
      order: order + 1,
      deckName: base.meta.decks.find((d) => d.deckId === deckId)?.name ?? "Untitled deck",
      commander: prepared.pack.commanders.map((x) => x.name).join(" and ") ?? "",
      // The deck as the model saw it, so a suggestion can be judged against it (plan: one click away).
      decklist: prepared.pack.cards.map((c) => ({ name: c.name, quantity: c.quantity })).sort((x, y) => x.name.localeCompare(y.name)),
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
