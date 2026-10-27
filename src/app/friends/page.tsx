// /friends: your name and face, your friends and your open friend links (Social R1 PR C), and your pods (PR E).
// With `SOCIAL_FRIENDS_ENABLED` off for this reader the route does not exist (E18).
//
// Loading is the shell's `LoadingScreen` (a route owns no `loading.tsx` here, `route-loading.test.ts`), and a
// read that throws is the app's error boundary (E16): nothing here catches one into a half-drawn page.
// `?accepted=<publicId>` is the receipt after Accept (E10), resolved through the reader's own friends, so a
// forged or stale id draws nothing.

import { notFound } from "next/navigation";
import { after } from "next/server";
import { headers } from "next/headers";
import { currentUser } from "@clerk/nextjs/server";
import { requireUserId } from "../../lib/auth";
import { friendDecksEnabled, ruleZeroEnabled, signatureCardEnabled, socialFriendsEnabled, socialInvitesEnabled } from "../../lib/social/flag";
import { loadFriendDeckPrefs } from "../../lib/social/deck-visibility";
import { loadInviteCount } from "../../lib/invites/read";
import { requestSwitchEnv } from "../../lib/switches/request";
import { perfRoute } from "../../lib/perf/timing";
import { ensureProfile, friendPublicId, loadFriendsAndLinks, profileAgeMs } from "../../lib/social/friends";
import { pendingReceipt, reservationIdFrom, spendInviteOnSignUp, takeReceipt } from "../../lib/invites/spend";
import { listPods } from "../../lib/social/access";
import { listSharedPods } from "../../lib/social/spares";
import { PodsPane } from "../../components/social/pods-pane";
import { MAX_OPEN_INVITES, profileNeedsClerk } from "../../lib/social/rules";
import { ACCEPTED_PARAM, INVITE_PARAM, originFrom } from "../../lib/social/client-rules";
import { FriendsView } from "../../components/social/friends-view";
import { pageLanding } from "../../lib/discovery/page-landing";
import { TOOL_PARAM } from "../../lib/discovery/tool-param";
import { ToolLandingMount } from "../../components/discovery/tool-landing-mount";
import { openTablesFor } from "../../lib/social/rule-zero";
import { loadWaitingOnYou } from "../../lib/social/waiting";
import { noticeTradeMatches } from "../../lib/social/trade-match";
import { markFriendsSeen } from "../../lib/feed/prefs";
import { WaitingOnYou } from "../../components/social/waiting-on-you";
import { TradeAskFrame } from "../../components/social/trade-ask";
import { CardDetailProvider } from "../../components/cards/card-detail-provider";
import { loadTradeAsk } from "../../lib/social/trade-ask";
import { loadYourRequests } from "../../lib/social/your-requests";
import { YourRequests } from "../../components/social/your-requests";
import { shoppingMarkBoughtEnabled } from "../../lib/decks/mark-bought-flag";

export default async function FriendsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const perf = perfRoute("/friends");
  // The three awaits ahead of the reads are timed too: `total` has always run from the top of this function, and the reads
  // account for ~35 ms of the ~190 it measured warm on staging (2026-10-18), so the rest sits in one of these.
  const userId = await perf.timed("requireUserId", () => requireUserId());
  const env = await perf.timed("switchEnv", () => requestSwitchEnv(userId));
  if (!socialFriendsEnabled(env)) notFound();
  const query = await searchParams;
  const accepted = query[ACCEPTED_PARAM];
  // Try it's landing (discovery R2·3): `?tool=friends` haloes Add a friend; anything else is stripped.
  const { landing, request } = pageLanding(query[TOOL_PARAM], env, "friends");
  const now = new Date();
  // The name a first visit starts with is the Clerk first name (decision 10); `ensureProfile` keeps a stored one.
  // Asked of Clerk only for a profile that is missing or new (`profileNeedsClerk`): the Backend call was 124 of the page's 180 ms
  // on staging (2026-10-18), and a returning reader's name is stored. Every path that writes a profile has attempted the invite spend by then (the spend itself,
  // this page, and `ensureSenderProfile`), so an old profile has nothing left for this page to recover.
  const needsClerk = profileNeedsClerk(await perf.timed("profileAge", () => profileAgeMs(userId)));
  const user = needsClerk ? await perf.timed("currentUser", () => currentUser()) : null;
  // A newcomer's first arrival (invites plan R8, ruling D). The webhook may have spent their invitation already or
  // not yet; the spend is idempotent, so this runs it when the account's own invitation names a reservation, and the
  // receipt is then drawn once from the edge, whichever of the two ran first.
  const reservationId = reservationIdFrom(user?.publicMetadata);
  if (reservationId !== null) await spendInviteOnSignUp(userId, reservationId, user?.firstName);
  // The invite count (invites PR 4), read beside the rest; null with invites off, so the head draws as shipped.
  // A count that cannot be read (a database the invites migration has not reached) draws the page as shipped,
  // never an error: the count is an extra, and Add a friend's link path works without it.
  const invitesRead = socialInvitesEnabled(env)
    ? perf.timed("inviteCount", () => loadInviteCount(userId, now)).catch((error: unknown) => {
        console.warn("[invites] count unreadable; drawing /friends without it", error instanceof Error ? error.message : "");
        return null;
      })
    : Promise.resolve(null);
  // Friends and open links from one snapshot, so a redraw never drops a redeemed link before its friend's row.
  // Rule 0's pod rows (plan decision 6): read fresh beside the pods, since this page caches nothing.
  const ruleZero = ruleZeroEnabled(env);
  const [profile, { friends, links }, pods, shared, tables, waiting, deckPrefs, mine] = await Promise.all([
    perf.timed("ensureProfile", () => ensureProfile(userId, user?.firstName)),
    perf.timed("friendsAndLinks", () => loadFriendsAndLinks(userId, now)),
    perf.timed("pods", () => listPods(userId)),
    perf.timed("sharedPods", () => listSharedPods(userId)),
    ruleZero ? perf.timed("openTables", () => openTablesFor(userId)) : Promise.resolve(null),
    perf.timed("waitingOnYou", () => loadWaitingOnYou(userId, env, now)),
    // The head's privacy line under friend decks: the reader's own two rules (README 4b).
    friendDecksEnabled(env) ? perf.timed("friendDeckPrefs", () => loadFriendDeckPrefs(userId)) : Promise.resolve(null),
    // Your requests (spare requests PR 3d): the reader's own asks, under Waiting on you. Empty with the switch off. Read
    // before `after()` moves the Friends cursor, so an answer this visit shows is still marked new.
    perf.timed("yourRequests", () => loadYourRequests(userId, env, now)),
  ]);
  // After the response, never during the render: record any trade match this reader has not been told about (the next
  // render draws it), then clear the Friends badge up to the instant this page drew. Each writes only when it has
  // something to write (`user_data_touch`: an unconditional write would retire the reader's cached pages).
  after(async () => {
    await noticeTradeMatches(userId, env);
    await markFriendsSeen(userId, env, now);
  });
  // The inviter is resolved first and the receipt marked shown LAST, once every read the page needs has succeeded: a
  // read that throws shows the error boundary, and a receipt already marked would never be drawn on the retry.
  const pendingInviter = await perf.timed("pendingReceipt", () => pendingReceipt(userId));
  const inviterPublicId = pendingInviter === null ? null : await friendPublicId(userId, pendingInviter);
  // Drawn only when THIS request consumed it: two renders can both read the pending inviter, and one update wins.
  const consumed = pendingInviter !== null && (await takeReceipt(userId)) !== null;
  const invites = await invitesRead;
  // A trade match's Ask opens its spares sheet over this page (product call 8): the rows' cards and their prices.
  const tradeAsk = await loadTradeAsk(
    waiting.flatMap((r) => (r.kind === "trade-match" && r.askable ? [{ oracleId: r.card.oracleId, name: r.card.name, imageUri: r.card.imageUri }] : [])),
  );
  return (
    <>
    <ToolLandingMount landing={landing} request={request} />
    <FriendsView
      profile={profile}
      waiting={<>
        {/* The sheet's name opens card details, so its provider sits around it here, as on a friend's Spares tab. Both
            stay mounted with no trade match, so a redraw that drops the last one keeps Waiting on you's visit state. A
            Your requests ✕ moves `asksVersion`, so a trade match's press stops saying Requested for a withdrawn ask. */}
        <CardDetailProvider>
          <TradeAskFrame payload={tradeAsk} asksVersion={mine.map((r) => `${r.id}:${r.state}:${r.cleared ? 1 : 0}`).join(",")}>
            <WaitingOnYou rows={waiting} now={now} />
          </TradeAskFrame>
        </CardDetailProvider>
        <YourRequests rows={mine} now={now} canBuy={shoppingMarkBoughtEnabled(env)} />
      </>}
      pods={<PodsPane pods={pods} sharedIds={shared.map((s) => s.podId)} friends={friends} ruleZero={tables ? { tables, now } : null} />}
      friends={friends}
      links={links}
      openInviteNew={query[INVITE_PARAM] === "new"}
      accepted={
        (typeof accepted === "string" ? friends.find((f) => f.publicId === accepted) : undefined) ??
        (consumed && inviterPublicId !== null ? friends.find((f) => f.publicId === inviterPublicId) : undefined) ??
        null
      }
      origin={originFrom(await headers())}
      nowMs={now.getTime()}
      maxLinks={MAX_OPEN_INVITES}
      friendPages
      invites={invites}
      decksSeen={deckPrefs}
      signature={signatureCardEnabled(env)}
    />
    </>
  );
}
