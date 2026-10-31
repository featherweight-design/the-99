// /friend/[token]: a friend link's landing, the friend request card (Social R1 PR D; boards `R2 - Landing-*`).
//
// Public in `src/proxy.ts`. A signed-out reader is drawn the signed-out card WHATEVER the switches say,
// because it reads nothing (E8): a signed-out request resolves to the environment alone, so a switch on
// for a group only would otherwise answer not found to everyone not yet signed in. A signed-in reader is
// gated by their OWN switch (E18), and only then is the link read. Loading is the shell's `LoadingScreen` (no
// `loading.tsx`, `route-loading.test.ts`), and a read that throws is the app's error boundary (E16).

import { auth } from "@clerk/nextjs/server";
import { SignInButton } from "@clerk/nextjs";
import { notFound } from "next/navigation";
import { socialFriendsEnabled } from "../../../lib/social/flag";
import { requestSwitchEnv } from "../../../lib/switches/request";
import { readInvite } from "../../../lib/social/friends";
import { landingView } from "../../../lib/social/landing";
import { invitePath, isInviteToken } from "../../../lib/social/client-rules";
import { socialCopy } from "../../../lib/copy/social";
import { SpendFriendLink } from "../../../components/social/spend-friend-link";
import { FriendCard } from "../../../components/social/friend-card";
import { FriendLanding, LandingColumn } from "../../../components/social/friend-landing";
import { PRIMARY_BUTTON } from "../../../components/social/friend-landing-buttons";

const copy = socialCopy.landing;

export default async function FriendLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { userId } = await auth();
  const { token } = await params;
  if (!userId) {
    // The landing's own ground and mark (R1 decision 8), with no shell: the card face down, naming nobody.
    return (
      // A <main> of its own: signed out, the shell draws none (`Shell`).
      <main className="flex min-h-screen flex-col items-center justify-center gap-[16px] bg-[color:var(--bg)] bg-[radial-gradient(600px_360px_at_50%_22%,color-mix(in_oklab,var(--accent)_12%,transparent),transparent_70%)] px-[24px] md:flex-row md:gap-[56px] md:px-0 md:bg-[radial-gradient(1000px_520px_at_50%_8%,color-mix(in_oklab,var(--accent)_10%,transparent),transparent_70%)]">
        <FriendCard face={null} up={false} />
        <LandingColumn
          kicker={copy.brand}
          signedOut
          title={copy.signedOutTitle}
          body={copy.signedOutBody}
          actions={
            // Back to this link once signed in, so the card turns over for them.
            <SignInButton mode="redirect" forceRedirectUrl={invitePath(encodeURIComponent(token))}>
              <button type="button" className={PRIMARY_BUTTON}>{copy.signIn}</button>
            </SignInButton>
          }
          fine={copy.signedOutFine}
        />
      </main>
    );
  }
  const env = await requestSwitchEnv(userId);
  if (!socialFriendsEnabled(env)) notFound();
  // `readInvite` names the inviter only for an open link (E6); an ended one carries its state alone.
  const view = landingView(isInviteToken(token) ? await readInvite(userId, token) : null);
  // The server's clock, so the card's first render names the same day as the server drew it.
  const now = new Date();
  return (
    <>
      {/* Opening a friend's link spends it, once, after mount (G4): the card says it is used up. */}
      {view.kind === "friends" && <SpendFriendLink token={token} />}
      <FriendLanding token={token} view={view} nowMs={now.getTime()} signature={socialFriendsEnabled(env)} />
    </>
  );
}
