"use client";

/**
 * The tokens joined to a deck, drawn on its Shopping view (split 5i): props in, JSX out, with no action and no provider. The
 * signed-in `tokens-shopping-group.tsx` reads the deck's tokens, runs the presses (hold, remove) and renders these; the
 * landing demo renders them from a fixture with inert presses.
 */
import type { ReactNode } from "react";

import { tokensCopy } from "../../lib/copy/tokens";
import type { DeckToken } from "../../lib/tokens/read";
import { ROW_SHELL } from "../ui/row-shell";
import { BuyTag } from "./buy-tag";
import { DecklistGroupHeader } from "./decklist-group-header";

/** The token's `P/T`, or null when either half is missing. */
export function tokenPT(t: Pick<DeckToken, "power" | "toughness">): string | null {
  return t.power !== null && t.toughness !== null ? `${t.power}/${t.toughness}` : null;
}

/** `Token Creature — Soldier` reads as `Creature — Soldier` once the row's own sub-line says `token`. */
const shortType = (typeLine: string) => typeLine.replace(/^Token /, "");

export function TokenShoppingRowView({
  token,
  newestAsOf,
  pending,
  onHave,
  onRemove,
  toast,
}: {
  token: DeckToken;
  newestAsOf: Date | null;
  /** A press of this row is in flight: both buttons disable. */
  pending: boolean;
  /** The buy tag's press: mark the token held. */
  onHave: () => void;
  /** The remove press: take the token off the deck's list. */
  onRemove: () => void;
  /** The row's refusal toast, drawn under it. */
  toast?: ReactNode;
}) {
  const pt = tokenPT(token);
  const type = pt ? `${shortType(token.typeLine)} · ${pt}` : shortType(token.typeLine);
  const code = token.picture ? `${token.picture.setCode.toUpperCase()} ${token.picture.collectorNumber}` : null;
  return (
    <li className="list-none">
      <div className={`${ROW_SHELL} min-h-[52px] items-center bg-[color:var(--surface-rail)] pl-[8px] pr-[4px] md:min-h-[34px] md:px-[9px]`}>
        <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
          <span className="truncate text-[13px] text-[color:var(--fg)] md:text-[13.5px]">{token.name}</span>
          <span className="font-mono text-[10px] text-[color:var(--fg-faint)]">
            <span className="md:hidden">{tokensCopy.shopping.sub(type, null)}</span>
            <span className="hidden md:inline">{tokensCopy.shopping.sub(type, code)}</span>
          </span>
          {token.makers.length === 0 ? (
            <span className="font-mono text-[10px] text-[color:var(--fg-faint)]">{tokensCopy.row.noMaker}</span>
          ) : null}
        </span>
        {/* The shipped buy tag, as a button of its own: one press marks the token held and takes it off every
            deck's list in one write, with no confirm (Hugh, 2026-10-11). */}
        {token.makers.length > 0 ? (
          <button
            type="button"
            disabled={pending}
            aria-busy={pending}
            aria-label={tokensCopy.row.haveAria(token.name)}
            onClick={onHave}
            className="flex min-h-[44px] flex-none items-center border-0 bg-transparent p-0 disabled:opacity-60 md:min-h-0"
          >
            <BuyTag variant="row" price={token.price} newestAsOf={newestAsOf} reserveSlot />
          </button>
        ) : (
          // No card of the deck makes it, so a hand mark could not be undone from anywhere: the tag is only a
          // price here, and the remove press beside it is the way off the list.
          <span className="flex min-h-[44px] flex-none items-center md:min-h-0">
            <BuyTag variant="row" price={token.price} newestAsOf={newestAsOf} reserveSlot />
          </span>
        )}
        <button
          type="button"
          disabled={pending}
          aria-label={tokensCopy.shopping.removeAria(token.name)}
          onClick={onRemove}
          className="flex h-[44px] w-[44px] flex-none items-center justify-center border-0 bg-transparent text-[14px] text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] disabled:opacity-60 md:h-[22px] md:w-[22px] transition-colors"
        >
          ✕
        </button>
      </div>
      {toast}
    </li>
  );
}

/** The group's frame: its header and the two-column list its rows sit in. `count` is how many tokens are listed. */
export function TokensShoppingFrame({ count, children }: { count: number; children: ReactNode }) {
  return (
    <div className="mb-[16px] md:mb-[20px]">
      <DecklistGroupHeader
        label={tokensCopy.group.label}
        count={count}
        gapClause={tokensCopy.shopping.clause(count)}
        headingId="deck-tokens-shopping-heading"
        focusable
      />
      <ul className="m-0 flex list-none flex-col gap-[3px] p-0 md:grid md:gap-y-[4px] md:gap-x-[20px]" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}>
        {children}
      </ul>
    </div>
  );
}
