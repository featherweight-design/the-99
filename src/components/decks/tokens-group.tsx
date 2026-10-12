"use client";

import Link from "next/link";
import { tokensCopy } from "../../lib/copy/tokens";
import { PendingReporter } from "../shell/pending-reporter";
import { useDeckTokens } from "./deck-tokens-context";
import { DecklistGroupHeader } from "./decklist-group-header";
import { TokenRow } from "./token-row";

const HEADING = "deck-tokens-heading";

/**
 * The tokens this deck's cards make, at the foot of Your deck. They are not the deck: the header says so
 * once, and nothing here moves a count, a price total or the deck's status. Draws nothing outside a
 * provider (the switch is off), for a deck that makes no token, and nothing at all before the catalog has
 * links, so a deck page without the feature is exactly the page it was.
 */
export function TokensGroup() {
  const ctx = useDeckTokens();
  if (!ctx || ctx.read.status === "absent") return null;
  const { deckId, read } = ctx;

  if (read.status === "failed") {
    return (
      <section aria-labelledby={HEADING} className="mt-[16px] md:mt-[20px]">
        <DecklistGroupHeader label={tokensCopy.group.label} count={null} note={tokensCopy.group.noteFailed} headingId={HEADING} />
        <p className="m-0 mb-[2px] font-mono text-[10.5px] text-[color:var(--fg-locked)] md:hidden">{tokensCopy.group.noteFailed}</p>
        <p className="m-0 py-[10px] font-mono text-[11px] text-[color:var(--fg-locked)]">{tokensCopy.group.failed}</p>
      </section>
    );
  }

  const note = tokensCopy.group.note(read.makerCount);
  return (
    <section aria-labelledby={HEADING} className="mt-[16px] md:mt-[20px]">
      <DecklistGroupHeader label={tokensCopy.group.label} count={read.tokens.length} note={note} headingId={HEADING} />
      {/* The phone has no right-hand note: it reads as a sub-line under the label. */}
      <p className="m-0 mb-[8px] font-mono text-[10.5px] text-[color:var(--fg-locked)] md:hidden">{note}</p>
      {read.read ? null : (
        <div className="mb-[10px] rounded-[9px] border border-[color:var(--border)] bg-[color:var(--surface-sunken)] px-[13px] pb-[4px] pt-[10px] md:pb-[6px]">
          <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-body)]">{tokensCopy.unknown.body}</p>
          <Link
            href="/collection"
            className="inline-flex min-h-[44px] items-center text-[13px] text-[color:var(--accent)] md:min-h-[30px]"
          >
            {tokensCopy.unknown.action}
            <PendingReporter href="/collection" />
          </Link>
        </div>
      )}
      <ul className="m-0 flex list-none flex-col gap-[8px] p-0">
        {read.tokens.map((t) => (
          <TokenRow key={t.oracleId} deckId={deckId} token={t} newestAsOf={read.newestPriceAsOf} />
        ))}
      </ul>
    </section>
  );
}
