// /friends: your name and face (Social R1 PR C) and your pods (PR E); the friends and the open friend links follow. With
// `SOCIAL_FRIENDS_ENABLED` off for this reader the route does not exist (E18).
//
// Loading is the shell's `LoadingScreen` (a route owns no `loading.tsx` here, `route-loading.test.ts`), and a
// read that throws is the app's error boundary (E16): nothing here catches one into a half-drawn page.

import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { requireUserId } from "../../lib/auth";
import { socialFriendsEnabled } from "../../lib/social/flag";
import { requestSwitchEnv } from "../../lib/switches/request";
import { ensureProfile } from "../../lib/social/friends";
import { listFriends, listPods } from "../../lib/social/access";
import { listSharedPods } from "../../lib/social/spares";
import { PodsPane } from "../../components/social/pods-pane";
import { FriendsView } from "../../components/social/friends-view";

export default async function FriendsPage() {
  const userId = await requireUserId();
  if (!socialFriendsEnabled(await requestSwitchEnv(userId))) notFound();
  // The name a first visit starts with is the Clerk first name (decision 10); `ensureProfile` keeps a stored one.
  const user = await currentUser();
  const [profile, friends, pods, shared] = await Promise.all([
    ensureProfile(userId, user?.firstName), listFriends(userId), listPods(userId), listSharedPods(userId),
  ]);
  return (
    <FriendsView
      profile={profile}
      pods={<PodsPane pods={pods} sharedIds={shared.map((s) => s.podId)} friends={friends} />}
    />
  );
}
