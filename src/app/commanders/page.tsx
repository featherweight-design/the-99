import { requireUserId } from "../../lib/auth";
import { getCollectionStats, listRecentDecks } from "../../lib/home/summary";
import { cacheForUser } from "../../lib/cache/user-lists";
import { commanderRankingsKey, loadCommanderRankings } from "../../lib/commanders/rankings";
import { readCommandersAvail } from "../../lib/commanders/avail-pref";
import { requestSwitchEnv } from "../../lib/switches/request";
import { permanentRedirect } from "next/navigation";
import { CardFan } from "../../components/marks";
import { CommandersView } from "../../components/commanders/commanders-view";
import { PageHeader } from "../../components/commanders/page-header";
import { scopeRedirectTarget } from "./scope-redirect";
import { searchParamsToQuery } from "../../lib/commanders/search-params";
import { retryRecs } from "./actions";
import { lanePrintedInFor, loadCommanderPrintings } from "../../lib/sets/lane-printed-in";
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

  // Fetch recommendations, recent decks and the saved mode in parallel.
  // decks is used only for the firstRun flag (no confirmed deck yet). The saved mode is read
  // fresh, never from the cached rankings: it moves on a flip, and the rankings do not.
  // Started now so it runs beside the rankings; a failure is handled where it is read.
  const printings = loadCommanderPrintings();
  printings.catch(() => {});
  // The reader's resolved switches: the rankings' key and their load decide the role basis
  // (`LABEL_ROLE_COUNTS_ENABLED`) from this one env.
  const env = await requestSwitchEnv(userId);
  const [rankings, decks, savedAvail] = await Promise.all([
    // A ranking counted by the classifier only because the label read failed is served and never
    // filed under the labels key (admin PR 6d-2).
    cacheForUser(userId, commanderRankingsKey(env), () => loadCommanderRankings(userId, env), {
      store: (r) => !r.labelFallback,
    }),
    listRecentDecks(userId, 1),
    readCommandersAvail(userId),
  ]);

  const { items, degraded, uniqueCardsRead, candidateCount, freeRanking, availOk } = rankings;
  // `Printed in ▾`'s index, aligned to these rows. The free ranking re-orders the same
  // commanders, so one index covers both lists.
  const printedIn = await lanePrintedInFor(items, printings);

  // No commander candidates in the collection.
  if (candidateCount === 0) {
    return (
      <section>
        {/* Page header (mobile + desktop) */}
        <PageHeader lane="owned" />

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
            No commanders in the ranks, yet
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
              can helm a legal 99 on their own. Add a legendary creature, or a
              planeswalker that can command, and they&apos;ll appear here, ranked.
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


  // The mode is NOT stated here. `?avail=free` is a request, not a promise, and
  // the view is the one place that can answer it: it reads the same `?a=`
  // through `lane-params` (short key, legacy `avail` and lane rule alike) and
  // refuses it when `availOk` or the ranking says there is nothing to switch to
  // — the same two inputs this page would have used. Sending the mode as well
  // gave the disagreement somewhere to live: the flip mirrors itself into the
  // URL without a re-render, so a cached tree's prop and the live URL drift
  // apart, and whichever won was wrong half the time.
  //
  // What IS sent is the reader's saved mode, the one the page opens in when the URL names none
  // (Hugh, 2026-09-27). It is the default the URL is read and written against, never a statement
  // of the mode on screen: `a=` wins over it in either direction. `All my cards` is still the
  // default for an account that has never chosen, so `Free cards only` only badges the `Filters`
  // trigger for a reader who picked it.

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
        freeRanking={freeRanking}
        availOk={availOk}
        printedIn={printedIn}
        savedAvail={savedAvail}
      />
    </section>
  );
}
