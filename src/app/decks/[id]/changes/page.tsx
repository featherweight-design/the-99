// /decks/[id]/changes — §Surfaces 2, the review page. What the draft is about to
// commit: what comes in, what goes out, and what it costs.
import { notFound, redirect } from "next/navigation";
import { requireUserId } from "../../../../lib/auth";
import { getDeckReviewHeader, loadSourceDeckFigures, type SourceDeckFigure } from "../../../../lib/decks/read";
import { latestReleaseSources, type ReleaseSource } from "../../../../lib/decks/pull-release";
import { pullSourceChoices } from "../../../../lib/decks/draft-shape";
import { indexGeneration } from "../../../../lib/cache/index-generation";
import { cacheForUser } from "../../../../lib/cache/user-lists";
import { loadDeckMix } from "../../../../lib/decks/deck-mix";
import { loadJobRows } from "../../../../lib/decks/job-rows";
import { labelRoleCountsEnabled } from "../../../../lib/decks/label-counts-flag";
import { deckBodySize } from "../../../../lib/decks/deck-size";
import {
  changeCount, loadDraftRows, loadDraftShape, loadVersionShape,
} from "../../../../lib/decks/draft-state";
import { ReviewChanges } from "../../../../components/decks/review-changes";
import { countContestedCards } from "../../../../lib/collection/summary-read";
import { admitsReview } from "./admits-review";
import { isUuid } from "../../../../lib/uuid";
import { commanderKeyParts } from "../../../../lib/commander-change/mix-key";

// Versioned like every other cached payload here, though since the deployment joined every
// `cacheForUser` key (`cache/deployment.ts`) a deploy already keeps a mix that grows a field
// from being read back out of an entry that lacks it; the version is kept, not relied on.
//
// WHY A DECK ID IS A SAFE KEY. The mix is a function of the deck's commanders and of the
// commander index, and neither can move under this entry:
//
//   - A deck's `commander_oracle_id` and `partner_oracle_id` are written once, by the two
//     inserts that create a deck, and by nothing else — there is no UPDATE of either column
//     anywhere in `src/`. A deck's commanders are immutable for its life. **A feature that
//     lets a player change a commander breaks that, and would have to drop this entry**;
//     nothing here would fail loudly if it did not.
//   - The index moves monthly, and `cacheForUser` carries the CATALOG generation, which a
//     `Commander index` run stamps only when it ENDS (on every exit, since 2026-09-28). The mix
//     should follow the index as it is written, so the index generation goes in the key here,
//     alongside the deck id. The window it closes is an hour once a month,
//     which sounds ignorable until you ask WHICH hour: the first run that writes role
//     averages flips every deck from an asserted baseline to a measured one, and serving the
//     old figure through that hour, on the page that explains what changed, is the worst
//     hour of the month to be stale in.
const DECK_MIX_KEY = ["deck-mix", "1"];

export default async function ChangesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ commit?: string }>;
}) {
  const { id } = await params;
  const { commit } = await searchParams;
  // See the note in `decks/[id]/page.tsx`: a malformed segment reaching a uuid
  // column is a 500 where the route means not-found.
  if (!isUuid(id)) notFound();
  const userId = await requireUserId();

  // The ownership guard every deck route carries. `loadDraftRows` takes a
  // `userId` to scope availability, NOT to prove the deck is this reader's —
  // without this line any signed-in account could read another player's draft by
  // id. The deck page's own loader would answer the same four questions and read
  // a whole deck to do it, so this route has a header loader of its own.
  const detail = await getDeckReviewHeader(id, userId);
  if (!detail) notFound();

  // One read, not two: `loadDraftRows` calls the same loader `loadDraftState`
  // does and returns its answer on `state`. Asking for both in a `Promise.all`
  // runs the whole diff, availability and price chain twice for one page.
  const { state, rows } = await loadDraftRows(id, userId);

  // The spine's `Commit as v1` offer, re-derived: a versionless list exactly its
  // pair-aware body size with nothing unresolved. `commitDeckVersion` enforces
  // this too, and has to — this only decides what the page is for.
  const firstCommitReady =
    detail.built === deckBodySize(detail.hasPartner) && detail.unresolvedCount === 0;

  // A committed or discarded draft leaves this page with nothing to review, and a
  // bare empty state would read as a bug. The deck page is where the version line
  // now is, so that is where the reader goes.
  //
  // `changeCount` counts every card the draft moved, basics among them, so it is
  // the whole test of whether there is anything to review.
  //
  // A brew is the other case, and it is the readiness test rather than the bare
  // absence of a version. Its draft has no change lists at all — there is nothing
  // to diff against — so the page is purely the v1 commit surface, and a brew
  // that cannot cut v1 has no reason to be here. Admitting one drew an empty page
  // under a heading counting changes against a version it does not have, over a
  // bar offering a commit the server then refused.
  //
  // `?commit=1` is the banner's CTA arriving — §Surfaces 5's second entry point
  // into the one commit surface — or, on a brew, the spine's `Commit as v1`.
  const wantsCommit = commit === "1";

  // The empty-column case is admitted ONLY as that arrival — see
  // `admitsReview`, which holds the rule and is where it is tested.
  const admitted = admitsReview({
    changes: changeCount(state),
    hasVersion: state.version !== null,
    firstCommitReady,
    wantsCommit,
  });
  if (!admitted) redirect(`/decks/${id}`);

  // The shape strip's two lists, each a read of its own: neither a version's
  // cards nor the header loader's figures carry the role and type line the strip
  // tallies by. Read after the admission test, not before it, so a visit that
  // redirects pays for neither. A brew gets a null `before` rather than a skipped
  // strip — the deck still has a shape, and what it has is no previous figure to
  // compare it against.
  //
  // Outside the snapshot the state and the rows came out of, deliberately, and on
  // the same terms as the claim and price reads there: an edit landing between
  // the two would make the strip's figures a moment older than the columns', and
  // every write to this deck revalidates the page that drew them. Folding two
  // more round trips into that transaction would hold it open to buy consistency
  // between two readings of a list the reader is about to commit anyway.
  // Every (sourceDeckId, oracleId) pair the picker could show, across every claimed row on
  // this page — batched into ONE read rather than one per row (addendum R1, "Pull it picks
  // its source deck"). A row the claim read failed on is skipped: `pullSourceChoices` needs
  // an `Availability` to filter, and `loadDraftRows` already renders the unknown-claims state
  // for that case.
  const claimedInRows = rows.in.filter((r) => r.bucket === "claimed");
  const sourcePairs = claimedInRows.flatMap((r) =>
    pullSourceChoices(r.availability ?? undefined).map((c) => ({ deckId: c.id, oracleId: r.oracleId })),
  );
  // EVERY incoming row, not just `claimed` ones — found by the pre-open review: a successful
  // pull releases the source's claim, which moves the asking deck's OWN row out of `claimed`
  // (it now reads `free`) on the very next load. Scoping this to `claimed` meant the post-pull
  // "pulled from {deck}" label could never find the release that caused the row to leave that
  // bucket in the first place — the single most common case this addendum exists for.
  const inOracleIds = [...new Set(rows.in.map((r) => r.oracleId))];

  const [before, after, contestedCount, sourceFigures, releaseSources] = await Promise.all([
    state.version ? loadVersionShape(state.version.id) : Promise.resolve(null),
    loadDraftShape(id),
    // THE INCOMING ROWS ONLY, read UNEXCLUDED, and degrading to nothing.
    //
    // Incoming: an outgoing row is a card this draft is REMOVING, and committing that removal
    // prunes any reservation made for it, so counting it here would count a row the next commit
    // makes irrelevant. It would also leave the `still short` chip counting a row `Put back` has
    // optimistically taken off the page.
    //
    // Unexcluded: the queue's subject is the committed decks INCLUDING the one the reader is
    // looking at, and this page's own rows are loaded from that deck's vantage.
    //
    // Swallowed: the rest of this page already degrades when a claim read fails — `loadDraftRows`
    // catches its own and renders the unknown-claims state — and an uncaught one here would turn
    // the same transient failure into a route error, losing the whole review to lose a chip.
    // PROXIED ADDS EXCLUDED. A printed card asks the collection for nothing — the draft buckets
    // it as `proxied` precisely because no physical copy is owed — so counting it here would
    // count a copy no deck is actually short of.
    countContestedCards(rows.in.filter((r) => !r.proxied).map((r) => r.oracleId), userId)
      .catch(() => 0),
    // "→ {n} cards" per candidate source — degrades to an empty map, same as the contested
    // count above: a failed read omits the figure rather than drawing a wrong one.
    loadSourceDeckFigures(sourcePairs, userId).catch(() => new Map<string, SourceDeckFigure>()),
    // The post-pull "pulled from {deck}" label, for every incoming row — see the note above
    // `inOracleIds` for why this is not scoped to `claimed`. A row with no release yet (never
    // pulled, or pulled before this read existed) simply has no entry.
    latestReleaseSources(userId, id, inOracleIds).catch(() => new Map<string, ReleaseSource>()),
  ]);

  // The same mix the deck page draws, through the one reader that defines it — the
  // what-changed strip and the deck's own strip are the same five cells about the same deck,
  // and two independently written reads would be two chances to disagree about what it is
  // measured against. This route holds only a deck id, so it asks by id; the deck page has
  // the suggestions payload and takes it from there. `loadDeckMix` never throws.
  //
  // CACHED, because this route is revisited: a reader opens the review, goes back to fix a
  // slot, and returns. The mix is five integers keyed on a deck id, so the entry is tiny and
  // the basis chain behind it is the ~170ms part of a profile build. Not `cachedDeckProfile`
  // — that assembles bracket flags, the Spellbook aggregation, tutor classification and the
  // staples join for the same five integers, measured at 632-831ms steady state.
  const mix = await cacheForUser(
    userId,
    // Change commander: the live commander joins the key, switch on only (audit F5).
    [...DECK_MIX_KEY, id, await indexGeneration(), ...(await commanderKeyParts(id))],
    () => loadDeckMix(id, userId),
  );

  // The strip counts by label when the switch is on, so the label rows cover every card it folds:
  // both lists and the removed rows a restore puts back. Null (switch off, or the read failed)
  // counts by role exactly as before.
  const labelRows = labelRoleCountsEnabled()
    ? await loadJobRows([
        ...(before ?? []), ...after,
        ...rows.out.map((r) => ({ oracleId: r.oracleId, typeLine: r.typeLine })),
      ].filter((c): c is { oracleId: string; typeLine: string } => c.oracleId !== undefined))
    : null;
  // The switch is on but the read failed: counts fall back to the classifier, so the targets do too.
  const shownMix = labelRoleCountsEnabled() && !labelRows ? await loadDeckMix(id, userId, "classifier") : mix;

  return (
    <ReviewChanges
      mix={shownMix}
      labelRows={labelRows}
      deckId={id}
      deckName={detail.name}
      rows={rows}
      state={state}
      contestedCount={contestedCount}
      before={before}
      after={after}
      sourceFigures={sourceFigures}
      releaseSources={releaseSources}
      commitOpen={wantsCommit}
      // `built`, not `total`: the snapshot holds the matched cards, and `total`
      // adds the unresolved lines no version can freeze.
      cardCount={detail.built}
    />
  );
}
