"use client";
// You have it R2 (board `Sheet`): the friend's answer to the reader's OFFER, opened over Home from its What's new item
// ("Your offer ›"). The mirror of the ask's answer sheet (`answer-sheet.tsx`) with the request-history row in place of the
// Your requests row: the offerer has no Your requests row and nothing to clear, so the sheet has no Clear. The item's own
// ✕ still only hides the item. The foot goes to Request history, whose From you tab holds the offer.
import Link from "next/link";
import { ModalChrome } from "../decks/receipt-modal";
import { PersonText, type PersonParts } from "../../lib/person-name";
import { KICKER_AGE } from "../feed/kicker-age";
import { feedAge } from "../../lib/feed/age";
import { formatShortDeckDate } from "../../lib/decks/format";
import { historyCopy } from "../../lib/copy/request-history";
import { offerSheetCopy as c, spareCopy } from "../../lib/copy/social";
import type { HistoryEntry } from "../../lib/social/request-history";
import { PendingReporter } from "../shell/pending-reporter";
import { HistoryPicture } from "../social/request-history";
import { useZone } from "../zone-context";

export function OfferAnswerSheet({ entry, now, onClose }: { entry: HistoryEntry; now: string; onClose: () => void }) {
  const zone = useZone();
  const o = spareCopy.request.offer.answered;
  // The reader only opens an answered offer (`offerAnswerIdQuery`), so the state is yes or no.
  const yes = entry.state === "yes";
  const title: PersonParts = yes ? o.yes(entry.other.displayName, entry.card.name) : o.no(entry.other.displayName, entry.card.name);
  const answeredAt = (entry.endedAt ?? entry.createdAt).toISOString();
  return (
    <ModalChrome
      title={c.title}
      closeLabel={c.close}
      onClose={onClose}
      width={560}
      fit
      foot={
        <div className="flex min-h-[52px] items-center px-[16px] pb-[8px] [border-top:1px_solid_var(--border)] md:min-h-[46px] md:justify-end md:px-[18px] md:pb-0">
          <Link href="/friends/requests" className="flex min-h-[44px] items-center font-sans text-[13.5px] font-medium text-[color:var(--accent-text)] no-underline">
            {historyCopy.box.history}
            <PendingReporter href="/friends/requests" />
          </Link>
        </div>
      }
    >
      <div
        data-testid="offer-sheet-row"
        data-state={entry.state}
        className="mx-[16px] mb-[16px] mt-[14px] grid grid-cols-[46px_minmax(0,1fr)] items-center gap-x-[12px] rounded-[14px] bg-[color:var(--surface-inset)] px-[14px] py-[12px] [border:1px_solid_var(--border)] md:mx-[18px] md:mb-[18px] md:mt-[16px] md:gap-x-[14px] md:px-[16px]"
      >
        <HistoryPicture e={entry} />
        <div className="flex min-w-0 flex-col gap-[3px]">
          <p className="m-0 flex min-w-0 items-center gap-[7px]">
            <span className={`truncate font-mono text-[9.5px] font-medium uppercase tracking-[.12em] ${yes ? "text-[color:var(--success)]" : "text-[color:var(--fg-faint)]"}`}>
              {historyCopy.kind[yes ? "yes" : "no"]}
            </span>
            <small className={`${KICKER_AGE} text-[color:var(--fg-faint)]`}>{feedAge(answeredAt, now)}</small>
          </p>
          <p className="m-0 text-[14px] font-semibold leading-[1.35] text-[color:var(--fg)] [overflow-wrap:anywhere]"><PersonText text={title} /></p>
          <p className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-body)] [overflow-wrap:anywhere]">{yes ? c.yesDetail : c.noDetail}</p>
          <p className="m-0 mt-[2px] font-mono text-[10.5px] text-[color:var(--fg-muted)]">{c.meta(formatShortDeckDate(entry.createdAt, zone), entry.copies)}</p>
        </div>
      </div>
    </ModalChrome>
  );
}
