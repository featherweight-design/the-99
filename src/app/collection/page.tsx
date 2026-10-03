// /collection — designed browse surface (#6).
// Server component: loads full aggregated collection once and hands it to
// the client browser for filter/sort/window/modal state.
//
// Empty-collection state remains the shell's design; this surface's own
// "no results" case is triggered when filters return zero (Task 5).

import { requireUserId } from "../../lib/auth";
import { getCollectionLastUpdated, getCollectionStats } from "../../lib/home/summary";
import { loadBrowseCards, loadOwnedSetMeta } from "../../lib/collection/browse";
import { CardFan } from "../../components/marks";
import { CollectionClient } from "../../components/collection/collection-client";
import { cacheForUser } from "../../lib/cache/user-lists";
import { encodeCollection } from "../../lib/collection/list-wire";
import { loadAvailability } from "../../lib/decks/availability-query";
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateTitle,
} from "../../components/ui/empty-state";
import { PrimaryButton } from "../../components/ui/button";
import { CollectionPlaceHead } from "../../components/collection/collection-place-head";

export default async function CollectionPage() {
  const userId = await requireUserId();
  const [stats, cards, lastUpdated, ownedSets, availability] = await Promise.all([
    getCollectionStats(userId),
    // The heaviest read on this page by an order of magnitude, which is why it
    // is the one cached across visits.
    // The version is history: since the deployment joined every `cacheForUser` key
    // (`cache/deployment.ts`), a deploy retires the previous build's entry on its own, and
    // a new field needs no new `browse-N`. The record of why each one moved:
    //
    // "browse-5" because the payload gained `comboOtherPartners`, the figure the marker's
    // tooltip counts. An entry written by the previous deploy carries no such field, so every
    // marker would say `You own both` where it should say `and 3 others` until the hour
    // ceiling expired it, with the loader never running.
    //
    // "browse-4" before it, because the payload gained `comboPartner` for state 1.
    // Same reason as "browse-3" before it, which added `facts`, and "browse-2" before that:
    // an entry written by the previous deploy carries no such field, so every card would
    // draw no clause until the hour ceiling expired it, with the loader never running. The
    // key WAS the version then; the deployment id does that job now.
    //
    // THE DECK-DEPENDENT HALF IS INVALIDATED, and an earlier revision of this comment said
    // the opposite at length. `comboPartner` means "both halves owned AND no single deck
    // holds both", so it depends on deck contents — and every deck write calls
    // `revalidateClaims`, which calls `revalidateUserLists`, which drops exactly the tag
    // `cacheForUser` put on this entry. Building a deck holding both pieces retires the
    // clause on the spot rather than at the hour ceiling.
    cacheForUser(userId, ["browse-5"], () => loadBrowseCards(userId)),
    getCollectionLastUpdated(userId),
    // Set names + release dates for the Set ▾ panel (#86).
    loadOwnedSetMeta(userId),
    // One aggregate for the whole page — never per row (Addendum 2).
    // Quiet failure: /collection shows no banner, the markers simply do not
    // appear and the Availability ▾ trigger disables (Task 10).
    loadAvailability(userId).catch(() => null),
  ]);

  // Flattened onto the cards here: a Map cannot cross the server/client
  // boundary as a prop, and every consumer below wants one card's entry. Encoded
  // on the way (`list-wire.ts`): each deck a claim names crosses once, and each
  // image as its Scryfall id and stamp. The client decodes it back.
  const wire = encodeCollection(cards, availability);

  const head = <CollectionPlaceHead current="cards" stats={stats} lastUpdated={lastUpdated} />;

  // Empty collection — shell's state, kept intact, under the same place head as every other
  // state of this route. The head's strip is how this reader reaches Proxies: before it,
  // this early return never mounted `FilterBar`, so the one entry point built ungated was
  // absent for exactly the player it was built for, whose cards are all printed.
  if (stats.uniqueCards === 0) {
    return (
      <section className="flex flex-col">
        {head}
        <EmptyState className="md:p-[48px]">
          <CardFan variant="mobile" className="mb-[22px] md:hidden" />
          <CardFan variant="desktop" className="mb-[26px] hidden md:block" />
          <EmptyStateTitle level={2} className="text-[28px]">
            Your collection is empty
          </EmptyStateTitle>
          <EmptyStateBody className="mt-3 max-w-[420px] text-[16px]">
            A pile of possibilities waiting for a commander. Upload a CSV and the
            table fills. Commanders and decks follow.
          </EmptyStateBody>
          <div className="mt-[26px]">
            <PrimaryButton
              href="/collection/replace"
              className="text-[13px] md:text-[14px] px-[20px] md:px-[22px] py-[11px]"
            >
              Upload your CSV
            </PrimaryButton>
          </div>
        </EmptyState>
      </section>
    );
  }

  return (
    <section className="flex flex-col min-h-[calc(100vh-var(--tabbar-h))] md:min-h-screen">
      {head}

      {/* The browse list carries no printings or oracle text — the modal fetches the
          one card it is opening, the same way every deck surface does. */}
      <CollectionClient
        wire={wire}
        ownedSets={ownedSets}
        availabilityOk={availability !== null}
        hasCollection={stats.totalCards > 0}
      />
    </section>
  );
}
