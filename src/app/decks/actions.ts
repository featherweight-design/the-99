"use server";

import { and, desc, eq, gt, inArray, lt, lte, sql } from "drizzle-orm";
import { bracketOf } from "../../lib/bracket/rules";
import { slotDeck } from "../../lib/bracket/slot";
import { cachedDeckProfile } from "../../lib/profile/load";
import { listFingerprint } from "../../lib/profile/fingerprint";
import { pinAnalysisToVersion, type CommitPin } from "../../lib/profile/stored";
import { pinSynopsisToVersion } from "../../lib/synopsis/pin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { db } from "../../db";
import {
  cards, collectionItems, deckCards, deckGameAxes, deckGames, decks,
  deckUnresolvedRows, deckVersions, fillPassCards, fillPasses,
} from "../../db/schema";
import { requireUserId } from "../../lib/auth";
import { placedCardsOf } from "../../lib/decks/costs-of";
import { loadCatalogBasics } from "../../lib/decks/catalog-basics";
import { isUuid } from "../../lib/uuid";
import { getEdhrecData } from "../../lib/edhrec/client";
import { loadAvailability } from "../../lib/decks/availability-query";
import { hardDecks, pullSources } from "../../lib/decks/availability";
import {
  type CommitSnapshot, commitVersion, loadVersionDiff, newestVersion, restoreDraftFromVersion, versionCards,
  versionLiveAt, type VersionDiffPayload,
} from "../../lib/decks/versions";
import {
  bucketAdds, draftDiff, type BucketedAdd, type DraftChange,
} from "../../lib/decks/draft-diff";
import { loadDraftState } from "../../lib/decks/draft-state";
import { deckSurfaces } from "../../lib/decks/revalidate";
import { revalidateClaims } from "../../lib/decks/revalidate-claims";
import { ownedColorLegalPool, unownedTopCards } from "../../lib/decks/suggestions-read";
import { requireDeck } from "../../lib/decks/read";
import { isBasicLand } from "../../lib/decks/grouping";
import { validateDeckName } from "../../lib/decks/deck-name";
import { deckBodySize } from "../../lib/decks/deck-size";
import { touchDeck } from "../../lib/decks/touch";
import { isCommanderCandidate } from "../../lib/recs/score";
import { canPair, partnerAbility } from "../../lib/decks/partner";
import {
  validateCardForDeck,
} from "../../lib/decks/add-validation";
import { type DeckMutationResult } from "../../lib/decks/mutation-result";
import type { ProfileSkeleton } from "../../lib/profile/types";
import { readSynergyCards } from "../commanders/[slug]/synergy-read";
import { listLastSlotsCandidates } from "../../lib/decks/last-slots";
import { readDeckSynergy } from "../../lib/decks/deck-synergy";
import { loadSkeletonForCommanders } from "../../lib/profile/load";
import { labelRoleCountsEnabled } from "../../lib/decks/label-counts-flag";
import { readLabelRoleSets } from "../../lib/labels/read";
import {
  capToBody, dedupeSelectionFromPool, isResidual, planFill,
  type FillCandidate, type FillPlan, type FillRow, type FillShortfall, type HeldCard, type PlanFillArgs,
} from "../../lib/decks/fill";
import { gatherFillStaples } from "../../lib/staples/fill-staples";
import { loadFillGate, type DeckAnswers } from "../../lib/intake/fill-facts";
import { answerColumnsFor, validateCreateAnswers, type AnswerColumns, type CreateAnswers } from "../../lib/intake/answers";
import { sanitizeSelection } from "../../lib/decks/selection-param";
import { recordFillPass, summariseFillPasses, type FillPassKind } from "../../lib/decks/fill-passes";
import { synergyCopy } from "../../lib/copy/synergy-discovery";
import { GAME_AXIS_KEYS, isGameAxisKey, type GameAxisKey } from "../../lib/decks/game-axes";
import { gameLogCopy } from "../../lib/copy/game-log";
import { countCharacters, deckTuningCopy } from "../../lib/copy/deck-tuning";
import { pruneOrphanProxies } from "../../lib/decks/prune-proxies";
import { writePullRelease } from "../../lib/decks/pull-release";
import { PULL_REFUSED_LOCKED, isLiveLocked, notLiveLocked, pruneOrphanLocks } from "../../lib/decks/locks";
import { pruneOrphanAssignments } from "../../lib/decks/prune-assignments";
import {
  PROXY_READ_FAILED, PULL_REFUSED_PROXIED, proxiedMembership, proxiedOracleIds,
} from "../../lib/decks/proxies";
import { proxyCopy } from "../../lib/copy/proxies";
import { lockedCardsCopy } from "../../lib/copy/locked-cards";
import { neverCutEnabled } from "../../lib/decks/never-cut-flag";
import { addCardToDeckFor, deckValidationContext, revalidateAdd } from "../../lib/decks/add-card";

export type TopOffResult =
  | { ok: true; passId: string | null; added: number; total: number; boughtDelta: number }
  | { ok: false; message: string };


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
  const labelsOn = labelRoleCountsEnabled();
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

/** `selectedOracleIds` are the synergy picks the player carried across the
    navigation in `?select=`. They are untrusted twice over — a server action
    answers any crafted request, and the ids rode in on a URL — so each is
    re-checked here against the same legality pass `addCardToDeck` runs.

    Unlike `restoreAutoCards`, an id that fails is **skipped, not thrown**: that
    action's input is a receipt the server itself just issued, whereas this one
    is a URL, and refusing the whole create would cost the player the commander
    choice as well as the picks. */
export async function createDeck(
  commanderOracleId: string,
  name: string,
  selectedOracleIds: string[] = [],
  partnerOracleId: string | null = null,
  /** What Help me choose was asked (F1), when the deck is started from it. */
  answers: CreateAnswers | null = null,
): Promise<void> {
  const userId = await requireUserId();
  const asked = answers === null ? null : validateCreateAnswers(answers);
  // Shape first: a crafted request can put any string here, and a malformed uuid
  // reaching `inArray` is rejected by Postgres rather than by this action — the
  // player would see a 500 where the refusal below reads as one.
  if (!isUuid(commanderOracleId)) throw new Error("commander not found");
  if (partnerOracleId !== null && !isUuid(partnerOracleId)) {
    throw new Error("partner not found");
  }
  // A deck's two commanders are two different cards — the schema says so with a
  // check constraint, and reaching it would surface as an opaque write failure.
  if (partnerOracleId === commanderOracleId) {
    throw new Error("a deck's two commanders must be different cards");
  }
  // One query over both ids: reading the partner separately would say nothing
  // this does not.
  const commanderIds =
    partnerOracleId !== null ? [commanderOracleId, partnerOracleId] : [commanderOracleId];
  const commanderRows = await db.select().from(cards).where(inArray(cards.oracleId, commanderIds));
  const commander = commanderRows.find((c) => c.oracleId === commanderOracleId);
  if (!commander) throw new Error("commander not found");
  // Server actions are reachable via crafted requests — re-validate that the
  // card can actually lead a deck, not just that it exists.
  if (!commander.commanderLegal || !isCommanderCandidate(commander)) {
    throw new Error("card is not a legal commander");
  }

  // Presence, not truthiness: this is a server action, so an empty string is a
  // partner id the request supplied and has to be validated rather than skipped.
  const partner =
    partnerOracleId !== null
      ? commanderRows.find((c) => c.oracleId === partnerOracleId)
      : undefined;
  if (partnerOracleId !== null) {
    // Named for the partner rather than reusing the primary's wording: the two
    // ids fail for different reasons and a shared message hides which one did.
    if (!partner) throw new Error("partner not found");
    if (!partner.commanderLegal || !isCommanderCandidate(partner)) {
      throw new Error("partner is not a legal commander");
    }
    // Always a pair the player picked, and the picker only ever offered a legal
    // one — so a mismatch here is a crafted request and is refused outright.
    if (
      !canPair(
        { name: commander.name, ability: partnerAbility(commander.oracleText, commander.typeLine) },
        { name: partner.name, ability: partnerAbility(partner.oracleText, partner.typeLine) },
      )
    ) {
      throw new Error("commanders cannot be paired");
    }
  }

  const deckName = validateDeckName(name);
  let deckId: string;
  // Filled in once the build-around card is resolved; the empty-deck fallback writes them too.
  let answerColumns: AnswerColumns = asked === null ? {} : answerColumnsFor(asked, null);
  try {
    // A malformed id would otherwise reach Postgres as a failed uuid cast, and
    // the whole create would fall back to an empty deck. Sanitizing here rather
    // than trusting the URL layer: this action is directly callable, so the
    // shape filter, the dedupe, and the 99 bound all have to hold on its own
    // argument. Dedupe also keeps one repeated id from conflicting with itself
    // inside the insert's own VALUES list.
    // The build-around card is always placed (§3.0), so it joins the selection and passes the
    // same legality check as any other pick.
    const requested = sanitizeSelection([
      ...(asked?.cardOracleId ? [asked.cardOracleId] : []), ...selectedOracleIds,
    ]);
    const candidates = requested.length > 0
      ? await db
          .select({
            oracleId: cards.oracleId,
            name: cards.name,
            commanderLegal: cards.commanderLegal,
            colorIdentity: cards.colorIdentity,
            typeLine: cards.typeLine,
            // What the plan counts a selected card by (`selected`). A selected card is inserted
            // into the deck BESIDE the fill's rows, so its roles, its land drop and its pips are
            // the finished deck's, and this read is the only place they are available.
            manaCost: cards.manaCost,
            oracleText: cards.oracleText,
            keywords: cards.keywords,
            layout: cards.layout,
          })
          .from(cards)
          .where(inArray(cards.oracleId, requested))
          // A basic land is never a build-around card (the free match leaves basics out), and
          // `validateCardForDeck` admits one. This action is directly callable, so the rule holds
          // here too: a basic named as the answer is dropped, neither placed nor stored.
          .then((rows) => rows.filter((c) => !(c.oracleId === asked?.cardOracleId && isBasicLand(c.typeLine))))
          // Back in the order asked for, since the query keeps none: the build-around card leads
          // `requested`, so it is placed first and is never the row `capToBody` cuts.
          .then((rows) => rows.sort((a, b) => requested.indexOf(a.oracleId) - requested.indexOf(b.oracleId)))
      : [];
    // `built: 0` asks about legality alone, exactly as restoreAutoCards does —
    // the cap is enforced by the loop inside the transaction below.
    const selected = candidates
      .filter((card) => !validateCardForDeck(card, {
        commanderOracleId,
        commanderColorIdentity: commander.colorIdentity,
        partnerOracleId,
        partnerColorIdentity: partner?.colorIdentity ?? null,
        built: 0,
      }))
      .map((card) => card.oracleId);
    const selectedSet = new Set(selected);
    // A build-around card the deck cannot hold is not an answer the deck can keep.
    const card = asked?.cardOracleId && selectedSet.has(asked.cardOracleId)
      ? candidates.find((c) => c.oracleId === asked.cardOracleId)!
      : null;
    answerColumns = asked === null ? {} : answerColumnsFor(asked, card);

    const bodySize = deckBodySize(partnerOracleId !== null);
    const plan = await buildFillPlan(
      userId,
      [
        {
          oracleId: commanderOracleId, name: commander.name,
          colorIdentity: commander.colorIdentity, manaCost: commander.manaCost,
        },
        ...(partner
          ? [{
            oracleId: partner.oracleId, name: partner.name,
            colorIdentity: partner.colorIdentity, manaCost: partner.manaCost,
          }]
          : []),
      ],
      selectedSet,
      {
        // Passed on every path rather than only the asked one: the selection is inserted beside
        // the fill's rows below, so it is the finished deck's whether or not Help me choose was
        // involved. `selectedSet` rather than `candidates`: a requested card that failed
        // validation is never placed, so it is not the deck's.
        selected: candidates
          .filter((c) => selectedSet.has(c.oracleId))
          .map((c) => ({
            oracleId: c.oracleId,
            typeLine: c.typeLine, oracleText: c.oracleText, keywords: c.keywords,
            layout: c.layout, manaCost: c.manaCost,
          })),
        ...(asked === null ? {} : {
          answers: { budgetCents: answerColumns.answerBudgetCents ?? null, bracket: asked.bracket, cardOracleId: card?.oracleId ?? null },
          // Only cards I own (three answers §3): the 99 from what the collection can supply.
          // Nothing is bought for it, so the budget has only the placed card to charge.
          ...(asked.pool === "own" ? { pool: "sleeveable" as const, failClosed: true } : {}),
        }),
      },
    );
    deckId = await db.transaction(async (tx) => {
      const [deck] = await tx.insert(decks)
        .values({
          userId, name: deckName, commanderOracleId, partnerOracleId, filled: true, ...answerColumns,
        })
        .returning({ id: decks.id });
      // The selection first, then as much of the fill as fits under the body
      // size — 99, or 98 for a pair. The cap sums quantity rather than counting
      // rows, because planFill stacks basics (a single row can be thirty
      // Forests).
      const rows = [
        ...selected.map((oracleId) => ({ deckId: deck.id, oracleId, quantity: 1, auto: true })),
        ...plan.rows.map((r) => ({ deckId: deck.id, oracleId: r.oracleId, quantity: r.quantity, auto: true })),
      ];
      const capped = capToBody(rows, bodySize);
      if (capped.length > 0) {
        await tx.insert(deckCards).values(capped).onConflictDoNothing();

        // TWO PASSES, NOT ONE, now that the fill reaches the whole body.
        //
        // The seed used to be the whole of what a create wrote, because the fill stopped at
        // the floors and the mana base. Filling to 99 in one go would make that a single
        // 99-row pass with nothing to undo but all of it — collapsing a separation the app
        // already ships and already draws, and taking `Undo these 31` with it.
        //
        //   seed          the role floors and the mana base — the foundation
        //   top_off #1    the synergy residual — the suggestions
        //
        // `isResidual` (a role of `other` that is not a staple) marks the residual, so the split needs no new
        // persistence: the pass ledger already carries it. `Undo these 31` then means
        // "clear the suggestions, keep the foundation", through `provenance-line.tsx` and
        // `topOffCopy.ledger.undo(n)` exactly as they stand.
        const residualIds = new Set(
          plan.rows.filter(isResidual).map((r) => r.oracleId),
        );
        const foundation = capped.filter((r) => !residualIds.has(r.oracleId));
        const residual = capped.filter((r) => residualIds.has(r.oracleId));

        // openSlots is the whole body because the deck did not exist a statement ago.
        await recordFillPass(tx, {
          deckId: deck.id, kind: "seed", openSlots: bodySize,
          rows: foundation.map((r) => ({ oracleId: r.oracleId, quantity: r.quantity })),
        });
        // Its own openSlots: what was left once the foundation was down, which is what the
        // ledger line means by the slots this pass was offered.
        await recordFillPass(tx, {
          deckId: deck.id, kind: "top_off",
          openSlots: bodySize - foundation.reduce((n, r) => n + r.quantity, 0),
          rows: residual.map((r) => ({ oracleId: r.oracleId, quantity: r.quantity })),
        });
      }
      return deck.id;
    });
  } catch (err) {
    // State 15: the deck is here, the cards aren't. The player keeps the deck
    // and the banner offers the fill again — losing the deck too would cost
    // them the one thing they actually asked for.
    console.error("buildFillPlan failed — falling back to empty deck", err);
    // The answers ride on the empty deck too (F1), so the retry fills to them.
    const [deck] = await db.insert(decks)
      .values({ userId, name: deckName, commanderOracleId, partnerOracleId, filled: false, ...answerColumns })
      .returning({ id: decks.id });
    deckId = deck.id;
  }
  // The redirect renders the new deck's own page, but /decks and the home
  // dashboard both list decks, and a back navigation to either is served from
  // the router cache — without this the deck you just made is missing there.
  // The full claim set, not just those three: a new deck claims the cards its
  // fill pass seeded, and it is a deck the discovery lane measures distance
  // from, so both cached list payloads describe a world without it.
  revalidateClaims(deckId, userId);
  // Outside the try: redirect() signals by throwing, and a catch here would
  // read that throw as a failed fill.
  redirect(`/decks/${deckId}`);
}



export async function addCardToDeck(
  deckId: string,
  oracleId: string,
  opts: { relock?: boolean } = {},
): Promise<DeckMutationResult> {
  const userId = await requireUserId();
  // The literal `true` only: this is a public endpoint, and `{ relock: "false" }` must not revive.
  const relock = typeof opts === "object" && opts !== null && opts.relock === true && neverCutEnabled();
  const outcome = await addCardToDeckFor(userId, deckId, oracleId, { relock });
  revalidateAdd(deckId, userId, outcome);
  return outcome.result;
}


/**
 * Mark or unmark one card in one deck as printed.
 *
 * Ruling 2: this takes effect at once. No commit, no pending state, nothing on
 * `/decks/[id]/changes` — a proxy is not a change to the list, it is a statement
 * about a slot the list already has.
 *
 * THE LOCK IS LOAD-BEARING and it is the deck row, taken before the membership
 * check, in the order every other deck write here uses. The pair being
 * serialised is this write against a concurrent removal: that removal deletes
 * the card and calls `pruneOrphanProxies`, so an unlocked mark could validate
 * membership, wait, and insert after the prune had run — leaving exactly the
 * orphan the prune exists to prevent, on a card the deck no longer holds.
 *
 * MEMBERSHIP IS VALIDATED, and deck ownership alone is not enough: without it
 * any oracle id at all can be posted and a row written for a card this deck has
 * never held. Both commander columns count as membership, or a proxied commander
 * could not be marked at all.
 */
export async function setCardProxied(
  deckId: string,
  oracleId: string,
  proxied: boolean,
): Promise<DeckMutationResult> {
  const userId = await requireUserId();
  // `proxied` is wire input whatever its TypeScript type says, and it decides
  // which branch runs: the string "false" is truthy, so an unvalidated call
  // MARKS a card the reader was trying to unmark. Same reason the ids are
  // checked rather than trusted.
  if (typeof proxied !== "boolean") return { ok: false, message: proxyCopy.error.refused };
  if (!isUuid(deckId) || !isUuid(oracleId)) return { ok: false, message: proxyCopy.error.refused };
  await requireDeck(deckId, userId);

  const ok = await db.transaction(async (tx) => {
    await tx.execute(sql`select 1 from ${decks} where ${decks.id} = ${deckId} for update`);
    const { rows: [member] } = await tx.execute<{ held: boolean }>(
      sql`select ${proxiedMembership(deckId, oracleId)} as held`,
    );
    if (!member?.held) return false;

    if (proxied) {
      // Idempotent: pressing twice is one mark, and the second press of a
      // control whose state the reader can already see is not an error.
      await tx.execute(sql`
        insert into deck_proxies (deck_id, oracle_id) values (${deckId}, ${oracleId})
        on conflict (deck_id, oracle_id) do nothing
      `);
    } else {
      await tx.execute(sql`
        delete from deck_proxies where deck_id = ${deckId} and oracle_id = ${oracleId}
      `);
    }
    // A PROXY ENDS A CLAIM, so it ends any reservation made about that claim. The claim model
    // anti-joins `deck_proxies`, so a proxied card is not claimed at all — and a reservation left
    // behind would match again the moment the card is unproxied, arriving silently already
    // holding somebody's contested copy. Same reconcile the commit runs, under this deck's row
    // lock, taken above.
    await pruneOrphanAssignments(tx, deckId);
    // NO `touchDeck`. The stamp means "this deck's list was edited", and a proxy
    // edits no list — Home's resume order would otherwise move a deck for a
    // decision that changed nothing about what is in it.
    return true;
  });

  if (!ok) return { ok: false, message: proxyCopy.error.notInDeck };
  // A proxy toggle moves figures on OTHER decks' pages — the copy it releases or
  // reclaims is theirs — and changes the proxy list, so both are revalidated
  // alongside this deck's own surfaces.
  revalidateClaims(deckId, userId);
  return { ok: true };
}

/**
 * Lock or unlock one card in one deck (Locked, sub-project 5.1): "never cut this". The tools that
 * cut cards read it as a filter; nothing here changes what the deck holds.
 *
 * `setCardProxied`'s wire, for the same reasons. `on` and both ids are wire input, checked rather
 * than trusted. The deck row is locked `for update` first, so this write and a concurrent
 * removal's `pruneOrphanLocks` serialise and a lock cannot land on a card that has just left.
 * MEMBERSHIP IS `deck_cards` ALONE: a commander is never cut, so it is never offered a lock.
 *
 * Locking UPSERTS with `removed_at = null`, so a stray dormant row can never swallow a lock.
 * Unlocking deletes the row, live or dormant.
 *
 * Refused outright with the switch off (D3): a lock row must not be writable where nothing reads it.
 */
export async function setCardLocked(
  deckId: string,
  oracleId: string,
  on: boolean,
): Promise<DeckMutationResult> {
  const userId = await requireUserId();
  if (!neverCutEnabled()) return { ok: false, message: lockedCardsCopy.mode.refused };
  if (typeof on !== "boolean") return { ok: false, message: lockedCardsCopy.mode.refused };
  if (!isUuid(deckId) || !isUuid(oracleId)) return { ok: false, message: lockedCardsCopy.mode.refused };
  await requireDeck(deckId, userId);

  const ok = await db.transaction(async (tx) => {
    await tx.execute(sql`select 1 from ${decks} where ${decks.id} = ${deckId} for update`);
    const { rows: [member] } = await tx.execute<{ held: boolean }>(sql`
      select exists (
        select 1 from deck_cards dc where dc.deck_id = ${deckId} and dc.oracle_id = ${oracleId}
      ) as held
    `);
    if (!member?.held) return false;
    if (on) {
      await tx.execute(sql`
        insert into deck_locks (deck_id, oracle_id) values (${deckId}, ${oracleId})
        on conflict (deck_id, oracle_id) do update set removed_at = null
      `);
    } else {
      await tx.execute(sql`delete from deck_locks where deck_id = ${deckId} and oracle_id = ${oracleId}`);
    }
    // NO `touchDeck` and no dirty analysis (D5, F12): a lock edits no list.
    return true;
  });

  if (!ok) return { ok: false, message: lockedCardsCopy.mode.refused };
  // DEFERRED INTO `after()` (D7): the mode invites a run of toggles, and a revalidation during the
  // action re-renders the calling page into every reply. This deck's surfaces, and every deck's
  // review page by pattern: another deck must stop offering Pull it from this one (L2).
  after(() => {
    for (const path of deckSurfaces(deckId)) revalidatePath(path);
    revalidatePath("/decks/[id]/changes", "page");
  });
  return { ok: true };
}

export async function removeCardFromDeck(deckId: string, oracleId: string): Promise<void> {
  const userId = await requireUserId();
  await requireDeck(deckId, userId);
  // Decrement multiples (basics); delete the row once quantity would hit 0.
  //
  // Both halves take the row's own lock, in one transaction, because the choice
  // between them is read-then-write and `restoreDraftFromVersion` replaces
  // `deck_cards` wholesale under that same lock. Run unlocked, a removal that
  // waited out a restore would find its decrement matching nothing and fall
  // through to an unconditional delete — taking a card straight back out of the
  // list the restore had just put back, with nothing recording it. Locking
  // first turns that case into the right answer instead: the row this removal
  // named is gone, so there is nothing to remove.
  await db.transaction(async (tx) => {
    // The DECK row first, then the card row. Every other deck write takes them
    // in that order — `addCardToDeck`, the fill, the top-off,
    // `restoreDraftFromVersion` — and this path now ends in a stamp on `decks`,
    // so taking the child first would leave a removal holding the card while it
    // waits for the deck, against a restore holding the deck while it waits for
    // the card. One order everywhere is what makes that pair impossible.
    await tx.execute(sql`select 1 from ${decks} where ${decks.id} = ${deckId} for update`);
    const [row] = await tx.select({ quantity: deckCards.quantity })
      .from(deckCards)
      .where(and(eq(deckCards.deckId, deckId), eq(deckCards.oracleId, oracleId)))
      .for("update");
    if (!row) return;
    const where = and(eq(deckCards.deckId, deckId), eq(deckCards.oracleId, oracleId));
    if (row.quantity > 1) await tx.update(deckCards).set({ quantity: row.quantity - 1 }).where(where);
    else {
      await tx.delete(deckCards).where(where);
      // The slot is gone, so the deck's statement about it goes with it.
      await pruneOrphanProxies(tx, deckId);
      await pruneOrphanLocks(tx, deckId);
    }
    // Inside the `if (!row)` guard's shadow deliberately: a removal that found
    // nothing wrote nothing, and a stamp for a write that did not happen is the
    // one lie this column can tell.
    await touchDeck(tx, deckId);
  });
  revalidateClaims(deckId, userId);
}

export async function deleteDeck(deckId: string): Promise<void> {
  const userId = await requireUserId();
  await requireDeck(deckId, userId);
  await db.delete(decks).where(eq(decks.id, deckId));
  // Deleting a deck releases every claim it held, so the availability markers
  // on /collection and /commanders are wrong until they are told.
  revalidateClaims(deckId, userId);
  redirect("/decks");
}

/** The retry behind the fill-failed banner. Re-runs Task 5's gathering against a
    deck that already exists. Refuses a deck that already holds cards — a retry
    must not double a deck the player has since added to by hand. */
export async function fillDeck(deckId: string): Promise<void> {
  const userId = await requireUserId();
  const deck = await requireDeck(deckId, userId);
  const [commander] = await db.select().from(cards).where(eq(cards.oracleId, deck.commanderOracleId));
  if (!commander) return;
  const existing = await db.select({ oracleId: deckCards.oracleId })
    .from(deckCards).where(eq(deckCards.deckId, deckId)).limit(1);
  if (existing.length > 0) return;

  // The partner legalises pool and staples alongside the primary, so the retry
  // reads it too rather than filling a pair as if it were a single.
  const [partner] = deck.partnerOracleId
    ? await db.select().from(cards).where(eq(cards.oracleId, deck.partnerOracleId))
    : [];
  const hasPartner = deck.partnerOracleId !== null;
  // THE ANSWERS A HELP ME CHOOSE CREATE STORED (F1), so a fill that failed at creation is retried
  // to what was asked: the same budget and bracket gates, and the build-around card placed first,
  // exactly as the create would have placed it.
  const buildAround = deck.answerCardOracleId ?? null;
  const budgetCents = deck.answerBudgetCents ?? null;
  const bracket = bracketOf(deck.answerBracket ?? null);
  const answers: DeckAnswers | null = budgetCents === null && bracket === null && buildAround === null
    ? null
    : { budgetCents, bracket, cardOracleId: buildAround };
  const plan = await buildFillPlan(
    userId,
    partner ? [commander, partner] : [commander],
    new Set(buildAround ? [buildAround] : []),
    {
      // The build-around card is placed beside the plan below, so the plan counts it exactly as
      // the create this retries did.
      selected: await placedCardsOf(buildAround ? [buildAround] : []),
      ...(answers === null ? {} : { answers }),
      // The retry fills the way the create was asked to: from the player's own cards.
      ...(deck.answerOwnedOnly ? { pool: "sleeveable" as const, failClosed: true, excludeDeckId: deck.id } : {}),
    },
  );
  // The card first, then the plan, which is already sized to the slots the card leaves; the cap
  // stays as the rule the body obeys. Before the plan was sized, an uncapped card made 100.
  const rows = capToBody([
    ...(buildAround ? [{ oracleId: buildAround, quantity: 1, role: "other" as const }] : []),
    ...plan.rows,
  ], deckBodySize(hasPartner));
  await db.transaction(async (tx) => {
    // Lock the deck row before re-reading, the same way addCardToDeck does.
    // Without it the read sees a snapshot: a hand-add that commits between the
    // read and the insert would slip past the check, and the fill would land on
    // top of a deck the player had already started.
    await tx.execute(sql`select 1 from ${decks} where ${decks.id} = ${deckId} for update`);
    // Re-read inside the transaction. buildFillPlan reaches out to EDHREC, so
    // the check above is seconds stale by now and the player may have added a
    // card by hand in the meantime — filling on top of it would double a deck
    // they had already started.
    const existingNow = await tx.select({ oracleId: deckCards.oracleId })
      .from(deckCards).where(eq(deckCards.deckId, deckId)).limit(1);
    if (existingNow.length > 0) return;
    if (rows.length > 0) {
      await tx.insert(deckCards).values(
        rows.map((r) => ({ deckId, oracleId: r.oracleId, quantity: r.quantity, auto: true })),
      );
      // THE SAME TWO PASSES THE CREATE RECORDS. This path runs the same `planFill` the create
      // does (to the body less a build-around card, as the create's is), so recording it as one seed would make the retry's residual non-undoable
      // separately — the same 99-row pass with nothing to undo but all of it that the create
      // was split to avoid, reachable by pressing the banner's retry instead.
      //
      // openSlots is the whole body because this path refuses a deck that already holds cards.
      const retryResidualIds = new Set(
        plan.rows.filter(isResidual).map((r) => r.oracleId),
      );
      // The build-around card is foundation, as the create files a selection: the player asked
      // for it, so it is never among the suggestions a top-off undo clears.
      const retryFoundation = rows.filter((r) => !retryResidualIds.has(r.oracleId));
      const retryResidual = rows.filter((r) => retryResidualIds.has(r.oracleId));
      await recordFillPass(tx, {
        deckId, kind: "seed", openSlots: deckBodySize(hasPartner),
        rows: retryFoundation.map((r) => ({ oracleId: r.oracleId, quantity: r.quantity })),
      });
      await recordFillPass(tx, {
        deckId, kind: "top_off",
        openSlots: deckBodySize(hasPartner)
          - retryFoundation.reduce((n, r) => n + r.quantity, 0),
        rows: retryResidual.map((r) => ({ oracleId: r.oracleId, quantity: r.quantity })),
      });
      // Only where the plan landed rows. A fill that found nothing to add still
      // sets `filled` below — that column answers "was this ever filled" — but
      // it left the list exactly as it was, and the stamp describes the list.
      await touchDeck(tx, deckId);
      // NO SEED HERE, unlike the create. This deck already exists, so the player may have
      // written a line and then cleared it, and a cleared line reads exactly like one never
      // written (`intent` null, `intent_seeded` false). Seeding over that would bring back the
      // app's words after the player's first edit, which the chip promises never happens.
    }
    await tx.update(decks).set({ filled: true }).where(eq(decks.id, deckId));
  });
  revalidateClaims(deckId, userId);
}

/** Clears the fill's marker on one row. The card stays in the deck — the marker
    is a claim about who put it there, and keeping it is the player saying "mine". */
export async function keepAutoCard(deckId: string, oracleId: string): Promise<void> {
  const userId = await requireUserId();
  await requireDeck(deckId, userId);
  await db.update(deckCards).set({ auto: false })
    .where(and(eq(deckCards.deckId, deckId), eq(deckCards.oracleId, oracleId)));
  revalidatePath(`/decks/${deckId}`);
}

/** The same claim as `keepAutoCard`, made once for every row the fill placed.
    Returns how many cards it cleared, for the one spoken receipt.

    One statement, like the sweep: forty rows must not be forty round trips, and
    a partial pass would leave the toolbar counting one thing and the tags
    another. No lock, for the sweep's reason — under Read Committed an UPDATE
    that meets a row a concurrent DELETE holds waits for that transaction and
    then finds no row, so a sweep landing mid-keep simply takes those cards and
    this write reports what survived it.

    Only the deck path is revalidated, not `revalidateClaims`. The marker says who
    put a card here; an availability claim says who holds a copy. Those are
    different facts, this writes only the first, and no card moves — so the
    availability surfaces have nothing to re-read. `keepAutoCard` revalidates the
    same one path for the same reason. */
export async function keepAllAutoCards(deckId: string): Promise<number> {
  const userId = await requireUserId();
  await requireDeck(deckId, userId);
  const kept = await db.update(deckCards).set({ auto: false })
    .where(and(eq(deckCards.deckId, deckId), eq(deckCards.auto, true)))
    .returning({ quantity: deckCards.quantity });
  revalidatePath(`/decks/${deckId}`);
  // Cards, not rows — a stacked basic is one row and several cards, and the
  // count in the button's own label is summed the same way.
  return kept.reduce((n, r) => n + r.quantity, 0);
}

export async function renameDeck(deckId: string, name: string): Promise<void> {
  const userId = await requireUserId();
  await requireDeck(deckId, userId);
  const trimmed = validateDeckName(name);
  // The one site that stamps `last_edited_at` without `touchDeck`: it is already
  // an UPDATE of this row, so folding the column in is atomic by construction
  // and a transaction wrapped around two statements would buy nothing. The rule
  // for what counts as an edit still lives in `touch.ts`.
  await db.update(decks).set({ name: trimmed, lastEditedAt: sql`clock_timestamp()` })
    .where(eq(decks.id, deckId));
  // A rename moves no card, so no claim changes — and it still reaches every
  // surface a claim does, because those surfaces print the deck's NAME. A card's
  // availability marker says `none free — in <deck>` on /collection, /commanders
  // and /discover; the commander detail page names the deck under Why this
  // commander and again on each committed card. Left to `deckSurfaces` alone,
  // all of them went on showing the old name until something else invalidated
  // them.
  revalidateClaims(deckId, userId);
}

/** One removed row, carried so Undo can restore a stacked basic at the exact
    quantity it was swept at rather than guessing 1. */
export type SweptRow = { oracleId: string; quantity: number };

/** The whole sweep in one statement — 58 rows must not be 58 round trips, and a
    partial sweep would leave a receipt that lies about what it removed. Returns
    the rows so Undo can put back exactly what went, and nothing the player kept.

    No lock, deliberately: under Read Committed a DELETE that meets a row an
    uncommitted UPDATE holds waits for that transaction, then re-evaluates its
    own WHERE against the updated row. A keep that lands mid-sweep therefore
    turns `auto` false before the delete re-reads it, and the sweep passes the
    card by. Serialising these two by hand would buy nothing Postgres is not
    already doing. */
export async function clearAutoCards(deckId: string): Promise<SweptRow[]> {
  const userId = await requireUserId();
  await requireDeck(deckId, userId);
  // The transaction is the stamp's, not the sweep's: the delete still takes no
  // lock of its own and still relies on Postgres re-evaluating its WHERE after
  // a concurrent keep, exactly as above. It buys one thing — the sweep and the
  // stamp that describes it commit together.
  const removed = await db.transaction(async (tx) => {
    // The deck row first, for the ordering reason above. It does NOT change what
    // the delete does: the statement still takes no lock of its own on the rows
    // it sweeps, and still relies on Postgres re-evaluating its WHERE after a
    // concurrent keep, so a card kept mid-sweep is still passed by.
    await tx.execute(sql`select 1 from ${decks} where ${decks.id} = ${deckId} for update`);
    // A LOCKED auto card stays (Locked, L3): the sweep never cuts it. Inside the delete, under the
    // deck row lock above, and only while `NEVER_CUT_ENABLED` is on (D3).
    const rows = await tx.delete(deckCards)
      .where(and(
        eq(deckCards.deckId, deckId),
        eq(deckCards.auto, true),
        neverCutEnabled() ? notLiveLocked() : undefined,
      ))
      .returning({ oracleId: deckCards.oracleId, quantity: deckCards.quantity });
    if (rows.length > 0) {
      await pruneOrphanProxies(tx, deckId);
      await pruneOrphanLocks(tx, deckId);
      await touchDeck(tx, deckId);
    }
    return rows;
  });
  revalidateClaims(deckId, userId);
  return removed;
}

/** Re-inserts the swept rows with auto: true. Uses onConflictDoNothing so a
    double-undo is harmless. The quantity comes from the delete's returning
    clause rather than a fresh read, so a stacked basic comes back at the count
    it was swept at even if the shelf changed in between.

    The rows arrive from the client, and a server action answers any crafted
    request that reaches it — so they are re-checked here rather than trusted.
    A malformed oracle id would otherwise reach Postgres as a failed uuid cast,
    a forged quantity would write a deck past the 99 the add path enforces, and
    a substituted oracle id would put a card in the deck that the add path would
    have refused as illegal, off-identity, or the commander itself.

    Returns how many cards actually landed, which is not the receipt's total: a
    card the player re-added by hand is skipped by the conflict clause, and the
    announcement must not claim to have restored it. */
export async function restoreAutoCards(deckId: string, rows: SweptRow[]): Promise<number> {
  const userId = await requireUserId();
  const deck = await requireDeck(deckId, userId);
  if (rows.length === 0) {
    revalidatePath(`/decks/${deckId}`);
    return 0;
  }
  // A duplicated oracle id would make the insert's own values conflict, which
  // onConflictDoNothing does not cover — Postgres rejects the statement whole.
  const byId = new Map<string, number>();
  for (const r of rows) {
    if (!isUuid(r.oracleId)) throw new Error("invalid oracle id");
    if (!Number.isInteger(r.quantity) || r.quantity < 1 || r.quantity > 99) {
      throw new Error("invalid quantity");
    }
    byId.set(r.oracleId, r.quantity);
  }

  // Every id gets the same legality pass addCardToDeck runs. The cap lives with
  // the write below, so `built: 0` here asks about legality alone.
  const ids = [...byId.keys()];
  const [identity, candidates] = await Promise.all([
    deckValidationContext(deck),
    db.select({ oracleId: cards.oracleId, commanderLegal: cards.commanderLegal, colorIdentity: cards.colorIdentity })
      .from(cards).where(inArray(cards.oracleId, ids)),
  ]);
  const byOracleId = new Map(candidates.map((c) => [c.oracleId, c]));
  for (const oracleId of ids) {
    const card = byOracleId.get(oracleId);
    if (!card) throw new Error("card not found");
    const rejection = validateCardForDeck(card, { ...identity, built: 0 });
    if (rejection) throw new Error(rejection);
  }

  // Locking the deck row keeps the read and the write atomic, the same way
  // addCardToDeck does — the returned count is what the Undo toast reports, and
  // a hand-add racing it would otherwise make that number a guess.
  const restored = await db.transaction(async (tx) => {
    await tx.execute(sql`select 1 from ${decks} where ${decks.id} = ${deckId} for update`);
    // Only the ids being restored. The read exists to say which of them the
    // insert's conflict clause will skip, and with the cap gone the rest of the
    // deck is an unbounded scan answering nothing.
    const present = await tx.select({ oracleId: deckCards.oracleId })
      .from(deckCards)
      .where(and(eq(deckCards.deckId, deckId), inArray(deckCards.oracleId, ids)));
    // A card the player re-added by hand before clicking Undo is skipped by the
    // conflict clause, so it is not part of what this restore put back.
    const here = new Set(present.map((r) => r.oracleId));
    const count = [...byId]
      .filter(([oracleId]) => !here.has(oracleId))
      .reduce((n, [, quantity]) => n + quantity, 0);
    const restoredRows = await tx.insert(deckCards)
      .values([...byId].map(([oracleId, quantity]) => ({ deckId, oracleId, quantity, auto: true })))
      .onConflictDoNothing()
      .returning({ oracleId: deckCards.oracleId });
    // The INSERT's own result, not `count`. `count` is what the read above
    // predicted, and the two can still disagree: the writers that take the deck
    // row's lock — the add, the removal, the sweep, the top-off, the list
    // update, the restore — are serialised against each other by it, but
    // `keepAutoCard` and `keepAllAutoCards` reach `deck_cards` without it, and
    // the conflict clause is what decides each row either way. The toast keeps
    // reporting `count`, which is the figure it has always reported; the stamp
    // follows what was actually written.
    if (restoredRows.length > 0) await touchDeck(tx, deckId);
    return count;
  });
  // AFTER the commit, never inside it. An invalidation from inside the callback
  // drops the caches while the write is still uncommitted, and a render arriving
  // in that window refills them from the rows as they were — leaving exactly the
  // staleness the invalidation was for, until some later write.
  revalidateClaims(deckId, userId);
  return restored;
}

/** Places exactly the cards the player ticked, as one act.
 *
 *  Nothing here is planned server-side: the list is the plan, and this writes
 *  the selection it produced. That is why an illegal card refuses the whole
 *  commit rather than being skipped — the player chose these cards
 *  specifically, and placing all but one of them would make the receipt lie
 *  about what they asked for.
 *
 *  The refusal is a race guard and not the surface for a ticked row going
 *  illegal: the list recounts that client-side before any request leaves, so a
 *  refusal here means the two views disagree, and it renders as the one
 *  refusal string this surface has. */
async function runTopOff(deckId: string, oracleIds: string[]) {
  const userId = await requireUserId();
  const deck = await requireDeck(deckId, userId);

  // A duplicate would make the insert's own values conflict, which
  // onConflictDoNothing does not cover — Postgres rejects the statement whole.
  const ids = [...new Set(oracleIds)];
  if (ids.length !== oracleIds.length) throw new Error("duplicate oracle id");
  for (const oracleId of ids) {
    if (!isUuid(oracleId)) throw new Error("invalid oracle id");
  }
  if (ids.length === 0) throw new Error("nothing selected");

  const identity = await deckValidationContext(deck);
  const bodySize = deckBodySize(deck.partnerOracleId !== null);

  const landedIds = await db.transaction(async (tx) => {
    await tx.execute(sql`select 1 from ${decks} where ${decks.id} = ${deckId} for update`);
    // Re-read inside the lock. The open-slot count the player ticked against is
    // a number another tab may already have spent.
    const present = await tx.select({ oracleId: deckCards.oracleId, quantity: deckCards.quantity })
      .from(deckCards).where(eq(deckCards.deckId, deckId));
    const built = present.reduce((n, r) => n + r.quantity, 0);
    // A card the player added by hand between opening the list and committing
    // loses its insert to the conflict clause, so it is not part of this pass —
    // and it costs no slot either, which is why the cap is measured against the
    // rows that will actually land rather than against the raw selection.
    const here = new Set(present.map((r) => r.oracleId));
    const landed = ids.filter((oracleId) => !here.has(oracleId));
    // A refusal, not a truncation: a caller past the cap is working from a stale
    // view of the deck and should be told rather than silently given less.
    if (landed.length > bodySize - built) throw new Error("more cards than open slots");

    const byOracleId = new Map(
      (await tx.select({
        oracleId: cards.oracleId,
        commanderLegal: cards.commanderLegal,
        colorIdentity: cards.colorIdentity,
      }).from(cards).where(inArray(cards.oracleId, ids)))
        .map((c) => [c.oracleId, c]),
    );
    for (const oracleId of ids) {
      const card = byOracleId.get(oracleId);
      if (!card) throw new Error("card not found");
      // `built: 0` asks about legality alone — the cap is enforced above,
      // against the deck as the lock found it.
      const rejection = validateCardForDeck(card, { ...identity, built: 0 });
      if (rejection) throw new Error(rejection);
    }

    const insertedRows = await tx.insert(deckCards)
      .values(ids.map((oracleId) => ({ deckId, oracleId, quantity: 1, auto: true })))
      .onConflictDoNothing()
      .returning({ oracleId: deckCards.oracleId });
    // Only the rows that landed. A pass claiming a card it did not place would
    // offer to undo one the player put there themselves.
    const passId = await recordFillPass(tx, {
      deckId, kind: "top_off", openSlots: bodySize - built,
      rows: landed.map((oracleId) => ({ oracleId, quantity: 1 })),
    });
    // The INSERT's own result, not `landed`. `landed` is computed from the read
    // above, and `removeCardFromDeck` reaches `deck_cards` under the deck lock
    // this transaction holds only now that the line above takes it — a removal
    // that committed between this transaction's read and its insert leaves a
    // card genuinely placed while `landed` says it was already there. The fill
    // pass still records `landed`, which is a pre-existing question about what
    // the undo may take back and not this column's to answer.
    if (insertedRows.length > 0) await touchDeck(tx, deckId);
    return { passId, landed, total: built + landed.length, userId };
  });

  return landedIds;
}

export async function commitTopOff(deckId: string, oracleIds: string[]): Promise<TopOffResult> {
  let committed: Awaited<ReturnType<typeof runTopOff>>;
  try {
    committed = await runTopOff(deckId, oracleIds);
  } catch (err) {
    console.error("commitTopOff failed", err);
    return { ok: false, message: synergyCopy.lastSlots.topUpFailed };
  }

  // The deck rows and the fill pass are committed from here on, so the caches
  // are wrong until this runs and nothing below may be allowed to skip it.
  // Inside the transaction it would drop them while the write was still
  // uncommitted, and a render arriving in that window would refill them from the
  // rows as they were; inside a `catch` that reports failure, a throw would leave
  // a landed commit behind stale lists.
  revalidateClaims(deckId, committed.userId);

  try {
    // The shopping figure the commit row promised: cards this act placed that
    // the player does not own, not the deck's whole unowned count. Read outside
    // the transaction — collection_items is untouched by the deck write.
    const owned = committed.landed.length === 0
      ? new Set<string>()
      : new Set(
          (await db.select({ oracleId: collectionItems.oracleId })
            .from(collectionItems)
            .where(and(
              eq(collectionItems.userId, committed.userId),
              inArray(collectionItems.oracleId, committed.landed),
            )))
            .map((c) => c.oracleId),
        );
    const boughtDelta = committed.landed.filter((oracleId) => !owned.has(oracleId)).length;
    return {
      ok: true,
      passId: committed.passId,
      added: committed.landed.length,
      total: committed.total,
      boughtDelta,
    };
  } catch (err) {
    // The write landed and the caches know it; only the receipt's shopping
    // figure is unknown. Reported as a refusal rather than as a success with an
    // invented `boughtDelta`, because `0` is the one value this surface reads as
    // "nothing to buy" and it would be a claim nothing measured. The list the
    // reader returns to shows the cards, which is the correction.
    console.error("commitTopOff receipt failed after the commit landed", err);
    return { ok: false, message: synergyCopy.lastSlots.topUpFailed };
  }
}

/** The inverse of one top-off, at any age.
 *
 *  Removes only the pass's *live* rows — still in the deck, still the app's, and
 *  still attributed to this pass. A card the player kept has graduated out of
 *  provenance and cannot be reached by this, which is the design's ruling.
 *
 *  Attribution is `summariseFillPasses`, not the membership record, because one
 *  oracle id can sit in two passes: pass 1 places Shark Typhoon, the player
 *  removes it, pass 3 places it again. The newest pass owns the live row, so
 *  undoing pass 1 must leave it alone — deleting on membership alone would take
 *  a card pass 3 put there and leave pass 3's line claiming a card that is gone.
 *  The ledger already reads it this way; this is the same rule as a write.
 *
 *  Neither the pass row nor its membership is deleted. The membership record is
 *  immutable, and the line goes on its own: with no live rows left the pass
 *  summarises to nothing and drops out of the ledger. Keeping the row also keeps
 *  the ordinals stable — an undone `top-off 1` never lets its number be handed
 *  out again — and keeps "has this deck ever had a pass?" answerable, which is
 *  the condition the legacy line turns on.
 *
 *  Returns the number of cards actually removed and the deck's size once the
 *  undo has settled — both of which the announcement states. A second undo of
 *  the same pass finds nothing live and removes none, and a card claimed
 *  between the read and the write is reported as staying. The size is counted
 *  inside the transaction rather than subtracted from a figure the browser held
 *  before the click, because the rest of the builder stays live during an undo
 *  and an edit landing meanwhile would make that subtraction state a deck size
 *  that was never true. */
export async function undoFillPass(
  deckId: string,
  passId: string,
): Promise<{ removed: number; built: number }> {
  const userId = await requireUserId();
  await requireDeck(deckId, userId);
  if (!isUuid(passId)) throw new Error("invalid pass id");

  const result = await db.transaction(async (tx) => {
    // Under the same lock every deck write takes: attribution is read here and
    // acted on in the same breath, so a commit landing between the two cannot
    // make this undo delete a row the newer pass had just claimed.
    await tx.execute(sql`select 1 from ${decks} where ${decks.id} = ${deckId} for update`);

    const passes = await tx.select({
      id: fillPasses.id,
      deckId: fillPasses.deckId,
      kind: fillPasses.kind,
      ordinal: fillPasses.ordinal,
      openSlots: fillPasses.openSlots,
      createdAt: fillPasses.createdAt,
    }).from(fillPasses).where(eq(fillPasses.deckId, deckId));

    // A pass id from another deck is simply unknown here, never a licence to
    // delete that deck's cards. That is the authorization check, and the deck
    // comparison is written out rather than left to the `where` alone.
    const pass = passes.find((p) => p.id === passId);
    if (!pass || pass.deckId !== deckId) throw new Error("pass not found");
    // The seed line grows no undo of its own — it names the sweep as its
    // reversal, and `clearAutoCards` is the control that performs it. The guard
    // exists so a hand-made call cannot do what the UI declines to offer.
    if (pass.kind === "seed") throw new Error("a seed pass is reversed by the sweep");

    // Every pass and every deck row, because attribution is a question about
    // the whole set: what this pass still owns depends on what the newer ones
    // have claimed.
    const [members, rows] = await Promise.all([
      tx.select({
        passId: fillPassCards.passId,
        oracleId: fillPassCards.oracleId,
        quantity: fillPassCards.quantity,
      }).from(fillPassCards).where(inArray(fillPassCards.passId, passes.map((p) => p.id))),
      tx.select({
        oracleId: deckCards.oracleId,
        quantity: deckCards.quantity,
        auto: deckCards.auto,
      }).from(deckCards).where(eq(deckCards.deckId, deckId)),
    ]);

    const summary = summariseFillPasses({
      passes: passes.map((p) => ({ ...p, kind: p.kind as FillPassKind })),
      members,
      deckCards: rows,
    }).find((s) => s.id === passId);
    // No live cards: already undone, swept, or kept out from under it. Nothing
    // to remove, and the deck is the size the read found it.
    if (!summary) {
      return { removed: 0, built: rows.reduce((n, r) => n + r.quantity, 0) };
    }

    const live = new Set(summary.liveCards.map((c) => c.oracleId));
    const placed = new Map(
      members.filter((m) => m.passId === passId).map((m) => [m.oracleId, m.quantity]),
    );
    // A stacked basic can hold copies the player added on top of the pass's.
    // Taking the whole row would remove those too, so a row holding more than
    // the pass placed is decremented by what the pass placed and a row holding
    // exactly that is deleted.
    // Keyed by the quantity the pass placed, because the delete below has to
    // carry that number in its own predicate and one statement can only carry
    // one. A pass places 1 of almost everything and a stack of basics, so this
    // is two groups in practice.
    const rowsToDelete = new Map<number, string[]>();
    const forDeletion = (held: number, oracleId: string) => {
      const group = rowsToDelete.get(held);
      if (group) group.push(oracleId);
      else rowsToDelete.set(held, [oracleId]);
    };
    // Counted from what the writes took, not from what the read predicted.
    // `keepAutoCard` clears the flag without this lock, so a keep landing
    // between the read above and these writes turns one of them into a no-op —
    // and the announcement has to say one card when one came out.
    let removedCards = 0;
    for (const row of rows) {
      if (!live.has(row.oracleId)) continue;
      const held = placed.get(row.oracleId) ?? 0;
      if (row.quantity > held) {
        // `auto` is re-checked in the predicate, exactly as the delete does it,
        // so a card the player has just claimed keeps all of its copies. It is
        // also cleared by the same write: what remains are the copies the
        // player stacked on top, and leaving the marker set would let
        // `summariseFillPasses` go on counting them as this pass's — a second
        // undo would then take copies the pass never placed.
        //
        // The quantity is re-checked too, and that is not belt-and-braces. The
        // deck row lock this transaction holds does not exclude
        // `removeCardFromDeck`, which decrements without taking it, so the
        // quantity read above can be out of date by the time this write lands.
        // Without the predicate a row that has since fallen to `held` or below
        // would be written negative. With it the update simply matches nothing
        // and the row moves to the delete below, which is the right answer for
        // a row that no longer holds more than the pass placed.
        const decremented = await tx.update(deckCards)
          .set({ quantity: sql`${deckCards.quantity} - ${held}`, auto: false })
          .where(and(
            eq(deckCards.deckId, deckId),
            eq(deckCards.oracleId, row.oracleId),
            eq(deckCards.auto, true),
            gt(deckCards.quantity, held),
            // A locked stack keeps every copy: a decrement removes copies with no delete (L3).
            neverCutEnabled() ? notLiveLocked() : undefined,
          ))
          .returning({ oracleId: deckCards.oracleId });
        if (decremented.length > 0) removedCards += held;
        else forDeletion(held, row.oracleId);
      } else {
        forDeletion(held, row.oracleId);
      }
    }
    for (const [held, oracleIds] of rowsToDelete) {
      // The mirror of the predicate above, and it exists for the mirrored race:
      // a row the read said held exactly what the pass placed can have gained
      // copies since, and deleting it whole would take cards the player added
      // rather than cards the app placed. A row that has grown past `held`
      // matches nothing here and keeps every copy — the undo then removes less
      // than it offered, which `removedCards` reports honestly, and no card the
      // player put there is lost.
      const deleted = await tx.delete(deckCards).where(and(
        eq(deckCards.deckId, deckId),
        eq(deckCards.auto, true),
        lte(deckCards.quantity, held),
        inArray(deckCards.oracleId, oracleIds),
        neverCutEnabled() ? notLiveLocked() : undefined,
      )).returning({ quantity: deckCards.quantity });
      removedCards += deleted.reduce((n, r) => n + r.quantity, 0);
      if (deleted.length > 0) {
        await pruneOrphanProxies(tx, deckId);
        await pruneOrphanLocks(tx, deckId);
      }
    }

    const [built] = await tx
      .select({ copies: sql<number>`coalesce(sum(${deckCards.quantity}), 0)::int` })
      .from(deckCards)
      .where(eq(deckCards.deckId, deckId));

    // An undo that found every row already claimed or already gone removed no
    // card, and `removedCards` is the figure the toast reports for exactly that
    // reason — the stamp uses the same one rather than a second test.
    if (removedCards > 0) await touchDeck(tx, deckId);

    return { removed: removedCards, built: built?.copies ?? 0 };
  });

  // The shopping list is derived from deck membership, so this is also what
  // gives the player their money back — nothing separate restores it. After the
  // commit: from inside the callback it drops the caches while the write is still
  // uncommitted, and a render arriving in that window refills them from the rows
  // as they were.
  revalidateClaims(deckId, userId);
  return result;
}

export type LogGameInput = {
  result: "win" | "loss" | "draw";
  podSize: number;
  /** When the game was played. Defaults to now. Never in the future. */
  playedAt?: Date;
  worked: string[];
  hurt: string[];
  /** One line in the player's own words, capped at 140. Optional — never
   *  required, not even on a loss. Blank stores null, so "has a note" is one
   *  predicate everywhere rather than two. */
  note?: string;
};

const GAME_RESULTS: readonly string[] = ["win", "loss", "draw"];
const NOTE_MAX_LENGTH = deckTuningCopy.note.maxLength;

/** How far ahead of the server a player's clock may run before a log is refused. */
const CLOCK_SKEW_MS = 5 * 60 * 1000;

/**
 * Record one game against a deck.
 *
 * Every refusal the form can act on is returned as { ok: false, message }
 * rather than thrown: the form renders it through the shipped MutationError and
 * keeps every value the player typed, which a thrown error would destroy along
 * with the form. Auth and ownership still throw, from requireUserId and
 * requireDeck — a player who cannot reach the deck has no form to preserve.
 *
 * There is no `for update` here, unlike addCardToDeck. That lock exists to keep
 * two concurrent adds from both seeing 98 cards and pushing the deck to 100.
 * A game log has no such ceiling — two concurrent logs are simply two games.
 */
export async function logGame(
  deckId: string,
  input: LogGameInput,
): Promise<DeckMutationResult> {
  const userId = await requireUserId();
  await requireDeck(deckId, userId);

  const refuse = { ok: false as const, message: gameLogCopy.form.refused };

  // A server action is a public endpoint, so the input's declared type is a
  // claim and not a guarantee. Everything below is shape-checked before it is
  // used, or a crafted payload would throw where the contract promises a refusal.
  if (!input || typeof input !== "object") return refuse;
  if (!GAME_RESULTS.includes(input.result)) return refuse;
  if (!Number.isInteger(input.podSize) || input.podSize < 2 || input.podSize > 8) return refuse;

  const sent = input.playedAt ?? new Date();
  if (!(sent instanceof Date) || Number.isNaN(sent.getTime())) return refuse;
  // The instant comes off the player's own clock, which routinely runs a little
  // ahead of the server's. A game logged tonight would then be refused as a
  // future one, so the skew window is tolerated and then clamped away: what is
  // stored never runs ahead of the server, and a genuinely future date — the
  // only thing this rule exists to refuse — is still refused.
  const now = Date.now();
  if (sent.getTime() > now + CLOCK_SKEW_MS) return refuse;
  const playedAt = new Date(Math.min(sent.getTime(), now));

  // The vocabulary is eight axes, so any longer list is a crafted payload rather
  // than a game. Length is checked before the keys are, or a public endpoint
  // would walk an arbitrarily long array to reach the same refusal.
  const marksFit = (marks: unknown): marks is GameAxisKey[] =>
    Array.isArray(marks) && marks.length <= GAME_AXIS_KEYS.length && marks.every(isGameAxisKey);
  if (!marksFit(input.worked)) return refuse;
  if (!marksFit(input.hurt)) return refuse;

  // Dedupe within a list before checking across them, so ['mana','mana'] is a
  // single mark rather than a primary-key collision, while ['mana'] on both
  // sides is still the contradiction the composite key exists to forbid.
  const worked = [...new Set(input.worked)] as GameAxisKey[];
  const hurt = [...new Set(input.hurt)] as GameAxisKey[];
  if (worked.some((key) => hurt.includes(key))) return refuse;

  // A server action is a public endpoint, so the field's `maxlength` is a
  // courtesy and this is the rule. Over the cap is refused rather than
  // truncated: silently storing less than somebody typed is the one outcome
  // worse than saying no. The column's check would refuse it anyway, and that
  // refusal would arrive as a generic failure with no explanation.
  if (input.note !== undefined && typeof input.note !== "string") return refuse;
  const note = input.note?.trim() ?? "";
  // Code points, not `.length`. JavaScript counts UTF-16 code units, so an
  // emoji is two and the column's `char_length` is one — counting the JS way
  // would refuse 71 emoji as 142 characters while the database was happy to
  // store them. One definition of "character", and it is the column's.
  if (countCharacters(note) > NOTE_MAX_LENGTH) return refuse;

  // The version live when the game was PLAYED, not when it was logged: a game
  // can be backdated, and stamping it with today's list would credit a night's
  // result to a deck that did not exist that night. Null for a brew, and null
  // is accurate: a game played by a list nobody committed has no version to
  // point at, and inventing one would be a claim the history cannot support.
  const version = await versionLiveAt(deckId, playedAt);

  try {
    await db.transaction(async (tx) => {
      const [game] = await tx
        .insert(deckGames)
        .values({
          deckId, userId, result: input.result, podSize: input.podSize, playedAt,
          versionId: version?.id ?? null,
          // Blank is null, never an empty string, so the row renders and the
          // reader queries one absence rather than two.
          note: note.length > 0 ? note : null,
        })
        .returning({ id: deckGames.id });

      const marks = [
        ...worked.map((axis) => ({ gameId: game.id, axis, polarity: "worked" })),
        ...hurt.map((axis) => ({ gameId: game.id, axis, polarity: "hurt" })),
      ];
      // Drizzle rejects an empty values array, and no marks is a valid log.
      if (marks.length > 0) await tx.insert(deckGameAxes).values(marks);
    });
  } catch (err) {
    // The player sees one generic refusal by design, so the underlying failure
    // has nowhere else to surface.
    console.error("logGame failed", err);
    return refuse;
  }

  for (const path of deckSurfaces(deckId)) revalidatePath(path);
  return { ok: true };
}

/**
 * Remove one logged game. The axis rows follow through ON DELETE CASCADE.
 *
 * There is no edit action by design, so this is the whole correction path: a
 * game logged wrong is deleted and logged again. That is why the history row's
 * confirm is inline and one step rather than a dialog — it is a routine
 * operation, not an exceptional one.
 */
export async function deleteGame(
  deckId: string,
  gameId: string,
): Promise<DeckMutationResult> {
  const userId = await requireUserId();
  await requireDeck(deckId, userId);

  const refuse = { ok: false as const, message: gameLogCopy.history.deleteRefused };

  // requireDeck above proves the caller owns this deck. It does not prove this
  // game is on it, so the pairing is part of the delete's own predicate rather
  // than a separate read: a check-then-delete would report success for a row
  // another tab removed in between, and the player would watch a game they
  // thought they had just deleted stay on the page.
  let deleted: { id: string }[];
  try {
    deleted = await db
      .delete(deckGames)
      .where(
        and(eq(deckGames.id, gameId), eq(deckGames.deckId, deckId), eq(deckGames.userId, userId)),
      )
      .returning({ id: deckGames.id });
  } catch (err) {
    console.error("deleteGame failed", err);
    return refuse;
  }
  if (deleted.length === 0) return refuse;

  for (const path of deckSurfaces(deckId)) revalidatePath(path);
  return { ok: true };
}

export type CommitResult =
  | {
      ok: true;
      number: number;
      /** Rows in the version just written, basics included — the size of the list
       *  that was snapshotted, not of the shopping decision. The success line
       *  prints this rather than recounting on the client. */
      cardCount: number;
      /** What the version costs, or NULL when the claim read behind it failed.
       *  Null is "nobody could say", never "nothing": the read is a receipt, so
       *  a failure must not cost the player a version they asked for, and an
       *  empty list there would announce their shopping as finished on the
       *  strength of a query that threw. Same distinction `PullResult.buy`
       *  draws, and the same one the page's `claimsKnown` draws. */
      buy: BucketedAdd[] | null;
      /** What goes back in the box, basics included, each carrying its
       *  `from`/`to` pair. Unlike `buy` this is a physical instruction rather
       *  than a shopping decision, and five cut Swamps are five cards to take
       *  out of the sleeve. */
      pull: DraftChange[];
    }
  | { ok: false; message: string };

/**
 * The declaration a commit should carry into its version, or `undefined` when there is none.
 *
 * `commitVersion` takes this optionally and for a while no caller passed it, so both declaration
 * columns were written null on every real commit. The pull path used to auto-commit the source
 * deck too; since 2026-09-27 it commits nothing, so the deliberate commit is the one caller.
 *
 * GATED ON THE DECK HAVING DECLARED ANYTHING. Deriving permits needs a whole profile — 630ms
 * median, 2.2s on the slowest real deck — and a deck with no live declaration has nothing to
 * carry, which is every deck until a player answers.
 *
 * CALL IT UNDER THE CALLER'S LOCK. An earlier version built it before the transaction and
 * called the resulting race benign, on the reasoning that `permitsDeclaration` would reject a
 * declaration the cards no longer permit. That was wrong: `commitVersion` takes
 * `snapshot.permits` ON TRUST and never compares them to the rows it is writing, so a stale
 * permit list is simply believed — and the version records a declaration its own cards may not
 * permit, which is the gate the column exists to be.
 *
 * It costs a 630ms-to-2.2s profile build inside a transaction, which is real. It is paid only by
 * a deck that has DECLARED something — none of them until a player answers — and only on a
 * deliberate commit.
 */
async function commitSnapshotFor(
  deckId: string,
  userId: string,
): Promise<CommitSnapshot | undefined> {
  // The column under its own name rather than through a projection alias: the shape then does
  // not depend on the alias surviving a driver or a test's select stub.
  const [live] = await db
    .select({ declaredBracket: decks.declaredBracket })
    .from(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)));
  const declared = bracketOf(live?.declaredBracket ?? null);
  if (declared === null) return undefined;
  const profile = await cachedDeckProfile(deckId, userId);
  return profile ? { declared, permits: slotDeck(profile).permits } : undefined;
}

/**
 * Freeze the draft as the next version and say what it costs.
 *
 * The two lists are computed BEFORE the write, against the version being
 * replaced — afterwards the draft and the newest version are identical by
 * definition and the diff is empty. They are also computed under the deck's
 * row lock, in the same transaction as the write: read outside it, an edit
 * landing in between puts the reader's receipt at odds with the version that
 * was actually snapshotted, and the buy list names cards nobody committed.
 *
 * `revalidateClaims`, not a bare `revalidatePath`: a commit changes what every
 * other deck can claim, so the collection page and every cached list payload
 * are stale the moment it lands.
 */
export async function commitDeckVersion(
  deckId: string,
  note: string | null,
): Promise<CommitResult> {
  const userId = await requireUserId();
  if (!isUuid(deckId)) return { ok: false, message: "We couldn't find that deck." };
  // A Server Action's arguments arrive over the wire, so the declared type is a
  // claim about the caller rather than a guarantee: anything at all can be posted
  // here. An absent note is legitimate, a non-string one is not, and refusing it
  // by name is what keeps `note.trim()` below from throwing a TypeError the action
  // has no result shape for.
  if (note !== null && note !== undefined && typeof note !== "string") {
    return { ok: false, message: "We couldn't save that note." };
  }
  try {
    await requireDeck(deckId, userId);
  } catch {
    return { ok: false, message: "We couldn't find that deck." };
  }


  let pin: CommitPin | null = null;
  const result = await db.transaction<CommitResult>(async (tx) => {
    const [deck] = await tx.select().from(decks).where(eq(decks.id, deckId)).for("update");
    // Deleted between the ownership check above and this lock. Left to fall
    // through, it reaches commitVersion, which throws rather than refusing.
    if (!deck) return { ok: false, message: "We couldn't find that deck." };

    const previous = await newestVersion(deckId, tx);
    const before = previous ? await versionCards(previous.id, tx) : [];
    // `for update`, because the deck row's lock alone does not serialize this:
    // the paths that edit `deck_cards` do not take it. Locking the draft rows
    // makes a concurrent edit wait, so the receipt describes what was written.
    const draft = await tx.select({
      oracleId: deckCards.oracleId, quantity: deckCards.quantity,
    }).from(deckCards).where(eq(deckCards.deckId, deckId)).for("update");

    // A FIRST version is the one commit with an eligibility test of its own, and
    // the server owns it. The spine offers `Commit as v1` only on a list that is
    // exactly its body size with nothing unresolved; `?commit=1` is a URL, so a
    // stale link or a hand-typed one reaches the sheet on a 63-card brew, and
    // without this it would freeze that as v1. Later commits carry no such test:
    // a deck already has a version to fall back to, and a draft mid-edit is
    // exactly what this feature exists to let the player commit.
    if (!previous) {
      const body = draft.reduce((n, row) => n + row.quantity, 0);
      const expected = deckBodySize(deck.partnerOracleId !== null);
      // An exact match, not `>=`: past its size the deck is `Over`, and a v1 of
      // 104 cards is an illegal list frozen into the deck's history.
      if (body !== expected) {
        return {
          ok: false,
          message: `A first version has to be a whole deck — ${expected} cards. This one has ${body}.`,
        };
      }
      const [unresolved] = await tx.select({ n: sql<number>`count(*)::int` })
        .from(deckUnresolvedRows).where(eq(deckUnresolvedRows.deckId, deckId));
      // Unresolved lines are not `deck_cards` rows and so never reach the count
      // above: a deck at its body size plus two unnamed lines is a list the
      // player has not finished, and the version would silently drop them.
      if ((unresolved?.n ?? 0) > 0) {
        return {
          ok: false,
          message: "Some lines in this deck never matched a card. Resolve them before cutting v1.",
        };
      }
    }

    const diff = draftDiff(draft, before);
    // Basics are out of the availability model entirely — see that query's
    // header — so an added Forest comes back with no row and would bucket as
    // `unowned`, putting ten Forests on a shopping list. Dropped from the BUY
    // list here rather than special-cased downstream, because every other
    // Shopping surface in the app already treats basics as unlimited.
    //
    // The adds alone. `removes` keeps its basics: the receipt's pull side is a
    // physical instruction — take these out of the box — and a cut Island is
    // exactly that. What made a basic wrong there was a bare `Island` asserting
    // the card had left a deck the player still plays thirty of; the row carries
    // its `from → to` now, so the figure it prints is the true one.
    const changed = diff.adds.map((c) => c.oracleId);
    const basics = new Set(
      changed.length === 0 ? [] : (await tx.select({
        oracleId: cards.oracleId, typeLine: cards.typeLine,
      }).from(cards).where(inArray(cards.oracleId, changed)))
        .filter((c) => isBasicLand(c.typeLine))
        .map((c) => c.oracleId),
    );
    const adds = diff.adds.filter((a) => !basics.has(a.oracleId));
    const removes = diff.removes;

    // A first version buys nothing. `previous` is null, so `before` is empty and
    // `diff.adds` is the whole deck — every card the player already owns and has
    // been holding in this brew. Asked about those, the availability model
    // answers 0 free for all of them: a brew's own live rows are claims, and
    // `excludeDeckId` subtracts them from a total that already counted them, so
    // each card appears spoken for by the very list asking about it. The receipt
    // would read as a 99-card purchase. The design says the same thing from the
    // other side — see `commit.lede`, where a first commit is one of the cases
    // that leaves a figure at zero.
    // Deliberately off `db` rather than `tx`: this asks what OTHER decks claim, and
    // the answer wanted is the one that held before this commit landed. That choice
    // is also what makes the catch below safe — a query that throws on `tx` would
    // abort the transaction and take the write with it, and one that throws on `db`
    // leaves this transaction untouched.
    //
    // Caught rather than allowed to propagate, because this read is the RECEIPT and
    // not the write: the page keeps the commit CTA live when its own claim read
    // fails (`claimsKnown`), so a version the player is invited to cut must not be
    // refused by a transient failure to price it. pullSources, not the raw claims: a
    // BREW "holding" a card holds nothing, and naming it would offer a pull against
    // a list that was never sleeved — and a JUNIOR sleeved holder is already outside
    // this deck's `free`, so pulling from it would empty that deck's slot and leave
    // the shortfall where it was.
    let buy: BucketedAdd[] | null = [];
    if (previous) {
      try {
        const availability = await loadAvailability(userId, {
          oracleIds: adds.map((a) => a.oracleId),
          excludeDeckId: deckId,
        });
        buy = bucketAdds(
          adds,
          new Map(
            [...availability].map(([oracleId, a]) => [
              oracleId,
              { free: a.free, claims: pullSources(a) },
            ]),
          ),
          new Set(),
          // The deck's printed cards, and THROWING on failure like the pull's
          // read does. The receipt quotes money: a swallowed failure would say
          // "no proxies" and bill a card the player has decided not to buy. The
          // outer catch already has the honest answer for an unreadable
          // receipt — `buy = null`, meaning nobody asked — so failing into it is
          // both safer and already drawn.
          await proxiedOracleIds(deckId, userId, "throw"),
        ).filter((a) => a.bucket !== "free" && a.bucket !== "proxied");
      } catch {
        buy = null;
      }
    }

    // `cardCount` comes back off the rows the snapshot was written from, rather
    // than being counted here from `draft`: a path that inserts a card the deck
    // did not hold takes no row lock this transaction holds, so the two reads can
    // legitimately differ and only the snapshot's is the version's own figure.
    // THE SNAPSHOT IS BUILT UNDER THE LOCK, and the cost is deliberate.
    //
    // Built before the transaction, it described the deck as it was BEFORE the row and draft
    // locks — and `commitVersion` trusts `snapshot.permits` without comparing them to the rows
    // it is writing. So an edit landing in that window could persist a declaration the committed
    // cards do not permit, which is the gate this column exists to be. Calling that race
    // "benign" was wrong: the permits are taken on trust, so nothing downstream catches it.
    //
    // It costs a 630ms-to-2.2s profile build inside the transaction — but ONLY for a deck that
    // has declared something, which is none of them until a player answers, and only on a
    // deliberate commit. Correctness of the one column the version exists to freeze is worth
    // that on the rare path that reaches it.
    const snapshot = await commitSnapshotFor(deckId, userId);
    const { version, cardCount } = await commitVersion(deckId, note?.trim() || null, tx, snapshot);
    // The list this version froze, for the pin below, read back from the VERSION'S OWN ROWS:
    // `commitVersion` snapshots `deck_cards` itself, and a card inserted after the `draft` read
    // above (a new row has nothing to lock) would be in the version and absent from `draft`.
    pin = {
      versionId: version.id,
      list: listFingerprint({
        commanderOracleId: version.commanderOracleId,
        partnerOracleId: version.partnerOracleId,
        cards: await versionCards(version.id, tx),
      }),
    };
    return { ok: true, number: version.number, cardCount, buy, pull: removes };
  });
  if (!result.ok) return result;
  // RULING 2: the commit pins the deck's analysis to the version it just wrote. Off the commit's
  // path, in `after()`, because the one pin that analyzes (a reading of this list under an older
  // `PROFILE_VERSION`) can cost 2.2s and the reader is waiting on the commit alone. It never
  // analyzes another list (H32). `pinAnalysisToVersion` writes nothing when an edit has moved the deck off this list
  // since, and nothing for a version that is not a whole deck (ruling 1). The synopsis is COPIED
  // beside it, never written: a commit writes no prose (ruling 7), and the version keeps the draft's
  // synopsis only when it was written for exactly this list from a draft that is not stale (brief
  // §2.4). The synopsis goes FIRST: the analysis pin may clear `dirty`, which the synopsis pin reads.
  // Both are best-effort.
  const committed = pin;
  if (committed) {
    after(async () => {
      await pinSynopsisToVersion(deckId, userId, committed);
      await pinAnalysisToVersion(deckId, userId, committed);
    });
  }
  revalidateClaims(deckId, userId);
  return result;
}

/**
 * Throw the draft away and put the newest version's list back.
 *
 * Destructive and unrecoverable — the draft is not versioned — so the caller
 * confirms first.
 *
 * `expectedVersionId` is the version the caller told the player they were
 * landing on. It is checked against the newest one under the restore's own
 * lock, so a commit from another tab — or a deck holding no version at all —
 * refuses this write rather than quietly landing somewhere the confirmation
 * never named. The refusal revalidates: whatever the player is looking at is
 * out of date either way.
 */
export async function discardDeckDraft(
  deckId: string,
  expectedVersionId: string,
): Promise<DeckMutationResult> {
  const userId = await requireUserId();
  if (!isUuid(deckId) || !isUuid(expectedVersionId)) {
    return { ok: false, message: "We couldn't find that deck." };
  }
  await requireDeck(deckId, userId);
  // The decks this draft's pulls freed a copy for. The discard deletes those releases, so their buy
  // tags return and their pages are refreshed with this one. Handed back by the restore from the
  // delete it ran under its own lock, so a pull landing just before it is never missed.
  let askers: string[] = [];
  const outcome = await restoreDraftFromVersion(deckId, expectedVersionId, (ids) => { askers = ids; });
  revalidateClaims(deckId, userId);
  for (const id of askers) revalidateClaims(id, userId);
  if (outcome === "moved") {
    return { ok: false, message: "We couldn't discard those changes. Nothing has changed." };
  }
  return { ok: true };
}

/**
 * What one version changed, read when its row on the history page is opened.
 *
 * The predecessor is the SERVER's to name, not the caller's. This is a public
 * server action, so a caller that supplied it could ask for v7 against v2 and
 * get a payload the rail would draw under the words "what v7 changed" — true of
 * no commit anybody made. Resolving it from `number` here means the answer means
 * one thing.
 *
 * `loadVersionDiff` reads by version id alone, so the version is checked against
 * this deck first: without that, a signed-in account could read another player's
 * list by posting their version id alongside a deck of its own. A refusal is
 * `null` rather than two empty lists, because two empty lists are also the honest
 * answer for a version that changed nothing, and the caller caches what it is
 * given — a refusal filed under that version id would outlive the refusal.
 * Returning null rather than throwing keeps a stale row — a version deleted in
 * another tab — from breaking the page.
 */
export async function getVersionDiff(
  deckId: string,
  versionId: string,
): Promise<VersionDiffPayload | null> {
  const userId = await requireUserId();
  if (!isUuid(deckId) || !isUuid(versionId)) return null;
  await requireDeck(deckId, userId);

  const [asked] = await db.select({ number: deckVersions.number })
    .from(deckVersions)
    .where(and(eq(deckVersions.deckId, deckId), eq(deckVersions.id, versionId)))
    .limit(1);
  if (!asked) return null;

  // The highest number below this one, which is the predecessor even across a
  // gap — no path deletes a version today, and a hole in the run would still
  // make the version before it the one this commit was cut from.
  const [previous] = await db.select({ id: deckVersions.id })
    .from(deckVersions)
    .where(and(eq(deckVersions.deckId, deckId), lt(deckVersions.number, asked.number)))
    .orderBy(desc(deckVersions.number))
    .limit(1);
  // A v1 has none, and `loadVersionDiff` answers that with two empty lists.
  return loadVersionDiff(versionId, previous?.id ?? null, userId, deckId);
}

/**
 * Take a card out of the deck that currently holds it, on the player's say-so.
 *
 * The pull edits the source deck's DRAFT and cuts no version (Hugh, 2026-09-27): the card goes
 * under that deck's Going out, and the player commits or discards it there like any other edit.
 * What frees the copy on the spot is the release row it writes (`writePullRelease`), which
 * subtracts the pulled copy from the source's committed claim in both claim readers, so the asking
 * deck's buy tag clears without waiting on the source's commit. Discarding the source's draft
 * puts the card back and deletes the release; committing it makes the removal the version.
 */
export type PullResult =
  | {
      ok: true;
      /** The asking deck's buy count and priced total AFTER the pull, read from
       *  the server rather than decremented on the client: a client that
       *  subtracts one from the figure it was rendered with is guessing, and the
       *  pull may have freed a copy the deck asked for more than once.
       *
       *  Null when that read failed, and never 0: zero is a purchase statement,
       *  the true count may be anything, and "0 to buy" over a transient read
       *  failure tells the player their shopping is finished when it is not. A
       *  consumer holding a null says nothing at all about buying. */
      buy: number | null;
      total: string | null;
    }
  | { ok: false; message: string };

export async function pullCardFromDeck(
  sourceDeckId: string,
  oracleId: string,
  askingDeckId: string,
): Promise<PullResult> {
  const userId = await requireUserId();
  if (!isUuid(sourceDeckId) || !isUuid(oracleId) || !isUuid(askingDeckId)) {
    return { ok: false, message: "We couldn't find that card." };
  }
  // Both decks, because both are revalidated and both must be the player's.
  await requireDeck(sourceDeckId, userId);
  await requireDeck(askingDeckId, userId);

  // A deck cannot pull from itself. Owning both ends is no defence here: with one
  // id the source loses a copy to satisfy a want the same list already holds, and
  // commits that loss — a destructive self-removal dressed as a transfer.
  if (sourceDeckId === askingDeckId) {
    return { ok: false, message: "A deck can't pull a card from itself." };
  }

  // Which decks the claim on this card is made of, read BEFORE the transaction
  // and used only to decide what to lock. The authorization below re-reads the
  // claim under those locks and is the read that decides; this one just names
  // the parties, because a lock set cannot be chosen from inside a transaction
  // without either locking every deck the player owns or taking locks in an
  // order a concurrent pull could deadlock against.
  //
  // A read that throws leaves the set at the two decks this pull is between,
  // which is the shipped behaviour and still safe: the verification inside the
  // transaction refuses rather than authorizing against an unlocked claimant.
  let claimants: string[] = [];
  try {
    const seen = await loadAvailability(userId, {
      oracleIds: [oracleId],
      excludeDeckId: askingDeckId,
    });
    claimants = hardDecks(seen.get(oracleId) ?? { claims: [] }).map((d) => d.id);
  } catch {
    claimants = [];
  }
  // Every party, deduplicated and sorted once. Sorting the whole set — not the
  // two decks with claimants appended — is what makes the ordering global: a
  // concurrent pull between any other pair takes the same locks in the same
  // sequence, so one of the two waits instead of both holding what the other
  // needs.
  const lockIds = [...new Set([sourceDeckId, askingDeckId, ...claimants])].sort();

  // One transaction, and every guard runs inside it under every party's row lock.
  // Each guard is a decision about what a draft holds right now: read outside
  // the lock, an edit landing before the commit is swept into a version its
  // owner never asked for — the exact case the pending-changes guard exists to
  // prevent. The write is in here for its own reason: a delete that lands
  // without its commit leaves the draft short of a card the version claims.
  const outcome = await db.transaction<DeckMutationResult>(async (tx) => {
    // EVERY party's deck row, locked in sorted id order, before anything is read.
    // The asking deck is locked because this transaction authorizes itself against
    // that deck's claim on the card: two readers each pulling the same card for
    // the same asking deck from two different sources would otherwise both find
    // it spoken for and release two copies for a deck that wanted one. The other
    // claimants are locked because the claim is what authorizes the pull, and a
    // claim is made of decks this transaction does not otherwise touch —
    // `commitDeckVersion` takes its own deck's row lock first, so holding a
    // claimant's row is what stops it committing a release underneath this read.
    //
    // Sorted order is what keeps that safe from deadlock. Two pulls with the
    // roles swapped — A pulling for B while B pulls for A — would otherwise each
    // hold the lock the other waits on. Sorted, one of them takes both locks and
    // the other waits at the first, which also serialises every `deck_cards`
    // lock taken below, so those need no ordering rule of their own.
    //
    // A statement each rather than one `where in (...) order by ... for update`:
    // Postgres does not promise FOR UPDATE takes its locks in ORDER BY order,
    // so the ordering has to be in the statement sequence to mean anything.
    for (const id of lockIds) {
      await tx.select({ id: decks.id }).from(decks).where(eq(decks.id, id)).for("update");
    }
    const [deck] = await tx.select().from(decks).where(eq(decks.id, sourceDeckId));

    // Deleted between the ownership check and this lock. Left to fall through,
    // it reaches commitVersion, which throws rather than refusing.
    if (!deck) return { ok: false, message: "We couldn't find that deck." };

    // Neither commander is a `deck_cards` row, but both are claims, so a deck
    // can be named as a card's holder on the strength of its commander alone.
    // Without this the pull the reader was offered fails as "doesn't hold it".
    //
    // Ahead of the offer check below, because it is the more specific answer: a
    // commander cannot be pulled by anybody for any reason, and a reader told
    // instead that their deck isn't waiting on the card would go looking for a
    // problem with their own draft.
    if (deck.commanderOracleId === oracleId || deck.partnerOracleId === oracleId) {
      return { ok: false, message: "That card is that deck's commander." };
    }

    // L2: a card the source deck has LOCKED is never pulled out of it. Under that deck's row lock,
    // taken above, so a lock landing first is honoured and none can land between this and the
    // delete. Only while `NEVER_CUT_ENABLED` is on (D3).
    if (neverCutEnabled() && (await isLiveLocked(tx, sourceDeckId, oracleId))) {
      return { ok: false, message: PULL_REFUSED_LOCKED };
    }

    // Ownership proves the player may act on both decks; it does not prove this
    // is a pull the app ever offered. Without this any two owned decks can be
    // named and the source made to lose a card the asking deck never asked for,
    // so the asking deck's own draft is the authority on which pulls exist.
    //
    // Re-derived here rather than read before the transaction, because that read
    // would be answering for a moment already past by the time the lock is
    // taken. `draftDiff` off a `for update` read of the asking deck's rows is the
    // same derivation `loadDraftState` performs, minus the presentation.
    const askingVersion = await newestVersion(askingDeckId, tx);
    const askingBefore = askingVersion ? await versionCards(askingVersion.id, tx) : [];
    const askingDraft = await tx.select({
      oracleId: deckCards.oracleId, quantity: deckCards.quantity,
    }).from(deckCards).where(eq(deckCards.deckId, askingDeckId)).for("update");
    const add = draftDiff(askingDraft, askingBefore).adds
      .find((a) => a.oracleId === oracleId);
    if (!add) return { ok: false, message: "That deck isn't waiting on that card." };

    // And the claim, read under the same locks. An add the reader was offered a
    // pull for is one whose copies are all spoken for; if a copy has come free
    // since the page was drawn — because another deck released it, or because an
    // earlier pull in this same flow already landed — there is nothing to take
    // out of anybody's box and the draft is already covered.
    //
    // `hardDecks`, not the raw claims, for the reason the commit gives: a BREW
    // "holding" a card holds nothing, and a pull against a list that was never
    // sleeved moves no physical card.
    const askingAvailability = await loadAvailability(
      userId,
      { oracleIds: [oracleId], excludeDeckId: askingDeckId },
      tx,
    );
    const holders = hardDecks(askingAvailability.get(oracleId) ?? { claims: [] });

    // The claim this authorizes against has to be one every party of which is
    // locked, or the read above answers for a moment that can still move: a deck
    // outside the lock set can commit a release between this SELECT and the
    // decrement below, and the source would then give up a copy that was already
    // free. The lock set was chosen from a read taken before the transaction, so
    // a claimant that appeared since is possible — and the honest answer to it is
    // to refuse and let the reader ask again against a page that names it, never
    // to authorize a destructive write on a claim half of which is unlocked.
    const unlocked = holders.find((d) => !lockIds.includes(d.id));
    if (unlocked) {
      return { ok: false, message: "Another deck claimed that card. Open the changes again." };
    }

    // `pullSources` here and `hardDecks` above, deliberately. The guard above asks
    // "is every claimant locked", so it must see every claimant — narrowing it would
    // let an unlocked junior deck move under the write. This asks "would taking a
    // copy relieve the shortfall", and a junior claim is already outside this deck's
    // `free`, so the answer over one is no: the copy would leave that deck's box and
    // the figure would not move. Refused, and the purchase stands.
    const sources = pullSources(askingAvailability.get(oracleId) ?? { claims: [] });
    // FAIL CLOSED here, unlike every rendering caller. This read is part of the
    // authorization for a destructive act — the pull takes a copy out of another
    // deck — and a swallowed failure would say "no proxies", authorize a pull for
    // a card the asking deck is not actually short of, and empty somebody's box.
    let askingProxies: ReadonlySet<string>;
    try {
      askingProxies = await proxiedOracleIds(askingDeckId, userId, "throw");
    } catch {
      return { ok: false, message: PROXY_READ_FAILED };
    }
    const [bucketed] = bucketAdds([add], new Map(
      [...askingAvailability].map(([id, a]) => [id, { free: a.free, claims: pullSources(a) }]),
    ), new Set(), askingProxies);
    // A printed card asks the collection for nothing, so there is nothing to
    // pull FOR — the guard below refuses it on `bucket !== "claimed"`, which is
    // the same refusal a covered add already gets.
    if (bucketed.bucket === "proxied") {
      // Its own refusal, before the generic one. "Already has the copies it
      // needs" would be a claim about the collection, and the whole point of a
      // proxy is that the deck is covered while owning nothing — the app must
      // not close that gap with a sentence.
      return { ok: false, message: PULL_REFUSED_PROXIED };
    }
    if (bucketed.bucket !== "claimed" || bucketed.shortfall <= 0) {
      return { ok: false, message: "That deck already has the copies it needs." };
    }

    // The bucket above answers for the CARD: some releasable holder exists. It
    // says nothing about the deck this call named, so on a card with two holders
    // — one senior, one junior — a request naming the junior one would pass on
    // the senior one's strength and decrement a deck whose copy was never this
    // deck's to take. The named source has to be a releasable holder itself.
    if (!sources.some((d) => d.id === sourceDeckId)) {
      return { ok: false, message: "That deck's copy wouldn't cover the shortfall." };
    }

    const version = await newestVersion(sourceDeckId, tx);
    if (!version) return { ok: false, message: "That deck isn't sleeved yet." };
    // The VERSION's commander too, not only the live columns checked above: with a commander change
    // pending, the card can sit in the draft's list while the version still leads with it. A
    // release subtracts from the version's LIST claim only, so that pull would empty the draft and
    // leave the asking deck exactly as short as it was.
    if (version.commanderOracleId === oracleId || version.partnerOracleId === oracleId) {
      return { ok: false, message: "That card is that deck's commander." };
    }

    const before = await versionCards(version.id, tx);
    // `for update`: the deck row's lock does not stop an edit to `deck_cards`, and the decrement
    // below is only as good as the draft still being what it read.
    const draft = await tx.select({
      oracleId: deckCards.oracleId, quantity: deckCards.quantity,
    }).from(deckCards).where(eq(deckCards.deckId, sourceDeckId)).for("update");
    // NO PENDING-CHANGES GUARD (Hugh, 2026-09-27). It existed because the pull committed, and a
    // commit would have swept the source's own draft into a version nobody asked for. Nothing is
    // committed now, so the pull simply joins that draft.
    const inDraft = draft.some((c) => c.oracleId === oracleId);
    // Nothing to release: the version does not list it and the draft does not hold it.
    if (!inDraft && !before.some((c) => c.oracleId === oracleId)) {
      return { ok: false, message: "That deck doesn't hold that card." };
    }

    // A pull takes ONE copy, matching removeCardFromDeck: a deck holding four
    // Relentless Rats keeps three. Delete only when the decrement would hit 0.
    // Skipped for a card the draft has ALREADY cut: its version is the only thing still claiming
    // the copy, and the release below is the whole pull.
    if (inDraft) {
      const decremented = await tx.update(deckCards)
        .set({ quantity: sql`${deckCards.quantity} - 1` })
        .where(and(
          eq(deckCards.deckId, sourceDeckId),
          eq(deckCards.oracleId, oracleId),
          gt(deckCards.quantity, 1),
        ))
        .returning({ oracleId: deckCards.oracleId });
      if (decremented.length === 0) {
        await tx.delete(deckCards)
          .where(and(eq(deckCards.deckId, sourceDeckId), eq(deckCards.oracleId, oracleId)));
        await pruneOrphanProxies(tx, sourceDeckId);
        await pruneOrphanLocks(tx, sourceDeckId);
      }
      // The source's list changed, so it reads as edited, and pending.
      await touchDeck(tx, sourceDeckId);
    }
    // The copy leaves the source's committed claim, which is what frees it for the asking deck.
    await writePullRelease(tx, { userId, sourceDeckId, oracleId, askingDeckId });
    return { ok: true };
  });
  if (!outcome.ok) return outcome;
  revalidateClaims(sourceDeckId, userId);
  revalidateClaims(askingDeckId, userId);
  // After the write and after the revalidation, so it reads the world the
  // reader is about to be shown. A failed read still reports the pull: the card
  // has moved, and losing the sentence about it is not worth undoing that.
  try {
    const state = await loadDraftState(askingDeckId, userId);
    // `claimsKnown` false is the loader's degraded answer, and it reports
    // `buyCount: 0` in that state — an honest zero for a figure it could not
    // compute, not a finished shopping list. Quoting it here would tell the
    // player they have nothing left to buy on the strength of a failed read, so
    // an unknown claim model gets the same null a thrown read gets.
    if (!state.claimsKnown) return { ok: true, buy: null, total: null };
    // A brew gets the same null, for the same reason. The guards above let a
    // versionless asking deck take a pull — with no version to diff against its
    // live rows are all adds — but `loadDraftState` answers for a brew with the
    // bare state, whose `buyCount` is 0 because nothing was measured rather than
    // because nothing is left to buy. Only a deck with a version has a purchase
    // figure this can quote.
    if (state.version === null) return { ok: true, buy: null, total: null };
    return { ok: true, buy: state.buyCount, total: state.total };
  } catch {
    // A null count, not a zero: the pull happened and the figures did not come
    // back, and quoting 0 would announce a finished purchase the server never
    // read. The caller draws the pull and says nothing about buying.
    return { ok: true, buy: null, total: null };
  }
}

/**
 * Which cards the bulk control should tick — chosen by what the deck NEEDS.
 *
 * A SERVER ACTION rather than a client-side selection, and not by preference: the list's pool
 * is `SynergyCard[]`, which carries no `oracleText`, `keywords`, `manaCost` or `ownedQuantity`,
 * and `planFill` needs all four. `mix.ts` states the rule outright — do not re-run
 * `classifyRoles` on the client, because `card.role` is derived from real oracle text on the
 * server and re-classifying with a null text under-counts every text-based role. A control that
 * tried would tick a ramp spell as "other" and call it a creature.
 *
 * THE FAILURE THIS FIXES is a category error rather than a bug. `canSeed` narrows the pool to
 * what the player can sleeve tonight, and the control then took the top N by SYNERGY within it
 * — optimising "what can I sleeve" where the player asked "what does this deck need". Short on
 * creatures, it ticked non-creatures and left the deck worse with no slots left to fix it.
 *
 * `canSeed` is kept exactly as it is. It was the right filter and only ever the wrong objective.
 */
/**
 * THE GATHER, once, for both pools.
 *
 * `chooseBulkFill` and `bulkFillOptions` ask the same five questions of the database — the
 * deck, its commanders, its `deck_cards` rows and what those cards ARE — and differ only in
 * which pool they then plan from. Written twice they would drift, and the pair's whole promise
 * is that the note beside a control describes the press that control makes.
 *
 * Returns `null` for a deck whose commander the catalog cannot resolve, which both callers
 * report as the same refusal.
 */
async function gatherFillInputs(deckId: string, userId: string) {
    const deck = await requireDeck(deckId, userId);
    const [commander] = await db.select().from(cards)
      .where(eq(cards.oracleId, deck.commanderOracleId));
    if (!commander) return null;
    // The partner legalises the pool alongside the primary, exactly as the create path reads it.
    const [partner] = deck.partnerOracleId
      ? await db.select().from(cards).where(eq(cards.oracleId, deck.partnerOracleId))
      : [];
    // THE DECK AS IT STANDS, not just its ids. `planFill` counts role coverage from zero
    // unless it is told otherwise, and every caller before this one filled an empty deck —
    // so asking for four slots returned the first four placements of a from-scratch 99. A
    // deck holding twenty ramp sources and no draw was offered four more ramp, which is the
    // exact failure this control exists to end.
    const heldRows = await db.select({
      oracleId: deckCards.oracleId,
      quantity: deckCards.quantity,
    }).from(deckCards).where(eq(deckCards.deckId, deckId));

    // A SECOND READ rather than a join, because the two questions are different: the rows say
    // what the deck holds, the catalog says what those cards ARE. A held card need not be in
    // the collection at all — sold, traded, or never owned and proxied — so this cannot come
    // off the owned pool that the candidates are drawn from.
    const heldIds = heldRows.map((r) => r.oracleId);
    const heldCards = heldIds.length === 0 ? [] : await db.select({
      oracleId: cards.oracleId,
      typeLine: cards.typeLine,
      oracleText: cards.oracleText,
      keywords: cards.keywords,
      layout: cards.layout,
      manaCost: cards.manaCost,
    }).from(cards).where(inArray(cards.oracleId, heldIds));
    const heldById = new Map(heldCards.map((c) => [c.oracleId, c]));
    const heldCount = heldRows.reduce((n, r) => n + r.quantity, 0);
    const held = heldRows.flatMap((r) => {
      const card = heldById.get(r.oracleId);
      // A row whose card the catalog no longer resolves is dropped rather than counted as a
      // typeless, textless card: classifying that would credit no role and tally no type,
      // which is a silent undercount dressed as data.
      return card ? [{ ...card, quantity: r.quantity }] : [];
    });

  return { deck, commander, partner, heldIds, heldCount, held };
}

type FillInputs = NonNullable<Awaited<ReturnType<typeof gatherFillInputs>>>;

/**
 * One plan, from one pool. `sleeveable` is what the collection control offers; `all` is what
 * the deck needs whoever owns it.
 */
/**
 * THE ROWS THE TOP-OFF LIST DRAWS, as ids: the plan behind a bulk control may pick only these.
 *
 * The list is the commander's EDHREC support list less the deck's own cards and the negative
 * tail (`listLastSlotsCandidates`), while the plan's pool is the whole owned collection. So a
 * control could plan cards the list has no row for, name a count, and tick nothing. Read through
 * the page's own cached read (`readDeckSynergy`) and the page's own filter, so the two are served
 * the same entry and cannot disagree.
 */
async function topOffAllowList(userId: string, inputs: FillInputs): Promise<ReadonlySet<string>> {
  const { commander, partner, heldIds } = inputs;
  // THE PAGE'S OWN CACHED READ, not a fresh one: the list on screen is served from that entry, and
  // a fresh read would disagree with it until the entry lapsed (`readDeckSynergy`).
  const ranked = await readDeckSynergy(userId, commander.oracleId, partner?.oracleId ?? null);
  return new Set(
    listLastSlotsCandidates({ ranked, inDeckOracleIds: new Set(heldIds) }).map((c) => c.oracleId),
  );
}

async function planFromPool(
  userId: string,
  deckId: string,
  inputs: FillInputs,
  openSlots: number,
  pool: "all" | "sleeveable",
  allowed: ReadonlySet<string>,
) {
  const { deck, commander, partner, heldIds, heldCount, held } = inputs;
    return await buildFillPlan(
      userId,
      partner ? [commander, partner] : [commander],
      // The deck's own cards are not candidates for filling it.
      new Set(heldIds),
      // THE POOL IS THE CALLER'S. The collection control promises cards the player can put in
      // the deck tonight; the other one asks what the deck needs and lets the note say what
      // that costs.
      {
        pool,
        // Only the cards the list on screen draws: a planned card with no row there is a tick
        // with nowhere to land. It binds the catalog's basics as well as the candidates.
        onlyOracleIds: allowed,
        // Nothing is placed beside this plan: the excluded ids are the deck's own rows, and they
        // reach the plan through `held`, so listing them here would count them twice.
        selected: [],
        // So this deck's own claims are not counted as competition for itself when the pool
        // is narrowed to cards with a free copy.
        excludeDeckId: deckId,
        // BOUNDED BY THE DECK, not only by the caller. `Number.isInteger` accepts 1e308, and
        // the shape guard above says nothing about size.
        //
        // NOT ASSERTED, and the reason is worth keeping: the ANSWER is already bounded by the
        // residual filter below, which drops every row past the floors and the mana base — so
        // no value of `slots` can make this return an unbounded id list, and a test on the
        // returned ids passes with or without this line. What it bounds is the WORK: without
        // it `planFill` places and scans across the whole owned pool before those rows are
        // thrown away. That is not observable through the action's return value, so it is
        // stated here rather than pinned by a case that would measure nothing.
        slots: Math.min(
          openSlots,
          Math.max(0, deckBodySize(Boolean(deck.partnerOracleId)) - heldCount),
        ),
        // Only what role and type classification read. `HeldCard` asks for no more, because
        // a card already sleeved is past the question of whether to choose it.
        // THE COMMANDERS ARE NOT IN HERE, and the codebase had already ruled it: the measured
        // role targets come from EDHREC's support lists, which never contain the commander,
        // so a floor of ten ramp describes the 99 rather than the 100. `profile/types.ts`
        // carries a whole second field for exactly this — the classification "over the 99
        // ALONE" — with the instruction to use it ONLY against a measured target, because
        // `counts` folds commanders in to match the stats loader.
        //
        // An earlier round of this PR asked for them to be added, citing the path where they
        // ARE folded in. That path answers a different question. Counting a ramp commander
        // here closed a unit of a floor the support lists never asked it to close, and
        // returned one fewer real card for the deck.
        held: held.map((h) => ({
          oracleId: h.oracleId,
          typeLine: h.typeLine, oracleText: h.oracleText,
          keywords: h.keywords ?? [], layout: h.layout, manaCost: h.manaCost,
          quantity: h.quantity,
        })),
      },
    );
}

/** One tick is one card, so a stacked row cannot be expressed. See the note in
 *  `chooseBulkFill` — this is that rule, shared by both callers. */
function sleeveableIds(plan: { rows: readonly FillRow[] }) {
  // A staple is kept whatever its role (H25): a roleless one (Swiftfoot Boots) is filed `other`
  // and is not the residual this drops.
  return plan.rows
    .filter((r) => !isResidual(r) && r.quantity === 1)
    .map((r) => r.oracleId);
}

/**
 * BOTH FILLS, BEFORE EITHER PRESS.
 *
 * The bulk pair's locked requirement is that a player can compare what each control concedes
 * WITHOUT pressing one to find out — so the notes beside them are figures from real plans
 * against this player's collection, not estimates. That means both plans run when the list
 * opens rather than when a button is pressed.
 *
 * It also means the press costs no round trip: the ids the note was computed from are the ids
 * the press applies. A second call would re-plan against a deck that may have moved, and the
 * note would then describe a selection the press did not make — which is the failure this
 * whole pair exists to end, arriving from the other side.
 *
 * `shortfalls` and `measuredTypes` travel per pool because they differ per pool: the
 * collection fill is the one that can leave a gap it had no card for.
 */
export async function bulkFillOptions(
  deckId: string,
  openSlots: number,
): Promise<
  | {
      ok: true;
      collection: { oracleIds: string[]; shortfalls: FillShortfall[]; measuredTypes: boolean };
      best: { oracleIds: string[]; shortfalls: FillShortfall[]; measuredTypes: boolean };
    }
  | { ok: false; message: string }
> {
  // THE SAME GUARD `chooseBulkFill` TAKES, and for the same reason: a server action is a
  // public endpoint, `<= 0` alone lets `NaN` through (every comparison with it is false), and
  // `planFill` then plans a whole 99 for a control that asked for a handful of slots.
  if (!Number.isInteger(openSlots) || openSlots <= 0) {
    const empty = { oracleIds: [], shortfalls: [], measuredTypes: false };
    return { ok: true, collection: empty, best: { ...empty } };
  }

  try {
    const userId = await requireUserId();
    const inputs = await gatherFillInputs(deckId, userId);
    if (!inputs) return { ok: false, message: synergyCopy.lastSlots.topUpFailed };

    // SEQUENTIAL, not `Promise.all`. Both plans read EDHREC through `getEdhrecData` for the
    // same commander, and firing them together races two cold fetches for one answer where
    // the second would have been served from the cache the first fills.
    const allowed = await topOffAllowList(userId, inputs);
    const collection = await planFromPool(userId, deckId, inputs, openSlots, "sleeveable", allowed);
    const best = await planFromPool(userId, deckId, inputs, openSlots, "all", allowed);

    return {
      ok: true,
      collection: {
        oracleIds: sleeveableIds(collection),
        shortfalls: collection.shortfalls,
        measuredTypes: collection.measuredTypes,
      },
      best: {
        oracleIds: sleeveableIds(best),
        shortfalls: best.shortfalls,
        measuredTypes: best.measuredTypes,
      },
    };
  } catch (err) {
    console.error("bulkFillOptions failed", err);
    return { ok: false, message: synergyCopy.lastSlots.topUpFailed };
  }
}

export async function chooseBulkFill(
  deckId: string,
  openSlots: number,
): Promise<{ ok: true; oracleIds: string[] } | { ok: false; message: string }> {
  // A SERVER ACTION IS A PUBLIC ENDPOINT, and `openSlots` arrives from the caller. `<= 0` is
  // not enough on its own: `NaN` passes it (every comparison with NaN is false), and reaches
  // `planFill` as `slots: NaN`, where `filledSoFar() >= limit` is false forever — so the guard
  // meant to cap the answer at a handful of slots instead lets it plan a whole 99. A
  // fractional 1.5 has a smaller version of the same problem, admitting two rows before the
  // check bites.
  if (!Number.isInteger(openSlots) || openSlots <= 0) return { ok: true, oracleIds: [] };

  try {
    const userId = await requireUserId();
    const inputs = await gatherFillInputs(deckId, userId);
    if (!inputs) return { ok: false, message: synergyCopy.lastSlots.topUpFailed };
    const plan = await planFromPool(
      userId, deckId, inputs, openSlots, "sleeveable", await topOffAllowList(userId, inputs),
    );
    // FEWER THAN THE SLOTS IS A VALID ANSWER, and the residual is what made that untrue.
    //
    // `planFill` always runs a residual pass after the role and land passes, filling whatever
    // `slots` remain with the next cards by preference — right for a CREATE, which owes a
    // whole 99 and would otherwise hand back a part-built deck. Here it is the failure this
    // control exists to end: with the floors unmeetable from the sleeveable pool, every open
    // slot went to "whatever ranked next", which is the synergy ordering wearing a different
    // hat.
    //
    // So the residual is dropped and the slot stays open. An open slot can still be fixed by
    // a player who buys the card the deck wants; a slot spent on a card the deck does not
    // need cannot be, without undoing it first.
    // ONE TICK IS ONE CARD, so a stacked row cannot be expressed here. `plan.rows` is
    // quantity-aware — the land sweep puts several copies of one basic in a single row — while
    // this answers with ids and `runTopOff` inserts each at quantity 1. Returning a row of
    // three Forests as one id would promise three cards and sleeve one, and the count on the
    // button would be wrong in the player's favour, which is the worse direction.
    //
    // Dropped rather than expanded into repeats: the list this feeds ticks each candidate at
    // most once, so three copies have nowhere to go on that surface either.
    return { ok: true, oracleIds: sleeveableIds(plan) };
  } catch (err) {
    console.error("chooseBulkFill failed", err);
    return { ok: false, message: synergyCopy.lastSlots.topUpFailed };
  }
}
