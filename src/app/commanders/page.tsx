import { requireUserId } from "../../lib/auth";
import { getCollectionStats, listRecentDecks } from "../../lib/home/summary";
import { getRankedList } from "../../lib/recs/ranked-list";
import { CardFan } from "../../components/marks";
import { CommandersView } from "../../components/commanders/commanders-view";
import { PageHeader } from "../../components/commanders/page-header";
import { retryRecs } from "./actions";
import { GhostButton, PrimaryButton } from "../../components/ui/button";
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateTitle,
} from "../../components/ui/empty-state";

export default async function CommandersPage() {
  const userId = await requireUserId();
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
          {/* XCIX seal badge: 96px mobile / 110px desktop, circle br-radius=999px, brass */}
          <div
            className="sm:hidden flex items-center justify-center"
            style={{
              width: 96,
              height: 96,
              borderRadius: 999,
              border: "2px solid var(--brass)",
              color: "var(--brass)",
              fontFamily: "var(--font-display), 'Cinzel', serif",
              fontWeight: 700,
              fontSize: 26,
              letterSpacing: "0.04em",
              boxShadow: "0 0 0 8px rgba(201,162,75,0.05)",
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
              border: "2px solid var(--brass)",
              color: "var(--brass)",
              fontFamily: "var(--font-display), 'Cinzel', serif",
              fontWeight: 700,
              fontSize: 30,
              letterSpacing: "0.04em",
              boxShadow: "0 0 0 10px rgba(201,162,75,0.05)",
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
            {/* "Add more cards" button — primary: brass on base canvas */}
            {/* Mobile: full-width, padding 12px 0; Desktop: padding 12px 22px per table */}
            <PrimaryButton
              href="/collection"
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
                <GhostButton
                  type="submit"
                  className="text-[14px] w-full p-[12px_0] sm:p-[12px_22px]"
                >
                  Retry
                </GhostButton>
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

  return (
    <section className="flex flex-col min-h-screen">
      {/* Page header (mobile + desktop) */}
      <PageHeader uniqueCardsRead={uniqueCardsRead} />

      <CommandersView
        results={items}
        degraded={degraded}
        uniqueCardsRead={uniqueCardsRead}
        candidateCount={candidateCount}
        firstRun={firstRun}
      />
    </section>
  );
}
