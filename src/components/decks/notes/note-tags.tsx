"use client";

import { useCardDetail } from "../../cards/card-detail-provider";
import { deckNotesCopy } from "../../../lib/copy/deck-notes";
import type { NoteDrawn } from "../../../lib/decks/notes-types";
import { usePreviewRow } from "../hover-preview";

/**
 * One tag. The card's name at 500 weight, a solid underline when the deck holds the card and a dashed one
 * when it does not (never held and since removed draw the same: nothing records the difference). A press
 * opens card details through the deck's provider, so the sheet's deck-scoped controls behave as from a
 * decklist row; on a desktop the shipped hover preview shows the card. A tag that cannot resolve is
 * drawn as plain text by `NoteTags`, with no press.
 */
function NoteTag({ tag, faint }: { tag: Extract<NoteDrawn, { kind: "tag" }>; faint: boolean }) {
  const { open } = useCardDetail();
  const preview = usePreviewRow(tag.imageUri);
  return (
    <button
      type="button"
      aria-label={deckNotesCopy.row.tagAria(tag.name)}
      onClick={(e) => open(tag.oracleId, undefined, null, { opener: e.currentTarget })}
      {...preview}
      className={`m-0 cursor-pointer border-0 bg-transparent p-0 font-sans font-medium underline underline-offset-[3px] decoration-1 ${tag.held ? "decoration-solid" : "decoration-dashed"} ${faint ? "text-[color:var(--fg-muted)] decoration-[color:var(--fg-locked)]" : "text-[color:var(--fg)] decoration-[color:var(--fg-faint)]"}`}
    >
      {tag.name}
    </button>
  );
}

export function NoteTags({ drawn, faint = false }: { drawn: readonly NoteDrawn[]; faint?: boolean }) {
  return (
    <>
      {drawn.map((s, i) =>
        s.kind === "text" || !s.resolved ? (
          <span key={i}>{s.kind === "text" ? s.text : s.name}</span>
        ) : (
          <NoteTag key={i} tag={s} faint={faint} />
        ),
      )}
    </>
  );
}
