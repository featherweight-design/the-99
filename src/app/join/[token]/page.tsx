// /join/[token]: the newcomer's page (invites R1 PR 5; boards `R1 - Newcomer`, N1 to N12).
//
// Public in `src/proxy.ts`: the reader has no account, so nothing here reads a session beyond "is there one". A signed-in
// reader already has an account and goes Home. The page reads the token's row once against the claim cookie
// (`readJoin`), so a reopened link redraws the step reached (N6), and an invite that is not this browser's, or that no
// longer works, is one card that names nobody (N12). Loading is the shell's `LoadingScreen` (no `loading.tsx`).

import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readJoin } from "../../../lib/invites/join-read";
import { JoinFlow } from "../../../components/join/join-flow";

// The claim cookie's name and path are the actions' (`app/join/actions.ts`): scoped to this page alone.
const COOKIE = "invite_claim";

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { userId } = await auth();
  if (userId) redirect("/");
  const jar = await cookies();
  const view = await readJoin(token, jar.get(COOKIE)?.value ?? null);
  return (
    // A <main> of its own: signed out, the shell draws none (`Shell`).
    <main className="flex min-h-screen flex-col items-center justify-center gap-[16px] bg-[color:var(--bg)] bg-[radial-gradient(600px_360px_at_50%_22%,color-mix(in_oklab,var(--accent)_12%,transparent),transparent_70%)] px-[24px] md:flex-row md:gap-[56px] md:px-0 md:bg-[radial-gradient(1000px_520px_at_50%_8%,color-mix(in_oklab,var(--accent)_10%,transparent),transparent_70%)]">
      <JoinFlow token={token} start={view} />
    </main>
  );
}
