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
import { FullCardTrigger } from "../commanders/full-card-trigger";
import { ArtWash, COVER_INK_SHADOW } from "../ui/art-wash";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { overCopy, overWord, renameCopy } from "../../lib/copy/decks-builder";
import { deckBodySize } from "../../lib/decks/deck-size";
import { IdentityPips } from "../commanders/commander-art";
import { colorLabel, deckIdentity } from "../../lib/decks/format";
import { STATUS_TOKEN, statusBarStyle } from "../../lib/decks/status-style";
import { FirstCommitOffer } from "./first-commit-offer";
import { type SpineBandProps, TRUNCATES } from "./spine-desktop";
import { StatusPillBadge } from "./status-pill";
import { useDeckRename } from "./use-deck-rename";

export function SpineMobile({
  deck,
  counts,
  status,
  onExport,
  offerFirstCommit,
}: SpineBandProps) {
  const [renaming, setRenaming] = useState(false);
  const { commander, partner } = deck;
  const { built } = counts;
  const bodySize = deckBodySize(partner !== null);
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
  const identity = deckIdentity(commander.colorIdentity, partner?.colorIdentity ?? null);

  const metaRow = (onWash: boolean) => (
    // `flex-nowrap`, and it is load-bearing. `labelAtPx` measures ONE 22px row,
    // and at 390px a pair's two names plus five 10px pips, the chip and the two
    // 8px gaps exceed the caption's width — so a wrapping row put the chip on a
    // second line, grew the block to about 120px, and left the title's first
    // line on a ramp still climbing. The names group already ellipsises under
    // pressure, and it is the half that should give.
    // `min-w-0 w-full`, and it is the fix for a real overflow: the row is
    // `flex-nowrap`, and without a zero minimum of its OWN the row inherits its
    // content's min-content width as a floor — so a long two-faced commander
    // name pushed the row wider than the band and drew outside the viewport on
    // both sides. The names group waives its minimum; the row has to waive its
    // own for that to reach the layout.
    <div
      // The marker the deck-header probe finds this row by. It used to look for
      // a `<p>` containing a `·`, and this row is a `div` whose separator lives
      // inside a child — so the probe read null and its two divider assertions
      // failed on every deck instead of measuring the move.
      data-spine-meta
      className="flex w-full min-w-0 flex-nowrap items-center justify-start"
      style={{ gap: 8 }}
    >
      {/* The chip leads the row, as the drawings have it: it is the one thing on
          this line whose width never changes, so leading with it keeps the line's
          left edge still while the names shrink behind it. */}
      <StatusPillBadge
        status={status}
        // `h-[22px]`, the settled chip height, rather than vertical padding over
        // an inherited line box: that made this pill 23px and the block 91, one
        // pixel past the ramp keyed to it.
        className="flex h-[22px] flex-none items-center rounded-[6px] px-[7px] font-mono text-[10px]"
      />
      {/* The pips, between the chip and the names — the same adjacency desktop
          draws (pips then names), with the chip moved to the front of the line.
          They cost 62px at five colours against this row's 314px, which is about
          eleven characters of the commander's name, and the name ellipsises
          either way on a two-faced pair. The colour stays worded beside them:
          the deck tile's ruling dropped pips in favour of the word because a
          grid cell cannot afford both, and a page header can. */}
      <IdentityPips colorIdentity={identity} size={10} />
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
    </div>
  );

  return (
    <header className="md:hidden" style={{ background: "var(--surface)", overflow: "hidden" }}>
      <div
        data-testid="spine-band"
        // A page header, stated at 288px. The 2.2/1 ratio made this band 177px on
        // a 390px phone and 236px on a 520px one, and because the ramp was a
        // percentage the taller of the two scaled its own darkness with it.
        className="relative overflow-hidden"
        style={{ height: 288 }}
      >
        <ArtWash
          strategy="cover"
          height={288}
          // The block's MEASURED height in pixels from the foot, at 390px and at
          // the title's own ceiling: `-webkit-line-clamp: 2` makes two lines hard
          // rather than an estimate, so 12 bottom inset, a 22px meta row — the
          // settled chip height, stated on the pill for exactly this reason — a
          // 6px gap and two 20px title lines at 1.25 for 50 gives 90. The pill
          // drew 23 from padding over an inherited line box before this round,
          // which put the block at 91 and the title's first pixels on a rising
          // ramp.
          //
          // The handoff's 83 was measured against a three-line title, which this
          // clamp forbids; its own correction note is the reason the figure is
          // measured here rather than taken — a `labelAt` derived from a block
          // other than the one drawn is this round's own failure.
          labelAtPx={90}
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
          // The block the ramp is keyed to, hooked so a probe measures it rather
          // than guessing at it.
          data-wash-label
          className="absolute flex flex-col items-start"
          // Left-aligned, so the reserved space is on the right ALONE: the
          // card-details control sits in this band's bottom-right corner and its
          // 44px target reached into the meta row. A centred block had to pad
          // both sides to clear that corner without moving its centre; a
          // left-aligned one pays for it once.
          style={{
            left: 18,
            right: 18,
            bottom: 12,
            paddingRight: 40,
            gap: renaming ? 8 : 6,
          }}
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
                className="w-full rounded-[8px] border border-[color:var(--accent)] bg-[color:var(--surface-sunken)] text-left font-display font-[700] focus-visible:outline-none"
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
              {/* A BLOCK, not a flex row, and that is the whole fix for the
                  floating pencil. A flex sibling sits after the heading's BOX,
                  and a heading whose text wraps has a full-width box — so on a
                  one-line name the glyph landed right after the words and on a
                  two-line name it landed at the far right of the band, which
                  read as arbitrary. In normal inline flow it shares the
                  heading's LAST LINE BOX instead, which is where the drawings
                  put it.

                  No spacer either: it existed only to balance the glyph's flow
                  width so a centred title stayed centred, and this block reads
                  from the left. */}
              <div className="w-full" style={{ maxWidth: "100%", textAlign: "left" }}>
                <h1
                  // `-webkit-inline-box`: inline-LEVEL so the glyph after it
                  // joins its last line, and still the clamped box the 90px ramp
                  // figure is measured against. With `overflow: hidden` its
                  // baseline is its bottom edge, which is what puts a
                  // baseline-aligned glyph beside the last line rather than the
                  // first.
                  className="m-0 min-w-0 font-display font-[700]"
                  style={{
                    display: "-webkit-inline-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    // The holder's own flow width is RESERVED: 14 of glyph plus
                    // its 6px margin. At `100%` a title long enough to need the
                    // whole line left nothing for the glyph, which pushed it to a
                    // line of its own — baseline alignment cannot reach back up
                    // to the clamped last line, and the extra line breaks the
                    // 90px figure the ramp is keyed to.
                    maxWidth: "calc(100% - 20px)",
                    fontSize: 20,
                    lineHeight: 1.25,
                    textAlign: "left",
                    color: "var(--fg)",
                    textShadow: COVER_INK_SHADOW,
                  }}
                >
                  {/* `data-deck-title` marks the deck's name for anything that
                      needs it apart from the heading's own layout — the browser
                      probe compares it to the rename control's accessible name.
                      The clamp lives here rather than on the heading so the
                      heading can be a flex line: a clamped box clips, and the
                      glyph beside the title would be clipped with it. */}
                  {/* The marker is the deck's name alone — the glyph is outside
                      this heading, so neither the heading's text content nor its
                      accessible name carries it. The clamp moved up to the
                      heading itself, which is now the inline box the glyph
                      follows. */}
                  {/* `min-w-0`: this span is a flex item of the inline box, and
                      an unbroken 120-character name would otherwise force its
                      min-content width past the reserved width and push the glyph
                      off the phone instead of clamping. */}
                  <span data-deck-title className="min-w-0">{deck.name}</span>
                </h1>
                {/* The glyph is a SIBLING of the heading, not a child. Inside it
                    its `aria-label` joined the heading's own accessible name, so
                    heading navigation announced "…Rename deck: …" and then the
                    control announced itself again. Beside the title it is still
                    the title's control rather than a corner one.

                    14px in flow, not zero: a zero-width holder puts the whole
                    44px border box past the text — 29px beyond the block's right
                    edge, which the band clips. Only the 15px of hit padding
                    overhangs now, inside the block's own 18px inset.

                    `relative z-[1]` because that overhang reaches 15px BELOW the
                    title's last line and the meta row starts a few pixels later:
                    two positioned elements at auto z-index are ordered by
                    document position, so the row underneath won the hit test
                    across the bottom third of this target. The same defect #534
                    fixed one control over. */}
                {/* `vertical-align: baseline` against an inline box whose
                    overflow is hidden: that box's baseline IS its bottom edge, so
                    the glyph sits beside the title's last line on a wrapped name
                    and beside its only line on a short one. No `self-*` — there
                    is no flex row left to align within. */}
                <span
                  className="relative z-[1] inline-flex"
                  style={{ width: 14, marginLeft: 6, verticalAlign: "baseline" }}
                >
                  <button
                    type="button"
                    onClick={() => setRenaming(true)}
                    aria-label={renameCopy.triggerAria(deck.name)}
                    className="inline-flex items-center justify-center text-[color:var(--fg-muted)]"
                    style={{
                      // The 44px target is stated rather than inferred from the
                      // glyph: a 14px font size does not guarantee a 14px advance,
                      // and this app draws six display faces. 14 of content plus
                      // 15 either side is 44 with `content-box`, and the negative
                      // margin keeps it from shifting the title's baseline.
                      boxSizing: "content-box",
                      width: 14,
                      height: 14,
                      padding: 15,
                      margin: -15,
                      fontSize: 14,
                      lineHeight: 1,
                      cursor: "pointer",
                      textShadow: COVER_INK_SHADOW,
                    }}
                  >
                    ✎
                  </button>
                </span>
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
        {/* The bar and its figure on one row, the figure to the bar's right: the
            count is what the bar is a picture of, and stacking them made the
            reader carry a number down to the thing it describes. */}
        <div className="flex w-full items-center" style={{ gap: 10 }}>
          <div
            className="min-w-0 flex-1"
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
          <div
            // The marker the deck-header probe reads the over-99 inks off. It used to
            // find this group as the bar track's previous sibling; the two share a row
            // now, so a positional lookup returned null and the check went quiet.
            data-spine-count
            className="flex flex-none items-baseline" style={{ gap: 4 }}>
            <span
              className="font-mono font-semibold"
              style={{ fontSize: 14, color: over ? overInk : "var(--fg)" }}
            >
              {built}
            </span>
            {/* Marked for the deck-header probe: the one ink here that is not
                the state's own, and 98 on a pair deck. */}
            <span
              data-spine-denominator
              className="font-mono"
              style={{ fontSize: 14, color: "var(--fg-faint)" }}
            >
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
        className="flex flex-wrap justify-center"
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
        {offerFirstCommit && <FirstCommitOffer deckId={deck.id} />}
      </div>
    </header>
  );
}
