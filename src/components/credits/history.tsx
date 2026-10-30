"use client";
// Purchase history (P1, P2): one row per lot, newest first, with a Receipt link where a Checkout Session backs it.
// The empty state is a dashed note, not a table of nothing. Date and price are drawn as the server read them.

import { creditsPageCopy } from "../../lib/copy/credits-page";
import type { HistoryItem } from "../../lib/payments/page-model";
import { ReceiptLink } from "./receipt-link";
import { LegalLinks } from "../legal/legal-links";
import { SupportLink } from "./support-link";
import { LinkOutLabel } from "../ui/link-out-icon";

const c = creditsPageCopy;

export function History({ items, onReceiptFailed }: { items: readonly HistoryItem[]; onReceiptFailed: () => void }) {
  return (
    <section aria-labelledby="credits-history" className="flex flex-col gap-[10px]">
      <h2 id="credits-history" className="m-0 font-display text-[17px] font-semibold text-[color:var(--fg)] md:text-[19px]">{c.hist.title}</h2>
      {items.length === 0 ? (
        <p className="m-0 rounded-[12px] border border-dashed border-[color:var(--border-dashed)] px-[16px] py-[18px] text-[13px] text-[color:var(--fg-muted)]">{c.hist.empty}</p>
      ) : (
        <ul className="m-0 list-none overflow-hidden rounded-[12px] border border-solid border-[color:var(--border)] bg-[color:var(--surface)] p-0">
          {items.map((item, i) => (
            <li key={item.id} className={`flex min-h-[56px] items-center gap-[12px] px-[14px] py-[9px] md:min-h-0 md:px-[18px] md:py-[8px] ${i > 0 ? "border-t border-solid border-[color:var(--border)]" : ""}`}>
              <span className="w-[52px] flex-none font-mono text-[11px] text-[color:var(--fg-faint)] md:w-[90px]">{item.date}</span>
              <span className="flex min-w-0 flex-1 flex-col gap-[2px] text-[13.5px] text-[color:var(--fg)]">
                {item.label}
                <small className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{c.hist.units(item.units)}</small>
              </span>
              {item.amount ? <span className="flex-none font-mono text-[12px] text-[color:var(--fg-body)]">{item.amount}</span> : null}
              {item.sessionId ?? item.invoiceId ? (
                <ReceiptLink
                  reference={(item.sessionId ?? item.invoiceId) as string}
                  onFailed={onReceiptFailed}
                  className="flex min-h-[44px] w-[59px] flex-none cursor-pointer items-center justify-end gap-[4px] border-0 bg-transparent p-0 text-[12.5px] font-semibold text-[color:var(--accent-text)] md:min-h-[32px] md:w-[90px]"
                >
                  <LinkOutLabel>{c.hist.receipt}</LinkOutLabel>
                </ReceiptLink>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-muted)]">{c.refunds.before}<SupportLink />{c.refunds.after}</p>
      <LegalLinks />
    </section>
  );
}
