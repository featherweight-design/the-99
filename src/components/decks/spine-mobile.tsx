// The deck details header below 768px — property table §C.
//
// Everything in the band sits on the wash, so every string here carries the
// cover band's deeper ink shadow — the exact inverse of the desktop band's
// flat-ground rule. The one string below the divider is on flat ground and
// carries none.
"use client";

import { useState } from "react";
import { GhostButton } from "@/components/ui/button";
import { CardDetailTrigger } from "../cards/card-detail-provider";
import { IdentityPips } from "../commanders/commander-art";
import { FullCardTrigger } from "../commanders/full-card-trigger";
import { ArtWash, COVER_INK_SHADOW } from "../ui/art-wash";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { overCopy, overWord, renameCopy } from "../../lib/copy/decks-builder";
import { deckBodySize } from "../../lib/decks/deck-size";
import { colorLabel, deckIdentity } from "../../lib/decks/format";
import { STATUS_TOKEN, statusBarStyle } from "../../lib/decks/status-style";
import { type SpineBandProps, TRUNCATES } from "./spine-desktop";
import { StatusPillBadge } from "./status-pill";
import { useDeckRename } from "./use-deck-rename";

export function SpineMobile({ deck, counts, status, onExport }: SpineBandProps) {
  const [renaming, setRenaming] = useState(false);
  const { commander, partner } = deck;
  const { built } = counts;
  const bodySize = deckBodySize(partner !== null);
  const identity = deckIdentity(commander.colorIdentity, partner?.colorIdentity ?? null);
  const over = built > bodySize;
  const toCut = built - bodySize;
  // R6 ruling 3: one state, one colour. Past 99 the status is `Over`, so every
  // ink the state adds reads the same token `statusBarStyle` gives the bar
  // rather than a second alarm colour of its own.
  const overInk = `var(${STATUS_TOKEN[status]})`;
  const rename = useDeckRename(deck.id, deck.name, () => setRenaming(false));

  // §C8/§C10 — one row, drawn in the band at rest and below the divider while
  // editing, where the field needs the band's whole width. Its ink differs with
  // its ground, which is the only reason the two call sites take an argument.
  const metaRow = (onWash: boolean) => (
    <div className="flex flex-wrap items-center justify-center" style={{ gap: 8 }}>
      {/* Decision 18. The caption is centred inside `left:18 right:18`, so a
          pair of names is already the width of the row at 390 — the identity
          label is dropped rather than wrapped, and a single commander keeps it
          on both widths. The names lead the row here and trail the pips on
          desktop, which is the one ordering difference between the two bands.

          Same ordered shrink as the desktop caption: the group hides its
          overflow, both halves ellipsise, and the partner's larger shrink
          factor makes it the half that gives. */}
      <span
        className="font-mono flex"
        style={{
          fontSize: 10,
          color: onWash ? "var(--fg-body)" : "var(--fg-muted)",
          textShadow: onWash ? COVER_INK_SHADOW : undefined,
          gap: 4,
          minWidth: 0,
          overflow: "hidden",
          alignItems: "baseline",
        }}
      >
        {partner ? (
          <>
            <span style={TRUNCATES}>{commander.name}</span>
            <span style={{ flex: "none" }}>+</span>
            {/* The partner's printing opens from the word that names it. The
                padding reaches a 44px target and the equal negative margin
                takes it back out of the flex row, so nothing moves; it is
                weighted upward because the row sits 12px off the band's
                clipped bottom edge. */}
            <CardDetailTrigger
              oracleId={partner.oracleId}
              name={partner.name}
              title={partner.name}
              ariaLabel={deckImportCopy.commander.partnerCardAria(partner.name)}
              className="font-mono"
              style={{
                ...TRUNCATES,
                flexShrink: 1000,
                fontSize: 10,
                color: "inherit",
                textShadow: onWash ? COVER_INK_SHADOW : undefined,
                padding: "22px 0 9px",
                margin: "-22px 0 -9px",
              }}
            >
              {/* The rule is on the word, not on the button: the button's box
                  is 9px taller than the text so the target clears 44px, and a
                  border there would draw that far below the name. */}
              <span style={{ borderBottom: "1px solid var(--border-strong)" }}>
                {partner.name}
              </span>
            </CardDetailTrigger>
          </>
        ) : (
          <span style={TRUNCATES}>
            {commander.name} · {colorLabel(commander.colorIdentity)}
          </span>
        )}
      </span>
      <IdentityPips colorIdentity={identity} size={10} />
      {/* No shadow at either call site: the chip carries its own opaque plate.
          The prop replaces the tile's class outright, so §C8's box is restated
          in full — there is no merge with the default. */}
      <StatusPillBadge
        status={status}
        className="flex flex-none items-center rounded-[6px] px-[7px] py-[3px] font-mono text-[10px]"
      />
    </div>
  );

  return (
    <header className="md:hidden" style={{ background: "var(--surface)", overflow: "hidden" }}>
      <div
        data-testid="spine-band"
        className="relative overflow-hidden"
        style={{ aspectRatio: "2.2 / 1" }}
      >
        <ArtWash
          strategy="cover"
          labelEdge="bottom"
          // The block's top edge as a percentage of the 2.2/1 band, taken at
          // its tallest. The title is `-webkit-line-clamp: 2`, so two lines is
          // a hard ceiling rather than an estimate: 57% with two, 61% with one.
          labelAt={57}
          artCropUri={commander.artCropUri}
          colorIdentity={commander.colorIdentity}
        />
        {/* §G — with no crop there is no printing to open. */}
        {commander.artCropUri ? (
          <FullCardTrigger
            oracleId={commander.oracleId}
            placement="deck-mobile"
            bandTapTarget={false}
          />
        ) : null}

        <div
          className="absolute flex flex-col items-center"
          style={{ left: 18, right: 18, bottom: 12, gap: renaming ? 8 : 6 }}
        >
          {renaming ? (
            <>
              <input
                autoFocus
                value={rename.value}
                onChange={(e) => rename.setValue(e.target.value)}
                onKeyDown={rename.onKeyDown}
                onBlur={rename.onBlur}
                // readOnly, never disabled: a disabled input blurs, and blur
                // commits.
                readOnly={rename.isPending}
                aria-label={renameCopy.fieldAria}
                className="w-full rounded-[8px] border border-[color:var(--accent)] bg-[color:var(--surface-sunken)] text-center font-display font-[700] focus-visible:outline-none"
                style={{
                  boxSizing: "border-box",
                  padding: "8px 12px",
                  fontSize: 20,
                  color: "var(--fg)",
                }}
              />
              {rename.error ? (
                <p className="font-mono" style={{ fontSize: 11, color: "var(--danger)" }}>
                  {rename.error}
                </p>
              ) : null}
              <div className="flex" style={{ gap: 8 }}>
                <button
                  type="button"
                  onClick={rename.commit}
                  // Same guard Cancel carries, for the opposite reason: without
                  // it the field's blur commits on mousedown and this tap
                  // commits again before the first request has flipped
                  // `isPending`, sending the rename twice.
                  onMouseDown={(e) => e.preventDefault()}
                  // aria-disabled, never disabled: disabling the focused control
                  // blurs it, and blur commits.
                  aria-disabled={!rename.canSave}
                  // Keyed off inert, not off `canSave`: a request in flight also
                  // clears `canSave`, and §F draws Saving as the accent button
                  // at .6 rather than as the elevated one nothing can be done to.
                  className={`flex items-center rounded-[7px] border-0 font-mono font-medium ${
                    rename.canSave || rename.isPending
                      ? "bg-[color:var(--accent)] text-[color:var(--bg)]"
                      : "bg-[color:var(--elevated)] text-[color:var(--fg-disabled)]"
                  }`}
                  style={{
                    minHeight: 44,
                    padding: "0 18px",
                    fontSize: 11,
                    opacity: rename.isPending ? 0.6 : 1,
                    cursor: rename.canSave ? "pointer" : "default",
                  }}
                >
                  {rename.isPending
                    ? renameCopy.saving
                    : rename.error
                      ? renameCopy.retry
                      : renameCopy.save}
                </button>
                <button
                  type="button"
                  onClick={rename.cancel}
                  // Without this the blur lands first and saves the edit the
                  // tap was refusing.
                  onMouseDown={(e) => e.preventDefault()}
                  className="flex items-center rounded-[7px] border border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] font-mono text-[color:var(--fg-body)]"
                  style={{ minHeight: 44, padding: "0 18px", fontSize: 11, cursor: "pointer" }}
                >
                  {renameCopy.cancel}
                </button>
              </div>
            </>
          ) : (
            <>
              <div
                className="flex items-center justify-center"
                style={{ gap: 8, maxWidth: "100%" }}
              >
                {/* The trigger's own width, opposite it: the row centres title
                    and trigger together, so without this the name sits half a
                    trigger left of the band's centre. */}
                <span aria-hidden="true" className="flex-none" style={{ width: 44 }} />
                <h1
                  className="min-w-0 font-display font-[700]"
                  style={{
                    fontSize: 20,
                    lineHeight: 1.25,
                    textAlign: "center",
                    color: "var(--fg)",
                    textShadow: COVER_INK_SHADOW,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {deck.name}
                </h1>
                {/* Always visible, at a phone target: there is no hover here.
                    The 44px target stays, but the box around it goes — it was
                    the only chrome in the band, so a bordered fill outweighed
                    the 20px title it sits beside. The glyph takes the title's
                    ink and its shadow instead, because both are on art. */}
                <button
                  type="button"
                  onClick={() => setRenaming(true)}
                  aria-label={renameCopy.triggerAria(deck.name)}
                  className="flex flex-none items-center justify-center text-[color:var(--fg)]"
                  style={{
                    width: 44,
                    height: 44,
                    fontSize: 17,
                    textShadow: COVER_INK_SHADOW,
                    cursor: "pointer",
                  }}
                >
                  ✎
                </button>
              </div>
              {metaRow(true)}
            </>
          )}
        </div>
      </div>

      <div
        className="flex flex-col items-center"
        style={{
          borderTop: "1px solid var(--border)",
          padding: "14px 16px 12px",
          gap: 8,
        }}
      >
        {renaming ? metaRow(false) : null}
        <div className="flex items-baseline" style={{ gap: 4 }}>
          <span
            className="font-mono font-semibold"
            style={{ fontSize: 14, color: over ? overInk : "var(--fg)" }}
          >
            {built}
          </span>
          <span className="font-mono" style={{ fontSize: 14, color: "var(--fg-faint)" }}>
            {overCopy.figure.denominator(bodySize)}
          </span>
          {over && (
            <span
              className="font-mono font-semibold"
              style={{ fontSize: 12, marginLeft: 4, color: overInk }}
            >
              {overCopy.figure.delta(String(toCut))}
            </span>
          )}
        </div>
        <div
          className="w-full"
          style={{
            height: 6,
            borderRadius: 999,
            background: "var(--elevated)",
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.4)",
            overflow: "hidden",
          }}
        >
          <div
            data-testid="spine-bar-fill"
            className="h-full"
            style={statusBarStyle(status, built, bodySize)}
          />
        </div>
        {over && (
          <p
            className="text-center"
            style={{ fontSize: 12, lineHeight: 1.5, color: "var(--fg-body)" }}
          >
            {/* Bold, but not the status token: the figure and the delta are the
                readout, this line is the remedy, and alarm colour marks the
                problem rather than the fix. */}
            <b className="font-semibold">{overCopy.trim.lead(overWord(toCut))}</b>{" "}
            {overCopy.trim.body(overWord(toCut))}
          </p>
        )}
      </div>

      <div
        className="flex justify-center"
        style={{ padding: "4px 16px 14px", gap: 8 }}
      >
        {built > 0 && (
          <GhostButton
            href={`/decks/${deck.id}/import`}
            className="flex min-h-[44px] items-center px-[9px] py-[6px] font-mono text-[11px]"
          >
            {deckImportCopy.update.entryLabel}
          </GhostButton>
        )}
        {built > 0 && (
          <button
            type="button"
            onClick={onExport}
            className="flex items-center gap-[5px] rounded-[7px] border border-[color:var(--border-strong)] bg-transparent px-[9px] py-[6px] font-mono text-[11px] text-[color:var(--accent)]"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--fg-faint)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export
          </button>
        )}
      </div>
    </header>
  );
}
