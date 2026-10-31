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
import { PRIMARY_BUTTON } from "../../components/social/friend-landing-buttons";
import { INVITE_MAIN, NewcomerColumn } from "../../components/join/newcomer-column";
import { LegalLinks } from "../../components/legal/legal-links";
import { InviteFan } from "../../components/social/friend-card";

export default async function SignUpPage() {
  const { userId } = await auth();
  if (userId) redirect("/");
  return (
    <main className={INVITE_MAIN}>
      <InviteFan word={copy.backWord} />
      <NewcomerColumn
        variant="invite"
        kicker={copy.kicker}
        title={copy.title}
        body={copy.body}
        actions={
          <div className="mt-[22px] flex w-full flex-col md:mt-[20px] md:items-start">
            <SignInButton mode="redirect">
              <button type="button" className={PRIMARY_BUTTON}>{copy.signIn}</button>
            </SignInButton>
            <LegalLinks className="mt-[18px]" />
          </div>
        }
        fine={copy.fine}
      />
    </main>
  );
}
