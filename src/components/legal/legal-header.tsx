import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";
import { Crowned99 } from "../marks";
import { PendingReporter } from "../shell/pending-reporter";
import { GhostButton } from "../ui/button";
import { legalCopy } from "../../lib/copy/legal/shared";

/**
 * The signed-out legal pages' own header (the shell draws none for a signed-out reader): the wordmark to `/` and a quiet
 * `Sign in`, 64px on the phone and 68px from `md`. The wordmark is the mobile header's (`nav.tsx`, §Mobile Wordmark).
 */
export function LegalHeader() {
  return (
    <header className="flex h-[64px] items-center justify-between border-0 border-b border-solid border-b-[color:var(--border)] bg-[color:var(--bg)] px-[20px] md:h-[68px] md:px-[34px]">
      <Link href="/" aria-label={legalCopy.homeLabel} className="flex items-end gap-[3px] no-underline">
        <span aria-hidden className="pb-1 text-[9px] tracking-[0.4em] text-[color:var(--accent)]" style={{ fontFamily: "var(--font-mono)" }}>THE</span>
        <Crowned99 variant="mobile-header" />
        <PendingReporter href="/" />
      </Link>
      <SignInButton mode="redirect">
        <GhostButton type="button" className="h-[40px] rounded-[8px] px-[16px] text-[13px]">{legalCopy.signIn}</GhostButton>
      </SignInButton>
    </header>
  );
}
