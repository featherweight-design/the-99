// Surface 1, state 2 — the offer to lock a versionless list as v1.
//
// In the spine beside `Export`, not in a banner: a deck that has never been
// committed has nothing pending, so there is no draft for a banner to be about.
// Outline and never the cream primary — making a deck's claims hard is a real
// consequence and not the app's goal for the player.

import Link from "next/link";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";

const copy = deckVersioningCopy.pending;

export function FirstCommitOffer({ deckId }: { deckId: string }) {
  return (
    // The control alone. The mono note that used to sit beside it is CUT: it
    // spent two lines and ~188px of the spine's narrowest row explaining that a
    // commit does not change the deck, which is what `Commit as v1` already
    // says, and the review page it links to describes the commit properly before
    // anything is locked. Nothing is decided on this note that is not decided
    // one click later.
    //
    // No wrapper row survives it. A flex container around one item is a box that
    // only affects how much of the row this offer claims, and it claimed too
    // much: the whole of #641 was that claim resolving the deck's title column
    // to 0px.
    <Link
      href={`/decks/${deckId}/changes?commit=1`}
      className="inline-flex items-center rounded-[8px] px-[16px] py-[9px] font-sans font-medium text-[13px] text-[color:var(--fg)] no-underline [border:1px_solid_var(--border-strong)]"
    >
      {copy.firstCommitCta}
    </Link>
  );
}
