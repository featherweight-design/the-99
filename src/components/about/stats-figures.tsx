"use client";

// The body of chapter 04's `decks-stats` figure (Stats on /decks, PR 5): the shipped Cards your decks share on
// fixture props, inert like every specimen (`Specimen` sets `pointer-events: none`), so nothing opens.

import { CardDetailProvider } from "../cards/card-detail-provider";
import { SharedBody } from "../decks/lineup/shared-card";
import { DECKS_STATS_DECKS, DECKS_STATS_SHARED } from "../../lib/about/fixtures";

export function DecksStatsFigureBody() {
  return (
    <CardDetailProvider fetchCard={async () => null}>
      <div className="flex flex-col gap-[10px]">
        <SharedBody shared={DECKS_STATS_SHARED} decks={DECKS_STATS_DECKS} cartEnabled={false} />
      </div>
    </CardDetailProvider>
  );
}
