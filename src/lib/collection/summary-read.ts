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

import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { cards, csvUploads } from "../../db/schema";
import { loadAvailability } from "../decks/availability-query";
import type { ArrivalsSummary } from "./arrivals";
import type { Availability } from "../decks/availability";

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
  /** Copies this import brought. Frozen — it is a fact about the import, not about now. */
  arrived: number;
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
 * Allocates a card's copies across its committed claimants, for display.
 *
 * RESERVATIONS COME FROM THE MODEL, never from here. `DeckClaim.granted` is what the claim query
 * granted each deck — already capped at its own list ask and at the supply left when its turn
 * came — so this function reads that figure rather than re-deriving it. An earlier version
 * recomputed the queue from `owned` alone, which made the page a second source of truth for an
 * arithmetic the query owns; the two would have disagreed the moment a reservation existed.
 *
 * What is left after the grants goes down the seniority queue in `(since, deckId)` order, which
 * is the order the model itself uses. Commander copies are NOT promoted: a commander claim is
 * never reservable, but it holds its place in the queue like any other.
 */
function allocate(owned: number, claimants: Omit<ContestedClaimant, "allocated">[]): ContestedClaimant[] {
  const grantedTotal = claimants.reduce((n, c) => n + c.granted, 0);
  let left = Math.max(owned - grantedTotal, 0);
  return claimants.map((c) => {
    // The unreserved part of this deck's ask takes what the queue has left when its turn comes.
    const unreserved = Math.max(c.quantity - c.granted, 0);
    const fromQueue = Math.min(unreserved, left);
    left -= fromQueue;
    return { ...c, allocated: c.granted + fromQueue };
  });
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
  return buildContestedCard(oracleId, name?.name ?? "", a, { arrived: 0, ownedBefore: 0 });
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
  frozen: { arrived: number; ownedBefore: number },
): ContestedCard {
  const committed = a.claims
    .filter((c) => c.mature)
    .map((c) => ({
      deckId: c.id,
      deckName: c.name,
      quantity: c.quantity,
      commanderCopies: c.commanderCopies ?? (c.commander ? 1 : 0),
      granted: c.granted ?? 0,
      since: c.since ?? null,
      versionNumber: c.versionNumber ?? null,
    }))
    // Commit order, per card. `claims` arrives ordered by deck NAME, which is the wrong order
    // here: the queue is the explanation of the default, so it has to be the order the model
    // uses. A null `since` cannot occur on a mature claim, and sorts last if it ever does.
    .sort((x, y) => (x.since ?? Infinity) - (y.since ?? Infinity) || x.deckId.localeCompare(y.deckId));
  return {
    oracleId,
    cardName,
    arrived: frozen.arrived,
    ownedBefore: frozen.ownedBefore,
    owned: a.owned,
    claimants: allocate(a.owned, committed),
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
    summary,
    contested,
  };
}
