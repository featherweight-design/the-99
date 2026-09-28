// /collection — designed browse surface (#6).
// Server component: loads full aggregated collection once and hands it to
// the client browser for filter/sort/window/modal state.
//
// Empty-collection state remains the shell's design; this surface's own
// "no results" case is triggered when filters return zero (Task 5).

import { requireUserId } from "../../lib/auth";
import { getCollectionLastUpdated, getCollectionStats } from "../../lib/home/summary";
import { formatLastUpdated, loadBrowseCards, loadOwnedSetMeta } from "../../lib/collection/browse";
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
import { GhostButton, PrimaryButton } from "../../components/ui/button";
import { proxyCopy } from "../../lib/copy/proxies";

/* The handoff spells this mark as the "↻" glyph, but glyph metrics render it
   noticeably smaller than the label it sits beside and no font stack agrees on
   its size. Same mark, drawn at an explicit 14px so it matches the 13px text. */
function ReplaceIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="inline-block align-[-2px] mr-[6px]"
    >
      <path d="M13.5 8a5.5 5.5 0 1 1-1.9-4.16" />
      <path d="M13.5 1.5v3.2h-3.2" />
    </svg>
  );
}

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
    // "browse-6" because the list card lost `keywords`, `cmc`, `preferredPrinting`, `setCodes`
    // and `comboPartner.oracleId` (list payload plan, PR 2). An entry the previous deploy wrote
    // carried them, which cost nothing here but the size that change existed to cut.
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
    cacheForUser(userId, ["browse-6"], () => loadBrowseCards(userId)),
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

  // Empty collection — shell's state, kept intact.
  if (stats.uniqueCards === 0) {
    return (
      <EmptyState className="md:p-[48px]">
        <CardFan variant="mobile" className="mb-[22px] md:hidden" />
        <CardFan variant="desktop" className="mb-[26px] hidden md:block" />
        <EmptyStateTitle className="text-[28px]">
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
        {/* The proxy list, reachable from HERE too. The rack link lives in
            `FilterBar`, which this early return never mounts — so the one
            entry point built deliberately ungated was, in the real route,
            absent for exactly the player it was built for: someone whose cards
            are all printed and whose collection is therefore empty. */}
        <div className="mt-[14px]">
          <GhostButton href="/collection/proxies" className="text-[13px]">
            {proxyCopy.entryPoint.label}
          </GhostButton>
        </div>
      </EmptyState>
    );
  }

  return (
    <section className="flex flex-col min-h-[calc(100vh-var(--tabbar-h))] md:min-h-screen">
      {/* Header — §Collection Page Header */}
      <div
        className="flex items-center md:items-end justify-between gap-[20px] p-[20px_18px_12px] md:p-[28px_34px_0] mb-[14px] md:mb-0"
        style={{ background: "var(--bg)" }}
      >
        <div>
          {/* Title — §Page Title "Collection": Cinzel 700, 22/30px, --fg */}
          <h1 className="font-display font-bold text-[22px] md:text-[30px] m-0" style={{ color: "var(--fg)" }}>
            Collection
          </h1>
          {/* Subtitle — §Subtitle / Stats Line: mono 11/12px, --fg-faint, margin-top 2/4px */}
          <p
            className="font-mono text-[11px] md:text-[12px] mt-[2px] md:mt-[4px]"
            style={{ color: "var(--fg-faint)" }}
          >
            <span className="md:hidden">
              {stats.totalCards.toLocaleString()} cards · {stats.uniqueCards.toLocaleString()} unique
            </span>
            <span className="hidden md:inline">
              {stats.totalCards.toLocaleString()} cards · {stats.uniqueCards.toLocaleString()} unique
              {lastUpdated ? ` · last updated ${formatLastUpdated(lastUpdated)}` : ""}
            </span>
          </p>
        </div>
        {/* Replace button — §Replace Collection Button (desktop-only per table) */}
        <div className="flex items-center gap-[12px]">
          <a
            href="/collection/replace"
            className="md:hidden text-[13px] text-[color:var(--accent)]"
          >
            <ReplaceIcon />
            Replace
          </a>
          <GhostButton
            href="/collection/replace"
            className="hidden md:inline-block text-[13px] px-[16px] py-[9px]"
          >
            <ReplaceIcon />
            Replace collection
          </GhostButton>
        </div>
      </div>

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
