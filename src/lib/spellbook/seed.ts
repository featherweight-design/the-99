import { sql } from "drizzle-orm";

import { db } from "../../db";
import { cardBracketFlags, cards, spellbookVariantCards, spellbookVariants } from "../../db/schema";
import { isMassLandDenial, isExtraTurn } from "../bracket/oracle-rules";
import { isTutor } from "../bracket/tutor-targets";
import { stampCatalogRefresh } from "../cache/stamp-catalog";
import {
  diffCombos, diffFlags, emptyLogReport, logTableExists, writeEntries,
  type CountedCombo, type FlagFacts, type LogReport,
} from "../notices/log";
import { isCountedCombo } from "../profile/load";
import { streamVariants } from "./bulk";
import { sweepCardFlags, unionFlagRows, type SweepFetcher, type SweepCard } from "./sweep";
import { toVariantRows, type DropReason } from "./transform";

const BULK_URL = "https://json.commanderspellbook.com/variants.json";
const SWEEP_URL = "https://backend.commanderspellbook.com/estimate-bracket";
const USER_AGENT = "the-99/1.0 (deck analysis; contact hugh@featherweight.design)";

/** Postgres caps a statement at 65,535 parameters; every seed here chunks at 500. */
const CHUNK = 500;

/**
 * COLLAPSE FLOORS, measured per source on the first clean run (see below).
 *
 * Per SOURCE rather than on the union, and that distinction is the whole value: the oracle
 * rule alone flags ~40 mass-land-denial cards, so a sweep that silently returns nothing still
 * clears any floor set on the combined figure. A union floor would report healthy through the
 * exact failure it exists to catch.
 *
 * Half the measured count, rounded down. These catch a COLLAPSE — an upstream restructure that
 * leaves the classifier matching almost nothing behind a green job — not drift. Filled from a
 * real run rather than guessed; see the run note in the PR.
 */
export const FLOORS = {
  // Measured on the first clean run, against local-dev, 2026-09-20:
  //   catalog 31,830 commander-legal · sweep 54 batches · 8,053 resolved (25.3% — upstream
  //   does not index the other 23,777) · 0 unresolved · resolution share 100%
  //   mass land denial: sweep 61, rule 40    extra turns: sweep 46, rule 52
  //   127 flag rows · 106,903 variants · 376,700 membership rows
  mldFromSweep: 30,
  mldFromRule: 20,
  extraTurnFromSweep: 23,
  extraTurnFromRule: 26,
  /**
   * Tutors, which only the oracle rule classifies. Measured on STAGING's catalog on 2026-09-22
   * rather than on a run, because the column is new: 419 commander-legal cards can find
   * something other than a land (929 searches, 510 of them land-only). Half, rounded down.
   */
  tutorFromRule: 209,
  /**
   * Share of returned entries this catalog could match — 100% on the measured run, because
   * upstream answers in Scryfall oracle ids. The floor is 0.5 rather than something near 1.0
   * on purpose: this guards a COLLAPSE (upstream changes its id scheme, or starts answering
   * about a different catalog), not the ordinary drift of a card the weekly refresh has not
   * ingested yet. A regression of that shape arrives as dropped-and-counted rather than a
   * thrown batch, so nothing else in the run would see it.
   */
  sweepResolutionShare: 0.5,
  /**
   * The BULK's own floor, and the gap that nearly shipped: every other floor here guards a
   * classifier, and none of them looks at how many variants survived the transform.
   *
   * A complete, untruncated download whose records all DROP — upstream renames a bracket tag,
   * or reshapes `legalities` or `uses` — passes every classifier floor, then clears 106,903
   * variants and 376,700 membership rows inside the publish transaction and inserts nothing.
   * Green job, both tables empty. That is precisely the wholesale-data-loss-behind-a-green-job
   * that `bulk.ts` throws on truncation to prevent, arriving by the one door truncation does
   * not cover.
   *
   * Half the measured 106,903.
   */
  variantsKept: 53000,
  /**
   * Share of KEPT variants carrying execution steps, and the share carrying a mana value.
   *
   * These guard the same class of failure `variantsKept` does, one door further in. A feed
   * that still sends well-formed records but stops populating `description` passes every floor
   * above — the transform keeps the variant, the publish succeeds, the job is green — and
   * every combo modal in the app is then empty. Nothing else here looks at a field's
   * POPULATION, only at whether records survived.
   *
   * Both measured at 1.00 across 347 variants sampled from the head plus two mid-file slices,
   * 2026-09-21. The floor is 0.5 for the reason `sweepResolutionShare`'s is: this detects a
   * collapse, not the ordinary drift of upstream leaving one record blank.
   *
   * There is deliberately NO floor on `manaNeeded`, whose population is 41% and is a fact
   * about combos rather than about the feed — most need no mana, so a floor there would be
   * asserting a ratio nobody controls. `manaValueNeeded` is the one to guard, because it is
   * set on every record and a 0 in it is load-bearing: see the reader note on the column.
   */
  stepsShare: 0.5,
  manaValueShare: 0.5,
} as const;

export type IngestFloors = typeof FLOORS;

/** What share of the rows about to be published carry each field the modal draws. */
export type FieldPopulation = {
  kept: number;
  withSteps: number;
  withManaValue: number;
  withManaPips: number;
  withPrerequisites: number;
  stepsShare: number;
  manaValueShare: number;
};

/**
 * Counted over the KEPT rows, so the denominator is the set about to be published rather than
 * everything upstream sent — a feed that drops half its records and populates the rest
 * perfectly is `variantsKept`'s problem, not this one.
 */
export function fieldPopulation(
  // `undefined` as well as `null`, because these arrive as Drizzle's `$inferInsert`, which
  // makes a nullable column optional. `!= null` covers both, and narrowing the parameter to
  // `| null` alone would force a cast at the one call site that matters.
  rows: readonly {
    steps?: string | null; manaValueNeeded?: number | null;
    manaNeeded?: string | null; notablePrerequisites?: string | null;
  }[],
): FieldPopulation {
  const kept = rows.length;
  const withSteps = rows.filter((v) => v.steps != null).length;
  const withManaValue = rows.filter((v) => v.manaValueNeeded != null).length;
  return {
    kept,
    withSteps,
    withManaValue,
    withManaPips: rows.filter((v) => v.manaNeeded != null).length,
    withPrerequisites: rows.filter((v) => v.notablePrerequisites != null).length,
    stepsShare: kept === 0 ? 0 : withSteps / kept,
    manaValueShare: kept === 0 ? 0 : withManaValue / kept,
  };
}

/**
 * The field floors, as a list of failures — empty when the population is healthy.
 *
 * CHECKED AFTER `variantsKept`, and that ordering is the guard rather than the exemption below.
 * A thin ingest breaches these shares for the same reason it breaches the variant floor, so
 * whichever runs first owns the refusal — and the honest owner is the variant floor, whose
 * message names the download. Running this one first reported "a field collapsed" over a
 * 1,000-row download and told the operator every floor above had passed, which was not yet true
 * because the variant floor had not been evaluated. Two refusals for one cause, naming the
 * wrong cause, is worse than one.
 *
 * The `kept === 0` exemption stays as a second belt: it is the one case where every share is 0
 * by construction rather than by collapse, and a caller reaching here with no rows at all has
 * skipped the floor above.
 */
export function fieldCollapse(fields: FieldPopulation, floors: IngestFloors): string[] {
  if (fields.kept === 0) return [];
  const below: string[] = [];
  if (fields.stepsShare < floors.stepsShare) {
    below.push(`steps ${fields.stepsShare.toFixed(3)} < ${floors.stepsShare}`);
  }
  if (fields.manaValueShare < floors.manaValueShare) {
    below.push(`mana value ${fields.manaValueShare.toFixed(3)} < ${floors.manaValueShare}`);
  }
  return below;
}

/** How many cards each classifier flagged, per SOURCE — what the classifier floors read. */
export type ClassifierCounts = {
  mldSweep: number;
  mldRule: number;
  etSweep: number;
  etRule: number;
  tutorRule: number;
};

/**
 * Every classifier floor the run is under, as the refusal's lines. Empty means publish.
 *
 * Pure, and separate from `ingestCombos`, so each floor has a test: the checks used to live
 * inline in a function that needs a database, and none of them was asserted by anything.
 */
export function classifierCollapse(
  counts: ClassifierCounts,
  share: number,
  floors: IngestFloors,
): string[] {
  const below: string[] = [];
  if (counts.mldSweep < floors.mldFromSweep) below.push(`mld sweep ${counts.mldSweep} < ${floors.mldFromSweep}`);
  if (counts.mldRule < floors.mldFromRule) below.push(`mld rule ${counts.mldRule} < ${floors.mldFromRule}`);
  if (counts.etSweep < floors.extraTurnFromSweep) below.push(`extra-turn sweep ${counts.etSweep} < ${floors.extraTurnFromSweep}`);
  if (counts.etRule < floors.extraTurnFromRule) below.push(`extra-turn rule ${counts.etRule} < ${floors.extraTurnFromRule}`);
  if (counts.tutorRule < floors.tutorFromRule) below.push(`tutor rule ${counts.tutorRule} < ${floors.tutorFromRule}`);
  if (share < floors.sweepResolutionShare) below.push(`resolution share ${share.toFixed(3)} < ${floors.sweepResolutionShare}`);
  return below;
}

export type IngestReport = {
  sweep: { batches: number; resolved: number; unresolved: number; notIndexed: number };
  // `ClassifierCounts` rather than a second list of the same fields, which is how `tutorRule`
  // shipped counted and published but missing from this type.
  flags: ClassifierCounts & { rows: number };
  variants: { kept: number; cards: number; dropped: Record<string, number> };
  gameChangerDisagreements: string[];
  /** The deck notices entries this run wrote and lost; losses never fail the run (plan D13). */
  notices: LogReport;
};

function defaultSweepFetcher(): SweepFetcher {
  return async (names) => {
    const res = await fetch(SWEEP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
      body: JSON.stringify({ main: names.map((card) => ({ card, quantity: 1 })) }),
    });
    if (!res.ok) throw new Error(`estimate-bracket ${res.status}`);
    return (await res.json()) as { cards?: [] };
  };
}

/**
 * The combo ingest.
 *
 * ORDER IS LOAD-BEARING, and it is the sweep-first rule the spec states: the card flags are
 * published in their OWN transaction BEFORE the 656 MB bulk is streamed, so a bulk failure
 * costs yesterday's variants and nothing else. An earlier draft of the plan put all three
 * tables in one transaction, which silently undid that — a failed download would have
 * discarded a healthy, floor-passing sweep.
 *
 * Both publishes clear and refill inside one transaction each (the #704 pattern), so a
 * refused or failed run leaves the previous rows standing rather than a half-written table.
 */
export async function ingestCombos(opts: {
  fetchSweep?: SweepFetcher;
  fetchBulk?: () => Promise<ReadableStream<Uint8Array>>;
  floors?: IngestFloors;
  log?: (line: string) => void;
  /** The notices report to fill; a caller that needs the entries' sequence numbers passes its own. */
  notices?: LogReport;
} = {}): Promise<IngestReport> {
  const log = opts.log ?? ((l: string) => console.log(l));
  const floors = opts.floors ?? FLOORS;

  // ---- 1 · the catalog we are classifying -------------------------------------------
  const catalog = await db
    .select({
      oracleId: cards.oracleId,
      name: cards.name,
      oracleText: cards.oracleText,
      gameChanger: cards.gameChanger,
    })
    .from(cards)
    .where(sql`${cards.commanderLegal} = true`);
  log(`catalog: ${catalog.length} commander-legal cards`);

  // ---- 2 · the sweep, FIRST ----------------------------------------------------------
  const sweepCards: SweepCard[] = catalog.map((c) => ({
    oracleId: c.oracleId,
    name: c.name,
    gameChanger: c.gameChanger,
  }));
  const swept = await sweepCardFlags(sweepCards, opts.fetchSweep ?? defaultSweepFetcher());
  const returned = swept.resolved + swept.unresolved;
  const share = returned === 0 ? 0 : swept.resolved / returned;
  log(
    `sweep: ${swept.batches} batches · ${swept.resolved} resolved · ` +
      `${swept.unresolved} unresolved · ${swept.notIndexed} not indexed upstream · ` +
      `resolution share ${(share * 100).toFixed(1)}%`,
  );
  if (swept.gameChangerDisagreements.length > 0) {
    log(
      `  NOTE: ${swept.gameChangerDisagreements.length} gameChanger disagreement(s) with ` +
        `Scryfall, logged and NOT written (Scryfall is authoritative): ` +
        swept.gameChangerDisagreements.slice(0, 10).join(", "),
    );
  }

  // ---- 3 · the oracle rules over the same corpus -------------------------------------
  const ruled = new Map<string, { massLandDenial: boolean; extraTurn: boolean; tutor: boolean }>();
  for (const c of catalog) {
    const mld = isMassLandDenial(c.oracleText);
    const et = isExtraTurn(c.oracleText);
    // `isTutor`, the predicate the note and the verdict read live, so a stored mark and a live
    // count can only disagree across a deploy that changes the rule, never at rest.
    const tutor = isTutor(c.oracleText);
    if (mld || et || tutor) ruled.set(c.oracleId, { massLandDenial: mld, extraTurn: et, tutor });
  }

  // ---- 4 · the floors, per source ----------------------------------------------------
  const counts = {
    mldSweep: [...swept.flags.values()].filter((f) => f.massLandDenial).length,
    etSweep: [...swept.flags.values()].filter((f) => f.extraTurn).length,
    mldRule: [...ruled.values()].filter((f) => f.massLandDenial).length,
    etRule: [...ruled.values()].filter((f) => f.extraTurn).length,
    tutorRule: [...ruled.values()].filter((f) => f.tutor).length,
  };
  log(
    `classifiers: mld sweep ${counts.mldSweep} / rule ${counts.mldRule} · ` +
      `extra-turn sweep ${counts.etSweep} / rule ${counts.etRule} · tutor rule ${counts.tutorRule}`,
  );
  const below = classifierCollapse(counts, share, floors);
  if (below.length > 0) {
    throw new Error(
      `spellbook ingest REFUSED — below floor, nothing written:\n  ${below.join("\n  ")}\n` +
        `The previous flags and variants stand. A floor is a collapse detector: reaching one ` +
        `means a classifier stopped classifying, not that the data moved.`,
    );
  }

  // ---- 5 · publish the FLAGS, in their own transaction, before the bulk ---------------
  const flagRows = unionFlagRows(swept.flags, ruled);
  // The deck notices log (brief §6): asked once whether it exists; each diff is written inside the
  // publish it describes, in a savepoint, and a failed write never fails the run (`writeEntries`).
  const logging = await logTableExists(db);
  const notices = opts.notices ?? emptyLogReport();
  await publishFlags(flagRows, logging, notices);
  log(`flags: published ${flagRows.length} rows (before the bulk, so a bulk failure cannot cost them)`);

  // ---- 6 · the bulk ------------------------------------------------------------------
  const known = new Set(catalog.map((c) => c.oracleId));
  const variantRows: (typeof spellbookVariants.$inferInsert)[] = [];
  const cardRows: (typeof spellbookVariantCards.$inferInsert)[] = [];
  const dropped: Record<string, number> = {};
  const body = opts.fetchBulk
    ? await opts.fetchBulk()
    : await (async () => {
        const res = await fetch(BULK_URL, { headers: { "User-Agent": USER_AGENT } });
        if (!res.ok || !res.body) throw new Error(`variants.json ${res.status}`);
        return res.body;
      })();

  for await (const raw of streamVariants(body)) {
    const out = toVariantRows(raw, known);
    if (out.kind === "drop") {
      dropped[out.reason satisfies DropReason] = (dropped[out.reason] ?? 0) + 1;
      continue;
    }
    variantRows.push(out.variant);
    for (const c of out.cards) cardRows.push({ variantId: out.variant.variantId, ...c });
  }
  log(
    `bulk: ${variantRows.length} variants kept, ${cardRows.length} membership rows; ` +
      `dropped ${Object.entries(dropped).map(([k, v]) => `${k} ${v}`).join(", ") || "none"}`,
  );

  // Checked AFTER the stream and BEFORE the variant publish, because that is the only window
  // in which refusing still leaves the previous variants standing.
  //
  // THE FLAGS ARE ALREADY LIVE AT THIS POINT, DELIBERATELY, and the resulting mixed state is
  // the design rather than a gap in it. The sweep-first ordering exists precisely so a bulk
  // failure cannot cost the card flags: an earlier draft published all three tables in one
  // transaction and a review round caught that it silently undid that guarantee. Reverting to
  // one generation would reinstate the defect.
  //
  // The mixed state is also the better one for a READER. The two stores answer different
  // questions — `card_bracket_flags` is "is this card mass land denial", `spellbook_variants`
  // is "which combos exist" — and a verdict built from fresh flags plus week-old variants is
  // strictly better than one built from week-old both. The alternative costs a week of stale
  // flags to avoid a week of stale combos.
  //
  // Nothing is hidden: `computed_at` on each table records its own generation, so a reader
  // comparing them can see exactly which is which, and the refusal message below says plainly
  // that the flags above are current while the previous variants stand.
  const fields = fieldPopulation(variantRows);
  log(
    `bulk fields: steps ${fields.withSteps}/${fields.kept} (${fields.stepsShare.toFixed(3)}), ` +
      `mana value ${fields.withManaValue}/${fields.kept} ` +
      `(${fields.manaValueShare.toFixed(3)}), ` +
      `mana pips ${fields.withManaPips}/${fields.kept}, ` +
      `prerequisites ${fields.withPrerequisites}/${fields.kept}`,
  );

  if (variantRows.length < floors.variantsKept) {
    throw new Error(
      `spellbook ingest REFUSED — ${variantRows.length} variants kept, below the floor of ` +
        `${floors.variantsKept}. The previous variants stand, and the flags published above ` +
        `are current.\n` +
        `Dropped by reason: ${Object.entries(dropped).map(([k, v]) => `${k} ${v}`).join(", ") || "none"}\n` +
        `A download that arrives whole and then drops everything is the one failure the ` +
        `truncation guard cannot see.`,
    );
  }

  const fieldBelow = fieldCollapse(fields, floors);
  if (fieldBelow.length > 0) {
    throw new Error(
      `spellbook ingest REFUSED — a field collapsed, nothing written:\n  ` +
        `${fieldBelow.join("\n  ")}\n` +
        `The records survived the transform AND cleared the variant floor above, so every other ` +
        `check passed. What this catches is ` +
        `upstream still sending variants while no longer populating a field the reasoning modal ` +
        `draws — which would otherwise publish and leave every modal empty behind a green job. ` +
        `The previous variants stand.`,
    );
  }


  // ---- 7 · publish the VARIANTS, second transaction -----------------------------------
  // Names from the WHOLE catalog, not the legal one above: a combo REMOVED because one of its
  // pieces became illegal names that piece, and the entry must carry its name once the variant
  // row is gone. Only read when the log is being written.
  // Non-fatal like the rest of the log: a failed read costs the entries their names (they keep the
  // oracle ids) and never the variant publish.
  let names = new Map<string, string>();
  if (logging) {
    try {
      names = new Map((await db.select({ oracleId: cards.oracleId, name: cards.name }).from(cards)).map((c) => [c.oracleId, c.name]));
    } catch (error) {
      log(`notices: card names unread, entries keep oracle ids (${error instanceof Error ? error.message : String(error)})`);
    }
  }
  await publishVariants(variantRows, cardRows, logging, notices, (id) => names.get(id) ?? id);
  log(`variants: published`);

  // ---- 8 · retire cached readers -----------------------------------------------------
  // Non-fatal, as every other ingest's stamp is: this job never runs `db:migrate`, so a
  // database without the table costs one refresh's staleness and a warning, not a red job
  // after a successful ingest.
  await stampCatalogRefresh();

  return {
    sweep: {
      batches: swept.batches,
      resolved: swept.resolved,
      unresolved: swept.unresolved,
      notIndexed: swept.notIndexed,
    },
    flags: { ...counts, rows: flagRows.length },
    variants: { kept: variantRows.length, cards: cardRows.length, dropped },
    gameChangerDisagreements: swept.gameChangerDisagreements,
    notices,
  };
}

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type FlagRowInsert = typeof cardBracketFlags.$inferInsert;
type VariantInsert = typeof spellbookVariants.$inferInsert;
type MemberInsert = typeof spellbookVariantCards.$inferInsert;

/**
 * Step 5's publish: the flags, cleared and refilled in one transaction (the #704 pattern). With
 * `logging`, the mass land denial and extra-turn flags it replaces are read in that transaction and
 * their diff is written in a savepoint inside it. Exported for `probe:notices-log`.
 */
export async function publishFlags(flagRows: readonly FlagRowInsert[], logging: boolean, notices: LogReport) {
  await db.transaction((tx) => publishFlagsIn(tx, flagRows, logging, notices));
}

/**
 * `publishFlags`'s body, in a transaction the CALLER owns. The ingest calls it through
 * `publishFlags`, one transaction as ever; `db:copy:combos` calls it and `publishVariantsIn` in ONE
 * production transaction, so both halves commit together and only after the copy is verified
 * (plan `2026-09-28-card-data-replicate.md`, §3a).
 */
export async function publishFlagsIn(tx: Tx, flagRows: readonly FlagRowInsert[], logging: boolean, notices: LogReport) {
  {
    // Never tutor: the verdict classifies tutors from oracle text, so a tutor flag moves nothing.
    const previous: Map<string, FlagFacts> | null = logging
      ? await readBefore(tx, "flags", async (sp) => new Map(
          (await sp
            .select({ oracleId: cardBracketFlags.oracleId, massLandDenial: cardBracketFlags.massLandDenial, extraTurn: cardBracketFlags.extraTurn })
            .from(cardBracketFlags)).map((r) => [r.oracleId, r]),
        ))
      : null;
    await tx.delete(cardBracketFlags);
    for (let i = 0; i < flagRows.length; i += CHUNK) {
      await tx.insert(cardBracketFlags).values(flagRows.slice(i, i + CHUNK));
    }
    if (previous) {
      const next = flagRows.map((r) => ({ oracleId: r.oracleId, massLandDenial: r.massLandDenial ?? false, extraTurn: r.extraTurn ?? false }));
      await writeEntries(tx, diffFlags(previous, next), notices);
    }
  }
}

/**
 * Step 7's publish: the variants and their members, in one transaction. With `logging`, the
 * COUNTED combos it replaces are read in that transaction (plan D7), and the diff against the
 * counted combos it publishes is written in a savepoint inside it. Exported for `probe:notices-log`.
 */
export async function publishVariants(
  variantRows: readonly VariantInsert[],
  cardRows: readonly MemberInsert[],
  logging: boolean,
  notices: LogReport,
  nameOf: (oracleId: string) => string,
) {
  await db.transaction((tx) => publishVariantsIn(tx, variantRows, cardRows, logging, notices, nameOf));
}

/** `publishVariants`'s body, in a transaction the caller owns; see `publishFlagsIn`. */
export async function publishVariantsIn(
  tx: Tx,
  variantRows: readonly VariantInsert[],
  cardRows: readonly MemberInsert[],
  logging: boolean,
  notices: LogReport,
  nameOf: (oracleId: string) => string,
) {
  {
    const previous = logging ? await readBefore(tx, "combos", async (sp) => countedCombos(await readCombosBefore(sp))) : null;
    // The child cascades from the parent, so one delete clears both.
    await tx.delete(spellbookVariants);
    for (let i = 0; i < variantRows.length; i += CHUNK) {
      await tx.insert(spellbookVariants).values(variantRows.slice(i, i + CHUNK));
    }
    for (let i = 0; i < cardRows.length; i += CHUNK) {
      await tx.insert(spellbookVariantCards).values(cardRows.slice(i, i + CHUNK));
    }
    if (previous) await writeEntries(tx, diffCombos(previous, countedCombos(combosOf(variantRows, cardRows)), nameOf), notices);
  }
}

/**
 * A publish's "before" read, in a SAVEPOINT of the publish's own transaction, so the log's contract
 * holds from its first statement: a failed read rolls back to the savepoint, the publish goes on,
 * and that publish writes no entries. Never an empty map in its place, which would log every row as
 * added.
 */
async function readBefore<T>(
  tx: Tx,
  what: string,
  read: (sp: Tx) => Promise<T>,
): Promise<T | null> {
  try {
    return await tx.transaction((sp) => read(sp));
  } catch (error) {
    console.warn(`notices: the ${what} before this publish were unread, so it writes no entries (${error instanceof Error ? error.message : String(error)})`);
    return null;
  }
}

/** A variant with its pieces, before the counting rule is applied. */
type ComboCandidate = {
  variantId: string; cardCount: number; requiresTemplateIds: readonly unknown[]; produces: string[];
  pieces: { oracleId: string; mustBeCommander: boolean }[];
};

/** The counted combos among `candidates`, keyed by variant (`isCountedCombo`, plan D7). */
function countedCombos(candidates: readonly ComboCandidate[]): Map<string, CountedCombo> {
  const out = new Map<string, CountedCombo>();
  for (const c of candidates) {
    const pieces = [...new Set(c.pieces.map((p) => p.oracleId))].sort();
    if (!isCountedCombo({ cardCount: c.cardCount, requiresTemplateIds: c.requiresTemplateIds, pieces, produces: c.produces })) continue;
    out.set(c.variantId, {
      variantId: c.variantId,
      pieces,
      mustBeCommander: [...new Set(c.pieces.filter((p) => p.mustBeCommander).map((p) => p.oracleId))].sort(),
      produces: c.produces,
    });
  }
  return out;
}

/** The rows this run is about to publish, as candidates. */
function combosOf(
  variants: readonly (typeof spellbookVariants.$inferInsert)[],
  members: readonly (typeof spellbookVariantCards.$inferInsert)[],
): ComboCandidate[] {
  const byVariant = new Map<string, { oracleId: string; mustBeCommander: boolean }[]>();
  for (const m of members) {
    const list = byVariant.get(m.variantId) ?? [];
    list.push({ oracleId: m.oracleId, mustBeCommander: m.mustBeCommander ?? false });
    byVariant.set(m.variantId, list);
  }
  return variants.map((v) => ({
    variantId: v.variantId, cardCount: v.cardCount, requiresTemplateIds: v.requiresTemplateIds,
    produces: v.produces, pieces: byVariant.get(v.variantId) ?? [],
  }));
}

/** The published variants that COULD count, narrowed in SQL to two-card, template-free ones so the
 *  read is a few thousand rows rather than the whole index; `countedCombos` applies the rule. */
async function readCombosBefore(tx: Tx): Promise<ComboCandidate[]> {
  const rows = (await tx.execute(sql`
    select v.variant_id, v.card_count, v.requires_template_ids, v.produces,
           json_agg(json_build_object('oracleId', vc.oracle_id, 'mustBeCommander', vc.must_be_commander)) as pieces
    from ${spellbookVariants} v
    join ${spellbookVariantCards} vc on vc.variant_id = v.variant_id
    where v.card_count = 2 and cardinality(v.requires_template_ids) = 0
    group by v.variant_id`)).rows as {
      variant_id: string; card_count: number; requires_template_ids: number[]; produces: string[];
      pieces: { oracleId: string; mustBeCommander: boolean }[];
    }[];
  return rows.map((r) => ({
    variantId: r.variant_id, cardCount: r.card_count, requiresTemplateIds: r.requires_template_ids,
    produces: r.produces, pieces: r.pieces,
  }));
}
