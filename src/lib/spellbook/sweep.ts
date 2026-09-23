/**
 * The card-level half of the Spellbook ingest: a batched sweep of `POST /estimate-bracket`,
 * harvesting `massLandDenial` and `extraTurn` per card.
 *
 * WHY A SWEEP AND NOT THE BULK. `/templates/` returns `scryfallQuery: null` for
 * `Mass Land Denial` (id 89), so template membership is not downloadable, and inferring
 * card-level flags from variant membership is fragile. The endpoint returns the server-side
 * classification directly and it batches, so 54 requests of 600 cards cover the catalog in
 * about a minute — inside the documented 80 req/min, and only if the requests are SEQUENTIAL.
 * A `Promise.all` over 54 would not be.
 *
 * VERIFIED LIVE 2026-09-20, and one finding changed the design:
 *
 *   **The response carries `cards[].card.oracleId`, and it is Scryfall's oracle id.** Checked
 *   against this catalog for Armageddon, Lightning Bolt, Rhystic Study and Time Warp — all
 *   four matched exactly. The plan (R5) specified keying responses back through
 *   `buildNameIndex`, the way the EDHREC ingest must, because EDHREC answers in names. This
 *   upstream answers in ids, so that whole step is unnecessary — and removing it removes the
 *   failure class it existed to manage: front-face spellings, `Front // Back`, and the
 *   ambiguity when one name resolves to two cards. Ids are matched against the catalog and
 *   an unknown one is dropped and counted, which is the same coverage discipline by a
 *   shorter route.
 *
 *   **A card upstream does not index is simply ABSENT from the response.** Asking for five
 *   cards returned four: `Back to Basics` was not among them. That is the coverage
 *   figure arriving as a missing entry rather than a null flag — and it is exactly the card
 *   the spec names as the one the oracle rule catches and the sweep does not. The union of
 *   the two sources is not a hedge; it is load-bearing, and this is the live proof.
 */

export type SweptFlags = { massLandDenial: boolean; extraTurn: boolean; gameChanger: boolean };

export type SweepResult = {
  /** Keyed by oracle id, for cards upstream both knew and this catalog holds. */
  flags: Map<string, SweptFlags>;
  batches: number;
  /** Entries returned whose oracle id this catalog does not hold. */
  unresolved: number;
  /** Entries returned and matched. `resolved / returned` is the share the floor guards. */
  resolved: number;
  /** Cards asked about that came back in no response at all — upstream does not index them. */
  notIndexed: number;
  /** Cards where upstream's `gameChanger` disagrees with `cards.game_changer`. Logged only. */
  gameChangerDisagreements: string[];
};

export const SWEEP_BATCH_SIZE = 600;

type Entry = {
  card?: { oracleId?: unknown; name?: unknown };
  massLandDenial?: unknown;
  extraTurn?: unknown;
  gameChanger?: unknown;
};

export type SweepFetcher = (names: string[]) => Promise<{ cards?: Entry[] }>;

export type SweepCard = { oracleId: string; name: string; gameChanger: boolean };

/**
 * Sweeps every card in `cards`, in batches, sequentially.
 *
 * A failed batch THROWS rather than returning partial flags: the publish that consumes this
 * clears the table first, and `card_bracket_flags` defaults to false, so a partial sweep
 * would silently un-flag every card the missing batches covered.
 */
export async function sweepCardFlags(
  cards: readonly SweepCard[],
  fetcher: SweepFetcher,
): Promise<SweepResult> {
  const known = new Map(cards.map((c) => [c.oracleId, c]));
  const flags = new Map<string, SweptFlags>();
  const gameChangerDisagreements: string[] = [];
  let batches = 0;
  let unresolved = 0;

  for (let i = 0; i < cards.length; i += SWEEP_BATCH_SIZE) {
    const slice = cards.slice(i, i + SWEEP_BATCH_SIZE);
    const res = await fetcher(slice.map((c) => c.name));
    batches++;

    for (const e of res.cards ?? []) {
      const oracleId = e?.card?.oracleId;
      if (typeof oracleId !== "string" || !known.has(oracleId)) {
        unresolved++;
        continue;
      }
      flags.set(oracleId, {
        massLandDenial: e.massLandDenial === true,
        extraTurn: e.extraTurn === true,
        gameChanger: e.gameChanger === true,
      });
      // Scryfall is authoritative for Game Changers (§4.1), so a disagreement is LOGGED and
      // never written. It is a free cross-check on two independent copies of one WotC list.
      if ((e.gameChanger === true) !== known.get(oracleId)!.gameChanger) {
        gameChangerDisagreements.push(known.get(oracleId)!.name);
      }
    }
  }

  return {
    flags,
    batches,
    unresolved,
    resolved: flags.size,
    notIndexed: cards.length - flags.size - unresolved,
    gameChangerDisagreements,
  };
}

export type FlagSource = "spellbook_sweep" | "oracle_rule";

export type FlagRow = {
  oracleId: string;
  massLandDenial: boolean;
  massLandDenialSources: FlagSource[];
  extraTurn: boolean;
  extraTurnSources: FlagSource[];
  /** The oracle rule is the only source: Spellbook's sweep does not classify tutors. */
  tutor: boolean;
  tutorSources: FlagSource[];
};

/**
 * Unions the sweep with the oracle rules, PER FLAG.
 *
 * A card can be mass land denial by the oracle rule and extra-turn by the sweep, so one
 * shared `source` string could not describe that row honestly — and the table's check
 * constraint refuses a flag set true with no source, so the two halves cannot drift.
 *
 * A card NEITHER source claims gets NO ROW. Absence is the honest answer: a row of all
 * falses would be indistinguishable from a card the ingest has classified and cleared,
 * where in fact the sweep may never have seen it.
 */
export function unionFlagRows(
  swept: Map<string, SweptFlags>,
  ruled: Map<string, { massLandDenial: boolean; extraTurn: boolean; tutor: boolean }>,
): FlagRow[] {
  const rows: FlagRow[] = [];
  for (const oracleId of new Set([...swept.keys(), ...ruled.keys()])) {
    const s = swept.get(oracleId);
    const r = ruled.get(oracleId);
    const mldSources: FlagSource[] = [];
    if (s?.massLandDenial) mldSources.push("spellbook_sweep");
    if (r?.massLandDenial) mldSources.push("oracle_rule");
    const etSources: FlagSource[] = [];
    if (s?.extraTurn) etSources.push("spellbook_sweep");
    if (r?.extraTurn) etSources.push("oracle_rule");
    const tutorSources: FlagSource[] = r?.tutor ? ["oracle_rule"] : [];
    if (mldSources.length === 0 && etSources.length === 0 && tutorSources.length === 0) continue;
    rows.push({
      oracleId,
      massLandDenial: mldSources.length > 0,
      massLandDenialSources: mldSources,
      extraTurn: etSources.length > 0,
      extraTurnSources: etSources,
      tutor: tutorSources.length > 0,
      tutorSources,
    });
  }
  return rows;
}
