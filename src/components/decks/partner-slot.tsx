"use client";

// The picker's second slot — decisions 17 and 20.
//
// One slot serving both of create-picker's modes, drawn in the Selected sidebar
// on desktop and in the scrolling flow on a phone. It never lives in the dock:
// the dock is summary and button only, and anything else there moves its height
// under a thumb.
//
// State A — absent — is the caller's: the slot draws only where a partner is
// possible, so the caller gates on `partnerAbility` and this component is handed
// the resolved ability. That keeps one computation deciding both the slot and the
// `Commander` / `Partner` eyebrows, which appear with the slot and never before
// it, and it is what leaves a single-commander sidebar pixel-identical to today.

import { commanderGradient } from "../../lib/collection/gradients";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { partnerAbilityLabel, type PartnerAbility } from "../../lib/decks/partner";

const copy = deckImportCopy.commander;

/**
 * The partner as this slot draws it. `caption` arrives as finished copy rather
 * than as a flag to interpret — the same contract `PickerRow` uses, and what
 * lets state C's `Proposed · from your list, line 2` and a create-mode pick's
 * identity line share one plate.
 */
export type PartnerSlotCard = {
  name: string;
  colorIdentity: string[];
  imageUri: string | null;
  caption: string;
  /**
   * The accessible name of the whole proposal, so a screen reader hears that it
   * is reversible before it hears the name. Finished by the caller for the same
   * reason `caption` is: only the caller knows whether this partner came from a
   * paste or was picked like any other row.
   */
  ariaLabel: string;
};

type PartnerSlotProps = {
  primaryName: string;
  ability: PartnerAbility;
  partner: PartnerSlotCard | null;
  /** How many of the listed commanders `canPair` with the primary. */
  pairableCount: number;
  onAdd: () => void;
  onChange: () => void;
  onRemove: () => void;
};

// Dashed means not settled — the app's existing vocabulary for a soft claim, and
// a line style rather than an alpha fade, so it reads in greyscale. Carried by
// both the empty plate and the filled one: a partner is optional throughout, and
// Create is never blocked on it.
const PLATE = "w-[38px] h-[54px] flex-none rounded-[6px] border border-dashed border-[color:var(--border-dashed)]";

export function PartnerSlot({
  primaryName,
  ability,
  partner,
  pairableCount,
  onAdd,
  onChange,
  onRemove,
}: PartnerSlotProps) {
  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
      <p
        className="font-mono uppercase"
        style={{
          fontSize: 9.5,
          letterSpacing: "0.12em",
          color: "var(--fg-faint)",
          marginBottom: 7,
        }}
      >
        {copy.partnerLabel}
      </p>

      {partner ? (
        <>
          <div
            role="group"
            aria-label={partner.ariaLabel}
            className="flex items-center gap-[11px] min-h-[44px]"
          >
            <div
              className={PLATE}
              style={{
                // `--elevated` under the art, as the shipped thumbs do: art is
                // fetched, and a plate with nothing behind it flashes the card
                // beneath through a 6px radius while it loads.
                background: partner.imageUri
                  ? `url(${partner.imageUri}) center top/cover, var(--elevated)`
                  : commanderGradient(partner.colorIdentity),
                boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.35)",
              }}
            />
            <div className="min-w-0 flex-1">
              <p
                className="font-display font-semibold"
                style={{ fontSize: 13.5, lineHeight: 1.25, color: "var(--fg)", margin: 0 }}
              >
                {partner.name}
              </p>
              <p
                className="font-mono"
                style={{
                  fontSize: 10,
                  lineHeight: 1.4,
                  color: "var(--fg-faint)",
                  marginTop: 4,
                  marginBottom: 0,
                }}
              >
                {partner.caption}
              </p>
            </div>
          </div>
          {/* Text, not buttons with fills, and neither is accent: refresh
              decision 3 reserves accent for `in use` and `to buy`, and a
              proposal is neither. */}
          <div className="flex gap-[14px]" style={{ marginTop: 9 }}>
            <button
              type="button"
              onClick={onChange}
              className="font-mono text-[11px] text-[color:var(--fg-body)] border-b border-[color:var(--border-strong)]"
            >
              {copy.change}
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="font-mono text-[11px] text-[color:var(--fg-faint)] border-b border-[color:var(--border)]"
            >
              {copy.remove}
            </button>
          </div>
        </>
      ) : (
        // Still drawn at a pairable count of zero. The commander can pair; the
        // player just owns nothing to pair it with, and that is a collection
        // fact rather than a disabled control.
        <button
          type="button"
          onClick={onAdd}
          aria-label={copy.addPartnerAria(primaryName)}
          className="w-full flex items-center gap-[11px] min-h-[44px] text-left"
        >
          <span className={PLATE} />
          <span className="min-w-0 flex-1">
            <span
              className="block font-display font-semibold"
              style={{ fontSize: 13.5, lineHeight: 1.25, color: "var(--fg)" }}
            >
              {copy.addPartner}
            </span>
            {/* The ability verbatim, then the count: the card's own words for
                why this deck may have two, rather than ours. */}
            <span
              className="block font-mono"
              style={{ fontSize: 10, lineHeight: 1.4, color: "var(--fg-faint)", marginTop: 4 }}
            >
              {pairableCount === 0
                ? copy.partnerNoneOwned(partnerAbilityLabel(ability))
                : copy.partnerAvailable(partnerAbilityLabel(ability), pairableCount)}
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
