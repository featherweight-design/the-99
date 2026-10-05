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

import { CommanderThumb } from "../ui/commander-thumb";
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
// the EMPTY plate alone now: a partner is optional throughout and Create is
// never blocked on it, but a slot that holds one is settled, and drawing the dash
// over a filled thumb said the opposite while also giving that thumb two edges.
/** The EMPTY slot alone. It matches the thumb's box so the row does not move
    when a partner arrives, and keeps the dashed border it always had — the app's
    own vocabulary for an unsettled claim, shared with Building's chip. A filled
    slot draws `CommanderThumb` and no dash. */
const EMPTY_PLATE =
  "w-[44px] h-[62px] flex-none rounded-[6px] border border-dashed border-[color:var(--border-dashed)]";

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
            {/* The filled slot draws the app's row thumb and nothing of its
                own. It keeps no dashed border: the dash says *no partner yet*,
                and a slot holding one is not an unsettled claim. The empty plate
                below still carries it, which is the whole point of the
                vocabulary. */}
            <CommanderThumb
              imageUri={partner.imageUri}
              colorIdentity={partner.colorIdentity}
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
              className="font-mono text-[11px] text-[color:var(--fg-body)] border-b border-b-[color:var(--border-strong)] border-[color:var(--border-strong)]"
            >
              {copy.change}
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="font-mono text-[11px] text-[color:var(--fg-faint)] border-b border-b-[color:var(--border)] border-[color:var(--border)]"
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
          <span className={EMPTY_PLATE} />
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
