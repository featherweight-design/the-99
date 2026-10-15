// /friend/[token]: a friend link's landing (Social R1). A STUB for now: PR B ships the route, its gates and
// the already-friends spend; PR D replaces the body with the request card in every state.
//
// Public in `src/proxy.ts`. A signed-out reader is drawn the signed-out card WHATEVER the switches say,
// because it reads nothing (E8): a signed-out request resolves to the environment alone, so a switch on
// for a group only would otherwise answer not found to everyone not yet signed in. A signed-in reader is
// gated by their OWN switch (E18), and only then is the link read.

import { auth } from "@clerk/nextjs/server";
import { SignInButton } from "@clerk/nextjs";
import { notFound } from "next/navigation";
import { socialFriendsEnabled } from "../../../lib/social/flag";
import { requestSwitchEnv } from "../../../lib/switches/request";
import { readInvite } from "../../../lib/social/friends";
import { isInviteToken } from "../../../lib/social/client-rules";
import { socialCopy } from "../../../lib/copy/social";
import { SpendFriendLink } from "../../../components/social/spend-friend-link";

const copy = socialCopy.landing;

export default async function FriendLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return (
      <main className="flex flex-col items-center gap-3 px-4 py-10 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[color:var(--fg-faint)]">{copy.kicker}</p>
        <h1 className="font-display text-[22px] text-[color:var(--fg)]">{copy.signedOutTitle}</h1>
        <p className="text-[14px] text-[color:var(--fg-body)]">{copy.signedOutBody}</p>
        <SignInButton mode="redirect">
          <button type="button" className="mt-2 rounded-[8px] bg-accent px-10 py-[14px] text-[15px] font-semibold text-bg">
            {copy.signIn}
          </button>
        </SignInButton>
      </main>
    );
  }
  if (!socialFriendsEnabled(await requestSwitchEnv(userId))) notFound();
  const { token } = await params;
  // `readInvite` names the inviter only for an open link (E6); an ended one carries its state alone.
  const view = isInviteToken(token) ? await readInvite(userId, token) : null;
  const spend = view !== null && view.state === "open" && !view.self && view.alreadyFriends;
  return (
    <div className="flex flex-col items-center px-4 py-10">
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[color:var(--fg-faint)]">{copy.kicker}</p>
      {spend && <SpendFriendLink token={token} />}
    </div>
  );
}
