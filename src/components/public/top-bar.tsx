import { publicPagesCopy } from "../../lib/copy/public-pages";
import { Crowned99 } from "../marks";
import { ExternalLink } from "../ui/external-link";
import { SCRYFALL_SEARCH } from "./links";

const c = publicPagesCopy.shell;

/**
 * The public pages' top bar (README call 5): the mark and wordmark home on the left, and the Scryfall hand-off where a
 * search box would be on the right, `Find another card on Scryfall ↗` from `md` and `Search Scryfall ↗` on the phone, in a
 * 44px target. 64px tall from `md`, 56px on the phone. A plain `<a>` home: a public page's exits never soft-navigate.
 */
export function PublicTopBar() {
  return (
    <header
      data-testid="public-top-bar"
      className="flex h-[56px] md:h-[64px] flex-none items-center justify-between pl-[16px] pr-[8px] md:px-[40px] border-b border-b-[color:var(--border)] bg-[color:var(--bg)]"
    >
      {/* A plain <a>, as every exit from a public page is (plan, follow-up B): the page must not depend on a soft
          navigation re-rendering the root layout around it. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" aria-label={c.homeLabel} className="flex min-h-[44px] items-center gap-[10px] md:gap-[12px] no-underline">
        <span aria-hidden="true" className="flex h-[34px] w-[34px] flex-none items-center justify-center">
          <Crowned99 variant="rail-62" className="max-h-[34px] w-auto" />
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.32em] md:tracking-[0.4em] text-[color:var(--accent)]">
          <span className="md:hidden">{c.wordmarkPhone}</span>
          <span className="max-md:hidden">{c.wordmark}</span>
        </span>
      </a>
      {/* The 44px target is the link itself, not a wrapper around it. */}
      <span className="flex items-center">
        <ExternalLink href={SCRYFALL_SEARCH} label={c.scryfallSearchPhone} className="md:hidden inline-flex min-h-[44px] items-center px-[8px] text-[13.5px]" />
        <ExternalLink href={SCRYFALL_SEARCH} label={c.scryfallSearch} className="max-md:hidden inline-flex min-h-[44px] items-center" />
      </span>
    </header>
  );
}
