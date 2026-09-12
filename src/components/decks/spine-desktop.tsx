// The deck details header at ≥768px — property table §B.
//
// The commander's art is the band now, washed as a 168px `left-portrait`, and
// every string sits at a 254px inset: past the scrim's 240px flat stop, on flat
// ground, so nothing here carries a shadow.
"use client";

import { useState } from "react";
import { GhostButton, PrimaryButton } from "@/components/ui/button";
import { CardDetailTrigger } from "../cards/card-detail-provider";
import { IdentityPips } from "../commanders/commander-art";
import { FullCardTrigger } from "../commanders/full-card-trigger";
import { ArtWash } from "../ui/art-wash";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { overCopy, overWord, renameCopy } from "../../lib/copy/decks-builder";
import { deckBodySize } from "../../lib/decks/deck-size";
import { colorLabel, deckIdentity } from "../../lib/decks/format";
import type { StatusPill } from "../../lib/decks/status";
import { STATUS_TOKEN, statusBarStyle } from "../../lib/decks/status-style";
import { FirstCommitOffer } from "./first-commit-offer";
import { StatusPillBadge } from "./status-pill";
import { useDeckRename } from "./use-deck-rename";

/** The slice of the deck both widths of the header read. Narrower than
    `DeckDetail` on purpose: nothing in this band knows about the decklist. */
export interface SpineBandProps {
  deck: {
    id: string;
    name: string;
    commander: {
      oracleId: string;
      name: string;
      colorIdentity: string[];
      artCropUri: string | null;
    };
    /**
     * The second commander, or null for the single-commander deck most decks
     * are. Read here for the body size the count's denominator prints — a deck
     * is 100 cards including its commanders.
     */
    partner: {
      oracleId: string;
      name: string;
      colorIdentity: string[];
      artCropUri: string | null;
    } | null;
  };
  counts: { built: number; ownedCount: number; toBuyCount: number };
  status: StatusPill;
  onExport: () => void;
  /** True on a deck with no version whose list has reached a full body — the
   *  one condition under which `Commit as v1` is offered. Computed by the shell,
   *  which owns `deckBodySize`, so neither spine reads the body count itself. */
  offerFirstCommit?: boolean;
}

/** §B16 — the field's box, identical in all four editing states. Declared
    rather than left to layout: zero reflow between states is the point. */
const FIELD_BOX = { width: 352, height: 29 } as const;

/**
 * Decision 18's shrinking half. Both names take it; the partner additionally
 * raises `flexShrink` so it is the half that gives first. `minWidth: 0` is what
 * makes the ellipsis reachable at all — a flex child's default `min-width:auto`
 * floors it at its content width, so without this the group overflows rather
 * than truncating.
 */
export const TRUNCATES: React.CSSProperties = {
  flex: "0 1 auto",
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

export function SpineDesktop({
  deck,
  counts,
  status,
  onExport,
  offerFirstCommit,
}: SpineBandProps) {
  const [renaming, setRenaming] = useState(false);
  const { commander, partner } = deck;
  const { built, ownedCount, toBuyCount } = counts;
  const bodySize = deckBodySize(partner !== null);
  const identity = deckIdentity(commander.colorIdentity, partner?.colorIdentity ?? null);
  const over = built > bodySize;
  const toCut = built - bodySize;
  // R6 ruling 3: one state, one colour. Past 99 the status is `Over`, so every
  // ink the state adds reads the same token `statusBarStyle` gives the bar
  // rather than a second alarm colour of its own.
  const overInk = `var(${STATUS_TOKEN[status]})`;
  const rename = useDeckRename(deck.id, deck.name, () => setRenaming(false));

  // §F, as three booleans rather than a state string: they are not exclusive in
  // the source (a save-disabled field can also be showing a previous error) and
  // the table only ever asks which of the three is true for a given property.
  const saving = rename.isPending;
  const failed = rename.error !== null;
  const inert = !rename.canSave && !saving;

  const fieldBorder = saving
    ? "1px solid var(--border-strong)"
    : failed
      ? "1px solid var(--danger)"
      : "1px solid var(--accent)";

  const hint = failed ? rename.error : saving ? renameCopy.saving : renameCopy.hint;
  const hintInk = failed
    ? "var(--danger)"
    : inert
      ? "var(--fg-disabled)"
      : "var(--fg-faint)";

  return (
    <header
      className="group relative hidden md:block"
      // minHeight, not the table's height + overflow:hidden: an over-99 deck
      // draws a trim paragraph inside this band, and clipping it would hide
      // copy rather than art. The wash still declares 168px itself.
      style={{ minHeight: 168, borderBottom: "1px solid var(--border)" }}
    >
      <ArtWash
        strategy="left-portrait"
        band={168}
        artCropUri={commander.artCropUri}
        colorIdentity={commander.colorIdentity}
      />
      {/* §G — with no crop there is no printing to open, so the pill is absent.
          It is absolutely positioned, so its absence shifts nothing. */}
      {commander.artCropUri ? (
        <FullCardTrigger
          oracleId={commander.oracleId}
          placement="deck-desktop"
          bandTapTarget={false}
        />
      ) : null}

      <div
        className="relative flex h-full items-center"
        style={{ padding: "0 24px 0 254px", gap: 18 }}
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center">
            {renaming ? (
              <input
                autoFocus
                value={rename.value}
                onChange={(e) => rename.setValue(e.target.value)}
                onKeyDown={rename.onKeyDown}
                onBlur={rename.onBlur}
                // readOnly, never disabled: a disabled input blurs, and blur
                // commits.
                readOnly={saving}
                maxLength={undefined}
                aria-label={renameCopy.fieldAria}
                className="font-display font-[700] focus-visible:outline-none"
                style={{
                  ...FIELD_BOX,
                  boxSizing: "border-box",
                  background: "var(--surface-sunken)",
                  border: fieldBorder,
                  borderRadius: 8,
                  padding: "1px 10px",
                  margin: "-2px 0 -2px -11px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  fontSize: 21,
                  lineHeight: 1.2,
                  color: "var(--fg)",
                }}
              />
            ) : (
              <>
                {/* Selectable text, not a control — §B15 makes the pencil the
                    one trigger. */}
                <h1
                  className="font-display font-[700] min-w-0"
                  style={{
                    fontSize: 21,
                    lineHeight: 1.2,
                    color: "var(--fg)",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {deck.name}
                </h1>
                <button
                  type="button"
                  onClick={() => setRenaming(true)}
                  aria-label={renameCopy.triggerAria(deck.name)}
                  // Focus-visible reveals it too, or it is keyboard-unreachable.
                  className="flex flex-none items-center justify-center rounded-[6px] border border-[color:var(--border-strong)] bg-transparent text-[color:var(--fg-muted)] opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:bg-[color:var(--elevated-hover)]"
                  style={{
                    width: 28,
                    height: 28,
                    marginLeft: 6,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  ✎
                </button>
              </>
            )}
          </div>

          <div
            className="flex flex-wrap items-center"
            style={{ gap: 10, marginTop: 3, minWidth: 0 }}
          >
            <IdentityPips colorIdentity={identity} size={10} />
            {/* Decision 18: the caption states the pair, joined by a `+`. No row
                is added and no badge is drawn — the band is one image, so the
                second commander is a word rather than a picture. Desktop keeps
                the identity label; the mobile caption drops it.

                The group is an ordered shrink, not a run of text: between 768
                and ~1085px the column is narrower than the pair, and wrapping
                the names is the state decision 18 rules out. `flex-wrap` on the
                row above spills the pips and pill first; past that the partner
                gives, carrying a shrink factor large enough that the primary
                yields only once the partner is gone. Writing the primary
                `flex-none` instead is the obvious reading and a bug — it would
                overflow the group and draw under the count. */}
            <span
              className="font-mono flex"
              style={{
                fontSize: 11,
                color: "var(--fg-body)",
                gap: 5,
                minWidth: 0,
                overflow: "hidden",
                alignItems: "baseline",
              }}
            >
              <span style={TRUNCATES}>{commander.name}</span>
              {partner ? (
                <>
                  <span style={{ flex: "none" }}>+</span>
                  {/* The partner's printing opens from the word that names it,
                      and the rule under it is the whole visible affordance. The
                      primary needs no equivalent — its trigger is the 230px of
                      art beside this text. */}
                  <CardDetailTrigger
                    oracleId={partner.oracleId}
                    name={partner.name}
                    title={partner.name}
                    ariaLabel={deckImportCopy.commander.partnerCardAria(partner.name)}
                    className="font-mono"
                    style={{
                      ...TRUNCATES,
                      flexShrink: 1000,
                      fontSize: 11,
                      color: "var(--fg-body)",
                      borderBottom: "1px solid var(--border-strong)",
                    }}
                  >
                    {partner.name}
                  </CardDetailTrigger>
                </>
              ) : null}
              <span style={{ flex: "none" }}>· {colorLabel(identity)}</span>
            </span>
            {/* Geometry only; `statusPillStyle` still owns the colour. The prop
                replaces the tile's class outright, so every box property §B8
                names has to be restated here — there is no merge. */}
            <StatusPillBadge
              status={status}
              className="flex flex-none items-center rounded-[6px] px-[8px] py-[3px] font-mono text-[11px]"
            />
          </div>

          <div className="flex items-baseline" style={{ gap: 4, marginTop: 5 }}>
            <span
              className="font-mono font-semibold"
              style={{ fontSize: 20, color: over ? overInk : "var(--fg)" }}
            >
              {built}
            </span>
            <span className="font-mono" style={{ fontSize: 13, color: "var(--fg-faint)" }}>
              {overCopy.figure.denominator(bodySize)}
            </span>
            {over && (
              <span
                className="font-mono font-semibold"
                style={{ fontSize: 13, marginLeft: 6, color: overInk }}
              >
                {overCopy.figure.delta(String(toCut))}
              </span>
            )}
          </div>

          <div
            style={{
              width: 170,
              height: 6,
              borderRadius: 999,
              background: "var(--elevated)",
              boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.4)",
              overflow: "hidden",
              marginTop: 6,
            }}
          >
            <div
              data-testid="spine-bar-fill"
              className="h-full"
              style={statusBarStyle(status, built, bodySize)}
            />
          </div>

          {/* The split of the figure above, so before the first card there is
              nothing to split. */}
          {built > 0 && (
            <p
              className="font-mono"
              style={{ fontSize: 11, color: "var(--fg-faint)", marginTop: 6 }}
            >
              {ownedCount} owned · {toBuyCount} to buy
            </p>
          )}

          {over && (
            <p
              style={{
                fontSize: 11.5,
                lineHeight: 1.5,
                marginTop: 6,
                maxWidth: 520,
                color: "var(--fg-body)",
              }}
            >
              {/* Bold, but not the status token: the figure and the delta are the
                  readout, this line is the remedy, and alarm colour marks the
                  problem rather than the fix. */}
              <b className="font-semibold">{overCopy.trim.lead(overWord(toCut))}</b>{" "}
              {overCopy.trim.body(overWord(toCut))}
            </p>
          )}
        </div>

        <div className="flex-none">
          {renaming ? (
            // §B14 — the actions are replaced, not joined. The hint row is
            // present in every state, which is what holds the column's height.
            <div className="flex flex-col items-end" style={{ gap: 7 }}>
              <div className="flex items-center" style={{ gap: 9 }}>
                <button
                  type="button"
                  onClick={rename.commit}
                  // Same guard Cancel carries, for the opposite reason: without
                  // it the field's blur commits on mousedown and this click
                  // commits again before the first request has flipped
                  // `isPending`, sending the rename twice.
                  onMouseDown={(e) => e.preventDefault()}
                  // aria-disabled, never disabled: disabling the focused control
                  // blurs it, and blur commits.
                  aria-disabled={!rename.canSave}
                  // `inert`, not `!canSave`: a request in flight also clears
                  // `canSave`, and §F draws Saving as the accent button at .6 —
                  // the elevated plate belongs to the one state nothing can be
                  // done to, where a hover would promise a click that does nothing.
                  className={`flex items-center rounded-[8px] border-0 font-sans font-semibold ${
                    inert
                      ? "bg-[color:var(--elevated)] text-[color:var(--fg-disabled)]"
                      : "bg-[color:var(--accent)] text-[color:var(--bg)] hover:bg-[color:var(--accent-hover)]"
                  }`}
                  style={{
                    height: 29,
                    padding: "0 14px",
                    fontSize: 12.5,
                    opacity: saving ? 0.6 : 1,
                    cursor: rename.canSave ? "pointer" : "default",
                  }}
                >
                  {saving ? renameCopy.saving : failed ? renameCopy.retry : renameCopy.save}
                </button>
                <button
                  type="button"
                  onClick={rename.cancel}
                  // Without this the blur lands first and saves the edit the
                  // click was refusing.
                  onMouseDown={(e) => e.preventDefault()}
                  className="flex items-center rounded-[8px] border border-[color:var(--border-strong)] bg-transparent font-sans text-[color:var(--fg-muted)]"
                  style={{ height: 29, padding: "0 12px", fontSize: 12.5, cursor: "pointer" }}
                >
                  {renameCopy.cancel}
                </button>
              </div>
              <p
                data-testid="spine-rename-hint"
                className="font-mono"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  minHeight: 16,
                  color: hintInk,
                }}
              >
                {hint}
              </p>
            </div>
          ) : (
            <div className="flex items-center" style={{ gap: 9 }}>
              {/* Absent on an empty deck for the same reason Export is disabled
                  there: nothing to diff. */}
              {built > 0 && (
                <GhostButton
                  href={`/decks/${deck.id}/import`}
                  className="flex h-[32px] items-center px-[14px] font-sans text-[12.5px]"
                >
                  {deckImportCopy.update.entryLabel}
                </GhostButton>
              )}
              {built === 0 ? (
                <button
                  type="button"
                  disabled
                  className="flex h-[32px] items-center gap-[6px] rounded-[8px] border border-[color:var(--border)] bg-transparent px-[14px] font-sans text-[12.5px] font-semibold text-[color:var(--fg-faint)]"
                  style={{ cursor: "not-allowed" }}
                >
                  Export
                </button>
              ) : (
                /* The one filled button on this surface, and bone — accent is
                   reserved for status and never fills an action. */
                <PrimaryButton
                  onClick={onExport}
                  className="flex h-[32px] items-center gap-[6px] px-[14px] text-[12.5px]"
                >
                  Export
                </PrimaryButton>
              )}
              {offerFirstCommit && <FirstCommitOffer deckId={deck.id} />}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
