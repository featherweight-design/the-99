import { sql } from "drizzle-orm";

import { db } from "../../db";
import { chainArt } from "../cards/chain-art";
import { loadOpeningArt } from "../cards/opening-printing";
import { resolveOwnedPrintings } from "../collection/owned-printings";
import { hardDecks } from "../decks/availability";
import { loadAvailability } from "../decks/availability-query";
import { loadPrices, slotFor } from "../discovery/price";
import { loadCommanderPrintings } from "../sets/printed-in-read";
import type { Answers, CardFacts, Ranked, SearchResult } from "./rank";
import { loadCardRow, searchCommanders } from "./search";
import { reorder, type ReadPicks, type ReasonPart } from "./the-read";

/**
 * The results as the screen draws them (plan, PR 5a). SERVER-ONLY.
 *
 * The search returns every passing commander (about 3,300 on a blank submit), which no page should
 * ship. So the page gets a SLICE, `RESULT_PAGE` rows at a time, and only the rows in it are
 * decorated: the art the player's own printing carries (resolve at the draw, never in the search),
 * the commander's own mark, and its price state. *Show 12 more* asks for the next slice.
 *
 * The search runs again for each slice. It is deterministic over the same answers, and a player who
 * presses *Show 12 more* after a deck commit elsewhere sees the list as it now stands, which is
 * the list's contract anyway.
 */
export const RESULT_PAGE = 12;

export type CommanderMark =
  /** Owned, with a copy free to lead a new deck. */
  | { kind: "free" }
  /** Owned, every copy held by a committed deck; `deck` names the first holder. */
  | { kind: "held"; deck: string | null }
  /** Not owned: the price state the buy tag draws. */
  | { kind: "buy"; price: ReturnType<typeof slotFor> };

export type ResultRow = {
  oracleId: string;
  name: string;
  colorIdentity: string[];
  imageUri: string | null;
  artCropUri: string | null;
  mark: CommanderMark;
  themeFits: Ranked["themeFits"];
  cardFit: number | null;
  ownedSupport: number;
  supportTotal: number;
  /**
   * With sets asked, the first of them this commander was printed in, for the row's code tag
   * (addendum §2), from the lanes' `Printed in` index. Absent or null with none asked.
   */
  set?: { code: string; name: string } | null;
  /** The read's line for this commander, on its picks alone (rework plan PR 4). */
  reason?: ReasonPart[];
};

export type ResultsPage = Pick<SearchResult, "order" | "tooNarrow"> & {
  card: CardFacts | null;
  rows: ResultRow[];
  /** More rows past this slice: *Show 12 more* is drawn only then. */
  hasMore: boolean;
  /**
   * How many commanders the answers allow: the read's pool, which its panel names while it reads
   * (`read.stepScan`). Never printed as a count of results (F6).
   */
  total: number;
};

/**
 * `picks`: a settled read's (rework plan PR 4). Its commanders come first, in the read's order and
 * each with its line, then every other row in the free order: the same list, re-ordered, so a slice
 * past the first page never repeats a pick. A pick the current answers no longer list is skipped.
 */
export async function loadResultsPage(
  userId: string,
  answers: Answers,
  offset = 0,
  picks: ReadPicks | null = null,
  /** The reader's resolved switches (`requestSwitchEnv`), for every claim read below; the environment
   *  alone when omitted (admin PR 7 makes it required). */
  env: NodeJS.ProcessEnv = process.env,
): Promise<ResultsPage> {
  const outcome = await searchCommanders(userId, answers, env);
  const ordered = picks ? reorder(outcome.rows, (r) => r.candidate.oracleId, picks) : outcome.rows;
  const slice = ordered.slice(offset, offset + RESULT_PAGE);
  const reasons = new Map((picks?.picks ?? []).map((p) => [p.oracleId, p.reason]));
  const rows = await decorate(userId, slice, answers.sets ?? [], env);
  return {
    order: outcome.order,
    tooNarrow: outcome.tooNarrow,
    card: outcome.card,
    rows: rows.map((r) => (reasons.has(r.oracleId) ? { ...r, reason: reasons.get(r.oracleId) } : r)),
    hasMore: ordered.length > offset + RESULT_PAGE,
    total: ordered.length,
  };
}

async function decorate(userId: string, slice: readonly Ranked[], sets: readonly string[], env: NodeJS.ProcessEnv): Promise<ResultRow[]> {
  if (slice.length === 0) return [];
  // A decoration: a failed read draws rows with no tag rather than no rows.
  const index = sets.length === 0 ? null : await loadCommanderPrintings().catch(() => null);
  const setOf = (id: string) => {
    if (!index) return null;
    const mine = new Set((index.byOracle[id] ?? []).map((i) => index.sets[i].code));
    const code = sets.find((s) => mine.has(s));
    return code ? { code, name: index.sets.find((s) => s.code === code)?.name ?? code.toUpperCase() } : null;
  };
  const ids = slice.map((r) => r.candidate.oracleId);
  const owned = slice.filter((r) => r.candidate.owned).map((r) => r.candidate.oracleId);
  const unowned = ids.filter((id) => !owned.includes(id));
  const [art, printings, availability, prices, opening] = await Promise.all([
    db.execute(sql`select c.oracle_id, c.image_uri, c.art_crop_uri from cards c where c.oracle_id = any(${sql.param(ids)}::uuid[])`)
      .then((r) => new Map((r.rows as { oracle_id: string; image_uri: string | null; art_crop_uri: string | null }[]).map((x) => [x.oracle_id, x]))),
    owned.length === 0 ? Promise.resolve(new Map()) : resolveOwnedPrintings(userId, owned),
    owned.length === 0 ? Promise.resolve(new Map()) : loadAvailability(userId, { oracleIds: owned, env }),
    loadPrices(ids),
    // A commander the reader does not own previews the printing card details open it on, not the catalog's arbitrary one.
    loadOpeningArt(unowned),
  ]);
  return slice.map(({ candidate: c, themeFits, cardFit }) => {
    const mine = printings.get(c.oracleId);
    const a = availability.get(c.oracleId);
    const mark: CommanderMark = !c.owned
      ? { kind: "buy", price: slotFor(prices.get(c.oracleId)) }
      // No availability row means nothing claims it: a copy is free.
      : a !== undefined && a.free <= 0
        ? { kind: "held", deck: hardDecks(a)[0]?.name ?? null }
        : { kind: "free" };
    return {
      oracleId: c.oracleId,
      name: c.name,
      colorIdentity: c.colorIdentity,
      // The owned printing's art where the player owns one; the card's own otherwise.
      imageUri: mine?.imageUri ?? opening.get(c.oracleId) ?? art.get(c.oracleId)?.image_uri ?? null,
      artCropUri: mine?.artCropUri ?? art.get(c.oracleId)?.art_crop_uri ?? null,
      mark,
      themeFits,
      cardFit,
      ownedSupport: c.ownedSupport,
      supportTotal: c.supportTotal,
      set: setOf(c.oracleId),
    };
  });
}

/** The *We read this as* bar's card chip: its name, whether the player owns it, and its price. */
export type CardChip = {
  oracleId: string;
  name: string;
  /** The printing the player owns when they own the card (the one card details open), else the catalog's art. */
  imageUri: string | null;
  owned: boolean;
  /** Owned, every copy held by a committed deck: drawn and charged as a buy (see `buysCard`). */
  held: { deck: string | null } | null;
  price: ReturnType<typeof slotFor>;
};

/**
 * Read apart from the search, because the bar is drawn before the search finishes: the results
 * stream in under it. Null for an id the catalog does not hold, which drops the chip.
 */
export async function loadCardChip(
  userId: string,
  oracleId: string,
  /** The reader's resolved switches (`requestSwitchEnv`), for the card's claim read and its printing
   *  picks (`chainArt`); the environment alone when omitted (admin PR 7 makes it required). */
  env: NodeJS.ProcessEnv = process.env,
): Promise<CardChip | null> {
  // The search's own card read, so the chip names exactly the card the search applied: a card it
  // drops (a basic, one not commander-legal, one that no longer exists) draws no chip either.
  const [row, prices, art] = await Promise.all([loadCardRow(userId, oracleId, env), loadPrices([oracleId]), chainArt(userId, null, [oracleId], env)]);
  if (!row) return null;
  return { oracleId, name: row.name, imageUri: art.get(oracleId) ?? row.imageUri, owned: row.owned, held: row.held, price: slotFor(prices.get(oracleId)) };
}
