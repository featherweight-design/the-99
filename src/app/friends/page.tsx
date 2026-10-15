// /friends: your name and face, your friends, your open friend links and your pods (Social R1). A STUB
// for now: PR B ships the route and its gate, and PR C replaces this body with the head and the friends
// list, PR E with the pods. With `SOCIAL_FRIENDS_ENABLED` off for this reader the route does not exist (E18).

import { notFound } from "next/navigation";
import { requireUserId } from "../../lib/auth";
import { socialFriendsEnabled } from "../../lib/social/flag";
import { requestSwitchEnv } from "../../lib/switches/request";
import { socialCopy } from "../../lib/copy/social";

export default async function FriendsPage() {
  const userId = await requireUserId();
  if (!socialFriendsEnabled(await requestSwitchEnv(userId))) notFound();
  return (
    <div className="flex flex-col px-4 py-6 md:px-8">
      <h1 className="font-display text-[26px] text-[color:var(--fg)]">{socialCopy.page.title}</h1>
    </div>
  );
}
