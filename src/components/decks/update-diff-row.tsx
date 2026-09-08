"use client";

// One row of the update diff (#277). Three shapes, one component: a removal
// carries a Keep control, an addition carries its source line, and neither is
// struck through or tinted --danger.
//
// No strikethrough and no red anywhere. A struck-through row says the deletion
// has happened, and nothing has happened yet — the group heading, its count and
// its sentence carry that fact. The row stays a legible card with a control on
// it, the same principle as the add panel's spent slot.

import { deckImportCopy } from "../../lib/copy/deck-import";
import type { Availability } from "../../lib/decks/availability";
import { CardDetailTrigger } from "../cards/card-detail-provider";
import { AvailabilityMarker } from "../ui/availability-marker";
import { OwnershipDot } from "../ui/ownership-dot";
import { ROW_RADIUS, ROW_SHELL } from "../ui/row-shell";
import { BuyTag } from "./buy-tag";

const copy = deckImportCopy.update.diff;

// Both plates the diff rows sit on, so the over-committed marker's seam matches
// what is actually behind it rather than the base canvas.
const SEAM_SURFACE = "var(--surface)";
const SEAM_KEPT = "var(--elevated-hover)";

export type DiffRowCard = {
  oracleId: string;
  name: string;
  typeLine: string;
  /** True only of a card the app placed. False covers a hand-add and a previous
   *  import's rows alike, so it carries no marker of its own. */
  auto: boolean;
  owned: boolean;
  /** Governs the availability marker only, never the slot's occupant. Null for
   *  an unowned card and for a failed rollup alike, and neither draws a marker.
   *  A card nothing competes for is NOT null: it carries a real rollup that the
   *  marker itself renders as nothing, so null and `free` reach the same drawing
   *  by different routes and must not be collapsed into one. An unowned row
   *  still fills the slot, with the buy tag. */
  availability: Availability | null;
};

/** The shipped `auto` tag, and nothing in its place when the card is not the
 *  app's. No column records who placed a card, so a second marker would assert
 *  something the data cannot support — Product ruled it out on 2026-09-05. */
function Marker({ auto }: { auto: boolean }) {
  // Keeps its box when there is no tag, so the type line beside it does not
  // shift between an app-placed row and a player's own. The border stays in both
  // states because its width is part of that box.
  return (
    <span
      className={[
        "hidden md:inline font-mono text-[10px] rounded-full px-[8px] py-[3px] flex-none",
        "text-[color:var(--fg-faint)] [border:1px_solid_var(--border)]",
        auto ? "" : "invisible",
      ].join(" ")}
    >
      auto
    </span>
  );
}

/**
 * The floor's one availability slot: the buy tag when the card is not owned,
 * the marker when it is. Never both — an unowned card has no claims to compete
 * over, and a card the player owns is not one to buy.
 *
 * An owned card nothing competes for draws nothing here, and that is the slot
 * being filled correctly rather than left empty: the marker returns null at
 * `free` on every surface in the app.
 *
 * The tag is the full `buy`, not the decklist's collapsed `$` — the collapse is
 * an All-tab affordance on a list the player is scanning, and this is a diff
 * they are reading once.
 *
 * `selfClaimed` is the caller's answer to the one question `selfExcluded` is
 * allowed to mean: does THIS deck's own claim account for the shortfall? The
 * rollup was read with `excludeDeckId`, so a removal — a card the deck holds
 * today — reaches `free === 0` by having its own claim subtracted, and must not
 * be called hard. An addition is not on the deck yet, so nothing of its was
 * subtracted and a `free === 0` there is a genuine claim by another deck.
 */
function AvailabilitySlot({
  card,
  seam,
  selfClaimed,
}: {
  card: DiffRowCard;
  seam: string;
  selfClaimed: boolean;
}) {
  if (!card.owned) return <BuyTag variant="row" />;
  if (!card.availability) return null;
  return (
    <AvailabilityMarker
      availability={card.availability}
      seam={seam}
      selfExcluded={selfClaimed}
      className="flex-none"
    />
  );
}

/** The row's name, and the flow's one way into the card itself. A player
 *  deciding whether to keep a removal is exactly the person who needs to reread
 *  what the card does, and every other deck surface already opens the modal from
 *  the name. The plate is not a control, so the trigger nests cleanly; the Keep
 *  button beside it stays the row's own action. */
function DiffRowName({
  oracleId,
  name,
  tone,
}: {
  oracleId: string;
  name: string;
  tone: string;
}) {
  return (
    <CardDetailTrigger
      oracleId={oracleId}
      name={name}
      title={name}
      className="flex-auto min-w-0 truncate text-left text-[13.5px]"
      style={{ color: tone }}
    >
      {name}
    </CardDetailTrigger>
  );
}

/** A row of `Coming out`. The only row in the flow with a decision on it. */
export function DiffRowOut({
  card,
  kept,
  onToggle,
}: {
  card: DiffRowCard;
  kept: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={[
        `${ROW_SHELL} min-h-[44px] pl-[12px] pr-[6px]`,
        kept
          ? "bg-[color:var(--elevated-hover)] [border:1px_solid_var(--accent-shadow)]"
          : "bg-[color:var(--surface)] [border:1px_solid_var(--border)]",
      ].join(" ")}
    >
      <OwnershipDot owned={card.owned} size={7} />
      <DiffRowName oracleId={card.oracleId} name={card.name} tone="var(--fg)" />
      <Marker auto={card.auto} />
      <AvailabilitySlot card={card} seam={kept ? SEAM_KEPT : SEAM_SURFACE} selfClaimed />
      {/* Desktop only: the phone row has no width for it, and the name plus the
          hand-added marker are what the decision turns on. */}
      <span className="hidden md:block font-mono text-[10px] w-[120px] flex-none truncate text-[color:var(--fg-locked)]">
        {card.typeLine}
      </span>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={kept}
        aria-label={copy.keepAria(card.name)}
        className={[
          `font-mono text-[11.5px] ${ROW_RADIUS} h-[38px] md:h-[34px] min-w-[64px] flex-none`,
          "flex items-center justify-center cursor-pointer bg-transparent transition-colors",
          kept
            ? "text-[color:var(--accent)] [border:1px_solid_var(--accent)] [background:color-mix(in_oklab,var(--accent)_10%,transparent)]"
            : "text-[color:var(--fg-body)] [border:1px_solid_var(--border-strong)] md:hover:[border-color:var(--accent)] md:hover:text-[color:var(--accent-hover)]",
        ].join(" ")}
      >
        <span className="md:hidden">{kept ? copy.keptMobile : copy.keep}</span>
        <span className="hidden md:inline">{kept ? copy.kept : copy.keep}</span>
      </button>
    </div>
  );
}

/** A row of `Going in`. A list, not a decision: there is deliberately no
 *  per-row toggle, because refusing individual additions turns update into a
 *  curated merge, which is the quick-add bar's job. */
export function DiffRowIn({
  card,
  sourceLine,
}: {
  card: DiffRowCard;
  sourceLine: number | null;
}) {
  return (
    <div className={`${ROW_SHELL} min-h-[44px] px-[12px] bg-[color:var(--surface)] [border:1px_solid_var(--border)]`}>
      <OwnershipDot owned={card.owned} size={7} />
      <DiffRowName oracleId={card.oracleId} name={card.name} tone="var(--fg)" />
      {/* The slot sits BEFORE the type line, not after it. The name is the only
          flexible item, so anything that can disappear has to sit on the name's
          side of the fixed columns — with the slot trailing, an owned row's type
          line landed a tag's width right of an unowned row's. */}
      <AvailabilitySlot card={card} seam={SEAM_SURFACE} selfClaimed={false} />
      <span className="hidden md:block font-mono text-[10px] w-[150px] flex-none truncate text-[color:var(--fg-locked)]">
        {card.typeLine}
      </span>
      {/* The line number keeps its width and is tabular, so the type line lands
          in the same place however many digits the source line has. */}
      <span
        // `whitespace-nowrap` because the string has a space in it: a long line
        // number would otherwise wrap and take the row's height with it. The
        // sibling slots get it from `truncate`. `min-w` rather than `w` so the
        // slot holds its place on short numbers but grows past four digits
        // instead of colliding with the type line — nothing caps import length.
        className="hidden md:inline font-mono text-[11px] min-w-[54px] flex-none text-right tabular-nums whitespace-nowrap text-[color:var(--fg-faint)]"
      >
        {sourceLine !== null ? copy.sourceLine(String(sourceLine)) : ""}
      </span>
    </div>
  );
}

/** A row of `We cannot name these`. The shipped unresolved plate, reused whole
 *  — an unmatched line is a resolvable row on the deck, not a failure. */
export function DiffRowUnnamed({
  rawName,
  sourceLine,
}: {
  rawName: string;
  sourceLine: number;
}) {
  return (
    <div className={`${ROW_SHELL} min-h-[44px] px-[12px] bg-[color:var(--surface-rail)] [border:1px_dashed_var(--accent-shadow)]`}>
      <span className="flex-auto min-w-0 font-mono text-[13px] truncate text-[color:var(--fg-body)]">
        {rawName}
      </span>
      <span className="font-mono text-[11px] flex-none text-[color:var(--fg-faint)]">
        {copy.sourceLine(String(sourceLine))}
      </span>
    </div>
  );
}

/** A row of the collapsed `unchanged` group. No control and no marker: it is
 *  there to be counted, and expanding it is already the player asking. */
export function DiffRowUnchanged({
  card,
}: {
  card: { oracleId: string; name: string; typeLine: string };
}) {
  return (
    <div className={`${ROW_SHELL} min-h-[44px] px-[12px] bg-[color:var(--surface)] [border:1px_solid_var(--border)]`}>
      <DiffRowName
        oracleId={card.oracleId}
        name={card.name}
        tone="var(--fg-body)"
      />
      <span className="hidden md:block font-mono text-[10px] w-[150px] flex-none truncate text-[color:var(--fg-locked)]">
        {card.typeLine}
      </span>
    </div>
  );
}
