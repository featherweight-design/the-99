// /sign-up: the invite-only page (invites R1 PR 5; boards `R1 - Invite-Only`, I1 and I2), and the in-app sign-up by
// invitation (Small items 11, item 4: addendum A2 Ruling 1 and Ruling 3; boards Q1 to Q8, R2, R3 and R5).
//
// Public in `src/proxy.ts`. Clerk's sign-up takes only an invitation ticket, so the page draws the sign-up only for an address
// that asks for one (`signUpEntry`): an invitation's ticket, which Clerk's accept link hands back here as `__clerk_ticket`
// (every invitation is made with this page as its `redirectUrl`, `lib/invites/clerk.ts`), or the way back from Google with
// something still owed (`?google=missing`, Q6). That render is kept out of search: the address carries a ticket. A reader
// with neither is told how the app is joined (R1); it is a render, never a redirect, so this page never sends a reader to
// itself. A reader who has an account is signed in and goes Home. Sign in stays a redirect, to the app's own `/sign-in`
// (`clerk-hosted.test.ts`).

import { auth } from "@clerk/nextjs/server";
import { SignInButton } from "@clerk/nextjs";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { inviteOnlyCopy as copy } from "../../lib/copy/join";
import { PRIMARY_BUTTON } from "../../components/social/friend-landing-buttons";
import { FLYER_MAIN, INVITE_MAIN, NewcomerColumn } from "../../components/join/newcomer-column";
import { LegalLinks } from "../../components/legal/legal-links";
import { InviteFan } from "../../components/social/friend-card";
import { SignUpFlow } from "../../components/sign-up/sign-up-flow";
import { signUpEntry, type SignUpQuery } from "../../components/sign-up/sign-up-query";

type Props = { searchParams: Promise<SignUpQuery> };

/** The sign-up's render is kept out of search; R1 keeps the page's own (the layout's). */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return signUpEntry(await searchParams) ? { robots: { index: false, follow: false } } : {};
}

export default async function SignUpPage({ searchParams }: Props) {
  const { userId } = await auth();
  if (userId) redirect("/");
  const entry = signUpEntry(await searchParams);
  if (entry) {
    return (
      // A <main> of its own: signed out, the shell draws none (`Shell`).
      <main className={FLYER_MAIN}>
        <SignUpFlow key={entry.ticket ?? "google"} ticket={entry.ticket} googleMissing={entry.googleMissing} />
      </main>
    );
  }
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
