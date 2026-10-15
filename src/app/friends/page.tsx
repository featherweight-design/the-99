// /friends: your name and face (Social R1 PR C); the friends, the open friend links and the pods follow. With
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
import { FriendsView } from "../../components/social/friends-view";

export default async function FriendsPage() {
  const userId = await requireUserId();
  if (!socialFriendsEnabled(await requestSwitchEnv(userId))) notFound();
  // The name a first visit starts with is the Clerk first name (decision 10); `ensureProfile` keeps a stored one.
  const user = await currentUser();
  return <FriendsView profile={await ensureProfile(userId, user?.firstName)} />;
}
