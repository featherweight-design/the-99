/**
 * The fill planner behind every create, fill, retry and trial. SERVER-ONLY, and deliberately NOT a
 * `"use server"` module: an export there is a Server Action any client can call with arguments it
 * chooses, and this one takes a reader id. Its callers are actions that authenticated the reader first
 * and pass the session's own id.
 */
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { normalizeSetCodes } from "../sets/printed-in";
import { isBasicLand } from "./grouping";
import { loadCatalogBasics } from "./catalog-basics";
import { getEdhrecData } from "../edhrec/client";
import { loadAvailability } from "./availability-query";
import { ownedColorLegalPool, unownedTopCards } from "./suggestions-read";
import { deckBodySize } from "./deck-size";
import type { ProfileSkeleton } from "../profile/types";
import { readSynergyCards } from "../../app/commanders/[slug]/synergy-read";
import { loadSkeletonForCommanders } from "../profile/load";
import { labelRoleCountsEnabled } from "./label-counts-flag";
import { readLabelRoleSets } from "../labels/read";
import { dedupeSelectionFromPool, reachCandidates, planFill, type FillCandidate, type FillPlan, type HeldCard, type PlanFillArgs } from "./fill";
import { gatherFillStaples } from "../staples/fill-staples";
import { loadBracketGateFacts, loadBudgetLeftCents, loadFillGate, type DeckAnswers } from "../intake/fill-facts";
import { permitsOf } from "../intake/fill-gate";
import { bracketReach, bringsForbidden, reachOverRows, type BracketReach, type ReachFacts } from "../intake/bracket-reach";
import type { Bracket } from "../intake/rank";
import { buysCopy } from "../intake/buys-card";
import { helpMeChooseEnabled } from "../intake/flag";
import { loadPrices } from "../discovery/price";

/**
 * Which of these cards have a printing in one of these sets ("printed in", the Sets answer's own
 * rule). ONE read, `printings.set_code` being stored lower-case. Empty ids or codes read nothing.
 */
export async function oracleIdsPrintedIn(oracleIds: readonly string[], setCodes: readonly string[]): Promise<Set<string>> {
  const codes = normalizeSetCodes(setCodes);
  if (oracleIds.length === 0 || codes.length === 0) return new Set();
  const res = await db.execute(sql`
    select distinct p.oracle_id from printings p
    where p.oracle_id = any(${sql.param([...oracleIds])}::uuid[])
      and p.set_code = any(${sql.param(codes)}::text[])
  `);
  return new Set((res.rows as { oracle_id: string }[]).map((r) => r.oracle_id));
}

/** Thrown to step over a read this mode cannot use, so the skip and a real failure do not
 *  share a log line. Never escapes `buildFillPlan`. */
class SkipRead extends Error {}

/** Gathers the pool (quantities included), the unowned EDHREC top cards and the deck's
    `format_staples` staples (H25), then
    plans the fill. The EDHREC call is not the failure to guard: `getEdhrecData`
    degrades an unreachable upstream to `{ data: null }` and the fill goes ahead
    on the collection alone. The database reads are what can throw, so callers
    still guard this. */
export async function buildFillPlan(
  userId: string,
  // Every commander, primary first: the pool and the top cards are both drawn
  // against the union identity, and a pair's body is 98 rather than 99. Passing
  // the list rather than a `hasPartner` flag is what keeps those three answers
  // from drifting apart. EDHREC is still asked about the primary — it indexes
  // one commander per page.
  // `manaCost` is REQUIRED rather than optional, and that is the whole point: it feeds the pip
  // census, and as an optional field `createDeck` omitted it in silence — so the census fix was
  // inert on the very path the reported bug came from. A required field makes a caller that
  // forgets a compile error, which is the rule `layout` on `HeldCard` already documents.
  commanders: { oracleId: string; name: string; colorIdentity: string[]; manaCost: string | null }[],
  // The cards a selection has already placed. Defaults to empty, so `fillDeck`
  // and the no-selection `createDeck` are unchanged.
  excludeOracleIds: Set<string> = new Set(),
  /** Passed straight to `planFill`. The bulk control names a slot count and a sleeveable-only
   *  pool; every other caller fills from everything, to the whole body less any cards it places
   *  beside the plan (`selected`). */
  options: Pick<PlanFillArgs, "slots" | "pool" | "held"> & {
    /** The deck being filled, so its OWN claims are not counted against it when
     *  `pool: "sleeveable"` narrows to cards with a free copy. */
    excludeDeckId?: string;
    /** What Help me choose was asked (F1): the budget and bracket become a gate on the fill.
     *  Absent on every other path, which then fills exactly as before. */
    answers?: DeckAnswers;
    /** Only cards I own (three answers §3): the sleeveable pool is the PROMISE, so a failed claim
     *  read throws rather than widening the pool to copies another deck may hold. The create reads
     *  that throw as a failed fill and leaves its retry. Every other sleeveable caller degrades. */
    failClosed?: boolean;
    /** The cards the CALLER will put in the deck itself, beside the plan.
     *
     * `createDeck` inserts its selection beside the plan's rows, and every selected card is in
     * `excludeOracleIds`, so it is stripped from the candidate pool and appears in no row. The
     * plan has to count it anyway: it is in the finished deck. They reach `planFill` as `held`
     * cards, so each one is credited to its roles, its type, its land drop and its pips.
     *
     * They used to arrive as their COSTS alone, for the pip census (H26). A selected land or
     * land-backed spell was then a land drop the plan could not see, so it built the whole land
     * count beside it: Thorin's v1 shipped 41 lands against 37, four of them picks.
     *
     * REQUIRED: as an optional field `fillDeck`'s retry and `trialFill` both excluded a
     * build-around card without it, so a retried create split the basics differently from the
     * create. A caller whose excluded cards arrive another way (`planFromPool`'s held rows ride
     * `held`) passes `[]` and says why. `placedCardsOf` loads them. */
    selected: readonly HeldCard[];
    /** THE ONLY CARDS THIS FILL MAY PICK, when the caller has a list on screen.
     *
     * The top-off's plan and the list the player is ticking drew from structurally different
     * pools: the list from `listLastSlotsCandidates`, which is the commander's EDHREC support
     * list, and the plan from `ownedColorLegalPool`, which is the whole owned collection. So the
     * plan could — and did — choose a card the list does not contain, and the tick it promised
     * had nowhere to land.
     *
     * It INTERSECTS and can never widen: the filter runs after the pool is assembled and after
     * `sleeveable` has narrowed it, so a card the player does not own, or has no free copy of,
     * stays out however the list ranked it. That direction is the point — the list's own
     * membership is the lenient side, admitting a card whose availability is simply unknown.
     *
     * It binds the catalog's basics (`planFill`'s `basics`) as well as the candidates: the controls
     * answer with ids, and a basic outside the list is a tick with nowhere to land like any card.
     *
     * Absent everywhere but the two top-off controls, which fill exactly as before. */
    onlyOracleIds?: ReadonlySet<string>;
    /** The switches resolved for the reader (`requestSwitchEnv`). Required, and never an action
     *  input: this module is not `"use server"`, so only server code that resolved them can pass it. */
    env: NodeJS.ProcessEnv;
  },
): Promise<FillPlan & BracketReachOnPlan> {
  const commander = commanders[0];
  const hasPartner = commanders.length > 1;
  let pool = dedupeSelectionFromPool(
    await ownedColorLegalPool(userId, commanders),
    excludeOracleIds,
  );
  const { data } = await getEdhrecData(commander.oracleId, commander.name);
  // Sparse: EDHREC reports a figure only for the cards it knows.
  const inclusionByName: Record<string, number | undefined> = data?.inclusionByName ?? {};
  const inclusionOf = (name: string): number | null => {
    const lower = name.toLowerCase();
    const raw = inclusionByName[lower] ?? inclusionByName[lower.split(" // ")[0]];
    return raw != null && Number.isFinite(raw) ? raw : null;
  };

  // Built from the deduped pool, so a selected card the player owns is absent
  // from it and `unownedTopCards` may well offer that card back as a top card. The
  // separate dedupe below is what settles it — for that card and for a selected
  // card the player does not own, which only ever reaches the plan through the
  // top-cards list. Filtering the pool alone would let either be placed twice.
  // THE SAME SKELETON THE DECK WILL BE MEASURED AGAINST. Built from the profile loader's own
  // reads rather than a second chain written for the fill: a deck filled to one set of targets
  // and then graded against another would disagree with itself from the moment it was created.
  // DEGRADES to the asserted baseline rather than failing the create. This function already
  // promises that an unreachable upstream leaves the fill going ahead on the collection alone,
  // and the same reasoning holds here: a deck built to `ROLE_TARGETS` is the state the app
  // shipped for a year, while a create that throws leaves the player with an empty deck and no
  // way to tell why. `planFill` reports `measured: false` for it, so nothing downstream
  // presents an asserted floor as a derived one.
  const labelsOn = labelRoleCountsEnabled(options.env);
  let skeleton: ProfileSkeleton | null = null;
  try {
    ({ skeleton } = await loadSkeletonForCommanders(
      commanders[0].oracleId,
      commanders[1]?.oracleId ?? null,
      [...new Set(commanders.flatMap((c) => c.colorIdentity))],
      undefined,
      { roleBasis: labelsOn ? "labels" : "classifier" },
    ));
  } catch (err) {
    console.warn("buildFillPlan: no skeleton — filling to the asserted baseline", err);
  }

  // THE SAME RANKING THE TOP-OFF LIST USES, for the residual. Without it the residual falls to
  // the pool's own owned/inclusion order, and the create disagrees with the list the player is
  // shown a moment later about which cards this commander wants — two answers to one question,
  // from one deck, minutes apart.
  //
  // Degraded like the skeleton above rather than failing the create: the residual's ORDER is
  // worth a query and is not worth losing the deck over, and inclusion order is what it fell
  // back to for the whole life of this function.
  // NEITHER OF THE NEXT TWO READS CAN CHANGE A SLEEVEABLE ANSWER, so neither is made.
  //
  // `synergyRank` orders the RESIDUAL, and the one caller asking for a sleeveable pool drops
  // every residual row before answering. `unownedTop` is unowned by definition, and
  // `pool: "sleeveable"` filters them straight back out.
  //
  // Skipping them is not only the two queries. `unownedTopCards` is awaited without a guard of
  // its own — deliberately, because a create that cannot see the top cards has lost something
  // real — so on that path a top-cards outage turned a perfectly good owned-pool fill into the
  // generic refusal, over work whose result was going to be discarded.
  //
  // NOT ASSERTED, and for the same reason the slot clamp is not: the OUTPUT is identical
  // either way, because the top cards this skips were being filtered out by `pool: "sleeveable"`
  // and the ranking ordered rows the caller drops. What changes is the work done and the
  // failures that can reach the player. `getEdhrecData` above is deliberately NOT skipped —
  // its `inclusionByName` orders the owned pool, so that read earns its place on this path.
  const sleeveableOnly = options.pool === "sleeveable";

  // SLEEVEABLE MEANS SLEEVEABLE, and `planFill`'s own filter cannot say so: it tests
  // `FillCandidate.owned`, and every row from `ownedColorLegalPool` is owned whether or not a
  // copy is FREE. A card with every copy claimed by another deck would close a floor here, and
  // the caller's client then strips it — the tick never appears, and the free card that could
  // have closed the same floor was never considered because the slot was already spent.
  //
  // Narrowed HERE rather than at the call site, and scoped to the pool. The unscoped aggregate
  // builds the claims JSON for every non-basic card and every claim in the account, which is a
  // lot of work per click to answer a question about a few hundred candidates.
  //
  // The predicate is `canSeed`'s rather than a second one written from memory: owned, and free
  // unless nothing is known about it. Degraded rather than fatal — without the read the pool
  // is as wide as it was before — except under own-only, where it fails closed (`failClosed`).
  /** Owned cards the sleeveable narrowing dropped, every copy claimed: never this fill's to place,
   *  but a card the reach's buying half can offer, since a claimed copy is bought like any other. */
  let claimed: typeof pool = [];
  if (sleeveableOnly && pool.length > 0) {
    const read = loadAvailability(userId, {
      oracleIds: pool.map((c) => c.oracleId),
      excludeDeckId: options.excludeDeckId,
      env: options.env,
    });
    const seen = options.failClosed ? await read : await read.catch(() => null);
    if (seen) {
      const whole = pool;
      pool = pool.filter((c) => {
        const a = seen.get(c.oracleId);
        return a === undefined || a.free > 0;
      });
      claimed = whole.filter((c) => !pool.includes(c));
    }
  }

  let synergyRank: Map<string, number> | undefined;
  try {
    if (sleeveableOnly) throw new SkipRead();
    const synergy = await readSynergyCards(
      userId,
      commanders.map((c) => c.oracleId),
      [],
    );
    // THE ORDER IT RETURNED, as an index — never a scalar recomputed from its fields.
    // `orderBySynergy` puts an unscored card after every scored one; coalescing
    // `synergyPts ?? inclusionPct` lets a null-synergy card's inclusion percentage outrank a
    // scored card, and equal scores fall back to name rather than to this pool's order. Two
    // rankings built from the same data that disagree is exactly what this argument exists to
    // prevent. Descending, because `planFill` sorts the residual high-to-low.
    synergyRank = new Map(
      synergy.map((card, index) => [card.oracleId, synergy.length - index]),
    );
  } catch (err) {
    if (!(err instanceof SkipRead)) {
      console.warn("buildFillPlan: no synergy ranking — the residual keeps inclusion order", err);
    }
  }

  const ownedIds = new Set(pool.map((c) => c.oracleId));
  // Help me choose under "Any cards". Decided once here, for the buy pool below and `planFill`.
  const anyCards = Boolean(options.answers) && !sleeveableOnly;
  const unownedTop = dedupeSelectionFromPool(
    data?.topCards && !sleeveableOnly
      ? await unownedTopCards(
          commanders,
          // `topCards` is every card on the commander's EDHREC page in LIST order (new, high
          // synergy, top, then by type), and `unownedTopCards` keeps its first 100. Under "Any
          // cards" that cut decides which cards can be bought at all, and list order put the
          // instants and sorceries last: Szarel's Worldsoul's Rage (53%) and Planetary Annihilation
          // (48%) sat at 103 and 104 of 241 and were never candidates, while the deck went short on
          // removal. Ranked by inclusion, the cut keeps the best-played cards of every type. The
          // other callers keep list order.
          anyCards ? byInclusion(data.topCards, inclusionOf) : data.topCards,
          ownedIds,
          new Set(commanders.map((c) => c.oracleId)),
        )
      : [],
    excludeOracleIds,
  );
  // THE REACH'S BUYING HALF UNDER OWN-ONLY (Design R1b): *Hit bracket N* is offered there too, so the
  // reach weighs the unowned top cards the pool leaves out. They are NEVER pool candidates: only the
  // player's explicit Hit places one (`boughtRaisers`). Read only with a bracket answer and Help me
  // choose on, and degraded rather than fatal, since an own-only fill does not need them.
  const reachOn = options.answers?.bracket != null && helpMeChooseEnabled(options.env);
  const reachOnlyTop = sleeveableOnly && reachOn && data?.topCards
    ? dedupeSelectionFromPool(
        await unownedTopCards(commanders, data.topCards, ownedIds, new Set(commanders.map((c) => c.oracleId)))
          .catch((err) => { console.warn("buildFillPlan: no top cards for the reach's buying half", err); return []; }),
        excludeOracleIds,
      ).filter((c) => !onlyOracleIdsMiss(options.onlyOracleIds, c.oracleId))
    : [];

  const { answers, selected, onlyOracleIds, ...fillOptions } = options;
  // THE ASKED SETS (Help me choose's Sets answer, or a set the words named): which owned cards,
  // claimed ones included, have a printing in them. A basic land is skipped (its printings span
  // every set and say nothing about the deck). A decoration of the order, so a failed read fills
  // without it rather than failing the create.
  let inSets = new Set<string>();
  if ((answers?.sets?.length ?? 0) > 0) {
    try {
      inSets = await oracleIdsPrintedIn(
        [...pool, ...claimed].filter((c) => !isBasicLand(c.typeLine)).map((c) => c.oracleId),
        answers!.sets!,
      );
    } catch (err) {
      console.warn("buildFillPlan: no set preference — the owned cards keep their usual order", err);
    }
  }
  const ownedCandidate = (c: (typeof pool)[number]): FillCandidate => ({
    oracleId: c.oracleId, name: c.name, typeLine: c.typeLine,
    oracleText: c.oracleText, keywords: c.keywords, manaCost: c.manaCost,
    layout: c.layout, owned: true, ownedQuantity: c.ownedQuantity,
    inclusionPct: inclusionOf(c.name),
    ...(inSets.has(c.oracleId) && !isBasicLand(c.typeLine) ? { inPreferredSets: true } : {}),
  });
  const candidates: FillCandidate[] = [
    ...pool.map(ownedCandidate),
    ...unownedTop.map((c) => ({
      oracleId: c.oracleId, name: c.name, typeLine: c.typeLine,
      oracleText: c.oracleText, keywords: c.keywords, manaCost: c.manaCost,
      layout: c.layout, owned: false, ownedQuantity: 0,
      inclusionPct: inclusionOf(c.name),
    })),
  ];
  // AFTER the pool and the top cards, so it can only ever narrow. Applied before the gate, because
  // a gate built over cards this fill may not pick would answer about candidates that cannot be
  // chosen — and `loadFillGate` reads claims per candidate, which is work per card besides.
  const scoped = onlyOracleIds
    ? candidates.filter((c) => onlyOracleIds.has(c.oracleId))
    : candidates;
  // The identity the basics split needs. The union of both commanders, which is the same rule
  // `ownedColorLegalPool` filters the pool by — so the split cannot want a colour the pool
  // would never have offered.
  const identity = [...new Set(commanders.flatMap((c) => c.colorIdentity))];
  // THE DECK'S STAPLES (H25): `format_staples`, universal first, then the identity condition's,
  // under every bound the pool is under (`gatherFillStaples`). In the GATE'S candidates as well,
  // because `loadFillGate` reads prices, claims and Game Changer facts only for the ids it is
  // given, and a staple it was not told about would read as unpriced and refused under any budget.
  //
  // Degraded rather than fatal, like the skeleton and the ranking: a fill that cannot read the
  // staples is the fill this app shipped before H25.
  let staples: FillCandidate[] = [];
  try {
    staples = await gatherFillStaples({
      identity, scoped, excludeOracleIds, onlyOracleIds, sleeveableOnly, inclusionOf,
      commanderIds: new Set(commanders.map((c) => c.oracleId)),
    });
  } catch (err) {
    console.warn("buildFillPlan: no staples — the fill runs without its staples step", err);
  }
  const commanderIds = commanders.map((c) => c.oracleId);
  const gateCandidates = [...scoped, ...staples.filter((c) => !scoped.includes(c))];
  // THE BRACKET ANSWER AS A TARGET (`bracket-reach.ts`), not only a ceiling: the owned cards that
  // reach it are placed first. NEVER a card to buy (Hugh, 2026-10-20: the app does not make that
  // choice for the player). When the collection cannot reach the answer, the owned cards that reach
  // the highest bracket below it are placed instead (a bracket-4 ask over one free Game Changer lands
  // at 3), and `bracketReach` comes back `short` for the choice.
  // The facts are read once, for the reach and the gate, so the two rule over the same cards.
  let bracketFacts: Awaited<ReturnType<typeof loadBracketGateFacts>> | undefined;
  let reach: BracketReach | undefined;
  let raisers: FillCandidate[] = [];
  let reachInputs: { fixedIds: string[]; offered: string[]; facts: ReachFacts } | undefined;
  let boughtRaisers: FillCandidate[] = [];
  let budgetLeftCents: number | null = null;
  let raisedBudgetCents: number | undefined;
  if (answers?.bracket != null && reachOn) {
    const fixedIds = [...new Set([...commanderIds, ...excludeOracleIds])];
    const claimedCandidates = claimed.map(ownedCandidate).filter((c) => !onlyOracleIds || onlyOracleIds.has(c.oracleId));
    const topCandidates: FillCandidate[] = reachOnlyTop.map((c) => ({
      oracleId: c.oracleId, name: c.name, typeLine: c.typeLine,
      oracleText: c.oracleText, keywords: c.keywords, manaCost: c.manaCost,
      layout: c.layout, owned: false, ownedQuantity: 0,
      inclusionPct: inclusionOf(c.name),
    }));
    const offered = reachCandidates(dedupeById([...gateCandidates, ...claimedCandidates, ...topCandidates]));
    const [facts, left] = await Promise.all([
      loadBracketGateFacts([...new Set([...fixedIds, ...offered.map((c) => c.oracleId), ...gateCandidates.map((c) => c.oracleId)])]),
      // What the build-around card leaves of the budget (audit item 10): a set to buy is over
      // budget against that, never against the whole budget.
      loadBudgetLeftCents({
        userId, commanderIds, answers, placedIds: [...excludeOracleIds],
        excludeDeckId: fillOptions.excludeDeckId, env: fillOptions.env,
      }),
    ]);
    bracketFacts = facts;
    budgetLeftCents = left;
    // FREE, the Shopping list's rule: owned, and not every copy claimed by a committed deck. An
    // unowned top card is never free, whatever availability says of it (it has no row there). Read
    // only for the cards that could raise a bracket, which are few, and priced for the same few: the
    // buying half is the choice's to offer (plan PR 3), never this fill's to place.
    const raising = offered.filter((c) => facts.flagsOf(c.oracleId).gameChanger
      || facts.combosOf(c.oracleId).length > 0 || facts.searches(c.oracleId));
    const raisingIds = raising.map((c) => c.oracleId);
    const [availability, prices] = raising.length === 0 ? [new Map(), new Map()] : await Promise.all([
      loadAvailability(userId, { oracleIds: raisingIds, excludeDeckId: fillOptions.excludeDeckId, env: fillOptions.env }),
      loadPrices(raisingIds),
    ]);
    const free = new Set(raising.filter((c) => !buysCopy(c.owned, availability.get(c.oracleId))).map((c) => c.oracleId));
    const reachFacts: ReachFacts = { ...facts, free: (id) => free.has(id), priceOf: (id) => prices.get(id)?.liveCents ?? null };
    reachInputs = { fixedIds, offered: offered.map((c) => c.oracleId), facts: reachFacts };
    reach = bracketReach({
      target: answers.bracket, commanderIds, fixedIds, cards: offered.map((c) => c.oracleId),
      facts: reachFacts,
      budgetCents: budgetLeftCents,
      // The buying half is computed for the choice to offer (Design R1b), from the unowned top cards
      // and staples among the candidates; under own-only from the claimed copies and the top cards
      // read for it alone (`reachOnlyTop`). A bought raiser is placed only behind the player's Hit.
      ownedOnly: false,
      // The slots the plan will fill: the caller's count, or the body less what is placed beside
      // it, the same figure `slots` below is built from. A set that cannot fit is never chosen.
      capacity: fillOptions.slots
        ?? Math.max(0, deckBodySize(hasPartner) - selected.reduce((n, c) => n + (c.quantity ?? 1), 0)),
    });
    let ids = reach.kind === "collection" ? reach.raisers : reach.kind === "short" ? reach.collectionRaisers : [];
    const byId = new Map(offered.map((c) => [c.oracleId, c]));
    // *HIT BRACKET N* (bracket reach PR 3b): the player chose to buy the set that reaches the target.
    // Only when the reach is still short with a set to buy: a collection that has since reached it
    // needs nothing bought, and one with nothing buyable has nothing to place.
    if (answers.bracketBuys && reach.kind === "short" && reach.buy) {
      const buy = reach.buy;
      boughtRaisers = buy.raisers.flatMap((id) => byId.get(id) ?? []);
      // The collection's own raisers ride along only while the whole set still reaches the target
      // and brings no loop or mass land denial: the buying set is proved on its own, and an owned
      // piece beside it can complete a turn loop neither set holds (at 4 and 5 a loop still permits).
      const together = [...new Set([...buy.raisers, ...ids])];
      ids = permitsOf(commanderIds, [...fixedIds, ...together], facts).includes(reach.target)
        && !bringsForbidden({ commanderIds, fixedIds, raisers: together, facts })
        ? ids.filter((id) => !buy.raisers.includes(id))
        : [];
      // G1: the set is charged to the budget first, and when it costs more than the budget leaves,
      // the budget is raised to what the placed cards and the set cost, so the rest buys nothing.
      if (answers.budgetCents !== null && budgetLeftCents !== null && buy.buyCents > budgetLeftCents) {
        // Whole dollars, up: `decks_answer_budget_check` stores no cents, and the cap below rounds
        // the same way, so the stored budget always covers the set.
        raisedBudgetCents = raisedBudget(answers.budgetCents, buy.buyCents - budgetLeftCents);
      }
    }
    raisers = ids.flatMap((id) => byId.get(id) ?? []);
  }
  // THE BUDGET WAS RAISED FOR HIT (G1): raised by this create, or stored raised by the create a retry
  // replays (`decks.answer_budget_raised`). Recorded, never inferred from what is left: a within-budget
  // Hit leaving under a dollar keeps that remainder to spend.
  const budgetRaised = boughtRaisers.length > 0
    && (raisedBudgetCents !== undefined || answers?.budgetRaised === true);
  const gate = answers
    ? await loadFillGate({
      userId, commanderIds, answers,
      // A bought raiser the pool does not carry is priced and counted like any candidate.
      candidates: [...gateCandidates, ...boughtRaisers.filter((c) => !gateCandidates.includes(c))],
      placedIds: [...excludeOracleIds], excludeDeckId: fillOptions.excludeDeckId, env: fillOptions.env,
      bracketFacts,
      // Raised for Hit: the cap is the set alone, so the raised budget's whole-dollar remainder is
      // never spent, on the create or its retry.
      capCents: budgetRaised ? reachBuyCents(reach) : undefined,
    })
    : undefined;
  // CENSUS ONLY. The commanders are deliberately absent from `held` — role floors come from
  // support lists that never contain them — but a `{2}{R}{W}` commander is the most reliable
  // colour signal the deck has, and leaving it out of the pip census scored HD - Thorin at zero
  // red and gave a Boros deck one Mountain.
  const commanderCosts = commanders.map((c) => c.manaCost ?? null);
  // What the deck will hold besides the plan: the caller's own `held` rows (the top-off's deck)
  // and the cards it places beside the plan.
  const held = [...(fillOptions.held ?? []), ...selected];
  // THE SLOTS THAT SURVIVE. A caller that places cards beside the plan (a selection, a
  // build-around card) caps the finished deck with `capToBody`, which cuts the plan's tail — the
  // residual. Planning the whole body anyway put those cut rows in the pip census, and with a
  // large `?select=` their pips outweighed the selection's own. Planning only what will be kept
  // means every row the census counts reaches the deck. A caller naming `slots` decides for itself.
  const placedBeside = selected.reduce((n, c) => n + (c.quantity ?? 1), 0);
  const slots = fillOptions.slots
    ?? (placedBeside > 0 ? Math.max(0, deckBodySize(hasPartner) - placedBeside) : undefined);
  // THE LABELS THE PLAN COUNTS BY, behind the same switch as the strip (labels-everywhere PR 4).
  // Read for every card the plan can weigh or hold. When the read fails the plan counts by the
  // classifier, so the targets are re-read on the classifier's basis too: a plan must never count
  // by one basis and build to the other's bars.
  // Only with a skeleton: with none, the plan builds to the asserted CLASSIFIER bars, and a label count
  // against those is the mismatch this guards. No skeleton means the classifier on both sides.
  const labelRoles = labelsOn && skeleton
    // A bought raiser may be in no pool (an unowned top card under own-only): its label is read too.
    ? await readLabelRoleSets([...scoped, ...staples, ...held, ...boughtRaisers].flatMap((c) => (c.oracleId ? [c.oracleId] : [])))
        .catch((err) => { console.warn("buildFillPlan: no labels — filling by the classifier", err); return undefined; })
    : undefined;
  if (labelsOn && !labelRoles && skeleton) {
    try {
      ({ skeleton } = await loadSkeletonForCommanders(
        commanders[0].oracleId, commanders[1]?.oracleId ?? null,
        [...new Set(commanders.flatMap((c) => c.colorIdentity))],
      ));
    } catch (err) {
      console.warn("buildFillPlan: no skeleton — filling to the asserted baseline", err);
      skeleton = null;
    }
  }
  const plan = planFill(scoped, {
    hasPartner, skeleton, synergyRank, ...fillOptions, held, slots, gate, identity, commanderCosts,
    staples, labelRoles, raisers, boughtRaisers,
    // Help me choose under "Any cards": ownership alone no longer wins a role slot.
    ...(anyCards ? { anyCards: true } : {}),
    // Every identity colour gets a basic even with no collection row behind it (`planFill`'s
    // `basics`). Loaded here, beside the pool, so no other pass sees them.
    //
    // UNDER THE SAME EXCLUSION AS THE POOL. A basic the caller places itself (a `?select=` pick)
    // or the deck already holds (the top-off's held rows) is in `excludeOracleIds`, and a planned
    // row for the same card would collide with it: `deck_cards` is keyed on the card, the insert
    // does nothing on conflict, and the planned stack would be dropped whole, leaving the deck
    // dozens short.
    //
    // AND UNDER THE ALLOW-LIST, when there is one. The bulk controls answer with ids, and a single
    // basic taken at quantity 1 (a deck one land short) is an id like any other: offered past the
    // allow-list, it is a tick the list on screen has no row for.
    basics: (await loadCatalogBasics()).filter((b) =>
      !excludeOracleIds.has(b.oracleId) && (!onlyOracleIds || onlyOracleIds.has(b.oracleId))),
  });
  // The reach rides the plan, so the choice (plan PR 3) can read the gap a short collection left.
  if (!reach || !reachInputs) return plan;
  // What the finished deck lands in, and what is left to buy over it (`reachOverRows`): the reach
  // above ran before the fill, which can buy part of its set, a cheaper route, or a tutor.
  const after = reachOverRows({ target: reach.target, commanderIds, rowIds: [...reachInputs.fixedIds, ...plan.rows.map((r) => r.oracleId)],
    cards: reachInputs.offered, facts: reachInputs.facts });
  return {
    ...plan, bracketReach: reach, bracketAfter: after, budgetLeftCents,
    ...(raisedBudgetCents !== undefined ? { raisedBudgetCents } : {}),
    ...(boughtRaisers.length > 0 ? { bracketBought: true } : {}),
    ...(budgetRaised ? { budgetRaised: true } : {}),
  };
}

/** What `buildFillPlan` adds to a plan when a bracket reach ran. */
export type BracketReachOnPlan = {
  bracketReach?: BracketReach;
  /** The bracket the finished rows permit, and the cheapest buy over them that reaches the target
   *  (null when they reach it, or nothing buyable does). Set whenever `bracketReach` is. */
  bracketAfter?: { permits: Bracket[]; buyCents: number | null };
  /** The budget left once the placed cards are charged; null with no budget. */
  budgetLeftCents?: number | null;
  /** Set when *Hit bracket N* cost more than the budget left: the budget the deck now stores (G1). */
  raisedBudgetCents?: number;
  /** True when the plan placed the reach's buying set (the player's *Hit*, honored). */
  bracketBought?: boolean;
  /** True when that set took the whole budget, raised for it (`decks.answer_budget_raised`). */
  budgetRaised?: boolean;
};

/** The budget raised by `overCents`, in whole dollars rounded up (`decks_answer_budget_check`). */
export function raisedBudget(budgetCents: number, overCents: number): number {
  return Math.ceil((budgetCents + overCents) / 100) * 100;
}

function reachBuyCents(reach: BracketReach | undefined): number | undefined {
  return reach?.kind === "short" && reach.buy ? reach.buy.buyCents : undefined;
}

/** Whether an allow-list leaves this card out. */
function onlyOracleIdsMiss(only: ReadonlySet<string> | undefined, id: string): boolean {
  return only !== undefined && !only.has(id);
}

/** One candidate per id, the first kept. */
function dedupeById(list: readonly FillCandidate[]): FillCandidate[] {
  const seen = new Set<string>();
  return list.filter((c) => !seen.has(c.oracleId) && (seen.add(c.oracleId), true));
}

/** EDHREC's card names ranked by inclusion, highest first; an unlisted figure last, list order kept on a tie. */
export function byInclusion(names: readonly string[], inclusionOf: (name: string) => number | null): string[] {
  return names
    .map((name, index) => ({ name, index, pct: inclusionOf(name) ?? -1 }))
    .sort((a, b) => b.pct - a.pct || a.index - b.index)
    .map((r) => r.name);
}
