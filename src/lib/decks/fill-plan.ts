/**
 * The fill planner behind every create, fill, retry and trial. SERVER-ONLY, and deliberately NOT a
 * `"use server"` module: an export there is a Server Action any client can call with arguments it
 * chooses, and this one takes a reader id. Its callers are actions that authenticated the reader first
 * and pass the session's own id.
 */
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
import { dedupeSelectionFromPool, planFill, type FillCandidate, type FillPlan, type HeldCard, type PlanFillArgs } from "./fill";
import { gatherFillStaples } from "../staples/fill-staples";
import { loadFillGate, type DeckAnswers } from "../intake/fill-facts";

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
): Promise<FillPlan> {
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
  if (sleeveableOnly && pool.length > 0) {
    const read = loadAvailability(userId, {
      oracleIds: pool.map((c) => c.oracleId),
      excludeDeckId: options.excludeDeckId,
    });
    const seen = options.failClosed ? await read : await read.catch(() => null);
    if (seen) {
      pool = pool.filter((c) => {
        const a = seen.get(c.oracleId);
        return a === undefined || a.free > 0;
      });
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
  const unownedTop = dedupeSelectionFromPool(
    data?.topCards && !sleeveableOnly
      ? await unownedTopCards(
          commanders,
          data.topCards,
          ownedIds,
          new Set(commanders.map((c) => c.oracleId)),
        )
      : [],
    excludeOracleIds,
  );

  const { answers, selected, onlyOracleIds, ...fillOptions } = options;
  const candidates: FillCandidate[] = [
    ...pool.map((c) => ({
      oracleId: c.oracleId, name: c.name, typeLine: c.typeLine,
      oracleText: c.oracleText, keywords: c.keywords, manaCost: c.manaCost,
      layout: c.layout, owned: true, ownedQuantity: c.ownedQuantity,
      inclusionPct: inclusionOf(c.name),
    })),
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
  const gate = answers
    ? await loadFillGate({
      userId, commanderIds: commanders.map((c) => c.oracleId), answers,
      candidates: [...scoped, ...staples.filter((c) => !scoped.includes(c))],
      placedIds: [...excludeOracleIds], excludeDeckId: fillOptions.excludeDeckId,
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
    ? await readLabelRoleSets([...scoped, ...staples, ...held].flatMap((c) => (c.oracleId ? [c.oracleId] : [])))
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
  return planFill(scoped, {
    hasPartner, skeleton, synergyRank, ...fillOptions, held, slots, gate, identity, commanderCosts,
    staples, labelRoles,
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
}
