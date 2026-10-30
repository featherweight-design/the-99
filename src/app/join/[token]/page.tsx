// /join/[token]: the newcomer's page (invites R1 PR 5; boards `R1 - Newcomer`, N1 to N12).
//
// Public in `src/proxy.ts`: the reader has no account, so nothing here reads a session beyond "is there one". A signed-in
// reader already has an account and goes Home. The page reads the token's row once against the claim cookie
// (`readJoin`), so a reopened link redraws the step reached (N6), and an invite that is not this browser's, or that no
// longer works, is one card that names nobody (N12). Loading is the shell's `LoadingScreen` (no `loading.tsx`).
//
// A six-character segment is a FLYER code (flyer trial; boards `Join-Phone`, `Join-Desktop`), a 43-character one an
// invite token, so the code is parsed first. Its cookie path (`/join`) is case-sensitive, so a lower-case code is
// redirected to its upper-case form before anything is read. The switch is decided for the code's creator inside
// `readFlyerJoin` (the reader has no account): off, every code reads as retired.

import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readFlyerJoin } from "../../../lib/flyer/join-read";
import { flyerCookieName } from "../../../lib/flyer/cookie";
import { parseFlyerCode } from "../../../lib/flyer/rules";
import { readJoin } from "../../../lib/invites/join-read";
import { JoinFlow } from "../../../components/join/join-flow";
import { FLYER_MAIN, NEWCOMER_MAIN } from "../../../components/join/newcomer-column";

// The claim cookie's name and path are the actions' (`app/join/actions.ts`): scoped to this page alone.
const COOKIE = "invite_claim";

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { userId } = await auth();
  if (userId) redirect("/");
  const jar = await cookies();
  const code = parseFlyerCode(token);
  if (code !== null) {
    if (token !== code) redirect(`/join/${code}`);
    const view = await readFlyerJoin(code, jar.get(flyerCookieName(code))?.value ?? null);
    return (
      <main className={FLYER_MAIN}>
        <JoinFlow token={code} start={view} flyer />
      </main>
    );
  }
  const view = await readJoin(token, jar.get(COOKIE)?.value ?? null);
  return (
    // A <main> of its own: signed out, the shell draws none (`Shell`).
    <main className={NEWCOMER_MAIN}>
      <JoinFlow token={token} start={view} />
    </main>
  );
}
