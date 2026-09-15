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
    <div className="flex flex-wrap items-center gap-[12px]">
      <Link
        href={`/decks/${deckId}/changes?commit=1`}
        className="inline-flex items-center rounded-[8px] px-[16px] py-[9px] font-sans font-medium text-[13px] text-[color:var(--fg)] no-underline [border:1px_solid_var(--border-strong)]"
      >
        {copy.firstCommitCta}
      </Link>
      {/* Capped, so the sentence wraps to the two lines the canvas draws it on.
          Uncapped it is one ~318px line, and in the desktop spine — where this
          offer sits in a row that sizes to its content — those 318px came out
          of the title column, which reached 0px: the deck's name, its commander
          line and its progress bar all measured zero and drew nothing. The cap
          is what makes the wrapper's `flex-wrap` above reachable at all. */}
      <span className="font-mono max-w-[188px] text-[10px] leading-[1.45] text-[color:var(--fg-locked)]">
        {copy.firstCommitNote}
      </span>
    </div>
  );
}
