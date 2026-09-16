"use client";

// The collection browse client boundary: the card modal's provider, and the one thing the
// list needs back out of it.
//
// A printing pick is written from inside `CardDetailProvider`, and it changes what the row
// and the tile behind the modal should draw — the art, the set code, and the printed name.
// Nothing tells them: `revalidatePath` does not refresh a mounted client route, and window
// focus does not fire for an action taken in this tab.
//
// So the pick is applied HERE, to this component's own copy of the one card it touched.
// Deliberately not a refetch: this route's payload is the largest in the app (a thousand-odd
// cards), and re-reading all of it to move three fields on one row is the cost this avoids.
// The patched values come from the same resolver the server used, so the next server read
// agrees with what is already on screen rather than correcting it.

import { useCallback, useMemo, useState } from "react";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { CollectionBrowser } from "./browser";
import type { BrowseListCard, CardArt } from "../../lib/collection/browse";
import type { OwnedSetMeta } from "../../lib/collection/set-filter";

export function CollectionClient({
  cards,
  ownedSets,
  availabilityOk,
  hasCollection,
}: {
  cards: BrowseListCard[];
  ownedSets: OwnedSetMeta[];
  availabilityOk: boolean;
  hasCollection: boolean;
}) {
  // Keyed by oracle id, and only ever holding cards the reader picked for in this visit.
  const [picks, setPicks] = useState<ReadonlyMap<string, CardArt>>(() => new Map());

  const onArtChange = useCallback((oracleId: string, art: CardArt | null) => {
    // Null means the card names no printing to resolve, which is not a statement that its
    // art moved — leaving any earlier patch alone is the honest answer.
    if (!art) return;
    setPicks((prev) => new Map(prev).set(oracleId, art));
  }, []);

  // A pick fires twice — once optimistically, once on settlement — and a refused write
  // settles with the art the server still holds, so a rollback lands here as an ordinary
  // patch. Nothing has to know which of the two it is looking at.
  const patched = useMemo(
    () =>
      picks.size === 0
        ? cards
        : cards.map((c) => {
            const art = picks.get(c.oracleId);
            return art ? { ...c, ...art } : c;
          }),
    [cards, picks],
  );

  return (
    <CardDetailProvider onArtChange={onArtChange}>
      <CollectionBrowser
        cards={patched}
        ownedSets={ownedSets}
        availabilityOk={availabilityOk}
        hasCollection={hasCollection}
      />
    </CardDetailProvider>
  );
}
