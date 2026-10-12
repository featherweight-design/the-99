"use client";

import { useState } from "react";

import { cssUrl } from "../../lib/collection/browse";
import { availabilityState } from "../../lib/decks/availability";
import { suggestionNeedsBuy } from "../../lib/decks/shopping";
import { recommendationsCopy } from "../../lib/copy/recommendations";
import type { DeckMutationResult } from "../../lib/decks/mutation-result";
import { deckTuningCopy } from "../../lib/copy/deck-tuning";
import { lockedCardsCopy } from "../../lib/copy/locked-cards";
import type { Bracket } from "../../lib/profile/types";
import { bracketShift } from "../../lib/tuning/bracket-shift";
import type { LineItem } from "../../lib/tuning/state";
import { useCardDetail, useCardIntent } from "../cards/card-detail-provider";
import { AvailabilityMarker } from "../ui/availability-marker";
import { OwnershipDot } from "../ui/ownership-dot";
import { BracketChip } from "./bracket-chip";
import { BuyTag } from "./buy-tag";
import { usePreviewRow } from "./hover-preview";
import { MutationError } from "./mutation-error";
import type { CardActions } from "./suggestion-card";

/**
 * One line of the two lists (sub-project 8; Design's B10/B10b): a card to ADD or a card to CUT,
 * with its own reason and its own citations. Renders the item and does no lookups of its own.
 *
 * An answered line collapses in its own slot, so nothing reorders under the reader, and nothing
 * unmounts while a verdict is in flight. The actions sit under the reason on a phone (two 44px
 * halves) and at the row's end on desktop (32 tall), as the specimen draws them.
 */
const copy = deckTuningCopy.lists;
const cardCopy = deckTuningCopy.card;

export function SuggestionLine({
  item,
  permits,
  newestPriceAsOf,
  actions,
  onSettled,
}: {
  item: LineItem;
  permits: readonly Bracket[];
  newestPriceAsOf: Date | null;
  actions: CardActions;
  onSettled: (announce: string) => void | Promise<void>;
}) {
  const [busy, setBusy] = useState<keyof CardActions | null>(null);
  const [refused, setRefused] = useState<string | null>(null);
  const isAdd = item.side === "add";

  async function answer(kind: keyof CardActions) {
    setBusy(kind);
    setRefused(null);
    const refusal = kind === "apply" ? copy.applyRefused : kind === "undo" ? copy.undoRefused : cardCopy.verdictRefused;
    const result = await actions[kind](item.id).catch((): DeckMutationResult => ({ ok: false, message: refusal }));
    if (!result.ok) {
      setBusy(null);
      setRefused(result.message);
      return;
    }
    const announce = deckTuningCopy.announce;
    // The row stays busy through the panel's re-read: until it lands the item still reads as it did,
    // and a second press would submit the same verdict again.
    await onSettled(
      kind === "apply" ? (isAdd ? announce.addedCard(item.cardName) : announce.cutCard(item.cardName))
        : kind === "undo" ? (isAdd ? announce.undoneAdd(item.cardName) : announce.undoneCut(item.cardName))
          : kind === "reject" ? announce.rejected
            : announce.restored,
    );
    setBusy(null);
  }

  if (item.verdict === "accepted") {
    return (
      <Answered
        tone="applied"
        label={isAdd ? copy.added : copy.cutDone}
        name={item.cardName}
        struck={!isAdd}
        action={{ label: copy.undo, onPress: () => answer("undo"), busy: busy === "undo" }}
        refused={refused}
      />
    );
  }
  if (item.verdict === "dismissed") {
    return (
      <Answered
        tone="rejected"
        label={copy.rejected}
        name={item.cardName}
        action={{ label: copy.showAgain, onPress: () => answer("restore"), busy: busy === "restore" }}
        refused={refused}
      />
    );
  }
  if (!item.applies) {
    return <Answered tone="broken" label={copy.noLongerApplies} name={brokenLine(item)} refused={refused} plain />;
  }

  const shift = bracketShift(permits, item.bracketAfter);
  const selfExcluded = item.inDeck;
  const marked = isAdd && item.owned && item.availability !== null
    && availabilityState(item.availability, { selfExcluded }) !== "free";
  // Owned but with no copy free for it, or already overcommitted: the marker says why, and the buy
  // tag beside it says what the copy costs, the pair a Shopping row draws for a spoken-for card.
  const needsBuy = suggestionNeedsBuy({ owned: item.owned, availability: item.availability, selfExcluded, typeLine: item.cardTypeLine });
  const marker = marked ? (
    <AvailabilityMarker bareOne
      availability={item.availability!}
      nameless
      selfExcluded={selfExcluded}
      spoken={false}
      seam="var(--surface)"
      className="flex-none font-mono text-[10.5px]"
    />
  ) : null;
  const addMark = !isAdd ? null : !needsBuy ? marker : !item.owned ? (
    <BuyTag variant="row" price={item.price} newestAsOf={newestPriceAsOf} />
  ) : (
    <span className="inline-flex flex-none items-center gap-[8px]">
      {marker}
      <BuyTag variant="row" label={recommendationsCopy.shopping.rowSecondCopyTagAria} price={item.price} newestAsOf={newestPriceAsOf} />
    </span>
  );

  const yes = (
    <button
      type="button"
      onClick={() => answer("apply")}
      aria-disabled={busy !== null || undefined}
      disabled={busy !== null}
      className="h-[44px] flex-1 rounded-[8px] text-[13px] font-semibold md:h-[32px] md:flex-none md:rounded-[7px] md:px-[13px] md:text-[12.5px] text-[color:var(--accent)] [border:1px_solid_var(--accent)] hover:bg-[color:color-mix(in_oklab,var(--accent)_10%,transparent)]"
    >
      {busy === "apply" ? copy.working : isAdd ? copy.add : copy.cut}
    </button>
  );
  const no = (
    <button
      type="button"
      onClick={() => answer("reject")}
      disabled={busy !== null}
      className="h-[44px] flex-1 rounded-[8px] text-[13px] font-medium md:h-[32px] md:flex-none md:rounded-[7px] md:px-[12px] md:text-[12.5px] text-[color:var(--fg-muted)] [border:1px_solid_var(--border-strong)] hover:text-[color:var(--fg)]"
    >
      {copy.reject}
    </button>
  );

  return (
    <article
      aria-label={isAdd ? `${copy.add} ${item.cardName}` : `${copy.cut} ${item.cardName}`}
      className="flex flex-col gap-[10px] rounded-[10px] p-[12px] md:gap-[7px] md:rounded-[9px] md:px-[12px] md:py-[10px]"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="flex flex-wrap items-center gap-[9px]">
        <span
          aria-hidden
          className="w-[12px] flex-none text-center font-mono text-[14px] font-semibold"
          style={{ color: isAdd ? "var(--accent)" : "var(--fg-faint)" }}
        >
          {isAdd ? "+" : "−"}
        </span>
        <Thumb item={item} />
        {isAdd ? <OwnershipDot owned={item.owned} size={7} /> : null}
        <Name item={item} />
        {addMark ? <span className="hidden md:inline-flex">{addMark}</span> : null}
        <span className="ml-auto hidden gap-[7px] md:flex">{yes}{no}</span>
      </div>
      {addMark ? <div className="flex items-center gap-[8px] md:hidden">{addMark}</div> : null}
      <p className="max-w-[980px] text-[12.5px] leading-[1.55]" style={{ color: "var(--fg-body)" }}>
        {item.rationale}
      </p>
      {shift && item.bracketAfter ? (
        <div data-testid="bracket-flag" className="flex flex-wrap items-center gap-[8px]">
          <span className="text-[12.5px]" style={{ color: "var(--fg-body)" }}>
            {shift === "raises" ? cardCopy.bracketRaises : shift === "lowers" ? cardCopy.bracketLowers : cardCopy.bracketChanges}
          </span>
          <BracketChip permits={item.bracketAfter as Bracket[]} />
        </div>
      ) : null}
      <ul className="flex flex-wrap gap-[5px]">
        {item.evidence.map((c, i) => (
          <li
            key={i}
            className="flex items-baseline gap-[5px] rounded-[5px] px-[7px] py-[3px] font-mono text-[9.5px]"
            style={{ background: "var(--surface-sunken)", border: "1px solid var(--border)" }}
          >
            <span className="uppercase tracking-[0.1em]" style={{ color: "var(--fg-locked)" }}>{cardCopy.cite[c.kind]}</span>
            <span style={{ color: "var(--fg-muted)" }}>{c.value}</span>
          </li>
        ))}
      </ul>
      <div className="flex gap-[8px] md:hidden">{yes}{no}</div>
      {refused ? <MutationError message={refused} /> : null}
    </article>
  );
}

function brokenLine(item: LineItem): string {
  if (item.side === "cut" && item.locked) return lockedCardsCopy.tuning.cutLocked(item.cardName);
  return item.side === "add" ? copy.addAlreadyIn(item.cardName) : copy.cutGone(item.cardName);
}

function useOpen(item: LineItem) {
  const { open } = useCardDetail();
  const preview = usePreviewRow(item.cardImageUri);
  const intent = useCardIntent(item.cardOracleId);
  return {
    onClick: (event: React.MouseEvent<HTMLElement>) => open(
      item.cardOracleId,
      [{ oracleId: item.cardOracleId, name: item.cardName, imageUri: item.cardImageUri }],
      undefined,
      { opener: event.currentTarget },
    ),
    ...preview,
    ...intent,
  };
}

function Name({ item }: { item: LineItem }) {
  const trigger = useOpen(item);
  const add = item.side === "add";
  return (
    <button
      type="button"
      {...trigger}
      aria-label={copy.open(item.cardName)}
      className={`min-w-0 text-left text-[13px] [border-bottom:1px_dotted_var(--accent)] hover:[border-bottom-style:solid] focus-visible:[border-bottom-style:solid] ${add ? "font-semibold text-[color:var(--fg)]" : "font-normal text-[color:var(--fg-body)] line-through [text-decoration-color:var(--fg-locked)]"}`}
    >
      {item.cardName}
    </button>
  );
}

function Thumb({ item }: { item: LineItem }) {
  const trigger = useOpen(item);
  // Dashed only for a card that is NOT in the deck (the table's "not in deck" row): an addition
  // already made, or a cut, is a card the deck holds.
  const add = item.side === "add" && !item.inDeck;
  const src = item.cardImageUri;
  return (
    <button
      type="button"
      {...trigger}
      tabIndex={-1}
      aria-hidden
      className={`h-[31px] w-[22px] flex-none overflow-hidden rounded-[3px] bg-cover bg-center hover:[border-color:var(--accent)] ${add ? "[border:1px_dashed_var(--border-dashed)]" : "[border:1px_solid_var(--border-strong)]"} ${src ? "" : add ? "bg-[image:repeating-linear-gradient(135deg,var(--elevated),var(--elevated)_3px,var(--border)_3px,var(--border)_6px)]" : "bg-[image:repeating-linear-gradient(135deg,var(--border),var(--border)_3px,var(--surface-raised)_3px,var(--surface-raised)_6px)]"}`}
      style={src ? { backgroundImage: cssUrl(src) } : undefined}
      title={item.cardName}
    />
  );
}

function Answered({
  tone, label, name, struck, plain, action, refused,
}: {
  tone: "applied" | "rejected" | "broken";
  label: string;
  name: string;
  struck?: boolean;
  /** The name is a sentence, not a card: drawn as it is. */
  plain?: boolean;
  action?: { label: string; onPress: () => void; busy: boolean };
  refused: string | null;
}) {
  const applied = tone === "applied";
  return (
    <div>
      <div
        data-testid={`answered-${tone}`}
        className="flex flex-wrap items-center gap-[9px] rounded-[9px] px-[12px] py-[9px]"
        style={{
          background: applied ? "var(--surface)" : "var(--surface-sunken)",
          border: `1px solid ${applied ? "var(--success)" : "var(--border)"}`,
        }}
      >
        <span className="flex flex-none items-center gap-[6px]">
          {applied ? (
            <span
              aria-hidden
              className="flex size-[15px] items-center justify-center rounded-[4px] text-[9px]"
              style={{ border: "1px solid var(--success)", color: "var(--success)" }}
            >
              {"✓"}
            </span>
          ) : null}
          <span
            className="font-mono text-[9.5px] uppercase tracking-[0.1em]"
            style={{ color: applied ? "var(--success)" : "var(--fg-locked)" }}
          >
            {label}
          </span>
        </span>
        <span
          className={`min-w-0 text-[12.5px] ${struck && !plain ? "line-through [text-decoration-color:var(--fg-locked)]" : ""}`}
          style={{ color: applied ? "var(--fg-body)" : "var(--fg-faint)" }}
        >
          {name}
        </span>
        {action ? (
          <button
            type="button"
            onClick={action.onPress}
            disabled={action.busy}
            className="ml-auto min-h-[32px] rounded-[7px] px-[11px] py-[6px] text-[12px] font-medium text-[color:var(--fg-muted)] [border:1px_solid_var(--border-strong)] hover:text-[color:var(--fg)] transition-colors"
          >
            {action.label}
          </button>
        ) : null}
      </div>
      {refused ? <MutationError message={refused} /> : null}
    </div>
  );
}
