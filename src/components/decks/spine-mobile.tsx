// The deck details header below 768px — property table §C.
//
// Everything in the band sits on the wash, so every string here carries the
// cover band's deeper ink shadow — the exact inverse of the desktop band's
// flat-ground rule. The one string below the divider is on flat ground and
// carries none.
"use client";

import { useRef, useState } from "react";
import { GhostButton } from "@/components/ui/button";
import { CardDetailTrigger } from "../cards/card-detail-provider";
import { ChangeCommanderDoor } from "./change-commander-door";
import { ArtWash, COVER_INK_SHADOW } from "../ui/art-wash";
import { DeckIntentLine } from "./deck-intent-line";
import { deckHeaderCopy } from "../../lib/copy/decks-builder";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { overCopy, overWord, renameCopy } from "../../lib/copy/decks-builder";
import { deckBodySize } from "../../lib/decks/deck-size";
import { IdentityPips } from "../commanders/commander-art";
import { commanderDisplayName } from "../../lib/cards/printed-name";
import { colorLabel, deckIdentity } from "../../lib/decks/format";
import { STATUS_TOKEN, statusBarStyle } from "../../lib/decks/status-style";
import { FirstCommitOffer } from "./first-commit-offer";
import { type SpineBandProps, TRUNCATES } from "./spine-desktop";
import { StatusPillBadge } from "./status-pill";
import { SpineBracketChip } from "./bracket-chip";
import { HeaderNoticeTag } from "./notice-tag";
import { verdictHead } from "../../lib/bracket/verdict-head";

/**
 * F18's yield on the phone header: below this row width a range beside a notice draws its marks
 * alone. MEASURED by `probe:notices-sheet` from the widest forms the code produces (`Unresolved`,
 * `Exhibition or Core`, `● 99 notices`), never derived.
 */
const F18_FACED = "@max-[344px]:hidden";
const F18_MARKS = "hidden @max-[344px]:contents";
import { useDeckHeaderEdit } from "./use-deck-header-edit";
import { deckDescriptionCopy } from "../../lib/copy/deck-description";
import { countCharacters } from "../../lib/copy/deck-tuning";
import { ProxyTag } from "./proxy-tag";
import { proxyCopy } from "../../lib/copy/proxies";
import { shortName } from "../../lib/cards/short-name";

/** The rename glyph's drawn size. Named because the measurement below has to
    keep the glyph inside the block, and the heading reserves the same figure. */
const GLYPH = 14;

export function SpineMobile({
  deck,
  counts,
  status,
  onExport,
  offerFirstCommit,
  bracket = null,
  onOpenBracket,
  notice = null,
  onOpenNotices,
}: SpineBandProps) {
  const [renaming, setRenaming] = useState(false);
  // No measurement, and no clamp. `-webkit-line-clamp` requires
  // `display: -webkit-box`, which is an ATOMIC inline box: its width is the
  // whole available width once its text wraps, so anything following it in flow
  // lands at that box's right edge rather than after its last word. Measuring
  // the last line with a Range does not rescue it either — `getClientRects`
  // reports lines the clamp hides, and the `…` the clamp draws is generated
  // content that no Range can see, so a glyph placed after the measured text
  // sits on top of it.
  //
  // So the title is not clamped. The heading is `display: inline`, which is
  // NON-atomic: its text wraps as ordinary inline content and the glyph after it
  // continues on the heading's last line, at any line count, with no JavaScript
  // and no fallback state. The cost is the block's height, which is why the ramp
  // is keyed to a three-line title rather than a two-line one.
  const { commander, partner } = deck;
  const { built } = counts;
  const bodySize = deckBodySize(partner !== null);
  const over = built > bodySize;
  const toCut = built - bodySize;
  // R6 ruling 3: one state, one colour. Past 99 the status is `Over`, so every
  // ink the state adds reads the same token `statusBarStyle` gives the bar
  // rather than a second alarm colour of its own.
  const overInk = `var(${STATUS_TOKEN[status]})`;
  const rename = useDeckHeaderEdit(deck.id, deck.name, deck.intent ?? null, () => setRenaming(false));
  const descriptionFieldRef = useRef<HTMLTextAreaElement>(null);

  // §C8/§C10 — one row, drawn in the band at rest and below the divider while
  // editing, where the field needs the band's whole width. Its ink differs with
  // its ground, which is the only reason the two call sites take an argument.
  const identity = deckIdentity(commander.colorIdentity, partner?.colorIdentity ?? null);

  // THE CHIPS ROW (Analysis tab handoff §1): the status pill, then the bracket chip, under the
  // commander line, in the order desktop draws. It WRAPS: the chip takes a second line before it
  // squeezes anything.
  // F18 (deck notices readiness): once the notice joins the row, a RANGE yields its name before the
  // row wraps, as the tile's does. The row is its own container, so the twin shown is decided by the
  // width the row actually has.
  const yieldsFace = Boolean(bracket && notice && verdictHead(bracket.permits, bracket.answered).split);
  const chipsRow = (
    // `w-full`, because a container's inline size ignores its content: under a parent that sizes it
    // by content the row would collapse to 0px while its chips still draw.
    <div data-spine-chips className="@container flex w-full flex-wrap items-center" style={{ gap: 8 }}>
      <StatusPillBadge
        status={status}
        // `h-[22px]`, the settled chip height, rather than vertical padding over
        // an inherited line box: that made this pill 23px and the block 91, one
        // pixel past the ramp keyed to it.
        className="flex h-[22px] flex-none items-center rounded-[6px] px-[7px] font-mono text-[10px]"
      />
      {yieldsFace ? (
        <>
          <span className={`contents ${F18_FACED}`}>
            <SpineBracketChip bracket={bracket} onOpen={onOpenBracket} />
          </span>
          <span className={`contents ${F18_MARKS}`}>
            <SpineBracketChip bracket={bracket} onOpen={onOpenBracket} face={false} />
          </span>
        </>
      ) : (
        <SpineBracketChip bracket={bracket} onOpen={onOpenBracket} />
      )}
      {notice && onOpenNotices ? <HeaderNoticeTag notice={notice} onOpen={onOpenNotices} /> : null}
    </div>
  );

  const metaRow = (onWash: boolean) => (
    // `flex-nowrap`, and it is load-bearing. `labelAtPx` counts this row as ONE
    // line, and at 390px a pair's two names plus five 10px pips exceed the
    // caption's width — so a wrapping row would grow the block past the figure
    // the ramp is keyed to (143, with the chips row below) and leave the
    // title's first line on a ramp still climbing. The names group already
    // ellipsises under pressure, and it is the half that should give.
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
      {/* The pips lead the names — the same adjacency desktop draws. They cost 62px
          at five colours against this row's 314px, which is about eleven characters
          of the commander's name, and the name ellipsises either way on a two-faced
          pair. The colour stays worded beside them: the deck tile's ruling dropped
          pips in favour of the word because a grid cell cannot afford both, and a
          page header can. The status pill and the bracket chip left this row for
          the chips row under it (Analysis tab handoff §1). */}
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
            <span style={TRUNCATES}>{commanderDisplayName(commander)}</span>
            {/* The pair names its owner, here as on desktop: two flags on one
                caption row make a bare glyph ambiguous. */}
            {commander.proxied ? (
              <ProxyTag variant="band" pairName={shortName(commanderDisplayName(commander))} />
            ) : null}
            <span style={{ flex: "none" }}>+</span>
            {/* The partner's printing opens from the word that names it. The
                padding reaches a 44px target and the equal negative margin
                takes it back out of the flex row, so nothing moves; it is
                weighted upward because the row sits 12px off the band's
                clipped bottom edge. */}
            <CardDetailTrigger
              oracleId={partner.oracleId}
              name={commanderDisplayName(partner)}
              title={commanderDisplayName(partner)}
              ariaLabel={deckImportCopy.commander.partnerCardAria(commanderDisplayName(partner))}
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
                {commanderDisplayName(partner)}
              </span>
            </CardDetailTrigger>
            {partner.proxied ? <ProxyTag variant="band" pairName={shortName(commanderDisplayName(partner))} /> : null}
          </>
        ) : (
          <>
            {/* Two spans, not one truncating string. The pips take 62px of this
                314px line at five colours, and a single `truncate` across both
                halves ellipsised the COLOUR away — the half that never needs to,
                since it is three or four characters. The name gives instead,
                which is the same ordered shrink the pair row above uses. */}
            <span style={TRUNCATES}>{commanderDisplayName(commander)}</span>
            {commander.proxied ? <ProxyTag variant="band" /> : null}
            <span style={{ flex: "none", whiteSpace: "nowrap" }}>
              &nbsp;· {colorLabel(commander.colorIdentity)}
            </span>
          </>
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
          // The block's MEASURED height in pixels from the foot, at a THREE-line
          // title: 12 bottom inset, a 22px meta row — the settled chip height —
          // a 6px gap and three 25px title lines at 20/1.25 gives 115.
          //
          // Three, not two, because the title is no longer clamped: clamping
          // needs `-webkit-box`, an atomic inline box whose width is the whole
          // available width once its text wraps, which is what put the rename
          // glyph at the far right of a two-line name. An unclamped inline
          // heading lets the glyph follow the words at any line count, and the
          // price is keying this figure to the taller block. It is a ceiling, so
          // a one- or two-line title simply holds its ramp higher than it needs
          // — more art, never less protection.
          // Plus the chips row since the Analysis tab handoff (§1) moved the status pill and the
          // bracket chip onto a line of their own: another 6px gap and a 22px row, so 143.
          // Plus the deck's intent line when it has one (placement addendum r3, E2b): a 6px gap
          // and up to four 18.75px lines at 12.5/1.5. A 120-character line wraps to three at
          // 390, and the seeded chip and `edit` riding its last line can push a fourth. So 224,
          // a ceiling again: a one-line intent holds the ramp higher than it needs.
          labelAtPx={deck.intent ? 224 : 143}
          artCropUri={commander.artCropUri}
          colorIdentity={commander.colorIdentity}
        />
        {/* §G — with no crop there is no printing to open; the door then draws its ⇄ half
            alone, or nothing with the switch off. */}
        <ChangeCommanderDoor oracleId={commander.oracleId} width="mobile" hasCrop={Boolean(commander.artCropUri)} />

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
            <div className="flex w-full flex-col" style={{ gap: 8 }} onBlur={rename.onPairBlur}>
              <input
                autoFocus
                value={rename.name}
                onChange={(e) => rename.setName(e.target.value)}
                onKeyDown={(e) => rename.onNameKeyDown(e, descriptionFieldRef.current)}
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
              <textarea
                ref={descriptionFieldRef}
                value={rename.description}
                onChange={(e) => {
                  if (countCharacters(e.target.value) <= deckDescriptionCopy.description.maxLength) {
                    rename.setDescription(e.target.value);
                  }
                }}
                onKeyDown={rename.onDescriptionKeyDown}
                readOnly={rename.isPending}
                rows={2}
                placeholder={deckDescriptionCopy.description.placeholderPhone}
                aria-label={deckDescriptionCopy.description.fieldAria}
                className="w-full resize-none rounded-[8px] border border-dashed border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] text-left font-sans focus-visible:outline-none"
                style={{
                  boxSizing: "border-box",
                  padding: "8px 12px",
                  fontSize: 13.5,
                  lineHeight: 1.45,
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
            </div>
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
                  // `display: inline`, and NOT clamped — which is the mechanism.
                  // A clamp needs `-webkit-box`, an ATOMIC inline box whose width
                  // is the whole available width once its text wraps, so the glyph
                  // after it lands at that box's right edge rather than after its
                  // last word. A plain inline heading wraps as ordinary text and
                  // the glyph continues on its last line at any line count.
                  //
                  // The ramp's figure is keyed to three lines as a ceiling. A name
                  // long enough to take a fourth holds its ramp below its own
                  // block, and the browser probe's block-versus-hold check fails
                  // by name if one ever appears — reported rather than hidden.
                  className="m-0 min-w-0 font-display font-[700]"
                  style={{
                    // `inline`, and NON-atomic — which is the whole mechanism.
                    // Its text wraps as ordinary inline content, so the glyph
                    // after it continues on the heading's last line however many
                    // lines that is. An atomic box (`-webkit-box`,
                    // `inline-block`, a flex item) takes the full available
                    // width when it wraps and puts the glyph at the far right.
                    display: "inline",
                    // An unbroken name cannot be held by `min-w-0` on an inline
                    // element, so it would run past the block rather than wrap.
                    // `anywhere` breaks it mid-word instead — the one case where
                    // a broken word beats content outside the viewport, which is
                    // the bug this branch also fixes.
                    overflowWrap: "anywhere",
                    fontSize: 20,
                    lineHeight: 1.25,
                    textAlign: "left",
                    color: "var(--fg)",
                    textShadow: COVER_INK_SHADOW,
                  }}
                >
                  {/* `data-deck-title` marks the deck's name for anything that
                      needs it apart from the heading's own layout — the browser
                      probe compares it to the rename control's accessible name. */}
                  {/* The marker is the deck's name alone — the glyph is outside
                      this heading, so neither the heading's text content nor its
                      accessible name carries it. No clamp lives here or on the
                      heading: the title wraps freely, which is what lets the
                      glyph follow its last line. */}
                  <span data-deck-title>{deck.name}</span>
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
                {/* In flow, straight after the heading, so it shares the
                    heading's last line — `\u00a0` first so a line break never
                    falls between the name and its control. */}
                {"\u00a0"}
                <span
                  className="relative z-[1] inline-flex"
                  style={{ width: GLYPH, verticalAlign: "baseline" }}
                >
                  <button
                    type="button"
                    onClick={() => setRenaming(true)}
                    aria-label={deckDescriptionCopy.description.pencilAria(deck.name)}
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
              {/* SECOND in the order (placement addendum r3, E2b), on the art like the name. */}
              <DeckIntentLine intent={deck.intent ?? null} width="phone" />
              {metaRow(true)}
              {chipsRow}
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
        {renaming ? (
          <>
            {metaRow(false)}
            {chipsRow}
          </>
        ) : null}
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
{/* The same line the desktop head draws, on the surface where the pill
            is just as capable of reading `Complete` over printed cards. A
            feature that appears at one width only is the defect the acceptance
            walk exists to catch. */}
        {(counts.proxiedCount ?? 0) > 0 && (
          <p
            className="font-mono text-center m-0"
            style={{ fontSize: 11.5, lineHeight: 1.5, marginTop: 6, color: "var(--fg-muted)" }}
          >
            {proxyCopy.deckHeader.line(counts.proxiedCount ?? 0)}
          </p>
        )}
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
            className="flex min-h-[44px] items-center gap-[5px] rounded-[7px] border border-[color:var(--border-strong)] bg-transparent px-[9px] py-[6px] font-mono text-[11px] text-[color:var(--accent)]"
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
            {deckHeaderCopy.export}
          </button>
        )}
        {offerFirstCommit && <FirstCommitOffer deckId={deck.id} />}
      </div>
    </header>
  );
}
