"use client";

import { useState, useTransition } from "react";
import { setTokenHeld, setTokenJoined } from "../../app/decks/token-actions";
import { cssUrl } from "../../lib/collection/browse";
import { tokensCopy } from "../../lib/copy/tokens";
import { formatPriceFigure, priceState } from "../../lib/decks/price";
import { tokenManapoolLine } from "../../lib/tokens/price-line";
import type { DeckToken } from "../../lib/tokens/read";
import { spokenFullManaCost } from "../../lib/copy/card-surfaces";
import { CostPips } from "../ui/cost-pips";
import { TokenMakers } from "./token-makers";

/** `{W}{U}` for a token's colors, `{C}` for none: the row's pip is the same pip a card's cost draws. */
export function tokenPips(colors: string[]): string {
  return colors.length === 0 ? "{C}" : colors.map((c) => `{${c}}`).join("");
}

export function tokenPT(t: Pick<DeckToken, "power" | "toughness">): string | null {
  return t.power !== null && t.toughness !== null ? `${t.power}/${t.toughness}` : null;
}

/**
 * What tells this token from another of its name, said in words: its colors, type line, P/T and rules text.
 * Both controls are described by it, so two Goblins that differ only by their pips and stats are two
 * different controls to a screen reader as well as to the eye.
 */
export function tokenFaceDescription(token: DeckToken): string {
  return [spokenFullManaCost(tokenPips(token.colors)), tokensCopy.row.type(token.typeLine, tokenPT(token)), token.oracleText]
    .filter(Boolean)
    .join(". ");
}

/** The "pictured and sent" line, only for a token that has a figure to name (an unpriced one sends nothing). */
export function printingLine(token: DeckToken, newestAsOf: Date | null): string | null {
  if (!token.price || !token.picture) return null;
  const figure = formatPriceFigure(token.price, priceState(token.price, newestAsOf));
  if (!figure) return null;
  const { setCode, collectorNumber, printings } = token.picture;
  const pictured = `${setCode.toUpperCase()} ${collectorNumber}`;
  // What a link SENDS is Mana Pool's own product (set and number differ from Scryfall's on 42% of priced
  // token printings), or the name alone where Mana Pool cannot place a number exactly. The picture is
  // Scryfall's, so the line names both only where they are the same printing.
  const line = tokenManapoolLine(token.name, 1, token.price);
  const sent = line.printing ? `${line.printing.setCode.toUpperCase()} ${line.printing.collectorNumber}` : null;
  if (sent === pictured) return tokensCopy.makers.printing(pictured, figure, printings);
  return sent ? tokensCopy.makers.sent(sent, figure, printings) : tokensCopy.makers.sentByName(figure, printings);
}

// Shared by both controls: the rest is each control's own (padding, height and weight differ).
const CONTROL = "rounded-[6px] text-[12px] disabled:opacity-60";

/**
 * A token press: one write at a time, pending while it lands, and a refusal line for both a refusal and a
 * throw (the session lapsed, the database threw), which say the same thing to the reader.
 */
export function useTokenPress() {
  const [refused, setRefused] = useState(false);
  const [pending, start] = useTransition();
  const press = (write: () => Promise<{ ok: boolean }>) => {
    setRefused(false);
    start(async () => {
      try {
        const r = await write();
        if (!r.ok) setRefused(true);
      } catch {
        setRefused(true);
      }
    });
  };
  return { press, pending, refused };
}

/**
 * One token of the deck: ownership as the dot and one fact, the two controls, and the cards that
 * make it folded behind the row. Never a verdict word, never a warning color on ownership.
 */
export function TokenRow({
  deckId, token, newestAsOf,
}: { deckId: string; token: DeckToken; newestAsOf: Date | null }) {
  const [open, setOpen] = useState(false);
  const { press, pending, refused } = useTokenPress();

  const upload = token.state === "owned" && token.source === "upload";
  const byHand = token.state === "owned" && token.source === "manual";
  const pt = tokenPT(token);
  const first = token.makers[0];
  // A joined token whose maker has left the deck has nothing to unfold: it says so and draws no chevron.
  const canOpen = token.makers.length > 0;

  return (
    <li
      className="list-none rounded-[7px] bg-[color:var(--surface-rail)] pb-[8px] pl-[8px] pr-[6px] pt-[10px] md:px-[9px] md:py-[8px]"
      data-token-state={token.state}
    >
      <span id={`token-${token.oracleId}-toggle`} className="sr-only">
        {tokensCopy.row.toggleAria(token.name, token.makers.length)}
      </span>
      <span id={`token-${token.oracleId}-face`} className="sr-only">{tokenFaceDescription(token)}</span>
      <div className="flex flex-wrap items-start md:flex-nowrap md:gap-[10px]">
        <button
          type="button"
          aria-expanded={canOpen ? open : undefined}
          // Named by what it shows (the name, pips, type and makers), as any button is. The disclosure's own
          // sentence is its description, so the visible content is not replaced by it.
          aria-describedby={`token-${token.oracleId}-toggle`}
          onClick={canOpen ? () => setOpen((v) => !v) : undefined}
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
            <span className="font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-faint)]">
              {first ? tokensCopy.row.from(first.name, token.makers.length) : tokensCopy.row.noMaker}
            </span>
          </span>
          {canOpen ? (
            <span aria-hidden className="ml-auto flex h-[44px] w-[36px] flex-none items-center justify-center text-[12px] text-[color:var(--fg-muted)] md:hidden">
              {open ? "▴" : "▾"}
            </span>
          ) : null}
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
              aria-describedby={`token-${token.oracleId}-face`}
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
              aria-describedby={`token-${token.oracleId}-face`}
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

        {canOpen ? (
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            onClick={() => setOpen((v) => !v)}
            className="hidden h-[26px] w-[22px] flex-none items-center justify-center text-[12px] text-[color:var(--fg-muted)] md:flex"
          >
            {open ? "▴" : "▾"}
          </button>
        ) : null}
      </div>

      {refused ? (
        <p role="alert" className="m-0 mt-[6px] pl-[56px] font-mono text-[10.5px] text-[color:var(--fg-locked)] md:pl-[54px]">
          {tokensCopy.row.refused}
        </p>
      ) : null}

      {open && canOpen ? <TokenMakers makers={token.makers} printingLine={printingLine(token, newestAsOf)} /> : null}
    </li>
  );
}
