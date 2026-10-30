"use client";

import { Fragment } from "react";

import { normalizeName } from "../../lib/synopsis/facts";
import type { CheckedSynopsis } from "../../lib/synopsis/types";
import { CardDetailFlowTrigger } from "../cards/card-detail-flow-trigger";
import { usePreviewRow } from "./hover-preview";
import type { FindingArt } from "./receipt-modal";

/**
 * Overview prose with its card names live (brief §3.2): every `[[Name]]` mark the accept contract
 * resolved opens that card, as a name in a receipt does, and shows the shared hover preview.
 *
 * Drawn bold `--fg` 600 on the dotted `--accent` card-open underline (`SYNOPSIS-modal.md`). A mark
 * with no resolved card cannot reach here, because a section holding one is refused whole; one is
 * still drawn as its plain name rather than as a broken control.
 */
const MARK = /\[\[([^\[\]]+)\]\]/g;

export function SynopsisText({
  text,
  cards,
  art,
}: {
  text: string;
  cards: CheckedSynopsis["cards"];
  art: FindingArt;
}) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(MARK)) {
    if (m.index! > last) parts.push(text.slice(last, m.index));
    const card = cards[normalizeName(m[1])];
    parts.push(card
      ? <CardName key={m.index} oracleId={card.oracleId} name={m[1]} imageUri={art.get(card.oracleId)?.imageUri ?? null} />
      : <Fragment key={m.index}>{m[1]}</Fragment>);
    last = m.index! + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

export function CardName({ oracleId, name, imageUri }: { oracleId: string; name: string; imageUri: string | null }) {
  const preview = usePreviewRow(imageUri);
  return (
    // A press opens the card modal under the pointer, and a box raised above the sheet it was
    // hovered in would sit above that modal too: the press closes it.
    <span {...preview} onClickCapture={preview.onMouseLeave} className="inline" data-testid="synopsis-card">
      <CardDetailFlowTrigger
        oracleId={oracleId}
        name={name}
        className="inline font-semibold text-[var(--fg)] [border-bottom:1px_dotted_var(--accent)] cursor-pointer"
      >
        {name}
      </CardDetailFlowTrigger>
    </span>
  );
}
