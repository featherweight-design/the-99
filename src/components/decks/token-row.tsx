"use client";

import { useRef, useState, useTransition, type MouseEvent } from "react";
import { setTokenHeld, setTokenJoined } from "../../app/decks/token-actions";
import { tokensCopy } from "../../lib/copy/tokens";
import { formatPriceFigure, priceState } from "../../lib/decks/price";
import { tokenManapoolLine } from "../../lib/tokens/price-line";
import type { DeckToken } from "../../lib/tokens/read";
import { spokenFullManaCost } from "../../lib/copy/card-surfaces";
import { CostPips } from "../ui/cost-pips";
import { TokenMakers } from "./token-makers";
import { Chevron } from "../ui/chevron";
import { useCardDetailIfAny, useCardIntentIfAny, type SiblingCard } from "../cards/card-detail-provider";
import { usePreviewRow } from "./hover-preview";
import { ArtLayer } from "../ui/art-layer";
import { TokenRefusalToast } from "./token-refusal-toast";

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
 * A token press: one write at a time, pending while it lands. A refusal and a throw (the session lapsed, the database
 * threw) say the same thing to the reader, and it is said as a deck toast (`TokenRefusalToast`): the caller draws
 * `toast` once, anywhere in what it renders, since the toast is fixed to the deck slot.
 */
export function useTokenPress() {
  const [refusal, setRefusal] = useState<{ name: string; key: number } | null>(null);
  const [pending, start] = useTransition();
  const press = (write: () => Promise<{ ok: boolean }>, name: string) => {
    setRefusal(null);
    start(async () => {
      try {
        const r = await write();
        if (!r.ok) setRefusal({ name, key: Date.now() });
      } catch {
        setRefusal({ name, key: Date.now() });
      }
    });
  };
  const toast = refusal ? <TokenRefusalToast key={refusal.key} name={refusal.name} onDone={() => setRefusal(null)} /> : null;
  return { press, pending, toast };
}

/**
 * The two presses a token carries, in the row and in the tile alike: the hand mark (`I have one`, or the plain
 * `in your collection` an upload wrote) and the Shopping join. `press` and `pending` are the host's own
 * (`useTokenPress`), so its refusal toast is whatever drew these's to draw.
 */
export function TokenControls({
  deckId, token, press, pending,
}: {
  deckId: string; token: DeckToken; press: ReturnType<typeof useTokenPress>["press"]; pending: boolean;
}) {
  const upload = token.state === "owned" && (token.source === "upload" || token.source === "precon");
  const byHand = token.state === "owned" && token.source === "manual";
  // An orphan (no card makes it) is refused by the hand mark both ways, so it offers neither.
  const canOpen = token.makers.length > 0;
  return (
    <>
    {upload ? (
      <span className="font-mono text-[10.5px] text-[color:var(--fg-muted)]">{tokensCopy.row.owned}</span>
    ) : null}
    {/* An orphan (no card makes it) is refused by the hand mark both ways, so it offers neither. */}
    {upload || !canOpen ? null : (
      <button
        type="button"
        disabled={pending}
        aria-busy={pending}
        aria-describedby={`token-${token.oracleId}-face`}
        aria-pressed={byHand}
        aria-label={byHand ? tokensCopy.row.haveOffAria(token.name) : tokensCopy.row.haveAria(token.name)}
        onClick={() => press(() => setTokenHeld(deckId, token.oracleId, !byHand), token.name)}
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
        onClick={() => press(() => setTokenJoined(deckId, token.oracleId, !token.joined), token.name)}
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
    </>
  );
}

/**
 * One token of the deck: ownership as the dot and one fact, the two controls, and the cards that
 * make it folded behind the row. Never a verdict word, never a warning color on ownership.
 */
export function TokenRow({
  deckId, token, newestAsOf, siblings,
}: {
  deckId: string; token: DeckToken; newestAsOf: Date | null;
  /** The deck's tokens in the order the group lists them: what card details' Prev/Next page through. */
  siblings?: readonly SiblingCard[];
}) {
  const [open, setOpen] = useState(false);
  const { press, pending, toast } = useTokenPress();

  const pt = tokenPT(token);
  const first = token.makers[0];
  // A joined token whose maker has left the deck has nothing to unfold: it says so and draws no chevron.
  const canOpen = token.makers.length > 0;
  // The token's image and name open its card details, as a card's do (bug batch 2026-10-12). Outside a
  // card provider (the About specimen) they stay plain.
  const detail = useCardDetailIfAny();
  // Focus comes back to the NAME when the details close, whichever of the two opened them: the image
  // is out of the tab order and the accessibility tree, so it is never a place to land.
  const nameRef = useRef<HTMLButtonElement>(null);
  // A pointer resting on the name or the image, or keyboard focus on the name, reads the details ahead
  // of the press, as a card's trigger does.
  const intent = useCardIntentIfAny(token.oracleId);
  // The hover preview is on the image and the name only, never the row: the rules text and the makers line under
  // them are prose, and a preview over the row covers what is being read (Hugh, 2026-10-12).
  const preview = usePreviewRow(token.picture?.imageUri);
  // Read only in the press, never during render: the ref is the element the press hands focus back to.
  const openDetails = (e: MouseEvent<HTMLElement>) => {
    // The row's own press toggles the makers; this one is the card's.
    e.stopPropagation();
    detail?.open(token.oracleId, siblings, undefined, { opener: nameRef.current ?? e.currentTarget });
  };
  const toggleAria = tokensCopy.row.toggleAria(token.name, token.makers.length);

  return (
    <li
      className="list-none rounded-[7px] bg-[color:var(--surface-rail)] pb-[8px] pl-[8px] pr-[6px] pt-[10px] md:px-[9px] md:py-[8px]"
      data-token-state={token.state}
    >
      <span id={`token-${token.oracleId}-face`} className="sr-only">{tokenFaceDescription(token)}</span>
      <div className="flex flex-wrap items-start md:flex-nowrap md:gap-[10px]">
        {/* The summary is not one button any more: the image and the name inside it are the card's
            details, and a button cannot hold a button. A press anywhere else on it still unfolds the
            makers, for a pointer; the chevron is the disclosure's control for a keyboard and a reader. */}
        <div
          onClick={canOpen ? () => setOpen((v) => !v) : undefined}
          className={`flex min-w-0 items-start gap-[10px] text-left max-md:basis-full md:flex-1 ${canOpen ? "cursor-pointer" : ""}`}
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
          {(() => {
            const art = {
              className: "relative h-[42px] w-[30px] md:h-[36px] md:w-[26px] flex-none overflow-hidden rounded-[3px]",
              style: { boxShadow: "inset 0 0 0 1px var(--border-strong)" },
            };
            // The art fades in over the ground (`ArtLayer`); the inset ring rides on it too, since a host's inset
            // shadow paints under its children.
            const layer = token.picture?.imageUriSmall
              ? <ArtLayer src={token.picture.imageUriSmall} style={{ boxShadow: "inset 0 0 0 1px var(--border-strong)" }} />
              : null;
            // Out of the tab order, as the name beside it is the same press for a keyboard.
            return detail
              ? (
                <button
                  type="button"
                  tabIndex={-1}
                  aria-hidden
                  // A pointer press must not focus it either: it is in no tree a reader can follow.
                  onMouseDown={(e) => e.preventDefault()}
                  {...intent}
                  {...preview}
                  onClick={openDetails}
                  {...art}
                  className={`${art.className} cursor-pointer`}
                >
                  {layer}
                </button>
              )
              : <span aria-hidden {...art}>{layer}</span>;
          })()}
          <span className="flex min-w-0 flex-col gap-[2px]">
            <span className="flex flex-wrap items-center gap-x-[8px] text-[13.5px] leading-[1.4] text-[color:var(--fg)]">
              {detail ? (
                <button
                  ref={nameRef}
                  type="button"
                  {...intent}
                  {...preview}
                  onClick={openDetails}
                  aria-describedby={`token-${token.oracleId}-face`}
                  className="cursor-pointer text-left"
                >
                  {token.name}
                </button>
              ) : (
                <span>{token.name}</span>
              )}
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
            <button
              type="button"
              aria-expanded={open}
              aria-label={toggleAria}
              // What tells this token from another of its name and maker count, as the old summary's
              // visible pips and type line did.
              aria-describedby={`token-${token.oracleId}-face`}
              onClick={(e) => {
                e.stopPropagation();
                setOpen((v) => !v);
              }}
              className="ml-auto flex h-[44px] w-[36px] flex-none items-center justify-center text-[color:var(--fg-muted)] md:hidden"
            >
              <Chevron open={open} />
            </button>
          ) : null}
        </div>

        <div className="order-3 flex basis-full items-center gap-[10px] pl-[56px] md:order-none md:basis-auto md:pl-0">
          <TokenControls deckId={deckId} token={token} press={press} pending={pending} />
        </div>

        {canOpen ? (
          <button
            type="button"
            aria-expanded={open}
            aria-label={toggleAria}
            aria-describedby={`token-${token.oracleId}-face`}
            onClick={() => setOpen((v) => !v)}
            className="hidden h-[26px] w-[22px] flex-none items-center justify-center text-[color:var(--fg-muted)] md:flex"
          >
            <Chevron open={open} />
          </button>
        ) : null}
      </div>

      {toast}

      {open && canOpen ? <TokenMakers makers={token.makers} printingLine={printingLine(token, newestAsOf)} /> : null}
    </li>
  );
}
