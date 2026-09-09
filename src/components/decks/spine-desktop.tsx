// The deck details header at ≥768px — property table §B.
//
// The commander's art is the band now, washed as a 168px `left-portrait`, and
// every string sits at a 254px inset: past the scrim's 240px flat stop, on flat
// ground, so nothing here carries a shadow.
"use client";

import { useState } from "react";
import { GhostButton, PrimaryButton } from "@/components/ui/button";
import { IdentityPips } from "../commanders/commander-art";
import { FullCardTrigger } from "../commanders/full-card-trigger";
import { ArtWash } from "../ui/art-wash";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { overCopy, overWord, renameCopy } from "../../lib/copy/decks-builder";
import { colorLabel } from "../../lib/decks/format";
import type { StatusPill } from "../../lib/decks/status";
import { statusBarStyle } from "../../lib/decks/status-style";
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
  };
  counts: { built: number; ownedCount: number; toBuyCount: number };
  status: StatusPill;
  onExport: () => void;
}

/** §B16 — the field's box, identical in all four editing states. Declared
    rather than left to layout: zero reflow between states is the point. */
const FIELD_BOX = { width: 352, height: 29 } as const;

export function SpineDesktop({ deck, counts, status, onExport }: SpineBandProps) {
  const [renaming, setRenaming] = useState(false);
  const { commander } = deck;
  const { built, ownedCount, toBuyCount } = counts;
  const over = built > 99;
  const toCut = built - 99;
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
                  aria-label={renameCopy.triggerAria}
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
            style={{ gap: 10, marginTop: 3 }}
          >
            <IdentityPips colorIdentity={commander.colorIdentity} size={10} />
            <p className="font-mono" style={{ fontSize: 11, color: "var(--fg-body)" }}>
              {commander.name} · {colorLabel(commander.colorIdentity)}
            </p>
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
              style={{ fontSize: 20, color: over ? "var(--warning)" : "var(--fg)" }}
            >
              {built}
            </span>
            <span className="font-mono" style={{ fontSize: 13, color: "var(--fg-faint)" }}>
              {overCopy.figure.denominator}
            </span>
            {over && (
              <span
                className="font-mono font-semibold"
                style={{ fontSize: 13, marginLeft: 6, color: "var(--warning)" }}
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
              style={statusBarStyle(status, built)}
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
                fontSize: 12.5,
                lineHeight: 1.5,
                marginTop: 8,
                maxWidth: 520,
                color: "var(--fg-body)",
              }}
            >
              <b className="font-semibold" style={{ color: "var(--warning)" }}>
                {overCopy.trim.lead(overWord(toCut))}
              </b>{" "}
              {overCopy.trim.body(String(toCut))}
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
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
