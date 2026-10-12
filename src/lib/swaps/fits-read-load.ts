import { sql } from "drizzle-orm";

import { db } from "../../db";
import { liveLockedIds } from "../decks/locks";
import { readLabels } from "../labels/read";
import type { Job } from "../labels/types";
import { readShownSynopsis } from "../synopsis/generate";
import { SYNOPSIS_CONTRACT_VERSION_V2, SYNOPSIS_CONTRACT_VERSION_V2_BENCHMARKS } from "../synopsis/limits";
import { deckNameIndex, normalizeName } from "../synopsis/facts";
import type { CheckedSynopsis } from "../synopsis/types";
import { loadFits, type FitsRead } from "./fits";
import { fitsReadCandidates, type CandidateFacts, type FitsDeckBlock, type FitsReadInputs, type PlanSource, type ReadCardFacts } from "./fits-read";

/**
 * The read's inputs for one card and one reader (brief defaults 2 and 3, Finding 1). Reads only.
 *
 * The candidates are `loadFits`' own (`fitsReadCandidates`), and each candidate's need is its row's.
 * The plan is the newest passing Overview of ANY contract (`readShownSynopsis`): its prose and its
 * strategy, marks drawn as names. With none, the commander and the deck's leading themes, counted
 * over its own cards' labels: `deck_profiles.profile.themes` is always null (`profile/types.ts`), so
 * it cannot be the source.
 *
 * `allDecks` loads a block for every deck the reader has, which the cached-decks layout shows; off,
 * only the candidates are loaded.
 */

/** The v2 Overview contracts. */
export const V2_CONTRACTS: readonly number[] = [SYNOPSIS_CONTRACT_VERSION_V2, SYNOPSIS_CONTRACT_VERSION_V2_BENCHMARKS];

/** How many leading themes a deck with no plan is shown with. */
const DECK_THEMES = 6;

export type FitsReadLoad = {
  fits: FitsRead;
  inputs: FitsReadInputs;
  /** Per deck loaded: where its plan came from, and the cards its Overview names that it no longer runs. */
  planOf: ReadonlyMap<string, { source: PlanSource; staleNames: string[] }>;
};

const kinds = (jobs: readonly Job[] | undefined) => [...new Set((jobs ?? []).map((j) => j.kind))];
const MARK = /\[\[([^[\]]+)\]\]/g;
const drawMarks = (t: string) => t.replace(MARK, "$1").replace(/\s+/g, " ").trim();

/** An Overview's plan text: its prose, then its strategy steps. Null when neither passed. */
export function planText(content: Pick<CheckedSynopsis, "overview" | "primer">): string | null {
  const parts: string[] = [];
  if (content.overview) parts.push(drawMarks(content.overview));
  const steps = content.primer?.strategy ?? [];
  if (steps.length > 0) parts.push(`Strategy: ${steps.map(drawMarks).join(" ")}`);
  return parts.length > 0 ? parts.join(" ") : null;
}

/** A deck's leading themes, counted over its cards' theme-space labels, most first. */
export function leadingThemes(list: readonly { oracleId: string }[], labels: ReadonlyMap<string, Job[]>, top = DECK_THEMES) {
  const n = new Map<string, number>();
  for (const c of list) for (const k of new Set((labels.get(c.oracleId) ?? []).filter((j) => j.space === "theme").map((j) => j.kind))) n.set(k, (n.get(k) ?? 0) + 1);
  return [...n].map(([kind, count]) => ({ kind, n: count })).sort((a, b) => b.n - a.n || a.kind.localeCompare(b.kind)).slice(0, top);
}

type DeckRow = { id: string; commander_oracle_id: string; partner_oracle_id: string | null };
type CardRow = { oracle_id: string; name: string; type_line: string; oracle_text: string | null };
type ListRow = { deck_id: string; oracle_id: string; name: string; type_line: string };

export async function loadFitsReadInputs(userId: string, oracleId: string, opts: { allDecks?: boolean } = {}): Promise<FitsReadLoad | null> {
  const fits = await loadFits(userId, oracleId);
  if (!fits) return null;
  const candidates = fitsReadCandidates(fits);

  const deckRows = (await db.execute<DeckRow>(sql`
    select id, commander_oracle_id, partner_oracle_id from decks where user_id = ${userId} order by id`)).rows;
  const candidateIds = new Set(candidates.map((c) => c.id));
  const loaded = opts.allDecks ? deckRows : deckRows.filter((d) => candidateIds.has(d.id));
  const deckIds = loaded.map((d) => d.id);
  const commanderIds = [...new Set(loaded.flatMap((d) => (d.partner_oracle_id ? [d.commander_oracle_id, d.partner_oracle_id] : [d.commander_oracle_id])))];

  const [cardRows, listRows, synopses, locks, inclusion] = await Promise.all([
    db.execute<CardRow>(sql`
      select oracle_id, name, type_line, oracle_text from cards
      where oracle_id = any(${sql.param([oracleId, ...commanderIds])}::uuid[])`).then((r) => r.rows),
    deckIds.length === 0 ? [] as ListRow[] : db.execute<ListRow>(sql`
      select dc.deck_id, dc.oracle_id, c.name, c.type_line
      from deck_cards dc join cards c on c.oracle_id = dc.oracle_id
      where dc.deck_id = any(${sql.param(deckIds)}::uuid[])
      order by dc.deck_id, c.name`).then((r) => r.rows),
    Promise.all(deckIds.map((id) => readShownSynopsis(id, userId))),
    Promise.all(deckIds.map((id) => liveLockedIds(db, id))),
    readInclusion(oracleId, loaded.filter((d) => candidateIds.has(d.id))),
  ]);
  const cardOf = new Map(cardRows.map((c) => [c.oracle_id, c]));
  const subjectRow = cardOf.get(oracleId);
  if (!subjectRow) return null;
  const labels = await readLabels([oracleId, ...commanderIds, ...listRows.map((r) => r.oracle_id)]);

  const planOf = new Map<string, { source: PlanSource; staleNames: string[] }>();
  const decks: FitsDeckBlock[] = loaded.map((d, i) => {
    // One row per card: a deck may hold a card on two rows (a printing each), which the prompt
    // lists once.
    const seen = new Set<string>();
    const list: ReadCardFacts[] = listRows.filter((r) => r.deck_id === d.id && !seen.has(r.oracle_id) && seen.add(r.oracle_id))
      .map((r) => ({ oracleId: r.oracle_id, name: r.name, typeLine: r.type_line, kinds: kinds(labels.get(r.oracle_id)) }));
    const commanders = (d.partner_oracle_id ? [d.commander_oracle_id, d.partner_oracle_id] : [d.commander_oracle_id]).flatMap((id) => {
      const c = cardOf.get(id);
      return c ? [{ oracleId: id, name: c.name, typeLine: c.type_line, oracleText: c.oracle_text ?? "", kinds: kinds(labels.get(id)) }] : [];
    });
    const shown = synopses[i];
    const text = shown ? planText(shown.content) : null;
    const source: PlanSource = !shown || !text ? "none" : V2_CONTRACTS.includes(shown.contractVersion) ? "v2" : "older";
    // Key cards as Proposed cuts resolves them (`buildCutsPack`): by name over this list, faces too.
    const byName = deckNameIndex(list);
    const keyCardIds = [...new Set((shown?.content.keyCards ?? []).flatMap((k) => { const hit = byName.get(normalizeName(k.card)); return hit ? [hit.oracleId] : []; }))];
    const runs = new Set([...list.map((c) => c.oracleId), ...commanders.map((c) => c.oracleId)]);
    const staleNames = shown ? Object.values(shown.content.cards ?? {}).filter((c) => !runs.has(c.oracleId)).map((c) => c.name) : [];
    planOf.set(d.id, { source, staleNames: [...new Set(staleNames)] });
    return {
      deckId: d.id,
      commanders,
      plan: source === "none" ? null : { source, text: text! },
      themes: source === "none" ? leadingThemes(list, labels) : [],
      list,
      keyCardIds,
      lockedIds: [...locks[i]].filter((id) => runs.has(id)),
    };
  });

  const candidateFacts: CandidateFacts[] = candidates.map((c) => ({ deckId: c.id, need: c.need, inclusion: inclusion.get(c.id) ?? null }));
  return {
    fits,
    inputs: {
      card: { oracleId, name: subjectRow.name, typeLine: subjectRow.type_line, oracleText: subjectRow.oracle_text ?? "", kinds: kinds(labels.get(oracleId)) },
      decks,
      candidates: candidateFacts,
    },
    planOf,
  };
}

/** How often decks with each candidate's commander (or pair) run the card, where the index records it. */
async function readInclusion(oracleId: string, decks: readonly DeckRow[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  await Promise.all(decks.map(async (d) => {
    const { rows } = d.partner_oracle_id === null
      ? await db.execute<{ inclusion: number | null }>(sql`
          select inclusion from commander_support_cards
          where commander_oracle_id = ${d.commander_oracle_id}::uuid and oracle_id = ${oracleId}::uuid`)
      : await db.execute<{ inclusion: number | null }>(sql`
          select inclusion from commander_pair_support_cards
          where commander_oracle_id = least(${d.commander_oracle_id}::uuid, ${d.partner_oracle_id}::uuid)
            and partner_oracle_id = greatest(${d.commander_oracle_id}::uuid, ${d.partner_oracle_id}::uuid)
            and oracle_id = ${oracleId}::uuid`);
    const v = rows[0]?.inclusion;
    if (v !== null && v !== undefined) out.set(d.id, Number(v));
  }));
  return out;
}
