/**
 * Reads one import's receipt back, for `/collection/replace/summary/[uploadId]`.
 *
 * TWO HALVES, AND ONLY ONE OF THEM IS FROZEN. The money sections come out of
 * `csv_uploads.summary_payload` exactly as the confirm wrote them — a receipt for one import,
 * whose names are stored so a later rename or a deleted deck cannot rewrite history. The
 * contested rows are read LIVE against the claim model, because their allocation moves: a
 * reservation can be made or moved after the payload was written, and a deck can commit a
 * removal. The payload stores which cards this import left contested and how many copies it
 * brought; everything else about those rows is asked for fresh.
 *
 * A null payload on a confirmed upload is not an error. The receipt is written after the
 * replace commits, so a failure in between leaves one — and the route renders the
 * nothing-to-report state, which is the state the design already draws for an import that moved
 * nothing.
 */

import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { cards, csvUploads } from "../../db/schema";
import { loadAvailability } from "../decks/availability-query";
import { withoutUndecided, type ArrivalsSummary } from "./arrivals";
import type { Availability } from "../decks/availability";
import { allocateClaims } from "../decks/allocate";

/** One committed deck's place in a contested card's queue. */
export type ContestedClaimant = {
  deckId: string;
  deckName: string;
  /** This deck's whole ask, commander copies included. */
  quantity: number;
  /** How many of that ask is a commander or partner — never reservable. */
  commanderCopies: number;
  /** Copies reserved to this deck by the player, as the claim model granted them. */
  granted: number;
  /** `deck_version_cards.since`, epoch millis. The order this list is in, and the stamp it draws. */
  since: number | null;
  versionNumber: number | null;
  /** How many copies this deck gets under the allocation as it currently stands. */
  allocated: number;
};

export type ContestedCard = {
  oracleId: string;
  cardName: string;
  /**
   * Copies this import brought. Frozen — it is a fact about the import, not about now.
   *
   * On a surface with no import behind it this is the supply instead, and `fromImport` is what
   * tells the row which it is holding. The two cannot share a word: `1 new copy` on a deck's own
   * review page tells the reader their collection turned up this morning.
   */
  arrived: number;
  /** True when `arrived` really is an arrival. False on the `/decks/[id]/changes` door. */
  fromImport: boolean;
  /** Copies held before it. Frozen too, and what `keeps it` is allowed to be said about. */
  ownedBefore: number;
  /** Copies the collection holds now. Live. */
  owned: number;
  claimants: ContestedClaimant[];
  /** Brews wanting the card. Named, never options — a brew cannot be given a copy. */
  brewNames: string[];
};

export type SummaryView = {
  uploadId: string;
  filename: string;
  /** When the file was uploaded — what the stamp says, and not the same as the confirm. */
  createdAt: Date;
  confirmedAt: Date | null;
  /** Null when the receipt did not survive its write. Renders as nothing-to-report. */
  summary: ArrivalsSummary | null;
  contested: ContestedCard[];
};


/**
 * Every contested card among `oracleIds`, read live — the `/decks/[id]/changes` door.
 *
 * NOT the deck's own vantage. A row on that page is loaded with `excludeDeckId` set, which is
 * right for its buy tag and its marker but wrong here: the chooser's whole subject is the queue
 * of committed decks INCLUDING this one, and an excluded read leaves the deck the reader is
 * looking at out of its own decision.
 *
 * Filtered by the same two tests the receipt uses: demand above supply, and at least two
 * committed claimants — a shortage with one claimant is a purchase, not a choice.
 */
/**
 * The two tests a card must pass to count as contested: demand above supply, and at least two
 * committed claimants. Shared by `loadContestedCards` and `countContestedCards`, so the two can
 * never drift into disagreeing about which cards are contested.
 */
function isContested(a: Availability): boolean {
  return a.hard > a.owned && a.claims.filter((c) => c.mature).length >= 2;
}

export async function loadContestedCards(
  oracleIds: string[],
  userId: string,
): Promise<ContestedCard[]> {
  if (oracleIds.length === 0) return [];
  const availability = await loadAvailability(userId, { oracleIds });
  const contested: ContestedCard[] = [];
  const names = new Map<string, string>();
  const ids = [...availability.keys()].filter((oracleId) => {
    const a = availability.get(oracleId);
    return a && isContested(a);
  });
  if (ids.length === 0) return [];
  for (const row of await db.select({ oracleId: cards.oracleId, name: cards.name })
    .from(cards).where(inArray(cards.oracleId, ids))) {
    names.set(row.oracleId, row.name);
  }
  for (const oracleId of ids) {
    const a = availability.get(oracleId);
    if (!a) continue;
    // `arrived` and `ownedBefore` are facts about an IMPORT, and this door has none — the row
    // draws its supply line from what is owned instead, and `keeps it` stays unavailable, which
    // is the honest reading when nothing is known to have arrived.
    contested.push(buildContestedCard(oracleId, names.get(oracleId) ?? "", a, {
      // The SUPPLY, not an arrival — and `fromImport: false` is what stops the row calling the
      // player's own copies new. `keeps it` stays unavailable here for the same reason: nothing
      // is known to have arrived, so nothing can be said to predate it.
      arrived: a.owned,
      ownedBefore: 0,
      fromImport: false,
    }));
  }
  return contested;
}

/**
 * How many of `oracleIds` are contested, read live — for `/decks/[id]/changes`'s `chipShort`
 * figure, which no longer draws a per-row chooser and so has no use for a card's name, its
 * claimants or its brew names (Copilot round 1, #1244: `loadContestedCards` still ran the
 * `cards.name` query and `allocateClaims` over every contested card, and still sent every
 * claimant's name and figures across the RSC boundary, to feed a count). Same unexcluded read
 * and the SAME `isContested` predicate `loadContestedCards` uses, so the two can never disagree
 * about which cards count — just without building a record for each.
 */
export async function countContestedCards(oracleIds: string[], userId: string): Promise<number> {
  if (oracleIds.length === 0) return 0;
  const availability = await loadAvailability(userId, { oracleIds });
  let n = 0;
  for (const a of availability.values()) if (isContested(a)) n++;
  return n;
}

/**
 * One contested card, read live. The chooser's write returns this so a row can redraw itself from
 * the state that authorized — or refused — the pick, rather than from props that just lost.
 */
export async function loadContestedCard(
  oracleId: string,
  userId: string,
): Promise<ContestedCard | null> {
  const availability = await loadAvailability(userId, { oracleIds: [oracleId] });
  const a = availability.get(oracleId);
  if (!a) return null;
  const [name] = await db.select({ name: cards.name }).from(cards)
    .where(eq(cards.oracleId, oracleId));
  // Read back after a write, with no receipt in hand: the row merges this into the frozen half
  // it already holds, so these three are placeholders it immediately replaces.
  return buildContestedCard(oracleId, name?.name ?? "", a, {
    arrived: 0, ownedBefore: 0, fromImport: false,
  });
}

/**
 * The shape both readers build, so the summary's rows and a redrawn row cannot differ.
 *
 * `arrived` and `ownedBefore` come from the FROZEN receipt when there is one — they are facts
 * about an import, not about now — and are nought for a row read outside that context.
 */
function buildContestedCard(
  oracleId: string,
  cardName: string,
  a: Availability,
  frozen: { arrived: number; ownedBefore: number; fromImport: boolean },
): ContestedCard {
  return {
    oracleId,
    cardName,
    arrived: frozen.arrived,
    ownedBefore: frozen.ownedBefore,
    fromImport: frozen.fromImport,
    owned: a.owned,
    claimants: allocateClaims(a),
    brewNames: a.claims.filter((c) => !c.mature).map((c) => c.name),
  };
}

export async function loadSummaryView(uploadId: string, userId: string): Promise<SummaryView | null> {
  // Projected, not `select()`. `preview_payload` carries every aggregated row of the import —
  // thousands of them on a real collection — and this route reads none of it. The issues line's
  // route back fetches that separately, and only when there are issues to show.
  const [upload] = await db
    .select({
      id: csvUploads.id,
      filename: csvUploads.filename,
      // The stamp says "uploaded", so it takes the time the FILE arrived. `confirmed_at` is when
      // the player pressed through the confirm, which can be a different day if they left the
      // review open overnight.
      createdAt: csvUploads.createdAt,
      confirmedAt: csvUploads.confirmedAt,
      summaryPayload: csvUploads.summaryPayload,
    })
    .from(csvUploads)
    .where(and(eq(csvUploads.id, uploadId), eq(csvUploads.userId, userId)));
  // Scoped to this reader, so another player's receipt is a not-found rather than a refusal.
  if (!upload) return null;

  const summary = (upload.summaryPayload as ArrivalsSummary | null) ?? null;
  const contestedIds = summary?.contested.map((c) => c.oracleId) ?? [];

  const availability: Awaited<ReturnType<typeof loadAvailability>> = contestedIds.length
    ? await loadAvailability(userId, { oracleIds: contestedIds })
    : new Map();

  const contested: ContestedCard[] = (summary?.contested ?? []).flatMap((row) => {
    const a = availability.get(row.oracleId);
    // A card whose contention has since resolved — a deck committed a removal, or copies
    // arrived another way — simply leaves. The payload is a record of one import, not a
    // promise about now.
    // The same two tests the payload was built with, re-asked live: the shortage may have been
    // resolved since (a deck committed a removal, or copies arrived another way), and a row that
    // has only one committed claimant left is a purchase rather than a choice.
    if (!a || a.hard <= a.owned) return [];
    // A row with one committed claimant left is a purchase rather than a choice — see the note
    // in `arrivals.ts`. Re-asked live because the payload is a record of one import: a deck may
    // have committed a removal since.
    if (a.claims.filter((c) => c.mature).length < 2) return [];
    return [buildContestedCard(row.oracleId, summary?.names.cards[row.oracleId] ?? "", a, {
      arrived: row.arrived,
      fromImport: true,
      // A receipt written before this field existed reads as nought, which makes `keeps it`
      // unavailable rather than wrong — the safe direction.
      ownedBefore: row.ownedBefore ?? 0,
    })];
  });

  return {
    uploadId: upload.id,
    filename: upload.filename,
    createdAt: upload.createdAt,
    confirmedAt: upload.confirmedAt,
    // The money sections lose whatever the chooser below is still deciding — see
    // `withoutUndecided`. Keyed on the LIVE list above, not the payload's, so a card whose
    // contention has resolved leaves the chooser and returns to the money sections together.
    summary: summary
      ? withoutUndecided(
          summary,
          // The chooser's OWN claimants per card, not just the card: a money row belonging to a
          // deck the chooser never lists is a deck whose demand nothing else would report.
          contested.map((c) => ({ oracleId: c.oracleId, deckIds: c.claimants.map((x) => x.deckId) })),
        )
      : null,
    contested,
  };
}
