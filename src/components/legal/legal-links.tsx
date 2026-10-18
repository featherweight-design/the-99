import Link from "next/link";
import { PendingReporter } from "../shell/pending-reporter";
import { TOUCH_HIT } from "../ui/touch-hit";
import { legalCopy } from "../../lib/copy/legal/shared";

/** The two legal pages, as quiet links under a surface that takes a reader's money or their sign-in. */
export function LegalLinks({ className = "" }: { className?: string }) {
  // A coarse pointer gets TOUCH_HIT's 44px past the 17px line, dropped 4px so its 9.5px reach upward stays clear of
  // the line above at the tightest mount (/credits' history, 10px under the refund line and its support link).
  const link = `${TOUCH_HIT} pointer-coarse:after:mt-[4px] text-[color:var(--fg-muted)] underline decoration-[color:var(--fg-faint)] underline-offset-2 hover:text-[color:var(--fg)]`;
  return (
    <nav aria-label={legalCopy.links} className={`flex gap-[16px] font-mono text-[11.5px] ${className}`}>
      <Link href="/terms" className={link}>{legalCopy.termsTitle}<PendingReporter href="/terms" /></Link>
      <Link href="/privacy" className={link}>{legalCopy.privacyTitle}<PendingReporter href="/privacy" /></Link>
    </nav>
  );
}
