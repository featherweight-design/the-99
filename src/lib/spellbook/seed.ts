import { sql } from "drizzle-orm";

import { db } from "../../db";
import { cardBracketFlags, cards, spellbookVariantCards, spellbookVariants } from "../../db/schema";
import { isMassLandDenial, isExtraTurn } from "../bracket/oracle-rules";
import { stampCatalogRefresh } from "../cache/stamp-catalog";
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
   * Share of returned entries this catalog could match — 100% on the measured run, because
   * upstream answers in Scryfall oracle ids. The floor is 0.5 rather than something near 1.0
   * on purpose: this guards a COLLAPSE (upstream changes its id scheme, or starts answering
   * about a different catalog), not the ordinary drift of a card the weekly refresh has not
   * ingested yet. A regression of that shape arrives as dropped-and-counted rather than a
   * thrown batch, so nothing else in the run would see it.
   */
  sweepResolutionShare: 0.5,
} as const;

export type IngestFloors = typeof FLOORS;

export type IngestReport = {
  sweep: { batches: number; resolved: number; unresolved: number; notIndexed: number };
  flags: { mldSweep: number; mldRule: number; etSweep: number; etRule: number; rows: number };
  variants: { kept: number; cards: number; dropped: Record<string, number> };
  gameChangerDisagreements: string[];
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
  const ruled = new Map<string, { massLandDenial: boolean; extraTurn: boolean }>();
  for (const c of catalog) {
    const mld = isMassLandDenial(c.oracleText);
    const et = isExtraTurn(c.oracleText);
    if (mld || et) ruled.set(c.oracleId, { massLandDenial: mld, extraTurn: et });
  }

  // ---- 4 · the floors, per source ----------------------------------------------------
  const counts = {
    mldSweep: [...swept.flags.values()].filter((f) => f.massLandDenial).length,
    etSweep: [...swept.flags.values()].filter((f) => f.extraTurn).length,
    mldRule: [...ruled.values()].filter((f) => f.massLandDenial).length,
    etRule: [...ruled.values()].filter((f) => f.extraTurn).length,
  };
  log(
    `classifiers: mld sweep ${counts.mldSweep} / rule ${counts.mldRule} · ` +
      `extra-turn sweep ${counts.etSweep} / rule ${counts.etRule}`,
  );
  const below: string[] = [];
  if (counts.mldSweep < floors.mldFromSweep) below.push(`mld sweep ${counts.mldSweep} < ${floors.mldFromSweep}`);
  if (counts.mldRule < floors.mldFromRule) below.push(`mld rule ${counts.mldRule} < ${floors.mldFromRule}`);
  if (counts.etSweep < floors.extraTurnFromSweep) below.push(`extra-turn sweep ${counts.etSweep} < ${floors.extraTurnFromSweep}`);
  if (counts.etRule < floors.extraTurnFromRule) below.push(`extra-turn rule ${counts.etRule} < ${floors.extraTurnFromRule}`);
  if (share < floors.sweepResolutionShare) below.push(`resolution share ${share.toFixed(3)} < ${floors.sweepResolutionShare}`);
  if (below.length > 0) {
    throw new Error(
      `spellbook ingest REFUSED — below floor, nothing written:\n  ${below.join("\n  ")}\n` +
        `The previous flags and variants stand. A floor is a collapse detector: reaching one ` +
        `means a classifier stopped classifying, not that the data moved.`,
    );
  }

  // ---- 5 · publish the FLAGS, in their own transaction, before the bulk ---------------
  const flagRows = unionFlagRows(swept.flags, ruled);
  await db.transaction(async (tx) => {
    await tx.delete(cardBracketFlags);
    for (let i = 0; i < flagRows.length; i += CHUNK) {
      await tx.insert(cardBracketFlags).values(flagRows.slice(i, i + CHUNK));
    }
  });
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

  // ---- 7 · publish the VARIANTS, second transaction -----------------------------------
  await db.transaction(async (tx) => {
    // The child cascades from the parent, so one delete clears both.
    await tx.delete(spellbookVariants);
    for (let i = 0; i < variantRows.length; i += CHUNK) {
      await tx.insert(spellbookVariants).values(variantRows.slice(i, i + CHUNK));
    }
    for (let i = 0; i < cardRows.length; i += CHUNK) {
      await tx.insert(spellbookVariantCards).values(cardRows.slice(i, i + CHUNK));
    }
  });
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
  };
}
