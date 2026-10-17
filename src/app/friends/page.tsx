// /friends: your name and face, your friends and your open friend links (Social R1 PR C), and your pods (PR E).
// With `SOCIAL_FRIENDS_ENABLED` off for this reader the route does not exist (E18).
//
// Loading is the shell's `LoadingScreen` (a route owns no `loading.tsx` here, `route-loading.test.ts`), and a
// read that throws is the app's error boundary (E16): nothing here catches one into a half-drawn page.
// `?accepted=<publicId>` is the receipt after Accept (E10), resolved through the reader's own friends, so a
// forged or stale id draws nothing.

import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { currentUser } from "@clerk/nextjs/server";
import { requireUserId } from "../../lib/auth";
import { socialFriendsEnabled } from "../../lib/social/flag";
import { wishlistEnabled } from "../../lib/wishlist/flag";
import { requestSwitchEnv } from "../../lib/switches/request";
import { ensureProfile, friendPublicId, loadFriendsAndLinks } from "../../lib/social/friends";
import { reservationIdFrom, spendInviteOnSignUp, takeReceipt } from "../../lib/invites/spend";
import { listPods } from "../../lib/social/access";
import { listSharedPods } from "../../lib/social/spares";
import { PodsPane } from "../../components/social/pods-pane";
import { MAX_OPEN_INVITES } from "../../lib/social/rules";
import { ACCEPTED_PARAM, originFrom } from "../../lib/social/client-rules";
import { FriendsView } from "../../components/social/friends-view";

export default async function FriendsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!socialFriendsEnabled(env)) notFound();
  const accepted = (await searchParams)[ACCEPTED_PARAM];
  const now = new Date();
  // The name a first visit starts with is the Clerk first name (decision 10); `ensureProfile` keeps a stored one.
  const user = await currentUser();
  // A newcomer's first arrival (invites plan R8, ruling D). The webhook may have spent their invitation already or
  // not yet; the spend is idempotent, so this runs it when the account's own invitation names a reservation, and the
  // receipt is then drawn once from the edge, whichever of the two ran first.
  const reservationId = reservationIdFrom(user?.publicMetadata);
  if (reservationId !== null) await spendInviteOnSignUp(userId, reservationId, user?.firstName);
  const inviterId = await takeReceipt(userId);
  const inviterPublicId = inviterId === null ? null : await friendPublicId(userId, inviterId);
  // Friends and open links from one snapshot, so a redraw never drops a redeemed link before its friend's row.
  const [profile, { friends, links }, pods, shared] = await Promise.all([
    ensureProfile(userId, user?.firstName),
    loadFriendsAndLinks(userId, now),
    listPods(userId),
    listSharedPods(userId),
  ]);
  return (
    <FriendsView
      profile={profile}
      pods={<PodsPane pods={pods} sharedIds={shared.map((s) => s.podId)} friends={friends} />}
      friends={friends}
      links={links}
      accepted={
        (typeof accepted === "string" ? friends.find((f) => f.publicId === accepted) : undefined) ??
        (inviterPublicId !== null ? friends.find((f) => f.publicId === inviterPublicId) : undefined) ??
        null
      }
      origin={originFrom(await headers())}
      nowMs={now.getTime()}
      maxLinks={MAX_OPEN_INVITES}
      friendPages={wishlistEnabled(env)}
    />
  );
}
