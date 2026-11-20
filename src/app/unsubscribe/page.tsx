import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { cache } from "react";

import { PRIMARY } from "../../components/ui/button";
import { unsubscribePageCopy } from "../../lib/copy/emails";
import { tokenShaped, unsubscribeByToken, type UnsubscribeOutcome } from "../../lib/flyer/launch-unsubscribe";
import { overAnonymousLimit } from "../../lib/rate/anon";

// The launch email's unsubscribe link (launch email R2c, boards U1 and U2): the shipped offline page's body, signed out, no
// shell. Opening the link is the one press: it deletes the address and says so (U1). A missing or malformed link is U2 and
// deletes nothing. The answer never says whether the address was on the list: an address already gone or purged is U1 too.
// Public in `src/proxy.ts`; each open counts against the visitor's `launch-unsubscribe` allowance, because it scans the list.
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ t?: string | string[] }> };

/** One answer per request: the title and the body read the same outcome, and the delete runs once. */
const outcomeFor = cache(async (t: unknown): Promise<UnsubscribeOutcome> => {
  if (!tokenShaped(t)) return "broken";
  // Over the allowance, nothing is read or deleted, and the link reads as one to open again (U2's words).
  if (await overAnonymousLimit(await headers(), "launch-unsubscribe")) return "broken";
  return unsubscribeByToken(t);
});

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { t } = await searchParams;
  const outcome = await outcomeFor(t);
  return { title: unsubscribePageCopy[outcome].documentTitle, robots: { index: false, follow: false } };
}

export default async function UnsubscribePage({ searchParams }: Props) {
  const { t } = await searchParams;
  const copy = unsubscribePageCopy;
  const state = copy[await outcomeFor(t)];
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[560px] flex-col justify-center gap-[12px] px-[20px] py-[40px]">
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">{copy.eyebrow}</span>
      <h1 className="m-0 font-display text-[24px] font-bold text-[color:var(--fg)]">{state.title}</h1>
      <p className="m-0 text-[14px] text-[color:var(--fg-muted)]">{state.sub}</p>
      <div className="mt-[8px]">
        <Link
          href="/"
          className={`${PRIMARY} inline-flex w-fit min-h-[44px] items-center rounded-lg px-[20px] font-sans text-[14px] font-semibold`}
        >
          {copy.button}
        </Link>
      </div>
    </main>
  );
}
