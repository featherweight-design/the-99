import type { ComponentProps } from "react";
import { perfRoute } from "../lib/perf/timing";
import { auth } from "@clerk/nextjs/server";
import { SignInButton } from "@clerk/nextjs";
import { Crowned99 } from "../components/marks";
import { receiptCountsByCommander, type ReceiptCounts } from "../lib/commanders/in-use";
import { loadAvailability } from "../lib/decks/availability-query";
import { listDecksWithStats } from "../lib/decks/read";
import { loadShoppingRollup } from "../lib/decks/shopping-rollup";
import { commitmentFigures, type Commitments } from "../lib/home/commitments";
import { getCollectionLastUpdated, getCollectionStats } from "../lib/home/summary";
import { getRankedList } from "../lib/recs/ranked-list";
import { withOwnedCardArt } from "../lib/collection/owned-printings";
import { readySlice } from "../lib/recs/ready-to-build";
import { loadUnplayedCounts } from "../lib/recs/home-novelty";
import { loadCollectionPool } from "../lib/recs/recommend";
import { FirstRunChecklist } from "../components/home/first-run";
import { Dashboard } from "../components/home/dashboard";
import { analysisTabEnabled } from "../lib/decks/analysis-flag";
import { cachePageForUser, type PageLoad } from "../lib/cache/page-cache";

/** What the signed-in Home draws, cached whole. First run draws none of it. */
type HomePayload =
  | { firstRun: true }
  | ({ firstRun: false } & Omit<ComponentProps<typeof Dashboard>, "now">);

export default async function HomePage() {
  const { userId } = await auth();

  if (!userId) {
    return (
      <section
        // Page layout per §Signed-Out Landing / Page layout.
        // Radial gradient differs between mobile and desktop (table row appshell.md:346):
        //   mobile:  600px 360px at 50% 22%, color-mix(in oklab, var(--accent) 12%, transparent)
        //   desktop: 1000px 520px at 50% 8%,  color-mix(in oklab, var(--accent) 10%, transparent)
        // Expressed as two Tailwind arbitrary-value bg utilities split at the md
        // breakpoint so no inline style is used on this element.
        className="flex min-h-screen flex-col items-center justify-center px-8 md:px-10 text-center bg-[color:var(--bg)] bg-[radial-gradient(600px_360px_at_50%_22%,color-mix(in_oklab,var(--accent)_12%,transparent),transparent_70%)] md:bg-[color:var(--bg)] md:bg-[radial-gradient(1000px_520px_at_50%_8%,color-mix(in_oklab,var(--accent)_10%,transparent),transparent_70%)]"
      >
        {/* Hero mark — 92px mobile / 132px desktop per §Hero numeral "99" */}
        <Crowned99 variant="hero-mobile" className="md:hidden" />
        <Crowned99 variant="hero-desktop" className="hidden md:block" />

        {/* "THE NINETY-NINE" sub-label per §"THE NINETY-NINE" sub-label
            mobile: 11px / 0.4em; desktop: 13px / 0.44em
            margin-top: 14px mobile / 16px desktop */}
        <p
          className="mt-[14px] md:mt-[16px] text-[11px] md:text-[13px] tracking-[0.4em] md:tracking-[0.44em] text-accent font-mono uppercase"
        >
          THE NINETY-NINE
        </p>

        {/* Tagline per §Tagline
            font-size 17px mobile / 21px desktop
            line-height 1.5 mobile only
            margin-top 22px mobile / 26px desktop
            max-width 280px mobile only */}
        <p
          className="mt-[22px] md:mt-[26px] max-w-[280px] md:max-w-none italic leading-[1.5] text-[17px] md:text-[21px] text-fg-body font-sans"
        >
          99 problems, but your commander ain&apos;t one.
        </p>

        {/* Sign in button per §Sign in button
            margin-top 34px mobile / 36px desktop
            padding 14px 0 (full width up to 260px) mobile / 14px 40px desktop */}
        <SignInButton mode="modal">
          <button
            type="button"
            className="mt-[34px] md:mt-[36px] w-full max-w-[260px] md:w-auto md:max-w-none rounded-[8px] py-[14px] px-0 md:px-[40px] font-semibold text-[15px] font-sans bg-accent hover:bg-accent-hover text-bg transition-colors cursor-pointer border-none"
          >
            Sign in
          </button>
        </SignInButton>

        {/* "Invite-only" note per §"Invite-only" note
            font-size 11px mobile / 12px desktop
            margin-top 18px mobile / 20px desktop
            letter-spacing 0.04em both
            mobile: "Invite-only · access by request"
            desktop: appends " · a Commander companion" */}
        <p
          className="mt-[18px] md:mt-[20px] text-[11px] md:text-[12px] tracking-[0.04em] text-fg-faint font-mono"
        >
          Invite-only · access by request
          <span className="hidden md:inline"> · a Commander companion</span>
        </p>
      </section>
    );
  }

  // Awaited before the rest: first run renders none of what follows, and there
  // is no point loading three more things to throw them away. The
  // `currentUser()` that used to ride alongside is gone with the name — neither
  // greeting interpolates one now, and a Clerk round trip nothing renders is a
  // request paid for nothing.
  //
  // The decks are read here rather than below because first run is "no
  // collection read AND no decks", both halves. A player who imported a deck
  // before reading a collection is not a new player, and that state is
  // reachable by design: the checklist's own escape hatch links to
  // /decks/import. Showing them the three steps would hide the deck they have.
  // `measure:load`'s spans (PERF_TIMING=1 only; a pass-through otherwise).
  const perf = perfRoute("/");
  // ONE clock for the whole render. The rotation's day boundary and the
  // dashboard's stamp both read it, and two `new Date()` calls either side of an
  // await can straddle UTC midnight — which would draw yesterday's pair beside a
  // figure stamped today.
  const now = new Date();
  // The whole payload is cached for this reader, keyed on their data stamp: see page-cache.ts
  // for why that is correct after any write, from anywhere. The UTC DATE is in the key because
  // the Ready-to-build pair rotates on it (`dailyPicks`, whose boundary is UTC by Hugh's call),
  // so a pair cached yesterday is never served today.
  const data = await cachePageForUser(userId, "home", [now.toISOString().slice(0, 10)], async (): Promise<PageLoad<HomePayload>> => {
    // Set when a tolerated read fell back. The page still draws, and is not stored: a transient
    // error would otherwise stand until the reader next writes something.
    let fellBack = false;
    const onSoftFailure = () => { fellBack = true; };
    const [stats, decks] = await Promise.all([
      perf.timed("collectionStats", () => getCollectionStats(userId)),
      // `name`, which is the CHEAPEST ORDER this reader offers. Home does not use
      // the order it asks for: the resume block re-sorts by `byTouched` and
      // nothing else on the page renders this list. `lastPlayed` — what Home took
      // while the deck rail existed — spends a correlated `max()` over
      // `deck_games` in its ORDER BY, and that ORDERING became dead work the
      // moment the rail went.
      //
      // The COLUMN it orders by is still read and still needed: `lastPlayedAt` is
      // one of the three timestamps `byTouched` weighs, and it is what makes a row
      // print `played`. Only the sorting of the whole list by it is dropped.
      // Proxy stats on, because this payload's rows are RENDERED here: `ResumeDecks`
      // draws each deck's status pill, and without the figures a deck whose last
      // slots are printed reads `To buy` on Home while `/decks` says `Complete`
      // about the same deck.
      // Commander art on, for the same reason proxy stats are: these rows are
      // RENDERED here, and the resume row's portrait is the commander's own art.
      perf.timed("listDecks", () => listDecksWithStats(userId, "name", {
        includeProxyStats: true,
        includeDeckState: true,
        includeCommanderArt: true,
        // The bracket chip on the resume row (Home bracket-chip addendum), behind the same flag
        // `/decks` reads it under. 0.83ms on staging.
        includeBracket: analysisTabEnabled(),
        onSoftFailure,
      })),
    ]);
    if (stats.uniqueCards === 0 && decks.length === 0) {
      return { value: { firstRun: true }, store: true };
    }

    const [lastUpdated, ranked, shopping, unplayed] = await Promise.all([
      perf.timed("lastUpdated", () => getCollectionLastUpdated(userId)),
      perf.timed("rankedList", () => getRankedList(userId)),
      perf.timed("shoppingRollup", () => loadShoppingRollup(userId)),
      // What the Ready-to-build rotation leans on (the themes each candidate plays that no deck
      // does). Beside the ranked list, never after it: it reads nothing the list returns. Null on
      // failure, which walks the plain shuffle.
      perf.timed("unplayedCounts", () => loadUnplayedCounts(userId)),
    ]);

    // The slice FIRST, then the printings — the two shown rather than every commander the
    // player could build. `getRankedList` deliberately does not resolve art itself: this
    // page draws two of its rows on the desktop hero and the rest never reach a screen,
    // and the lookup is a join over `collection_items × printings × sets`.
    const slice = readySlice(ranked.items, { userId, now, unplayed });
    const ready = { ...slice, shown: await perf.timed("ownedArt", () => withOwnedCardArt(userId, slice.shown)) };

    // One availability read between the in-use clause and the Commitments card.
    // Fail soft, the same way src/app/commanders/page.tsx does: losing
    // availability must cost those two things, never the page.
    let inUse = new Map<string, ReceiptCounts>();
    let commitments: Commitments | null = null;
    try {
      const [{ collection }, availability] = await Promise.all([
        // React-cached, so on the branch where getRankedList recomputed this is a
        // cache hit rather than a second query.
        perf.timed("collectionPool", () => loadCollectionPool(userId)),
        // No options: the whole-user vantage, as /collection already takes.
        perf.timed("availability", () => loadAvailability(userId)),
      ]);
      // The shown pair, not the whole ranked list — only a rendered hero prints
      // the clause.
      inUse = receiptCountsByCommander(ready.shown, collection, availability);
      commitments = commitmentFigures(availability.values());
    } catch {
      // Both consumers render nothing rather than a zero, which would be a claim.
      fellBack = true;
    }
    // Null only when the read failed: the rotation then walks its plain shuffle.
    if (unplayed === null) fellBack = true;

    return {
      value: { firstRun: false, stats, lastUpdated, ready, inUse, decks, commitments, shopping },
      // A degraded ranking recomputes on every visit by design; a stored one would freeze it.
      store: !ranked.degraded && !fellBack,
    };
  });
  if (data.firstRun) return <FirstRunChecklist />;

  return (
    <Dashboard
      stats={data.stats}
      lastUpdated={data.lastUpdated}
      ready={data.ready}
      inUse={data.inUse}
      decks={data.decks}
      commitments={data.commitments}
      shopping={data.shopping}
      // One clock for the whole page, read on the server, so every relative
      // date below agrees.
      now={now.toISOString()}
    />
  );
}
