// /decks/[id]/changes — §Surfaces 2, the review page. What the draft is about to
// commit: what comes in, what goes out, and what it costs.
import { notFound, redirect } from "next/navigation";
import { requireUserId } from "../../../../lib/auth";
import { getDeckReviewHeader } from "../../../../lib/decks/read";
import { deckBodySize } from "../../../../lib/decks/deck-size";
import {
  changeCount, loadDraftRows, loadDraftShape, loadVersionShape,
} from "../../../../lib/decks/draft-state";
import { ReviewChanges } from "../../../../components/decks/review-changes";
import { admitsReview } from "./admits-review";
import { isUuid } from "../../../../lib/uuid";

export default async function ChangesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ commit?: string }>;
}) {
  const { id } = await params;
  const { commit } = await searchParams;
  // See the note in `versions/page.tsx`: a malformed segment reaching a uuid
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
  // `changeCount` counts NAMED rows, which is not the same question as "is there
  // anything to commit": a basics-only edit names no card and still has a version
  // to cut, so a count alone would bounce it.
  //
  // A brew is the third case, and it is the readiness test rather than the bare
  // absence of a version. Its draft has no change lists at all — there is nothing
  // to diff against — so the page is purely the v1 commit surface, and a brew
  // that cannot cut v1 has no reason to be here. Admitting one drew an empty page
  // under a heading counting changes against a version it does not have, over a
  // bar offering a commit the server then refused.
  //
  // `?commit=1` is the banner's CTA arriving — §Surfaces 5's second entry point
  // into the one commit surface — or, on a brew, the spine's `Commit as v1`.
  const wantsCommit = commit === "1";

  // Both empty-column cases are admitted ONLY as that arrival — see
  // `admitsReview`, which holds the rule and is where it is tested.
  const admitted = admitsReview({
    changes: changeCount(state),
    basicsChanged: state.basicsChanged,
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
  const [before, after] = await Promise.all([
    state.version ? loadVersionShape(state.version.id) : Promise.resolve(null),
    loadDraftShape(id),
  ]);

  return (
    <ReviewChanges
      deckId={id}
      deckName={detail.name}
      rows={rows}
      state={state}
      before={before}
      after={after}
      commitOpen={wantsCommit}
      // `built`, not `total`: the snapshot holds the matched cards, and `total`
      // adds the unresolved lines no version can freeze.
      cardCount={detail.built}
    />
  );
}
