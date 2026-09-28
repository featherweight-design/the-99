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
import { decodeCollection, type CollectionWire } from "../../lib/collection/list-wire";

export function CollectionClient({
  wire,
  ownedSets,
  availabilityOk,
  hasCollection,
}: {
  wire: CollectionWire;
  ownedSets: OwnedSetMeta[];
  availabilityOk: boolean;
  hasCollection: boolean;
}) {
  // Decoded once per payload: the same wire identity is the same list, so everything below
  // that compares `cards` by identity keeps working.
  const cards: BrowseListCard[] = useMemo(() => decodeCollection(wire), [wire]);
  // Keyed by oracle id, and only ever holding cards the reader picked for in this visit.
  const [picks, setPicks] = useState<ReadonlyMap<string, CardArt>>(() => new Map());

  // A FRESH SERVER PAYLOAD ALWAYS WINS, and is dropped on its way past — the convention
  // `AGENTS.md` states for every cache of a list a reader flips between, applied during
  // render rather than in an effect so the stale art never paints once before being
  // corrected.
  //
  // A new `cards` identity is a new read of the collection: a navigation back to this
  // route, or a refresh after the collection changed. Whatever it says about a card's art
  // is newer than a patch made against the payload before it, and the patch may now be
  // describing a printing the reader no longer owns.
  // STATE, not a ref: `react-hooks/refs` forbids reading or writing a ref during render, and
  // this comparison has to happen there — an effect would let the stale art paint once
  // before being corrected. Holding the last payload in state is React's own form of
  // "adjust state when a prop changes", and it is what `useDiscoveryCache` does too.
  const [served, setServed] = useState(cards);
  if (served !== cards) {
    setServed(cards);
    if (picks.size > 0) setPicks(new Map());
  }

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
