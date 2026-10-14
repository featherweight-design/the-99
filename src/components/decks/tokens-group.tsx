"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { tokensCopy } from "../../lib/copy/tokens";
import { PendingReporter } from "../shell/pending-reporter";
import { useStoredView } from "../ui/use-stored-view";
import { useDeckTokens } from "./deck-tokens-context";
import { SHOW_DECK_TOKENS } from "./deck-tokens-landing";
import { DECK_VIEW_KEY, isDeckView } from "./group-toggle";
import { HoverPreviewProvider } from "./hover-preview";
import { DecklistGroupHeader } from "./decklist-group-header";
import { TokenRow } from "./token-row";
import { TokenTile } from "./token-tile";

const HEADING = "deck-tokens-heading";
const PANEL = "deck-tokens-panel";

/**
 * Whether the Tokens group is folded: one preference for every deck, as the deck's view is ("I keep tokens
 * folded" is a fact about the reader, not about a deck). Open until this browser says otherwise.
 */
export const TOKENS_FOLD_KEY = "the99:deck-tokens-fold";
const isFold = (value: string): value is "open" | "closed" => value === "open" || value === "closed";

/**
 * The tokens this deck's cards make, at the foot of Your deck. They are not the deck: the header says so
 * once, and nothing here moves a count, a price total or the deck's status. Draws nothing outside a
 * provider (the switch is off), for a deck that makes no token, and nothing at all before the catalog has
 * links, so a deck page without the feature is exactly the page it was. The heading folds the group, and
 * the tokens are tiles in the deck's Card view and rows in its List view.
 */
export function TokensGroup() {
  const ctx = useDeckTokens();
  const [fold, chooseFold] = useStoredView(TOKENS_FOLD_KEY, isFold);
  // The deck's own view, from the same stored choice the list reads.
  const [storedView] = useStoredView(DECK_VIEW_KEY, isDeckView);
  const cards = storedView === "card";
  // `Tokens ›` from card details opens a folded group for this visit, without writing the reader's preference.
  const [landed, setLanded] = useState(false);
  useEffect(() => {
    const land = () => setLanded(true);
    window.addEventListener(SHOW_DECK_TOKENS, land);
    return () => window.removeEventListener(SHOW_DECK_TOKENS, land);
  }, []);
  if (!ctx || ctx.read.status === "absent") return null;
  const { deckId, read } = ctx;

  if (read.status === "failed") {
    return (
      <section aria-labelledby={HEADING} className="mt-[16px] md:mt-[20px]">
        <DecklistGroupHeader label={tokensCopy.group.label} count={null} note={tokensCopy.group.noteFailed} headingId={HEADING} focusable />
        <p className="m-0 mb-[2px] font-mono text-[10.5px] text-[color:var(--fg-locked)] md:hidden">{tokensCopy.group.noteFailed}</p>
        <p className="m-0 py-[10px] font-mono text-[11px] text-[color:var(--fg-locked)]">{tokensCopy.group.failed}</p>
      </section>
    );
  }

  const open = landed || fold !== "closed";
  const note = tokensCopy.group.note(read.makerCount);
  const siblings = read.tokens.map((t) => ({ oracleId: t.oracleId, name: t.name, imageUri: t.picture?.imageUri ?? null }));
  const toggle = {
    open,
    panelId: PANEL,
    onToggle: () => {
      setLanded(false);
      chooseFold(open ? "closed" : "open");
    },
  };
  return (
    <section aria-labelledby={HEADING} className="mt-[16px] md:mt-[20px]">
      <DecklistGroupHeader label={tokensCopy.group.label} count={read.tokens.length} note={note} headingId={HEADING} focusable toggle={toggle} />
      {/* The phone has no right-hand note: it reads as a sub-line under the label. */}
      <p className="m-0 mb-[8px] font-mono text-[10.5px] text-[color:var(--fg-locked)] md:hidden">{note}</p>
      {open ? (
        <div id={PANEL}>
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
          <HoverPreviewProvider>
            {cards ? (
              // The deck's own Card view declaration (`DecklistGroup`): the column count falls out of the width.
              <ul className="m-0 grid list-none grid-cols-2 items-start gap-[12px] p-0 md:grid-cols-[repeat(auto-fill,minmax(178px,1fr))] md:gap-[20px]">
                {read.tokens.map((t) => (
                  <TokenTile key={t.oracleId} deckId={deckId} token={t} newestAsOf={read.newestPriceAsOf} siblings={siblings} />
                ))}
              </ul>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-[8px] p-0">
                {read.tokens.map((t) => (
                  <TokenRow key={t.oracleId} deckId={deckId} token={t} newestAsOf={read.newestPriceAsOf} siblings={siblings} />
                ))}
              </ul>
            )}
          </HoverPreviewProvider>
        </div>
      ) : null}
    </section>
  );
}
