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

const copy = deckImportCopy.update.diff;

export type DiffRowCard = {
  oracleId: string;
  name: string;
  typeLine: string;
  /** True only of a card the app placed. False covers a hand-add and a previous
   *  import's rows alike, so it carries no marker of its own. */
  auto: boolean;
  owned: boolean;
};

/** Owned reads as a filled disc, unowned as a dashed ring — the deck surface's
 *  own availability vocabulary. Decorative: the group header carries the
 *  owned/to-buy split in text. */
function OwnedDot({ owned }: { owned: boolean }) {
  return (
    <span
      aria-hidden
      className={
        owned
          ? "w-[7px] h-[7px] rounded-full flex-none bg-[color:var(--success)]"
          : "w-[7px] h-[7px] rounded-full flex-none bg-transparent [border:1px_dashed_var(--fg-locked)]"
      }
    />
  );
}

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
        "flex items-center gap-[10px] min-h-[44px] rounded-[8px] pl-[12px] pr-[6px]",
        kept
          ? "bg-[color:var(--elevated-hover)] [border:1px_solid_var(--accent-shadow)]"
          : "bg-[color:var(--surface)] [border:1px_solid_var(--border)]",
      ].join(" ")}
    >
      <OwnedDot owned={card.owned} />
      <span className="flex-auto min-w-0 text-[13.5px] text-[color:var(--fg)]">{card.name}</span>
      <Marker auto={card.auto} />
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
          "font-mono text-[11.5px] rounded-[7px] h-[38px] md:h-[34px] min-w-[64px] flex-none",
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
export function DiffRowIn({ card, sourceLine }: { card: DiffRowCard; sourceLine: number | null }) {
  return (
    <div className="flex items-center gap-[10px] min-h-[44px] rounded-[8px] px-[12px] bg-[color:var(--surface)] [border:1px_solid_var(--border)]">
      <OwnedDot owned={card.owned} />
      <span className="flex-auto min-w-0 text-[13.5px] text-[color:var(--fg)]">{card.name}</span>
      <span className="hidden md:block font-mono text-[10px] w-[150px] flex-none truncate text-[color:var(--fg-locked)]">
        {card.typeLine}
      </span>
      {/* Both trailing slots keep their width when empty, and the line number is
          tabular, so the type line lands in the same place on every row whether
          or not the card is owned and however many digits its source line has. */}
      <span
        className={[
          "font-mono text-[10px] rounded-full px-[8px] py-[3px] flex-none",
          "text-[color:var(--warning)] [border:1px_solid_var(--accent-shadow)]",
          card.owned ? "invisible" : "",
        ].join(" ")}
      >
        buy
      </span>
      <span
        className="hidden md:inline font-mono text-[11px] w-[54px] flex-none text-right tabular-nums text-[color:var(--fg-faint)]"
      >
        {sourceLine !== null ? copy.sourceLine(String(sourceLine)) : ""}
      </span>
    </div>
  );
}

/** A row of `We cannot name these`. The shipped unresolved plate, reused whole
 *  — an unmatched line is a resolvable row on the deck, not a failure. */
export function DiffRowUnnamed({ rawName, sourceLine }: { rawName: string; sourceLine: number }) {
  return (
    <div className="flex items-center gap-[10px] min-h-[44px] rounded-[8px] px-[12px] bg-[color:var(--surface-rail)] [border:1px_dashed_var(--accent-shadow)]">
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
export function DiffRowUnchanged({ card }: { card: { name: string; typeLine: string } }) {
  return (
    <div className="flex items-center gap-[10px] min-h-[44px] rounded-[8px] px-[12px] bg-[color:var(--surface)] [border:1px_solid_var(--border)]">
      <span className="flex-auto min-w-0 text-[13.5px] text-[color:var(--fg-body)]">
        {card.name}
      </span>
      <span className="hidden md:block font-mono text-[10px] w-[150px] flex-none truncate text-[color:var(--fg-locked)]">
        {card.typeLine}
      </span>
    </div>
  );
}
