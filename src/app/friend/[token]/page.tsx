// /friend/[token]: a friend link's landing, the friend request card (Social R1 PR D; boards `R2 - Landing-*`).
//
// Public in `src/proxy.ts`. A reusable friend link (friend links R1) names its owner to whoever holds it, signed in or out
// (Q2); a single-use invite's signed-out card reads nothing (E8), and only a signed-in reader's request reads that link. Loading is the shell's `LoadingScreen` (no
// `loading.tsx`, `route-loading.test.ts`), and a read that throws is the app's error boundary (E16).

import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { mailEnv } from "../../../lib/invites/mail";
import { inviteSecret } from "../../../lib/invites/tokens";
import { overAnonymousLimit } from "../../../lib/rate/anon";
import { readLinkLanding } from "../../../lib/social/link-landing";
import { friendLinkCopy } from "../../../lib/copy/friend-links";
import { LinkEnded, LinkLanding, LinkLandingSignedOut } from "../../../components/social/link-landing";
import { friendLinksEnabled } from "../../../lib/friend-links/flag";
import { requestFlags } from "../../../lib/flags/request";
import { SignInButton } from "@clerk/nextjs";
import { readInvite } from "../../../lib/social/friends";
import { landingView } from "../../../lib/social/landing";
import { invitePath, isInviteToken } from "../../../lib/social/client-rules";
import { socialCopy } from "../../../lib/copy/social";
import { SpendFriendLink } from "../../../components/social/spend-friend-link";
import { FriendCard } from "../../../components/social/friend-card";
import { FriendLanding, LandingColumn } from "../../../components/social/friend-landing";
import { PRIMARY_BUTTON } from "../../../components/social/friend-landing-buttons";

const copy = socialCopy.landing;
/** The signed-out landing's own ground and mark (R1 decision 8), with no shell. */
const SIGNED_OUT_MAIN = "flex min-h-screen flex-col items-center justify-center gap-[16px] bg-[color:var(--bg)] bg-[radial-gradient(600px_360px_at_50%_22%,color-mix(in_oklab,var(--accent)_12%,transparent),transparent_70%)] px-[24px] md:flex-row md:gap-[56px] md:px-0 md:bg-[radial-gradient(1000px_520px_at_50%_8%,color-mix(in_oklab,var(--accent)_10%,transparent),transparent_70%)]";

export default async function FriendLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { userId } = await auth();
  const { token } = await params;
  // A reusable friend link (friend links R1) is read first; a single-use invite link keeps its own landing below until it
  // expires (G7). Signed out, a visitor past the per-visitor cap (across every link, so one address cannot walk tokens)
  // reads the ended card, naming nobody, and nothing is read.
  if (!userId && (await overAnonymousLimit(await headers(), "friend-landing"))) {
    return (
      <main className={SIGNED_OUT_MAIN}>
        <FriendCard face={null} up={false} />
        <LandingColumn
          kicker={copy.brand}
          signedOut
          title={copy.endedTitle}
          body={friendLinkCopy.landing.endedBody}
          actions={
            <SignInButton mode="redirect" forceRedirectUrl={invitePath(encodeURIComponent(token))}>
              <button type="button" className={PRIMARY_BUTTON}>{copy.signIn}</button>
            </SignInButton>
          }
        />
      </main>
    );
  }
  const link = await readLinkLanding(userId ?? null, token, inviteSecret(mailEnv()));
  if (link && !userId) {
    return (
      <main className={`${SIGNED_OUT_MAIN} py-[28px]`}>
        <LinkLandingSignedOut token={token} owner={link.owner} outOfInvites={link.outOfInvites} />
      </main>
    );
  }
  if (link && userId) {
    return (
      <LinkLanding token={token} owner={link.owner} sentAt={link.sentAt?.toISOString() ?? null} friendsSince={link.friendsSince?.toISOString() ?? null}
        initial={link.self ? "self" : link.friends ? "friends" : "send"} />
    );
  }
  if (!userId) {
    // The landing's own ground and mark (R1 decision 8), with no shell: the card face down, naming nobody.
    return (
      // A <main> of its own: signed out, the shell draws none (`Shell`).
      <main className={SIGNED_OUT_MAIN}>
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
  // `readInvite` names the inviter only for an open link (E6); an ended one carries its state alone.
  const view = landingView(isInviteToken(token) ? await readInvite(userId, token) : null);
  // With friend links on for the reader, a link that is neither live nor a single-use invite reads L7: it may be reset.
  if (view.kind === "ended" && friendLinksEnabled(await requestFlags(userId))) return <LinkEnded />;
  // The server's clock, so the card's first render names the same day as the server drew it.
  const now = new Date();
  return (
    <>
      {/* Opening a friend's link spends it, once, after mount (G4): the card says it is used up. */}
      {view.kind === "friends" && <SpendFriendLink token={token} />}
      <FriendLanding token={token} view={view} nowMs={now.getTime()} />
    </>
  );
}
