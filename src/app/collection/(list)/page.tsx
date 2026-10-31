// /collection — designed browse surface (#6).
// Server component: loads full aggregated collection once and hands it to
// the client browser for filter/sort/window/modal state.
//
// Empty-collection state remains the shell's design; this surface's own
// "no results" case is triggered when filters return zero (Task 5).

import { cookies } from "next/headers";
import { perfRoute } from "../../../lib/perf/timing";
import { requireUserId } from "../../../lib/auth";
import {
  COLLECTION_SORT_COOKIE,
  COLLECTION_VIEW_COOKIE,
  COLLECTION_WIDE_COOKIE,
  parseViewCookie,
  parseWideCookie,
} from "../../../components/ui/view-cookie";
import { getCollectionStats } from "../../../lib/home/summary";
import { loadOwnedSetMeta } from "../../../lib/collection/browse-read";
import { CardFan } from "../../../components/marks";
import { CollectionClient } from "../../../components/collection/collection-client";
import { cutCollectionWindow, encodeCollection } from "../../../lib/collection/list-wire";
import { loadCollectionList } from "../../../lib/collection/payload";
import { pageWindowIds } from "../../../lib/collection/window";
import { parseSortCookie, withStoredSort } from "../../../lib/collection/sort-options";
import { searchParamsToQuery } from "../../../lib/commanders/search-params";
import { loadAvailability } from "../../../lib/decks/availability-query";
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateTitle,
} from "../../../components/ui/empty-state";
import { CollectionEmptyDoors } from "../../../components/collection/collection-empty-doors";
import { requestSwitchEnv } from "../../../lib/switches/request";
import { collectionEditCopy } from "../../../lib/copy/collection-edit";
import { PICK_RECEIPT_PARAM } from "../../../lib/precons/pick";
import { readPickReceipt, type PickReceipt } from "../../../lib/precons/pick-receipt-read";
import { PreconPickReceipt } from "../../../components/home/precon-pick-receipt";
import { pageLanding } from "../../../lib/discovery/page-landing";
import { TOOL_PARAM } from "../../../lib/discovery/tool-param";
import { ToolLandingMount } from "../../../components/discovery/tool-landing-mount";

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Per-request spans for `pnpm measure:load`: off (a bare pass-through) unless PERF_TIMING=1.
  const perf = perfRoute("/collection");
  const userId = await requireUserId();
  // The reader's resolved switches (`requestSwitchEnv`), once for the whole render.
  const env = await requestSwitchEnv(userId);
  // The two layout hints a past visit left (`ui/view-cookie`), so the server draws the view the
  // reader will see. Parsed to a closed set; anything else is no hint.
  const jar = await cookies();
  const viewHint = {
    stored: parseViewCookie(jar.get(COLLECTION_VIEW_COOKIE)?.value),
    wide: parseWideCookie(jar.get(COLLECTION_WIDE_COOKIE)?.value),
    // The sort the reader last chose: the first window is cut by it unless the URL names its own.
    sort: parseSortCookie(jar.get(COLLECTION_SORT_COOKIE)?.value),
  };
  const [stats, { cards, pricesFailed }, ownedSets, availability] = await Promise.all([
    perf.timed("stats", () => getCollectionStats(userId)),
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
    perf.timed("list", () => loadCollectionList(userId)),
    // Set names + release dates for the Set ▾ panel (#86).
    perf.timed("ownedSets", () => loadOwnedSetMeta(userId)),
    // One aggregate for the whole page — never per row (Addendum 2).
    // Quiet failure: /collection shows no banner, the markers simply do not
    // appear and the Availability ▾ trigger disables (Task 10).
    perf.timed("availability", () => loadAvailability(userId)).catch(() => null),
  ]);

  // Flattened onto the cards here: a Map cannot cross the server/client
  // boundary as a prop, and every consumer below wants one card's entry. Encoded
  // on the way (`list-wire.ts`): each deck a claim names crosses once, and each
  // image as its Scryfall id and stamp. The client decodes it back.
  // THE URL'S OWN FIRST WINDOW keeps its draw fields and every other card ships without them
  // (list payload plan, PR 4): the art, the facts and the combo partners were most of what a card
  // carries, and a window draws 200 of about 2,800. The window is found by the browser's own steps
  // (`lib/collection/window`) over the same list, so the cards it draws first are the ones shipped
  // whole; the rest arrive in the background from `/api/collection-fields`.
  const params = await searchParams;
  const query = searchParamsToQuery(params);
  // Try it's landing for Find a deck (discovery R2·3, R2 gap 11): `?tool=find-a-deck` is stripped at once, and the next
  // card details opened halo `Find a deck for it` once (deferred). Anything else is stripped.
  const { landing, request } = pageLanding(params[TOOL_PARAM], env, "find-a-deck");
  const toolLanding = <ToolLandingMount landing={landing} request={request} deferred />;

  // A precon pick opened from Collection lands here (no-collection entry S19) with the receipt under the tabs: Home's
  // own strip and dismiss key, read per request from the ledger and only when the address claims one.
  let receipt: PickReceipt | null = null;
  const claim = params[PICK_RECEIPT_PARAM];
  if (claim !== undefined) {
    try {
      receipt = await readPickReceipt(userId, claim);
    } catch (error) {
      // not a fallback: the receipt is an extra, and the collection below draws whether or not it was read.
      console.error("collection: the precon receipt could not be read", error);
    }
  }
  const strip = receipt ? <PreconPickReceipt receipt={receipt} /> : null;
  const keep = pageWindowIds(cards, availability, withStoredSort((key) => query.get(key), viewHint.sort));
  const wire = await perf.timed("encode", async () => cutCollectionWindow(encodeCollection(cards, availability), keep));

  // Empty collection — the shell's state, kept intact, under the group's place head (shared
  // `(list)/layout.tsx`) same as every other state of this route. The head's strip is how
  // this reader reaches Proxies: before it mounted here, this early return never mounted
  // `FilterBar`, so the one entry point built ungated was absent for exactly the player it
  // was built for, whose cards are all printed.
  if (stats.uniqueCards === 0) {
    // The no-collection entry (S13): one Upload tile and the ways group, which opens the precon pick.
    return (
      <section className="flex flex-col">
        {toolLanding}
        {strip}
        <EmptyState className="md:p-[48px]">
          <CardFan variant="mobile" className="mb-[22px] md:hidden" />
          <CardFan variant="desktop" className="mb-[26px] hidden md:block" />
          <EmptyStateTitle level={2} className="text-[28px]">
            Your collection is empty
          </EmptyStateTitle>
          <EmptyStateBody className="mt-3 max-w-[420px] text-[16px]">
            {collectionEditCopy.ways.emptyBody}
          </EmptyStateBody>
          <CollectionEmptyDoors ways={{ precons: true }} scan />
        </EmptyState>
      </section>
    );
  }

  return (
    <section className="flex flex-col min-h-[calc(100vh-var(--tabbar-h)-var(--collection-head-h))] md:min-h-[calc(100vh-var(--collection-head-h))]">
      {toolLanding}
      {strip}
      {/* The browse list carries no printings or oracle text — the modal fetches the
          one card it is opening, the same way every deck surface does. */}
      <CollectionClient
        wire={wire}
        ownedSets={ownedSets}
        availabilityOk={availability !== null}
        pricesFailed={pricesFailed}
        viewHint={viewHint}
        collectionEdit
      />
    </section>
  );
}
