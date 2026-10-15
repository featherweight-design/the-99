"use client";

// The `In this deck` box a token's details draw when the sheet is opened from a deck (small-polish handoff §5.3), where a
// card's own box sits under its price line: `I have one` (the hand mark, with today's rules: offered only when a card in the
// deck makes the token, never when an upload or a precon holds it), the cards that make it (`TokenMakers`, each name opening
// that card's details stacked over this one) and its printing line. A token no card makes says so. The Shopping press is NOT
// here: it lives on the tile alone, as a card's does. Absent outside a deck (no provider) and for a token the deck lacks.

import { setTokenHeld } from "../../app/decks/token-actions";
import { tokensCopy } from "../../lib/copy/tokens";
import { useDeckTokens } from "./deck-tokens-context";
import { TokenMakers } from "./token-makers";
import { printingLine, useTokenPress } from "./token-row";

export function TokenDeckBox({ oracleId, onSelectCard }: { oracleId: string; onSelectCard?: (oracleId: string) => void }) {
  const ctx = useDeckTokens();
  const { press, pending, toast } = useTokenPress();
  if (!ctx || ctx.read.status !== "ok") return null;
  const token = ctx.read.tokens.find((t) => t.oracleId === oracleId);
  if (!token) return null;

  const upload = token.state === "owned" && (token.source === "upload" || token.source === "precon");
  const byHand = token.state === "owned" && token.source === "manual";
  const canOpen = token.makers.length > 0;
  return (
    <div
      data-token-deck-box
      className="mt-[16px] rounded-[10px] p-[14px_16px] md:mt-[22px] md:p-[18px_20px]"
      style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--fg-faint)" }}>
        {tokensCopy.details.boxHeading}
      </div>
      {/* An orphan (no card makes it) is refused by the hand mark both ways, so it offers neither. */}
      {upload || !canOpen ? null : (
        <button
          type="button"
          disabled={pending}
          aria-busy={pending}
          aria-pressed={byHand}
          aria-label={byHand ? tokensCopy.row.haveOffAria(token.name) : tokensCopy.row.haveAria(token.name)}
          onClick={() => press(() => setTokenHeld(ctx.deckId, token.oracleId, !byHand), token)}
          className={`mt-[6px] flex min-h-[44px] items-center border-0 bg-transparent p-0 text-left text-[13px] disabled:opacity-60 md:min-h-[30px] ${
            byHand
              ? "font-medium text-[color:var(--accent)]"
              : "font-normal text-[color:var(--fg-body)] underline decoration-dashed decoration-[color:var(--border-dashed)] underline-offset-[3px]"
          }`}
        >
          {byHand ? tokensCopy.row.haveOn : tokensCopy.row.have}
        </button>
      )}
      {canOpen ? (
        <TokenMakers layout="box" makers={token.makers} printingLine={printingLine(token, ctx.read.newestPriceAsOf)} onSelect={onSelectCard} />
      ) : (
        <p className="m-0 mt-[8px] font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-faint)]">{tokensCopy.row.noMaker}</p>
      )}
      {toast}
      {/* The toast sits outside this modal, where a screen reader confined to it cannot reach: the same refusal is said here too,
          in the dialog, for the token this box is about. */}
      {ctx.refusal?.oracleId === token.oracleId ? (
        <span key={ctx.refusal.key} role="alert" className="sr-only">{tokensCopy.row.refused} {tokensCopy.row.refusedDetail(token.name)}</span>
      ) : null}
    </div>
  );
}
