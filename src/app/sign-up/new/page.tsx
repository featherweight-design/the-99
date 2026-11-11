// /sign-up/new: the in-app sign-up by invitation (Small items 11, item 4: addendum A2 Ruling 1 and Ruling 3; boards Q1 to
// Q8, R2, R3 and R5).
//
// Public in `src/proxy.ts` (under `/sign-up(/.*)?`), unlinked and kept out of search until the cutover points invitations
// here; a real invitation email still lands on Clerk's hosted sign-up. `?ticket=` is the invitation's ticket (Clerk's own
// `__clerk_ticket` is read too, the name its redirect adds); `?google=missing` is the way back from Google with a name or a
// password still owed (Q6, `app/sso-callback`). A reader with neither gets the shipped invite-only `/sign-up` (R1), and a
// reader already signed in goes Home.

import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FLYER_MAIN } from "../../../components/join/newcomer-column";
import { SignUpFlow } from "../../../components/sign-up/sign-up-flow";

export const metadata: Metadata = { robots: { index: false, follow: false } };

type Query = Record<string, string | string[] | undefined>;

/** The ticket a link carries: one non-empty value, or none (a repeated param is not a ticket). */
function ticketOf(query: Query): string | null {
  for (const key of ["ticket", "__clerk_ticket"]) {
    const value = query[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export default async function SignUpTicketPage({ searchParams }: { searchParams: Promise<Query> }) {
  const { userId } = await auth();
  if (userId) redirect("/");
  const query = await searchParams;
  const googleMissing = query.google === "missing";
  const ticket = googleMissing ? null : ticketOf(query);
  if (!ticket && !googleMissing) redirect("/sign-up");
  return (
    // A <main> of its own: signed out, the shell draws none (`Shell`).
    <main className={FLYER_MAIN}>
      <SignUpFlow key={ticket ?? "google"} ticket={ticket} googleMissing={googleMissing} />
    </main>
  );
}
