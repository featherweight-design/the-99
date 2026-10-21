import { allDecksCartEnabled } from "../lib/decks/all-decks-cart-flag";
import { helpMeChooseEnabled } from "../lib/intake/flag";
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
import { HomeTour } from "../components/discovery/home-tour";
import { collectionEditEnabled } from "../lib/collection/edit-flag";
import { analysisTabEnabled } from "../lib/decks/analysis-flag";
import { cachePageForUser, type PageLoad } from "../lib/cache/page-cache";
import { recordSoftFailure } from "../lib/cache/soft-failure";
import { requestSwitchEnv } from "../lib/switches/request";
import { ruleZeroEnabled, socialFriendsEnabled, socialGamesEnabled, socialInvitesEnabled } from "../lib/social/flag";
import { loadHomeTables } from "../lib/social/rule-zero-home";
import { HomeTableCard } from "../components/rule-zero/home-table-card";
import { loadInviteCount } from "../lib/invites/read";
import { wishlistEnabled } from "../lib/wishlist/flag";
import { loadHomeFriends, type HomeFriends } from "../lib/social/home-friends";
import { firstRunTourEnabled } from "../lib/discovery/onboarding-flag";
import { readTourSeen, tourDue } from "../lib/discovery/tour";
import { loadArrivalsBanner } from "../lib/precons/banner";
import { upcomingPreconsEnabled } from "../lib/precons/upcoming-flag";
import { cookies } from "next/headers";
import { aboutSheetEnabled } from "../lib/about/flag";
import { SHEET_COOKIE, sheetCookieIsCurrent } from "../lib/about/gate";
import { aboutLine, aboutNotice } from "../lib/about/notice";
import { aboutSeen } from "../lib/about/read";
import { visibleEntries, type SeenState } from "../lib/about/visible";
import { noCollectionEntryEnabled } from "../lib/collection/edit-flag";
import { preconsEnabled } from "../lib/precons/flag";
import { cardScanEnabled } from "../lib/card-scan/flag";
import { PICK_RECEIPT_PARAM } from "../lib/precons/pick";
import { readPickReceipt, type PickReceipt } from "../lib/precons/pick-receipt-read";
import { PreconPickReceipt } from "../components/home/precon-pick-receipt";
import { readFreeAllowance, readWelcomeState, welcomeSheetFor } from "../lib/payments/welcome-read";
import { stripFacts, type WelcomeFacts } from "../lib/payments/welcome-sheet";
import { WelcomeStrip } from "../components/welcome/welcome-strip";

/**
 * What the signed-in Home draws, cached whole. First run draws none of the Dashboard. Both carry the reader's About
 * seen state (null with `ABOUT_SHEET_ENABLED` off, or when the read failed), which About's banner line is decided
 * from; `user_prefs` carries the stamp trigger, so a write to it retires the entry.
 */
type HomePayload =
  | { firstRun: true; aboutSeen: SeenState | null; tourDue: boolean }
  | ({ firstRun: false; aboutSeen: SeenState | null } & Omit<ComponentProps<typeof Dashboard>, "now" | "about">);

/** The reader's About seen state for the banner line, or null. A failed read draws no line and is not stored. */
async function readAboutSeen(userId: string, env: NodeJS.ProcessEnv): Promise<SeenState | null> {
  if (!aboutSheetEnabled(env)) return null;
  try {
    return await aboutSeen(userId);
  } catch {
    recordSoftFailure();
    return null;
  }
}

/**
 * When the reader's tour was spent, or undefined when no read was made: with `FIRST_RUN_TOUR_ENABLED` off the tour is
 * never due, so its stamp is never read. A failed read is treated as spent, so no tour opens, and that render is
 * not stored.
 */
async function readTourSeenFor(userId: string, env: NodeJS.ProcessEnv): Promise<Date | null | undefined> {
  if (!firstRunTourEnabled(env)) return undefined;
  try {
    return await readTourSeen(userId);
  } catch {
    recordSoftFailure();
    return undefined;
  }
}

export default async function HomePage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> } = {}) {
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
          className="mt-[14px] md:mt-[16px] text-[11px] md:text-[13px] tracking-[0.4em] md:tracking-[0.44em] text-accent-text font-mono uppercase"
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
          99 problems, but your commander ain’t one.
        </p>

        {/* Sign in button per §Sign in button
            margin-top 34px mobile / 36px desktop
            padding 14px 0 (full width up to 260px) mobile / 14px 40px desktop */}
        <SignInButton mode="redirect">
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
  // reachable by design: `/decks/import` has no collection gate, and with
  // NO_COLLECTION_ENTRY_ENABLED step 1's ways group links to it. Showing them
  // the three steps would hide the deck they have.
  // `measure:load`'s spans (PERF_TIMING=1 only; a pass-through otherwise).
  const perf = perfRoute("/");
  // The reader's resolved switches, once for the whole render: the cached payload's key, its load
  // and the first-run checklist all decide from this one env.
  const env = await requestSwitchEnv(userId);
  // ONE clock for the whole render. The rotation's day boundary and the
  // dashboard's stamp both read it, and two `new Date()` calls either side of an
  // await can straddle UTC midnight — which would draw yesterday's pair beside a
  // figure stamped today.
  const now = new Date();
  // The whole payload is cached for this reader, keyed on their data stamp: see page-cache.ts
  // for why that is correct after any write, from anywhere. The UTC DATE is in the key because
  // the Ready-to-build pair rotates on it (`dailyPicks`, whose boundary is UTC by Hugh's call),
  // so a pair cached yesterday is never served today.
  const data = await cachePageForUser(userId, "home", [now.toISOString().slice(0, 10)], async (env): Promise<PageLoad<HomePayload>> => {
    const [stats, decks, seen, tourSeen] = await Promise.all([
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
        includeBracket: analysisTabEnabled(env),
        // The env the load is handed, which is the one the entry is keyed on.
        env,
      })),
      // About's notice (About on the banner): read on both surfaces, since About's first run and Home's checklist
      // are separate states. One primary-key lookup.
      perf.timed("aboutSeen", () => readAboutSeen(userId, env)),
      // The tour's stamp (R3·1a): one primary-key lookup, read only with its switch on. Beside the reads that decide
      // first run rather than after them, so first run's render waits on no extra round trip.
      perf.timed("tourSeen", () => readTourSeenFor(userId, env)),
    ]);
    if (stats.uniqueCards === 0 && decks.length === 0) {
      // `tourDue` is the first-run tour's (R3·1b) one reader.
      const due = tourSeen !== undefined && tourDue(env, true, tourSeen);
      return { value: { firstRun: true, aboutSeen: seen, tourDue: due }, store: true };
    }

    const [lastUpdated, ranked, shopping, unplayed, arrivals] = await Promise.all([
      perf.timed("lastUpdated", () => getCollectionLastUpdated(userId)),
      perf.timed("rankedList", () => getRankedList(userId, env)),
      perf.timed("shoppingRollup", () => loadShoppingRollup(userId, undefined, env)),
      // What the Ready-to-build rotation leans on (the themes each candidate plays that no deck
      // does). Beside the ranked list, never after it: it reads nothing the list returns. Null on
      // failure, which walks the plain shuffle.
      perf.timed("unplayedCounts", () => loadUnplayedCounts(userId, env)),
      // The arrivals banner (upcoming precons): read only past the first-run return above, so a first-run
      // account neither sees it nor reads it. Null when its switch is off, when nothing is new, or when the read
      // failed, which records a fallback so that render is served and not stored.
      upcomingPreconsEnabled(env) ? perf.timed("arrivals", () => loadArrivalsBanner(userId, now)) : null,
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
        // No narrowing: the whole-user vantage, as /collection already takes, under the load's env.
        perf.timed("availability", () => loadAvailability(userId, { env })),
      ]);
      // The shown pair, not the whole ranked list — only a rendered hero prints
      // the clause.
      inUse = receiptCountsByCommander(ready.shown, collection, availability);
      commitments = commitmentFigures(availability.values());
    } catch {
      // Both consumers render nothing rather than a zero, which would be a claim.
      // A fallback, so this render is served and not cached (see soft-failure.ts).
      recordSoftFailure();
    }

    return {
      value: { firstRun: false, aboutSeen: seen, stats, lastUpdated, ready, inUse, decks, commitments, shopping, arrivals },
      // A degraded ranking recomputes on every visit by design; a stored one would freeze it.
      store: !ranked.degraded,
    };
  }, env);
  // The welcome-credits strip (welcome credits D2, PR 2): read per request, after the cached load and never stored,
  // beside the chip's read in the shell, because neither `credit_grants` nor `model_calls` moves the reader's stamp. A
  // failed read draws no strip. Its sheet's list reads nothing more: it is judged on the deck list the payload holds.
  let welcome: WelcomeFacts | null = null;
  try {
    const [state, free] = await Promise.all([readWelcomeState(userId, env, now), readFreeAllowance(userId)]);
    welcome = stripFacts(state, now, free);
  } catch (error) {
    // not a fallback: this read runs after the cached load and is never stored, so nothing stale can be kept.
    console.error("home: the welcome credits could not be read", error instanceof Error ? error.message : "");
  }
  const welcomeSheet = welcome && welcome.lot !== "usedUp"
    ? welcomeSheetFor(env, data.firstRun ? { cards: 0, decks: [] } : { cards: data.stats.uniqueCards, decks: data.decks })
    : null;

  // About's line, decided per request from the cached seen state and THIS browser's sheet cookie, which stays out
  // of the cache because it is per browser: a browser that already showed the sheet for these entries is not told
  // again on Home. The cookie is read, never written; the proxy no longer writes it.
  let about = null;
  if (data.aboutSeen) {
    const visible = visibleEntries(env);
    const shown = sheetCookieIsCurrent((await cookies()).get(SHEET_COOKIE)?.value, userId, visible);
    about = aboutLine(aboutNotice(data.aboutSeen, visible, shown), visible);
  }
  // The no-collection entry (S1, S12): step 1's ways group, and the dashboard's zero-card header for an account with
  // decks and no cards. Decided per request from the resolved switches, outside the cached payload.
  // Rule 0's `Tonight's table` (plan decision 1): read per request after the cached load, never stored, so a reseat,
  // a rename and an expiry show on the next request. A failed read draws no card. Read
  // before the first-run return: a reader with no cards and no decks can still sit at a table, their seat waiting.
  let homeTables: Awaited<ReturnType<typeof loadHomeTables>> = [];
  if (ruleZeroEnabled(env)) {
    try {
      homeTables = await loadHomeTables(userId);
    } catch (error) {
      // not a fallback: this read runs after the cached load and is never stored, so nothing stale can be kept.
      console.error("home: tonight's table could not be read", error);
    }
  }
  const noCollectionEntry = noCollectionEntryEnabled(env);
  // Friends on Home (Social R3 addendum, readiness gap 1): read per request, outside the cached payload, because a
  // friend's rename, a link made or revoked and a link's expiry move nothing its key carries. A failed read draws no
  // section, as a failed Commitments read draws no card. Read before the first-run return, so the checklist's Friends
  // row (Discovery R3·3) draws from the same read, and a failed read draws no row there either.
  let homeFriends: HomeFriends | null = null;
  if (socialFriendsEnabled(env)) {
    try {
      homeFriends = await loadHomeFriends(userId, now);
    } catch (error) {
      // not a fallback: this read runs after the cached load and is never stored, so nothing stale can be kept.
      console.error("home: the friends section could not be read", error);
    }
  }
  // With invites on, Add a friend opens /friends' chooser (addendum G4), which shows the reader's invite count. Read
  // per request like the rest of the section; a count that cannot be read draws Add a friend as a plain link, as
  // /friends does.
  const invites = homeFriends && socialInvitesEnabled(env)
    ? await loadInviteCount(userId, now).catch((error: unknown) => {
        // not a fallback: read after the cached load and never stored.
        console.warn("[invites] count unreadable; drawing Home's Add a friend without it", error instanceof Error ? error.message : "");
        return null;
      })
    : null;

  // The tour taken again (R3·2, plan decision 6): with the switch on, `/?tour=1` starts it whatever `tour_seen_at` says.
  // Decided per request, outside the cached payload; the client reads and strips the parameter itself.
  const tourAgain = firstRunTourEnabled(env);

  if (data.firstRun) {
    return (
      <FirstRunChecklist
        addByHand={collectionEditEnabled(env)}
        about={about}
        welcome={welcome && <WelcomeStrip facts={welcome} sheet={welcomeSheet} place="first-run" afterAbout={about !== null} />}
        ways={noCollectionEntry ? { precons: preconsEnabled(env) } : null}
        scan={cardScanEnabled(env)}
        friends={homeFriends && { friends: homeFriends.friends, links: homeFriends.links, now: now.toISOString(), invites }}
        tables={homeTables.length > 0 ? homeTables.map((t) => <HomeTableCard key={t.tableId} table={t} now={now} />) : null}
        tour={data.tourDue}
        tourAgain={tourAgain}
      />
    );
  }

  // A precon pick's receipt (no-collection entry S5): read per request from the ledger, outside the cached payload,
  // and only when the address claims one, with the pick's switches on (the line's and precons'). A failed read draws
  // no strip.
  let receipt: PickReceipt | null = null;
  const claim = noCollectionEntry && preconsEnabled(env) ? (await searchParams)?.[PICK_RECEIPT_PARAM] : undefined;
  if (claim !== undefined) {
    try {
      receipt = await readPickReceipt(userId, claim);
    } catch (error) {
      // not a fallback: the receipt is an extra, and the dashboard below draws whether or not it was read.
      console.error("home: the precon receipt could not be read", error);
    }
  }

  const dashboard = (
    <Dashboard
      stats={data.stats}
      lastUpdated={data.lastUpdated}
      ready={data.ready}
      inUse={data.inUse}
      decks={data.decks}
      commitments={data.commitments}
      shopping={data.shopping}
      arrivals={data.arrivals}
      about={about}
      welcome={welcome && <WelcomeStrip facts={welcome} sheet={welcomeSheet} place="dashboard" />}
      cartEnabled={allDecksCartEnabled(env)}
      helpMeChoose={helpMeChooseEnabled(env)}
      noCards={noCollectionEntry && data.stats.uniqueCards === 0}
      tables={homeTables}
      friends={homeFriends && { you: homeFriends.you, friends: homeFriends.friends, links: homeFriends.links, games: socialGamesEnabled(env), friendPages: wishlistEnabled(env), invites }}
      // One clock for the whole page, read on the server, so every relative
      // date below agrees.
      now={now.toISOString()}
    />
  );
  // On the dashboard the tour runs on the real app, and is never due: only asked for.
  const page = receipt ? <><PreconPickReceipt receipt={receipt} />{dashboard}</> : dashboard;
  return tourAgain ? <>{page}<HomeTour due={false} mode="dashboard" precons={false} /></> : page;
}
