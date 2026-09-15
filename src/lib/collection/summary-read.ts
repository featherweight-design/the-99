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
import { csvUploads } from "../../db/schema";
import { loadAvailability } from "../decks/availability-query";
import type { ArrivalsSummary } from "./arrivals";

/** One committed deck's place in a contested card's queue. */
export type ContestedClaimant = {
  deckId: string;
  deckName: string;
  /** This deck's whole ask, commander copies included. */
  quantity: number;
  /** How many of that ask is a commander or partner — never reservable. */
  commanderCopies: number;
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
  /** Copies the collection holds now. Live. */
  owned: number;
  claimants: ContestedClaimant[];
  /** Brews wanting the card. Named, never options — a brew cannot be given a copy. */
  brewNames: string[];
};

export type SummaryView = {
  uploadId: string;
  filename: string;
  confirmedAt: Date | null;
  /** Null when the receipt did not survive its write. Renders as nothing-to-report. */
  summary: ArrivalsSummary | null;
  contested: ContestedCard[];
};

/**
 * Allocates a card's copies across its committed claimants, in the order the model uses.
 *
 * STRICTLY IN QUEUE ORDER — `(since, deckId)` — and commander copies do NOT jump it. That is
 * the same correction the claim model itself took in PR 1: a commander claim is never
 * RESERVABLE, which is a rule about assignments, but it holds its place in the seniority queue
 * like any other claim. Taking commander copies off the top here would make the reader's view
 * disagree with the arithmetic underneath it — with one copy owned, an earlier list claimant
 * and a later commander claimant, the page would say the later deck keeps it and the deck that
 * committed first buys it, which is the opposite of what the model does and of what the section
 * note promises.
 *
 * Each claimant takes as much of its whole ask as is left when its turn comes; the commander
 * half is not special here and only matters to the chooser, which cannot offer those copies.
 */
function allocate(owned: number, claimants: Omit<ContestedClaimant, "allocated">[]): ContestedClaimant[] {
  let left = owned;
  return claimants.map((c) => {
    const allocated = Math.min(c.quantity, left);
    left -= allocated;
    return { ...c, allocated };
  });
}

export async function loadSummaryView(uploadId: string, userId: string): Promise<SummaryView | null> {
  const [upload] = await db.select().from(csvUploads)
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
    const committed = a.claims
      .filter((c) => c.mature)
      .map((c) => ({
        deckId: c.id,
        deckName: c.name,
        quantity: c.quantity,
        commanderCopies: c.commanderCopies ?? (c.commander ? 1 : 0),
        since: c.since ?? null,
        versionNumber: c.versionNumber ?? null,
      }))
      // Commit order, per card. `claims` arrives ordered by deck NAME, which is the wrong
      // order here: the queue is the explanation of the default, so it has to be the order the
      // model uses. Null `since` cannot occur on a mature claim, and sorts last if it ever does.
      .sort((x, y) => (x.since ?? Infinity) - (y.since ?? Infinity) || x.deckId.localeCompare(y.deckId));
    return [{
      oracleId: row.oracleId,
      cardName: summary?.names.cards[row.oracleId] ?? "",
      arrived: row.arrived,
      owned: a.owned,
      claimants: allocate(a.owned, committed),
      brewNames: a.claims.filter((c) => !c.mature).map((c) => c.name),
    }];
  });

  return {
    uploadId: upload.id,
    filename: upload.filename,
    confirmedAt: upload.confirmedAt,
    summary,
    contested,
  };
}
