// The deck details header at ≥768px — property table §B.
//
// The commander's art is the band now, washed as a 288px `left-portrait` at one
// of two portrait widths, and every string sits past whichever flat stop is
// drawn — a 592px inset past the 560px portrait's 584, or 364 past the 340px
// portrait's 356. On flat ground either way, so nothing here carries a shadow.
"use client";

import { useRef, useState } from "react";
import { GhostButton, PrimaryButton } from "@/components/ui/button";
import { CardDetailTrigger } from "../cards/card-detail-provider";
import { useCommanderSiblings } from "./deck-siblings";
import { IdentityPips } from "../commanders/commander-art";
import { ChangeCommanderDoor } from "./change-commander-door";
import { ArtWash } from "../ui/art-wash";
import { DeckCardOverflow, type DeckMove } from "./deck-card-overflow";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { overCopy, overWord, renameCopy } from "../../lib/copy/decks-builder";
import { tuningHubShortcutsCopy } from "../../lib/copy/tuning-hub-shortcuts";
import { deckHeaderCopy } from "../../lib/copy/decks-builder";
import { deckBodySize } from "../../lib/decks/deck-size";
import { commanderDisplayName } from "../../lib/cards/printed-name";
import { colorLabel, deckIdentity } from "../../lib/decks/format";
import type { StatusPill } from "../../lib/decks/status";
import { STATUS_TOKEN, statusBarStyle } from "../../lib/decks/status-style";
import { FirstCommitOffer } from "./first-commit-offer";
import { StatusPillBadge } from "./status-pill";
import { SpineBracketChip } from "./bracket-chip";
import { HeaderNoticeTag, type HeaderNotice } from "./notice-tag";
import type { TileBracket } from "../../lib/decks/read";
import { useDeckHeaderEdit } from "./use-deck-header-edit";
import { CardTagList } from "../cards/card-tag-picker";
import { searchDescriptionCards } from "../cards/description-tag-search";
import { useTaggedField } from "../cards/use-tagged-field";
import { NOTES_TAGS_MAX } from "../../lib/tuning/limits";
import { useMinWidth } from "../ui/use-min-width";
import { ProxyTag } from "./proxy-tag";
import { proxyCopy } from "../../lib/copy/proxies";
import { shortName } from "../../lib/cards/short-name";
import { DeckIntentLine } from "./deck-intent-line";
import { deckDescriptionCopy } from "../../lib/copy/deck-description";

/** The slice of the deck both widths of the header read. Narrower than
    `DeckDetail` on purpose: nothing in this band knows about the decklist. */
export interface SpineBandProps {
  deck: {
    id: string;
    name: string;
    /** What this deck is for, drawn second in the header; null draws no row. Optional because
     *  the fixtures that build this literal predate it. */
    intent?: string | null;
    /** The line is the app's own words from a fill, until the player's first save. */
    intentSeeded?: boolean;
    commander: {
      oracleId: string;
      name: string;
      colorIdentity: string[];
      artCropUri: string | null;
      /** The name on the copy the player owns, where it differs from the oracle
       *  card's. Optional for the same reason `proxied` is; absent is null, and
       *  the caption falls back to the oracle name. */
      printedName?: string | null;
      /** This deck prints its copy of this commander. Optional because the
       *  fixtures that build this literal predate proxies; absent is unproxied. */
      proxied?: boolean;
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
      /** As on the primary: the name on the copy owned, or null. */
      printedName?: string | null;
      /** Per id: a pair deck can print one commander and own the other. */
      proxied?: boolean;
    } | null;
  };
  counts: {
    built: number;
    ownedCount: number;
    toBuyCount: number;
    /** Printed cards in this deck. The line under the bar, absent at zero. */
    proxiedCount?: number;
  };
  status: StatusPill;
  onExport: () => void;
  /** True on a deck with no version whose list has reached a full body — the
   *  one condition under which `Commit as v1` is offered. Computed by the shell,
   *  which owns `deckBodySize`, so neither spine reads the body count itself. */
  offerFirstCommit?: boolean;
  /**
   * The deck's bracket, drawn beside the status in the badge row (Round 0 §5), or null for a deck
   * that has not been analyzed since its last edit: an unread deck draws no chip.
   */
  bracket?: TileBracket | null;
  /** Pressing the chip lands on the Analysis tab. */
  onOpenBracket?: () => void;
  /**
   * The deck's notice (deck notices HANDOFF §1), drawn after the chip, or in the chip's slot when
   * there is none. Null draws nothing. Pressing it opens Notices.
   */
  notice?: HeaderNotice | null;
  onOpenNotices?: () => void;
  /** The trim line's `Proposed cuts →` (Tuning hub A5): opens the tool on the Analysis tab.
   *  Absent with the hub off, and then the line is exactly as before. */
  onProposedCuts?: () => void;
  /** The deck menu's Move, with the page's read of the shelves. Absent, the menu carries Delete alone. */
  move?: DeckMove;
}

// §B16's single-field box is retired: editing now draws name and description at one width,
// `max-w-[560px]`, set inline on the editor block below (H35, STATES §2).

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
  bracket = null,
  onOpenBracket,
  notice = null,
  onOpenNotices,
  onProposedCuts,
  move,
}: SpineBandProps) {
  const [renaming, setRenaming] = useState(false);
  const { commander, partner } = deck;
  // The commander's card details page on into the deck: the commanders, then the list as drawn.
  const commanderSiblings = useCommanderSiblings(
    [commander, partner].flatMap((c) => (c ? [{ oracleId: c.oracleId, name: commanderDisplayName(c), colorIdentity: c.colorIdentity }] : [])),
  );
  const { built } = counts;
  const bodySize = deckBodySize(partner !== null);
  const identity = deckIdentity(commander.colorIdentity, partner?.colorIdentity ?? null);
  const over = built > bodySize;
  const toCut = built - bodySize;
  // R6 ruling 3: one state, one colour. Past 99 the status is `Over`, so every
  // ink the state adds reads the same token `statusBarStyle` gives the bar
  // rather than a second alarm colour of its own.
  const overInk = `var(${STATUS_TOKEN[status]})`;
  const rename = useDeckHeaderEdit(deck.id, deck.name, deck.intent ?? null, () => setRenaming(false));
  const descriptionFieldRef = useRef<HTMLTextAreaElement>(null);
  // The editor's two halves sit in separate flex columns of the header row, with the partner's
  // card-details trigger between them in DOM order — so blur has to be checked against BOTH
  // halves explicitly (pre-open review round 2), not against one shared ancestor that would
  // also contain that unrelated control.
  const fieldsWrapperRef = useRef<HTMLDivElement>(null);
  const actionsWrapperRef = useRef<HTMLDivElement>(null);
  // This header renders from 768px, which includes landscape iPhones and iPads — devices iOS
  // Safari still zooms the viewport on focusing a sub-16px input. `pointer: fine` is false on
  // every touchscreen regardless of viewport width, so the description field keeps 13.5px only
  // on a mouse/trackpad desktop and falls back to 16px anywhere that protection is needed.
  const pointerFine = useMinWidth("(pointer: fine)");

  // §F, as three booleans rather than a state string: they are not exclusive in
  // the source (a save-disabled field can also be showing a previous error) and
  // the table only ever asks which of the three is true for a given property.
  const saving = rename.isPending;
  // The description takes the `[[` card tag: the hook holds the BODY, the box shows names (card-tags plan, PR 3).
  const descriptionTags = useTaggedField({
    value: rename.description, onChange: rename.setDescription, search: searchDescriptionCards,
    max: deckDescriptionCopy.description.maxLength, maxTags: NOTES_TAGS_MAX, field: descriptionFieldRef, disabled: saving,
  });
  const failed = rename.error !== null;
  const inert = !rename.canSave && !saving;

  const fieldBorder = saving
    ? "1px solid var(--border-strong)"
    : failed
      ? "1px solid var(--danger)"
      : "1px solid var(--accent)";

  // STATES §2, state 3: "No hint line" — the keyboard hint shown by the retired single-field
  // editor is gone. State 4 keeps the refusal message, same as the mobile editor's.
  const hint = failed ? rename.error : null;

  return (
    <header
      // The marker a browser probe reads to tell this band from every other one
      // that draws the same control: this is the single placement allowed to keep
      // the control's words, and the check that enforces that everywhere else
      // needs to know which band it is looking at.
      data-deck-spine-desktop
      // `@container`, because the switch below is about the ROW's width and not
      // the viewport's: this header is the flex sibling of a 62px desktop rail, so
      // a 1200px viewport is a ~1138px row and a viewport query would have picked
      // the wide portrait for a row that cannot hold it. The container is
      // declared here because this element IS the row.
      className="group @container relative hidden md:block"
      // minHeight, not the table's height + overflow:hidden: an over-99 deck
      // draws a trim paragraph inside this band, and clipping it would hide
      // copy rather than art. Each wash still declares 288px itself.
      style={{ minHeight: 288, borderBottom: "1px solid var(--border)" }}
    >
      {/* TWO geometries, both mounted, one shown by a media query — the same
          arrangement `builder-spine.tsx` already uses for this component and its
          phone twin, and for the same reason: the wash's stops are inline
          gradients computed from numbers, so no stylesheet can switch them.

          The wide one is the round's only inverted geometry: its portrait's SHAPE
          was chosen first at 560 and the 288 band follows, because 288 is what
          keeps that crop from scaling past ~42%. Below ~1200px of row a 560px
          portrait crowds the title column, so the header falls back to the 340px
          portrait the deck tile's own band already ships, at a 364px inset which
          clears that portrait's 356px flat stop.

          The switch is a CONTAINER query on this header, because the handoff's
          floor is 1200px OF ROW: the header is the flex sibling of a 62px
          desktop rail, so a 1200px viewport is a ~1138px row and a viewport
          query would have chosen the wide portrait for a row that cannot hold
          it.

          `labelAtPx="flat"`: this band's ink starts past the portrait's flat stop
          and stands on the row's own ground, so a vertical ramp would darken the
          header for nothing. */}
      <div className="hidden @min-[1200px]:block">
        <ArtWash
          strategy="left-portrait"
          height={288}
          portrait={560}
          labelAtPx="flat"
          artCropUri={commander.artCropUri}
          colorIdentity={commander.colorIdentity}
        />
      </div>
      <div className="@min-[1200px]:hidden">
        <ArtWash
          strategy="left-portrait"
          height={288}
          portrait={340}
          labelAtPx="flat"
          artCropUri={commander.artCropUri}
          colorIdentity={commander.colorIdentity}
        />
      </div>
      {/* §G — with no crop there is no printing to open, so the pill is absent (the door then
          draws its ⇄ half alone, or nothing with the switch off). It is absolutely
          positioned, so its absence shifts nothing. Hidden while editing (STATES §2, state 3:
          "the corner buttons hide"). */}
      {!renaming && (
        <ChangeCommanderDoor oracleId={commander.oracleId} width="desktop" hasCrop={Boolean(commander.artCropUri)} siblings={commanderSiblings} />
      )}

      <div
        // The inset switches on the same breakpoint the portrait does: 592 clears
        // the 560px portrait's 584px flat stop, and 364 clears the 340px one's
        // 356. Ink that starts before the flat stop stands on a crop rather than
        // on the row's ground, which is what makes `flat` safe.
        // `min-h-[288px]`, not `h-full`: the header states `minHeight` rather
        // than a definite height — an over-99 deck grows a trim paragraph inside
        // it — and `h-full` against an indefinite parent resolves to `auto`, so
        // `items-center` would centre this row in its own content height and
        // leave it sitting near the band's top edge.
        // `items-end`: the drawings put both columns at the band's foot — the
        // identity block reads up from the bottom edge and the actions sit in the
        // bottom-right corner. `items-center` floated both in the middle of a
        // 288px band with the art's subject behind them.
        className="relative flex min-h-[288px] items-end pl-[364px] @min-[1200px]:pl-[592px]"
        // `paddingRight` alone: a `padding` shorthand here would set
        // `padding-left` too, and an inline declaration outranks the `pl-`
        // classes above — the inset would silently stay at 24px and the title
        // would print over the portrait.
        style={{ paddingRight: 24, paddingBottom: 18, gap: 18 }}
      >
        {/* `basis-[280px]`, not a bare `flex-1`: with a zero basis this column
            takes only what the action column leaves, and that column sizes to
            its content. Once the `Commit as v1` offer joined it the content was
            wider than the row, so this column resolved to 0px and the name, the
            commander line and the bar each measured zero — present in the DOM,
            drawn nowhere. A basis states the column's claim, so the deficit is
            taken out of the actions, which wrap, instead of out of the title,
            which cannot. `min-w-0` stays: it is what keeps the ellipsis
            reachable when the basis itself has to give. */}
        <div className="flex min-w-0 flex-1 basis-[280px] flex-col">
          <div className="flex items-center">
            {renaming ? (
              // Both fields, one width (STATES-deck-description.md §2, state 3): 560 or the
              // cover's own width, whichever this column has. One commit for the pair — blur on
              // the wrapper, never on either field alone.
              <div
                ref={fieldsWrapperRef}
                className="flex w-full max-w-[560px] flex-col gap-[6px]"
                style={{ margin: "-2px 0 -2px -11px" }}
                onBlur={(e) => rename.onPairBlur(e, actionsWrapperRef.current)}
              >
                <input
                  autoFocus
                  value={rename.name}
                  onChange={(e) => rename.setName(e.target.value)}
                  onKeyDown={(e) => rename.onNameKeyDown(e, descriptionFieldRef.current)}
                  readOnly={saving}
                  aria-label={renameCopy.fieldAria}
                  className="font-display font-[700] focus-visible:outline-none"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "var(--surface-sunken)",
                    border: fieldBorder,
                    borderRadius: 8,
                    padding: "1px 10px",
                    height: 29,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    fontSize: 21,
                    lineHeight: 1.2,
                    color: "var(--fg)",
                  }}
                />
                <div className="relative">
                  <textarea
                    ref={descriptionFieldRef}
                    value={descriptionTags.field.text}
                    {...descriptionTags.picker.fieldProps}
                    onChange={(e) => descriptionTags.picker.typed(e.target.value, e.target.selectionStart)}
                    onKeyDown={(e) => {
                      // The picker owns its keys while its list is open (Enter and Tab pick, Escape closes it); the rest is the editor's.
                      if (descriptionTags.picker.onKeyDown(e)) return;
                      rename.onDescriptionKeyDown(e);
                    }}
                    readOnly={saving}
                    rows={2}
                    placeholder={deckDescriptionCopy.description.placeholder}
                    aria-label={deckDescriptionCopy.description.fieldAria}
                    className="resize-none font-sans"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      background: "var(--surface-sunken)",
                      border: "1px dashed var(--border-strong)",
                      borderRadius: 8,
                      padding: "6px 10px",
                      fontSize: pointerFine ? 13.5 : 16,
                      lineHeight: 1.45,
                      color: "var(--fg)",
                    }}
                  />
                  {descriptionTags.picker.open && <CardTagList {...descriptionTags.picker.list} anchor={descriptionFieldRef} />}
                </div>
              </div>
            ) : (
              <>
                {/* Selectable text, not a control — §B15 makes the pencil the
                    one trigger. */}
                <h1
                  // The clamp lives on the SPAN inside, not on the heading: a
                  // clamped box needs `overflow: hidden`, and anything beside the
                  // text inside it gets clipped when the heading shrink-wraps a
                  // short name.
                  className="flex min-w-0 items-end font-display font-[700]"
                  style={{ fontSize: 21, lineHeight: 1.2, color: "var(--fg)" }}
                >
                  {/* `data-deck-title` marks the deck's name for anything that
                      needs it apart from the heading's own layout — the browser
                      probe compares it to the rename control's accessible name.
                      The clamp lives here rather than on the heading so the
                      heading can be a flex line: a clamped box clips, and the
                      glyph beside the title would be clipped with it. */}
                  <span
                    data-deck-title
                    className="min-w-0"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {deck.name}
                  </span>
                </h1>
                {/* A SIBLING of the heading, in the same row, not a child of it.
                    Inside the heading its `aria-label` joined the heading's own
                    accessible name, so heading navigation announced
                    "…Rename deck: …" and then the control announced itself again.
                    Beside the title it is still the title's control rather than a
                    corner one, which is the point of the treatment — and the box
                    and the hover reveal both stay gone: a control revealed on
                    hover has to be discovered by accident, and there is no hover
                    where the same glyph also has to work on a phone.

                    `relative z-[1]` because the 15px hit padding reaches below the
                    title line and the identity row starts 3px later: two
                    positioned elements at auto z-index are ordered by document
                    position, so that row — which carries the partner printing
                    control — won the hit test across the bottom of this target.
                    The same defect #534 fixed one control over. */}
                {/* `self-center`, because the row's own `items-center` is what
                    the glyph should follow and the `items-end` on the heading
                    aligns only the heading's own child. Centred across the title
                    row: against a two-line name a bottom-aligned glyph reads as a
                    footnote to the second line rather than as the title's
                    control. */}
                <span
                  // Centred across the title row, not bottom-aligned: against a
                  // two-line name a bottom-aligned glyph reads as a footnote to
                  // the second line.
                  // `marginLeft` rather than the row's gap, because the gap also
                  // sets the distance between the name and everything else.
                  className="relative z-[1] inline-flex flex-none self-center"
                  style={{ width: 14, marginLeft: 6 }}
                >
                  <button
                    type="button"
                    onClick={() => setRenaming(true)}
                    aria-label={deckDescriptionCopy.description.pencilAria(deck.name)}
                    className="inline-flex items-center justify-center bg-transparent text-[color:var(--fg-muted)]"
                    style={{
                      // Stated rather than inferred from the glyph: a 14px font
                      // size does not guarantee a 14px advance, and this app draws
                      // six display faces. 14 of content plus 15 either side is 44
                      // with `content-box`.
                      boxSizing: "content-box",
                      width: 14,
                      height: 14,
                      padding: 15,
                      margin: -15,
                      fontSize: 14,
                      lineHeight: 1,
                      cursor: "pointer",
                    }}
                  >
                    ✎
                  </button>
                </span>
              </>
            )}
          </div>

          {/* SECOND in the order (placement addendum r3, E2): the deck's purpose, under its name.
              Hidden while editing (pre-open review round 3): the editor already shows the
              description as its own field, and drawing the saved tagline too reads as a
              duplicate of whatever the draft has just replaced. The phone header already hides
              it the same way, by mounting it only outside the `renaming` branch. */}
          {renaming ? null : <DeckIntentLine intent={deck.intent ?? null} width="desktop" />}

          <div
            // Same marker as the phone's row, for the same probe.
            data-spine-meta
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
                row above spills the pips first; past that the partner
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
              <span style={TRUNCATES}>{commanderDisplayName(commander)}</span>
              {/* The mark, on the caption's own line. A PAIR names its owner —
                  two commanders, two independent flags and one row, so a bare
                  glyph could belong to either — and a single commander never
                  pays for that. `P×2` is banned by ruling 5, so both proxied
                  draws two named marks in name order. */}
              {commander.proxied ? (
                <ProxyTag variant="band" pairName={partner ? shortName(commanderDisplayName(commander)) : undefined} />
              ) : null}
              {partner ? (
                <>
                  <span style={{ flex: "none" }}>+</span>
                  {/* The partner's printing opens from the word that names it,
                      and the rule under it is the whole visible affordance. The
                      primary needs no equivalent — its trigger is the 230px of
                      art beside this text. */}
                  <CardDetailTrigger
                    oracleId={partner.oracleId}
                    name={commanderDisplayName(partner)}
                    siblings={commanderSiblings}
                    title={commanderDisplayName(partner)}
                    ariaLabel={deckImportCopy.commander.partnerCardAria(commanderDisplayName(partner))}
                    className="font-mono"
                    style={{
                      ...TRUNCATES,
                      flexShrink: 1000,
                      fontSize: 11,
                      color: "var(--fg-body)",
                      borderBottom: "1px solid var(--border-strong)",
                    }}
                  >
                    {commanderDisplayName(partner)}
                  </CardDetailTrigger>
                  {partner.proxied ? (
                    <ProxyTag variant="band" pairName={shortName(commanderDisplayName(partner))} />
                  ) : null}
                </>
              ) : null}
              <span style={{ flex: "none" }}>· {colorLabel(identity)}</span>
            </span>
          </div>

          {/* THE CHIPS ROW (Analysis tab handoff §1): the status pill, then the bracket chip, on a
              line of their own under the commander line, in one order at both widths. It wraps,
              so a chip that does not fit beside the pill takes a second line rather than
              squeezing the names. */}
          <div data-spine-chips className="flex flex-wrap items-center" style={{ gap: 8, marginTop: 8 }}>
            {/* Geometry only; `statusPillStyle` still owns the colour. The prop
                replaces the tile's class outright, so every box property §B8
                names has to be restated here — there is no merge. */}
            <StatusPillBadge
              status={status}
              className="flex flex-none items-center rounded-[6px] px-[8px] py-[3px] font-mono text-[11px]"
            />
            <SpineBracketChip bracket={bracket} onOpen={onOpenBracket} />
            {notice && onOpenNotices ? <HeaderNoticeTag notice={notice} onOpen={onOpenNotices} /> : null}
          </div>

          {/* The bar and its figure on ONE row, the figure to the bar's right:
              the count is what the bar is a picture of, and stacking them made
              the reader hold a number in mind while their eye travelled down to
              the thing it describes. The `x owned · y to buy` split under it is
              cut — the bar's fill and the figure carry it between them. */}
          <div className="flex items-center" style={{ gap: 10, marginTop: 9 }}>
            <div
              // A shrinking item with a 170px ceiling, not a fixed 170: at the
              // first desktop breakpoint the 364px portrait inset, the right
              // padding and the `flex-none` action slot can leave this column
              // narrower than the track, and a fixed width would push the count
              // under the actions rather than giving way.
              className="min-w-0 flex-1"
              style={{
                maxWidth: 170,
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
                style={{ fontSize: 15, color: over ? overInk : "var(--fg)" }}
              >
                {built}
              </span>
              {/* Marked for the deck-header probe: this is the one ink in the
                  row that is not the state's own, and it is 98 on a pair deck —
                  so it cannot be identified by matching `/ 99`. */}
              <span
                data-spine-denominator
                className="font-mono"
                style={{ fontSize: 13, color: "var(--fg-faint)" }}
              >
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
          </div>

{/* One mono line under the bar, absent at zero. A 99-card deck reading
              `Complete` with seven printed cards is correct AND is the moment a
              player could be misled, so the count says so plainly — no colour,
              no control, and it qualifies the pill rather than replacing it.
              NOT a roll-up band: those are alarm chrome for over-commitment, and
              a proxy is not a problem to be solved. */}
          {(counts.proxiedCount ?? 0) > 0 && (
            <p
              className="font-mono m-0"
              style={{ fontSize: 11.5, lineHeight: 1.5, marginTop: 6, color: "var(--fg-muted)" }}
            >
              {proxyCopy.deckHeader.line(counts.proxiedCount ?? 0)}
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
              {onProposedCuts ? (
                <button
                  type="button"
                  data-shortcut="proposed-cuts"
                  onClick={onProposedCuts}
                  className="ml-[10px] border-b border-b-[var(--accent-dim)] font-mono text-[11.5px] text-[var(--accent)]"
                >
                  {tuningHubShortcutsCopy.proposedCuts}
                </button>
              ) : null}
            </p>
          )}
        </div>

        {/* Shrinkable, where this was `flex-none`: the offer's row is wider than
            any row this column has held before, and a column that refuses to
            shrink resolves its neighbour to zero rather than wrapping itself.
            `shrink-[4]` against the title column's shrink of 1 decides which of
            the two gives — the actions have a second line to fall onto and the
            title does not. `min-w-0` is what lets it shrink below its content at
            all, which is the width the wrap happens at.

            While RENAMING it stays `flex-none`, which is what shipped. The
            shrink is there for one row's content — the offer's — and that row is
            replaced during a rename by §B14's Save/Cancel pair, which does not
            wrap: shrinking the column below a pair of fixed-height buttons would
            push them out of the band rather than onto a second line. The rename
            column is also the narrower of the two, so the title has room without
            it giving anything. */}
        <div className={renaming ? "flex-none" : "min-w-0 shrink-[4] grow-0 basis-auto"}>
          {renaming ? (
            // §B14 — the actions are replaced, not joined.
            <div
              ref={actionsWrapperRef}
              className="flex flex-col items-end"
              style={{ gap: 7 }}
              onBlur={(e) => rename.onPairBlur(e, fieldsWrapperRef.current)}
            >
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
                      : "bg-[color:var(--accent)] text-[color:var(--bg)] hover:bg-[color:var(--accent-hover)] transition-colors"
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
              {hint ? (
                <p
                  data-testid="spine-rename-hint"
                  role="alert"
                  className="font-mono"
                  style={{ fontSize: 10, letterSpacing: "0.08em", color: "var(--danger)" }}
                >
                  {hint}
                </p>
              ) : null}
            </div>
          ) : (
            // `flex-wrap justify-end`: with the first-commit offer present this
            // row is wider than the column can be at any desktop width the app
            // draws, so it takes a second line and stays at the band's right
            // edge rather than pushing the title column to zero.
            <div className="flex flex-wrap items-center justify-end" style={{ gap: 9 }}>
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
                  {deckHeaderCopy.export}
                </button>
              ) : (
                /* The one filled button on this surface, and bone — accent is
                   reserved for status and never fills an action. */
                <PrimaryButton
                  onClick={onExport}
                  className="flex h-[32px] items-center gap-[6px] px-[14px] text-[12.5px]"
                >
                  {deckHeaderCopy.export}
                </PrimaryButton>
              )}
              {/* The Decks tile's own ⋯, beside Export: Rename and Delete from inside the deck. A delete
                  lands on /decks, which `deleteDeck`'s redirect does. */}
              <DeckCardOverflow deckId={deck.id} deckName={deck.name} built={built} placement="header" move={move} />
              {offerFirstCommit && <FirstCommitOffer deckId={deck.id} />}
            </div>
          )}
        </div>
      </div>
      {/* Mounted regardless of `renaming` — a successful save closes the editor via `onDone`,
          and the announcement has to outlive that unmount to be heard (round 5). */}
      <span role="status" className="sr-only">{rename.announced}</span>
    </header>
  );
}
