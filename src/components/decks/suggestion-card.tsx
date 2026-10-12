"use client";

import { useState, type ReactNode } from "react";
import { lockedCardsCopy } from "../../lib/copy/locked-cards";

import { deckTuningCopy } from "../../lib/copy/deck-tuning";
import { cssUrl } from "../../lib/collection/browse";
import { availabilityState } from "../../lib/decks/availability";
import { suggestionNeedsBuy } from "../../lib/decks/shopping";
import { recommendationsCopy } from "../../lib/copy/recommendations";
import type { DeckMutationResult } from "../../lib/decks/mutation-result";
import { bracketShift } from "../../lib/tuning/bracket-shift";
import type { PairItem as TuningItem } from "../../lib/tuning/state";
import type { Bracket } from "../../lib/profile/types";
import { useCardDetail, useCardIntent } from "../cards/card-detail-provider";
import { AvailabilityMarker } from "../ui/availability-marker";
import { OwnershipDot } from "../ui/ownership-dot";
import { BracketChip } from "./bracket-chip";
import { BuyTag } from "./buy-tag";
import { usePreviewRow } from "./hover-preview";
import { MutationError } from "./mutation-error";

/**
 * One suggested swap (placement addendum v2, A1/A2, B1, C3-C5, E1). A card out, a card in, the
 * reason, what it cites, and two answers. It renders the item and does no lookups of its own.
 *
 * Both names and both thumbnails open the card, with the pair as the list the modal pages
 * through, and preview it under a fine pointer. The add carries the shipped availability marks,
 * or the buy tag when it is not owned; the cut carries none. An answered swap collapses to one
 * line in its own slot, so nothing reorders under the reader. Nothing unmounts while a verdict
 * is in flight: a card that vanished mid-write and came back is the flicker the plan forbids.
 */
type Verdict = (itemId: string) => Promise<DeckMutationResult>;
export type CardActions = { apply: Verdict; undo: Verdict; reject: Verdict; restore: Verdict };

const copy = deckTuningCopy.card;

export function SuggestionCard({
  item,
  permits,
  newestPriceAsOf,
  actions,
  onSettled,
}: {
  item: TuningItem;
  /** The reading on screen now, which the bracket flag is worded against. */
  permits: readonly Bracket[];
  newestPriceAsOf: Date | null;
  actions: CardActions;
  /** Told after a verdict lands, with what to announce, so the panel can re-read. */
  onSettled: (announce: string) => void;
}) {
  const [busy, setBusy] = useState<keyof CardActions | null>(null);
  const [refused, setRefused] = useState<string | null>(null);

  async function answer(kind: keyof CardActions) {
    setBusy(kind);
    setRefused(null);
    // A rejection is a refusal too: the card must never stay disabled with nothing said.
    const refusal = kind === "apply" ? copy.applyRefused : kind === "undo" ? copy.undoRefused : copy.verdictRefused;
    const result = await actions[kind](item.id).catch((): DeckMutationResult => ({ ok: false, message: refusal }));
    setBusy(null);
    if (!result.ok) {
      setRefused(result.message);
      return;
    }
    onSettled(
      kind === "apply" ? deckTuningCopy.announce.applied(item.cutName, item.addName)
        : kind === "undo" ? deckTuningCopy.announce.undone(item.cutName)
          : kind === "reject" ? deckTuningCopy.announce.rejected
            : deckTuningCopy.announce.restored,
    );
  }

  if (item.verdict === "accepted") {
    return (
      <AnsweredRow
        tone="applied"
        pair={<><span>{item.cutName}</span> <Arrow ink="var(--success)" /> <b className="font-semibold" style={{ color: "var(--fg)" }}>{item.addName}</b></>}
        action={{ label: copy.undo, onPress: () => answer("undo"), busy: busy === "undo" }}
        refused={refused}
      />
    );
  }
  if (item.verdict === "dismissed") {
    return (
      <AnsweredRow
        tone="rejected"
        pair={<>{item.cutName} <Arrow ink="var(--fg-faint)" /> {item.addName}</>}
        action={{ label: copy.restore, onPress: () => answer("restore"), busy: busy === "restore" }}
        refused={refused}
      />
    );
  }
  if (!item.applies) {
    return (
      <AnsweredRow
        tone="broken"
        pair={brokenLine(item)}
        refused={refused}
      />
    );
  }

  const shift = bracketShift(permits, item.bracketAfter);
  // `availability` is read from this deck's vantage, which subtracts the deck's own ask. That
  // only changes the reading when the deck holds the add, so it is self-excluded exactly then.
  const selfExcluded = item.addInDeck;
  const marked = item.owned && item.availability !== null
    && availabilityState(item.availability, { selfExcluded }) !== "free";
  // Owned but with no copy free for it, or already overcommitted: the marker says why, and the buy
  // tag beside it says what the copy costs, the pair a Shopping row draws for a spoken-for card.
  const needsBuy = suggestionNeedsBuy({ owned: item.owned, availability: item.availability, selfExcluded, typeLine: item.addTypeLine });
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
  const addMark = !needsBuy ? marker : !item.owned ? (
    <BuyTag variant="row" price={item.price} newestAsOf={newestPriceAsOf} />
  ) : (
    <span className="inline-flex flex-none items-center gap-[8px]">
      {marker}
      <BuyTag variant="row" label={recommendationsCopy.shopping.rowSecondCopyTagAria} price={item.price} newestAsOf={newestPriceAsOf} />
    </span>
  );

  return (
    <article
      aria-label={copy.swap(item.cutName, item.addName)}
      className="flex flex-col gap-[11px] rounded-[10px] px-[12px] py-[13px] md:gap-[8px] md:rounded-[9px] md:px-[12px] md:py-[10px]"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      {/* The pair: one line on desktop, the cut over the add on a phone. */}
      <div className="flex flex-col gap-[7px] md:flex-row md:flex-wrap md:items-center md:gap-[9px]">
        <span className="flex min-w-0 items-center gap-[9px]">
          <Thumb item={item} side="cut" />
          <Name item={item} side="cut" />
        </span>
        <span className="flex min-w-0 items-center gap-[9px]">
          <span aria-hidden className="hidden flex-none font-mono text-[13px] md:inline" style={{ color: "var(--accent)" }}>
            {"→"}
          </span>
          <Thumb item={item} side="add" />
          <span className="flex min-w-0 flex-auto items-center gap-[7px]">
            <span aria-hidden className="flex-none font-mono text-[12px] md:hidden" style={{ color: "var(--accent)" }}>
              {"→"}
            </span>
            <OwnershipDot owned={item.owned} size={7} />
            <Name item={item} side="add" />
            {addMark ? <span className="hidden md:inline-flex">{addMark}</span> : null}
          </span>
        </span>
      </div>
      {/* The phone's marks row: its own line, and only when there is a mark to draw. */}
      {addMark ? <div className="flex items-center gap-[8px] md:hidden">{addMark}</div> : null}

      {/* H35-E: the phone drew only `rationaleShort`, a one-line summary, while desktop drew
          the full `rationale` paragraph — "why would we hide more insight based on device
          type?" (Hugh). Both widths now draw the same full reasoning. */}
      <p className="max-w-[980px] text-[12.5px] leading-[1.55] md:leading-[1.5]" style={{ color: "var(--fg-body)" }}>
        {item.rationale}
      </p>

      {shift && item.bracketAfter ? (
        <div data-testid="bracket-flag" className="flex flex-wrap items-center gap-[8px]">
          <span className="text-[12.5px]" style={{ color: "var(--fg-body)" }}>
            {shift === "raises" ? copy.bracketRaises : shift === "lowers" ? copy.bracketLowers : copy.bracketChanges}
          </span>
          <BracketChip permits={item.bracketAfter as Bracket[]} />
        </div>
      ) : null}

      <div className="flex flex-col gap-[11px] md:flex-row-reverse md:flex-wrap md:items-center md:gap-[7px]">
        <ul className="flex flex-wrap gap-[6px] md:ml-auto md:gap-[5px]">
          {item.evidence.map((c, i) => (
            <li
              key={i}
              className="flex items-baseline gap-[5px] rounded-[5px] px-[7px] py-[3px] font-mono text-[9.5px]"
              style={{ background: "var(--surface-sunken)", border: "1px solid var(--border)" }}
            >
              <span className="uppercase tracking-[0.1em]" style={{ color: "var(--fg-locked)" }}>{copy.cite[c.kind]}</span>
              <span style={{ color: "var(--fg-muted)" }}>{c.value}</span>
            </li>
          ))}
        </ul>
        <div className="flex gap-[8px] md:mr-auto md:gap-[7px]">
          <button
            type="button"
            onClick={() => answer("apply")}
            aria-disabled={busy !== null || undefined}
            disabled={busy !== null}
            className="h-[44px] flex-1 rounded-[8px] text-[13px] font-semibold md:h-auto md:flex-none md:rounded-[7px] md:px-[13px] md:py-[7px] md:text-[12.5px] text-[color:var(--accent)] [border:1px_solid_var(--accent)] hover:bg-[color:color-mix(in_oklab,var(--accent)_10%,transparent)]"
          >
            {busy === "apply" ? copy.applying : copy.apply}
          </button>
          <button
            type="button"
            onClick={() => answer("reject")}
            disabled={busy !== null}
            className="h-[44px] flex-1 rounded-[8px] text-[13px] font-medium md:h-auto md:flex-none md:rounded-[7px] md:px-[12px] md:py-[7px] md:text-[12.5px] text-[color:var(--fg-muted)] [border:1px_solid_var(--border-strong)] hover:text-[color:var(--fg)]"
          >
            {copy.reject}
          </button>
        </div>
      </div>
      {refused ? <MutationError message={refused} /> : null}
    </article>
  );
}

function brokenLine(item: TuningItem): string {
  // `applies` is false when the cut has left the deck or the add is already in it. The cut
  // leaving is the drawn case; the add's half is the other way the rule can fail.
  // A locked cut is still IN the deck, so it is named before the in-deck test (Locked, F4).
  if (item.cutLocked) return lockedCardsCopy.tuning.cutLocked(item.cutName);
  return item.cutInDeck ? copy.addAlreadyIn(item.addName) : copy.cutGone(item.cutName);
}

export function Arrow({ ink }: { ink: string }) {
  return <span aria-hidden className="font-mono" style={{ color: ink }}>{"→"}</span>;
}

function useOpen(item: TuningItem, side: "cut" | "add") {
  const { open } = useCardDetail();
  const id = side === "cut" ? item.cutOracleId : item.addOracleId;
  const preview = usePreviewRow(side === "cut" ? item.cutImageUri : item.addImageUri);
  const intent = useCardIntent(id);
  return {
    // The pressed control names itself, so focus comes back to it on close even in Safari.
    onClick: (event: React.MouseEvent<HTMLElement>) => open(id, [
      { oracleId: item.cutOracleId, name: item.cutName, imageUri: item.cutImageUri },
      { oracleId: item.addOracleId, name: item.addName, imageUri: item.addImageUri },
    ], undefined, { opener: event.currentTarget }),
    ...preview,
    ...intent,
  };
}

function Name({ item, side }: { item: TuningItem; side: "cut" | "add" }) {
  const trigger = useOpen(item, side);
  const name = side === "cut" ? item.cutName : item.addName;
  return (
    <button
      type="button"
      {...trigger}
      aria-label={copy.open(name)}
      className={`min-w-0 text-left text-[13px] [border-bottom:1px_dotted_var(--accent)] hover:[border-bottom-style:solid] focus-visible:[border-bottom-style:solid] ${side === "cut" ? "text-[color:var(--fg-body)] line-through [text-decoration-color:var(--fg-locked)]" : "font-semibold text-[color:var(--fg)]"}`}
    >
      {name}
    </button>
  );
}

function Thumb({ item, side }: { item: TuningItem; side: "cut" | "add" }) {
  const trigger = useOpen(item, side);
  const src = side === "cut" ? item.cutImageUri : item.addImageUri;
  const name = side === "cut" ? item.cutName : item.addName;
  return (
    <button
      type="button"
      {...trigger}
      tabIndex={-1}
      aria-hidden
      className={`h-[31px] w-[22px] flex-none overflow-hidden rounded-[3px] bg-cover bg-center hover:[border-color:var(--accent)] ${side === "cut" ? "[border:1px_solid_var(--border-strong)]" : "[border:1px_solid_var(--border-dashed)]"} ${src ? "" : side === "cut" ? "bg-[image:repeating-linear-gradient(135deg,var(--border),var(--border)_3px,var(--surface-raised)_3px,var(--surface-raised)_6px)]" : "bg-[image:repeating-linear-gradient(135deg,var(--elevated),var(--elevated)_3px,var(--border)_3px,var(--border)_6px)]"}`}
      // eslint-disable-next-line no-restricted-syntax -- the card's own art, a per-item URL no class can hold
      style={src ? { backgroundImage: cssUrl(src) } : undefined}
      title={name}
    />
  );
}

/** A verdict receipt, shared with Improve my mana's applied trades, which take Undo the same way. */
export function AnsweredRow({
  tone,
  pair,
  action,
  refused,
}: {
  tone: "applied" | "rejected" | "broken";
  pair: ReactNode;
  action?: { label: string; onPress: () => void; busy: boolean };
  refused: string | null;
}) {
  const label = tone === "applied" ? copy.applied : tone === "rejected" ? copy.rejected : copy.noLongerApplies;
  return (
    <div>
      <div
        data-testid={`answered-${tone}`}
        className={`flex flex-wrap items-center gap-[9px] rounded-[9px] px-[12px] ${tone === "applied" ? "py-[10px]" : "py-[9px]"}`}
        style={{
          background: tone === "applied" ? "var(--surface)" : "var(--surface-sunken)",
          border: `1px solid ${tone === "applied" ? "var(--success)" : "var(--border)"}`,
        }}
      >
        <span className="flex flex-none items-center gap-[6px]">
          {tone === "applied" ? (
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
            style={{ color: tone === "applied" ? "var(--success)" : "var(--fg-locked)" }}
          >
            {label}
          </span>
        </span>
        <span
          className={tone === "applied" ? "min-w-0 text-[13px]" : "min-w-0 text-[12.5px]"}
          style={{ color: tone === "applied" ? "var(--fg-body)" : "var(--fg-faint)" }}
        >
          {pair}
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
