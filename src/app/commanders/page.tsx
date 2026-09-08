import { requireUserId } from "../../lib/auth";
import { getCollectionStats, listRecentDecks } from "../../lib/home/summary";
import { getRankedList } from "../../lib/recs/ranked-list";
import { rankFree } from "../../lib/recs/free-ranking";
import { toFreeDelta, type FreeRankingDelta } from "../../lib/recs/free-delta";
import { loadCollectionPool } from "../../lib/recs/recommend";
import { loadAvailability } from "../../lib/decks/availability-query";
import type { Availability } from "../../lib/decks/availability";
import {
  receiptCountsByCommander,
  type ReceiptCounts,
} from "../../lib/commanders/in-use";
import { permanentRedirect } from "next/navigation";
import { CardFan } from "../../components/marks";
import { CommandersView } from "../../components/commanders/commanders-view";
import { PageHeader } from "../../components/commanders/page-header";
import { scopeRedirectTarget } from "./scope-redirect";
import { parseLaneParams } from "../../lib/commanders/lane-params";
import { searchParamsToQuery } from "../../lib/commanders/search-params";
import { retryRecs } from "./actions";
import { RetryGhost } from "../../components/commanders/retry-submit";
import { GhostButton, PrimaryButton } from "../../components/ui/button";
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateTitle,
} from "../../components/ui/empty-state";

export default async function CommandersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const userId = await requireUserId();
  const sp = await searchParams;
  // Before any read: the `?scope=` toggle became two routes, and a bookmark that
  // still names the other lane must land there rather than be answered here with
  // the wrong list.
  // It cannot loop: a target is only returned while `scope` is present, and the
  // target never carries it — one 308 and the parameter is gone for good.
  const target = scopeRedirectTarget(searchParamsToQuery(sp));
  if (target) permanentRedirect(target);
  // `All my cards` is the default the lane opens on, which reverses the shipped
  // build's `What's free`. The rack is why: `Free cards only` now counts as an
  // active control, so defaulting to it would badge the `Filters` trigger and
  // draw a chip on arrival, for a choice the reader never made. The parse is
  // `lane-params`' own, so the short key, the legacy `avail` and the lane rule
  // are read here exactly as the client reads them.
  const avail = parseLaneParams(searchParamsToQuery(sp), "owned").avail;
  const stats = await getCollectionStats(userId);

  if (stats.uniqueCards === 0) {
    // No cards → collection-empty analog: send the user to upload.
    return (
      <EmptyState>
        {/* Card-fan mark: same construction as collection empty state */}
        <CardFan variant="mobile" className="mb-[22px] sm:hidden" />
        <CardFan variant="desktop" className="mb-[26px] hidden sm:block" />

        <EmptyStateTitle className="text-[28px]">
          No collection yet
        </EmptyStateTitle>

        <EmptyStateBody className="mt-3 max-w-[420px] text-[16px]">
          Upload your cards and we&apos;ll rank every commander you can build.
        </EmptyStateBody>

        <PrimaryButton
          href="/collection"
          className="mt-6 px-[24px] py-[12px] text-[14px]"
        >
          Upload collection
        </PrimaryButton>
      </EmptyState>
    );
  }

  // Fetch recommendations and recent decks in parallel.
  // decks is used only for the firstRun flag (no confirmed deck yet).
  const [list, decks] = await Promise.all([
    getRankedList(userId),
    listRecentDecks(userId, 1),
  ]);

  const { items, degraded, uniqueCardsRead, candidateCount } = list;

  // No commander candidates in the collection.
  if (candidateCount === 0) {
    return (
      <section>
        {/* Page header (mobile + desktop) */}
        <PageHeader uniqueCardsRead={uniqueCardsRead} />

        {/* Empty-no-candidates state (§Empty State — No Candidates) */}
        {/* Container: padding 24px 30px mobile / 60px 40px desktop; min-height 520px desktop */}
        <div
          className="flex flex-col items-center justify-center text-center p-[24px_30px] sm:p-[60px_40px] sm:min-h-[520px]"
        >
          {/* XCIX seal badge: 96px mobile / 110px desktop, circle br-radius=999px, accent */}
          <div
            className="sm:hidden flex items-center justify-center"
            style={{
              width: 96,
              height: 96,
              borderRadius: 999,
              border: "2px solid var(--accent)",
              color: "var(--accent)",
              fontFamily: "var(--font-display), 'Cinzel', serif",
              fontWeight: 700,
              fontSize: 26,
              letterSpacing: "0.04em",
              boxShadow: "0 0 0 8px color-mix(in oklab, var(--accent) 5%, transparent)",
            }}
          >
            XCIX
          </div>
          <div
            className="hidden sm:flex items-center justify-center"
            style={{
              width: 110,
              height: 110,
              borderRadius: 999,
              border: "2px solid var(--accent)",
              color: "var(--accent)",
              fontFamily: "var(--font-display), 'Cinzel', serif",
              fontWeight: 700,
              fontSize: 30,
              letterSpacing: "0.04em",
              boxShadow: "0 0 0 10px color-mix(in oklab, var(--accent) 5%, transparent)",
            }}
          >
            XCIX
          </div>

          {/* Heading: Cinzel 700, 22px mobile / 30px desktop, --fg */}
          <h1
            className="font-display font-bold text-[22px] sm:text-[30px] leading-[1.2]"
            style={{
              color: "var(--fg)",
              margin: "26px 0 0",
            }}
          >
            No commanders in the ranks — yet
          </h1>

          {/* Body paragraph: 13.5px mobile / 15px desktop */}
          <p
            className="text-[13.5px] sm:text-[15px] leading-[1.6] sm:leading-[1.65]"
            style={{
              color: "var(--fg-body)",
              margin: "10px 0 0",
              maxWidth: 480,
            }}
          >
            <span className="sm:hidden">
              We scanned all {uniqueCardsRead.toLocaleString()} cards and none
              can helm a legal 99 on their own. Add a legendary creature and
              they&apos;ll show up here.
            </span>
            <span className="hidden sm:inline">
              We scanned all {uniqueCardsRead.toLocaleString()} cards and none
              can helm a legal 99 on their own. Add a legendary creature — or a
              planeswalker that can command — and they&apos;ll appear here, ranked.
            </span>
          </p>

          {/* Button row: column on mobile (gap 10px, mt 24px, full-width), row on desktop (gap 12px, mt 26px) */}
          <div
            className="flex flex-col sm:flex-row mt-[24px] sm:mt-[26px] w-full sm:w-auto gap-[10px] sm:gap-[12px]"
          >
            {/* "Add more cards" button — primary: accent on base canvas */}
            {/* Mobile: full-width, padding 12px 0; Desktop: padding 12px 22px per table */}
            {/* The upload flow, not the collection table: this button and the ghost
                one beside it both pointed at /collection, so the pair offered one
                destination under two labels. */}
            <PrimaryButton
              href="/collection/replace"
              className="text-[14px] text-center block p-[12px_0] sm:p-[12px_22px]"
            >
              Add more cards
            </PrimaryButton>

            {/* "View collection" button — secondary */}
            <GhostButton
              href="/collection"
              className="text-[14px] text-center block p-[12px_0] sm:p-[12px_22px]"
            >
              View collection
            </GhostButton>

            {/* Retry — visible when EDHREC was degraded */}
            {degraded && (
              <form action={retryRecs} className="w-full sm:w-auto">
                <RetryGhost className="text-[14px] w-full p-[12px_0] sm:p-[12px_22px]">
                  Retry
                </RetryGhost>
              </form>
            )}
          </div>
        </div>
      </section>
    );
  }

  // Has candidates: render the full recommendations view.
  // firstRun = user has no confirmed decks yet (mirrors home dashboard's
  // guided-flow condition: decks.length === 0 after collection upload).
  const firstRun = decks.length === 0;

  // The receipt's second clause renders in BOTH ranking modes, so this read is
  // unconditional — gating it on `?avail=free` would strip the clause from the
  // default view, which is the one most players never leave. One rollup for the
  // whole page, shared across every commander; `rankFree` is not on this path.
  const { collection } = await loadCollectionPool(userId);
  let receiptCounts = new Map<string, ReceiptCounts>();
  let availability: Map<string, Availability> | null = null;
  let availOk = true;
  try {
    availability = await loadAvailability(userId, {
      oracleIds: collection.map((c) => c.oracleId),
    });
    receiptCounts = receiptCountsByCommander(items, collection, availability);
  } catch {
    // Fail soft: the list, the scores and the ranking are all unaffected. Only
    // the clause and `What's free` are lost, and the toggle says so itself.
    availOk = false;
  }

  // Both rankings ship in every render, whichever mode is asked for, so the
  // toggle is a client-side swap between two lists rather than a round trip.
  // This costs no extra query: `rankFree` re-scores the same `items` against the
  // collection and availability already read above, which also makes the receipt
  // and the free ranking describe one snapshot of the decks rather than two.
  //
  // Shipped as a diff against `items` rather than as a second full list: the
  // two are the same commanders, so most of a second copy is the same names,
  // slugs and image URLs sent twice. See `free-delta.ts`.
  let freeRanking: FreeRankingDelta | null = null;
  if (availOk && availability) {
    const free = await rankFree(userId, items, { collection, availability });
    freeRanking = free.ok ? toFreeDelta(items, free.items) : null;
    if (!freeRanking) availOk = false;
  }

  // `?avail=free` is a request, not a promise. With no free ranking to show the
  // page renders the canonical list, so it must say so too: left as `free` the
  // toggle would read as checked, the receipt would claim `are free` over
  // all-mode counts, and the live region would announce a re-rank that never
  // happened. The struck-out segment carries the reason.
  const renderedAvail = availOk ? avail : ("all" as const);

  return (
    <section className="flex flex-col min-h-screen">
      {/* The header renders inside the view: its subtitle names the mode, and the
          mode is now the client's to change. */}
      <CommandersView
        results={items}
        degraded={degraded}
        uniqueCardsRead={uniqueCardsRead}
        candidateCount={candidateCount}
        firstRun={firstRun}
        avail={renderedAvail}
        freeRanking={freeRanking}
        availOk={availOk}
        receiptCounts={receiptCounts}
      />
    </section>
  );
}
