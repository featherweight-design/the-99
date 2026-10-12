"use client";

import { useState, useTransition } from "react";
import { setTokenHeld, setTokenJoined } from "../../app/decks/token-actions";
import { cssUrl } from "../../lib/collection/browse";
import { tokensCopy } from "../../lib/copy/tokens";
import { formatPriceFigure, priceState } from "../../lib/decks/price";
import type { DeckToken } from "../../lib/tokens/read";
import { CostPips } from "../ui/cost-pips";
import { TokenMakers } from "./token-makers";

/** `{W}{U}` for a token's colors, `{C}` for none: the row's pip is the same pip a card's cost draws. */
export function tokenPips(colors: string[]): string {
  return colors.length === 0 ? "{C}" : colors.map((c) => `{${c}}`).join("");
}

export function tokenPT(t: Pick<DeckToken, "power" | "toughness">): string | null {
  return t.power !== null && t.toughness !== null ? `${t.power}/${t.toughness}` : null;
}

/** The "pictured and sent" line, only for a token that has a figure to name (an unpriced one sends nothing). */
export function printingLine(token: DeckToken, newestAsOf: Date | null): string | null {
  if (!token.price || !token.picture) return null;
  const figure = formatPriceFigure(token.price, priceState(token.price, newestAsOf));
  if (!figure) return null;
  const { setCode, collectorNumber, printings } = token.picture;
  return tokensCopy.makers.printing(`${setCode.toUpperCase()} ${collectorNumber}`, figure, printings);
}

// Shared by both controls: the rest is each control's own (padding, height and weight differ).
const CONTROL = "rounded-[6px] text-[12px] disabled:opacity-60";

/**
 * One token of the deck: ownership as the dot and one fact, the two controls, and the cards that
 * make it folded behind the row. Never a verdict word, never a warning color on ownership.
 */
export function TokenRow({
  deckId, token, newestAsOf,
}: { deckId: string; token: DeckToken; newestAsOf: Date | null }) {
  const [open, setOpen] = useState(false);
  const [refused, setRefused] = useState(false);
  const [pending, start] = useTransition();

  const press = (write: () => Promise<{ ok: boolean }>) => {
    setRefused(false);
    start(async () => {
      const r = await write();
      if (!r.ok) setRefused(true);
    });
  };

  const upload = token.state === "owned" && token.source === "upload";
  const byHand = token.state === "owned" && token.source === "manual";
  const pt = tokenPT(token);
  const first = token.makers[0];

  return (
    <li
      className="list-none rounded-[7px] bg-[color:var(--surface-rail)] pb-[8px] pl-[8px] pr-[6px] pt-[10px] md:px-[9px] md:py-[8px]"
      data-token-state={token.state}
    >
      <div className="flex flex-wrap items-start md:flex-nowrap md:gap-[10px]">
        <button
          type="button"
          aria-expanded={open}
          aria-label={tokensCopy.row.toggleAria(token.name, token.makers.length)}
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 items-start gap-[10px] text-left max-md:basis-full md:flex-1"
        >
          <span
            aria-hidden
            data-token-dot={token.state}
            className="mt-[6px] h-[8px] w-[8px] flex-none rounded-full"
            style={
              token.state === "owned"
                ? { background: "var(--success)" }
                : token.state === "not"
                  ? { border: "1px dashed var(--fg-faint)" }
                  : undefined
            }
          />
          <span
            aria-hidden
            className="h-[42px] w-[30px] md:h-[36px] md:w-[26px] flex-none rounded-[3px] bg-cover bg-center"
            style={{
              boxShadow: "inset 0 0 0 1px var(--border-strong)",
              backgroundImage: token.picture?.imageUriSmall ? cssUrl(token.picture.imageUriSmall) : undefined,
            }}
          />
          <span className="flex min-w-0 flex-col gap-[2px]">
            <span className="flex flex-wrap items-center gap-x-[8px] text-[13.5px] leading-[1.4] text-[color:var(--fg)]">
              <span>{token.name}</span>
              {/* The row's own pip: 13 on a phone, 12 from md up, the decklist row's sizes. */}
              <span className="md:hidden"><CostPips cost={tokenPips(token.colors)} size={13} spoken /></span>
              <span className="hidden md:inline"><CostPips cost={tokenPips(token.colors)} size={12} spoken /></span>
            </span>
            <span className="font-mono text-[11px] text-[color:var(--fg-muted)]">
              {tokensCopy.row.type(token.typeLine, pt)}
            </span>
            {token.oracleText ? (
              <span className="font-mono text-[10.5px] text-[color:var(--fg-muted)]">{token.oracleText}</span>
            ) : null}
            {first ? (
              <span className="font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-faint)]">
                {tokensCopy.row.from(first.name, token.makers.length)}
              </span>
            ) : null}
          </span>
          <span aria-hidden className="ml-auto flex h-[44px] w-[36px] flex-none items-center justify-center text-[12px] text-[color:var(--fg-muted)] md:hidden">
            {open ? "▴" : "▾"}
          </span>
        </button>

        <div className="order-3 flex basis-full items-center gap-[10px] pl-[56px] md:order-none md:basis-auto md:pl-0">
          {upload ? (
            <span className="font-mono text-[10.5px] text-[color:var(--fg-muted)]">{tokensCopy.row.owned}</span>
          ) : null}
          {upload ? null : (
            <button
              type="button"
              disabled={pending}
              aria-busy={pending}
              aria-pressed={byHand}
              aria-label={byHand ? tokensCopy.row.haveOffAria(token.name) : tokensCopy.row.haveAria(token.name)}
              onClick={() => press(() => setTokenHeld(deckId, token.oracleId, !byHand))}
              // 44 on a phone, 24 from md up; regular weight until it is held.
              className={`${CONTROL} h-[44px] bg-transparent px-[8px] md:h-[24px] ${
                byHand
                  ? "font-medium text-[color:var(--accent)]"
                  : "font-normal text-[color:var(--fg-muted)] underline decoration-dashed decoration-[color:var(--border-dashed)] underline-offset-[3px]"
              }`}
            >
              {byHand ? tokensCopy.row.haveOn : tokensCopy.row.have}
            </button>
          )}
          {token.state === "owned" ? null : (
            <button
              type="button"
              disabled={pending}
              aria-busy={pending}
              aria-pressed={token.joined}
              aria-label={token.joined ? tokensCopy.row.leaveAria(token.name) : tokensCopy.row.joinAria(token.name)}
              onClick={() => press(() => setTokenJoined(deckId, token.oracleId, !token.joined))}
              // 32 tall with a 44 hit area on a phone (the pseudo-element), 24 from md up.
              className={`${CONTROL} relative h-[32px] border px-[10px] font-medium max-md:after:absolute max-md:after:inset-x-0 max-md:after:-inset-y-[6px] max-md:after:content-[''] md:h-[24px] ${
                token.joined
                  ? "border-[color:var(--accent)] bg-[color:color-mix(in_oklab,var(--accent)_14%,transparent)] text-[color:var(--fg)]"
                  : "border-[color:var(--border-strong)] text-[color:var(--fg-body)]"
              }`}
            >
              {token.joined ? tokensCopy.row.joined : tokensCopy.row.join}
            </button>
          )}
        </div>

        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          onClick={() => setOpen((v) => !v)}
          className="hidden h-[26px] w-[22px] flex-none items-center justify-center text-[12px] text-[color:var(--fg-muted)] md:flex"
        >
          {open ? "▴" : "▾"}
        </button>
      </div>

      {refused ? (
        <p role="alert" className="m-0 mt-[6px] pl-[56px] font-mono text-[10.5px] text-[color:var(--fg-locked)] md:pl-[54px]">
          {tokensCopy.row.refused}
        </p>
      ) : null}

      {open ? <TokenMakers makers={token.makers} printingLine={printingLine(token, newestAsOf)} /> : null}
    </li>
  );
}
