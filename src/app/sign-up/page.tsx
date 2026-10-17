// /sign-up: the invite-only page (invites R1 PR 5; boards `R1 - Invite-Only`, I1 and I2).
//
// Public in `src/proxy.ts`. Clerk's sign-up takes only an invitation ticket, so a reader without one lands here and is
// told how the app is joined; a reader who has an account is signed in and goes Home. Sign in stays a redirect to
// Clerk's hosted page (`clerk-hosted.test.ts`). The invitation-email line points at the email's own link, which
// makes the account on Clerk's hosted sign-up, not here.

import { auth } from "@clerk/nextjs/server";
import { SignInButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { inviteOnlyCopy as copy } from "../../lib/copy/join";
import { LandingColumn, PRIMARY_BUTTON } from "../../components/social/friend-landing";
import { FriendCard } from "../../components/social/friend-card";

export default async function SignUpPage() {
  const { userId } = await auth();
  if (userId) redirect("/");
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-[16px] bg-[color:var(--bg)] bg-[radial-gradient(600px_360px_at_50%_22%,color-mix(in_oklab,var(--accent)_12%,transparent),transparent_70%)] px-[24px] md:flex-row md:gap-[56px] md:px-0 md:bg-[radial-gradient(1000px_520px_at_50%_8%,color-mix(in_oklab,var(--accent)_10%,transparent),transparent_70%)]">
      <FriendCard face={null} up={false} />
      <LandingColumn
        kicker={copy.kicker}
        brand
        title={copy.title}
        body={copy.body}
        actions={
          <SignInButton mode="redirect">
            <button type="button" className={PRIMARY_BUTTON}>{copy.signIn}</button>
          </SignInButton>
        }
        fine={copy.fine}
      />
    </main>
  );
}
