import Link from "next/link";
import { PendingReporter } from "../shell/pending-reporter";
import { legalCopy } from "../../lib/copy/legal/shared";

/** The two legal pages, as quiet links under a surface that takes a reader's money or their sign-in. */
export function LegalLinks({ className = "" }: { className?: string }) {
  const link = "text-[color:var(--fg-muted)] underline decoration-[color:var(--fg-faint)] underline-offset-2 hover:text-[color:var(--fg)]";
  return (
    <nav aria-label={legalCopy.links} className={`flex gap-[16px] font-mono text-[11.5px] ${className}`}>
      <Link href="/terms" className={link}>{legalCopy.termsTitle}<PendingReporter href="/terms" /></Link>
      <Link href="/privacy" className={link}>{legalCopy.privacyTitle}<PendingReporter href="/privacy" /></Link>
    </nav>
  );
}
