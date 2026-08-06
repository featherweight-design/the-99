// Unresolved group — the `Couldn't identify` group, pinned last in the decklist.
// Server-pure (no "use client" directive).
// §`Couldn't identify` group header, §Unresolved row (design table).
//
// A sibling of DecklistGroup rather than a variant of it: the row component,
// the count colour, the desktop right note, the sort key and the Shopping-filter
// behaviour all differ, which is most of the component. Only the header is
// genuinely shared, and it is shared as a component.

import { deckImportCopy } from "../../lib/copy/deck-import";
import { unresolvedCardCount, type DeckUnresolvedRow } from "../../lib/decks/grouping";
import { DecklistGroupHeader } from "./decklist-group-header";
import { UnresolvedRow } from "./unresolved-row";

const copy = deckImportCopy.unresolved;

interface UnresolvedGroupProps {
  rows: DeckUnresolvedRow[];
}

export function UnresolvedGroup({ rows }: UnresolvedGroupProps) {
  if (rows.length === 0) return null;

  // Import order, not alphabetical: the player is looking for the line they can
  // see in the list they pasted.
  const ordered = rows.slice().sort((a, b) => a.sourceLine - b.sourceLine);

  return (
    <section className="mb-[16px] md:mb-[20px]" aria-labelledby="unresolved-h">
      <DecklistGroupHeader
        label={copy.groupLabel}
        count={unresolvedCardCount(ordered)}
        countColor="#E0913C"
        note={copy.groupNote}
        headingId="unresolved-h"
      />

      <div
        className="flex flex-col gap-[3px] md:grid md:gap-y-[4px] md:gap-x-[20px]"
        style={{ gridTemplateColumns: "1fr 1fr" }}
      >
        {ordered.map((row) => (
          <UnresolvedRow key={row.id} row={row} />
        ))}
      </div>

      <p
        className="text-[12px] leading-[1.55] mt-[10px] md:text-[12.5px] md:leading-[1.6] md:mt-[12px]"
        style={{ color: "#8E8269" }}
      >
        <span className="md:hidden">{copy.footnoteMobile}</span>
        <span className="hidden md:inline">{copy.footnote(ordered.length)}</span>
      </p>
    </section>
  );
}
