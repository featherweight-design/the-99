// /decks/[id]/changes — §Surfaces 2, the review page. What the draft is about to
// commit: what comes in, what goes out, and what it costs.
import { notFound, redirect } from "next/navigation";
import { requireUserId } from "../../../../lib/auth";
import { getDeckDetail } from "../../../../lib/decks/read";
import { deckBodySize } from "../../../../lib/decks/deck-size";
import { changeCount, loadDraftRows } from "../../../../lib/decks/draft-state";
import { ReviewChanges } from "../../../../components/decks/review-changes";

export default async function ChangesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ commit?: string }>;
}) {
  const { id } = await params;
  const { commit } = await searchParams;
  const userId = await requireUserId();

  // The ownership guard every deck route carries. `loadDraftRows` takes a
  // `userId` to scope availability, NOT to prove the deck is this reader's —
  // without this line any signed-in account could read another player's draft by
  // id. Same two lines as `src/app/decks/[id]/page.tsx`.
  const detail = await getDeckDetail(id, userId);
  if (!detail) notFound();

  // One read, not two: `loadDraftRows` calls the same loader `loadDraftState`
  // does and returns its answer on `state`. Asking for both in a `Promise.all`
  // runs the whole diff, availability and price chain twice for one page.
  const { state, rows } = await loadDraftRows(id, userId);

  // A committed or discarded draft leaves this page with nothing to review, and a
  // bare empty state would read as a bug. The deck page is where the version line
  // now is, so that is where the reader goes.
  //
  // `changeCount` counts NAMED rows, which is not the same question as "is there
  // anything to commit". A basics-only edit names no card, and a brew has no
  // version to diff against at all — both have a version to cut, and both would
  // be bounced straight back to the deck page by a count alone.
  //
  // `?commit=1` is deliberately NOT an exception to this test. The two cases it
  // used to excuse are both named above, so all the query could still let through
  // is a clean committed deck — where the sheet would offer a version identical
  // to the one behind it.
  const hasSomethingToCommit =
    changeCount(state) > 0 || state.basicsChanged || state.version === null;
  if (!hasSomethingToCommit) redirect(`/decks/${id}`);

  // `?commit=1` is the banner's CTA arriving — §Surfaces 5's second entry point
  // into the one commit surface. On a brew it is the spine's `Commit as v1`
  // instead, and that offer is gated on a whole list, so an arriving URL is held
  // to the same test: a stale or hand-typed link would otherwise open the sheet
  // over a 63-card brew. `commitDeckVersion` enforces this too, and has to — this
  // only decides whether the sheet is worth opening.
  const firstCommitReady =
    detail.built === deckBodySize(detail.partner !== null) && detail.unresolvedRows.length === 0;
  const wantsCommit = commit === "1" && (state.version !== null || firstCommitReady);

  return (
    <ReviewChanges
      deckId={id}
      deckName={detail.name}
      rows={rows}
      state={state}
      commitOpen={wantsCommit}
      // `built`, not `total`: the snapshot holds the matched cards, and `total`
      // adds the unresolved lines no version can freeze.
      cardCount={detail.built}
    />
  );
}
