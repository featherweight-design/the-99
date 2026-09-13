// "Pick up where you left off" — the two decks you touched last, desktop only.
//
// Property table: docs/superpowers/design-tables/ui-refresh-home.md
// §ResumeRows. The phone frame draws no such section, so the whole thing sits
// behind `hidden sm:block`: the rail's rows carry the same status and count, and
// the ordering is the only thing phone gives up.
//
// The ordering lives in `resumeDecks` rather than in the component so it can be
// tested without a DOM, and so Home slices once and hands this section and the
// rail (Task 17) their own lists.
//
// Placement inside the two-column §HomeBody belongs to the layout task; this
// draws the section and nothing around it.

import Link from "next/link";
import { shortCommanderName } from "../../lib/copy/decks-builder";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { refreshCopy } from "../../lib/copy/refresh";
import { deckBodySize } from "../../lib/decks/deck-size";
import type { DeckListItem } from "../../lib/decks/read";
import type { ShoppingRollup } from "../../lib/decks/shopping-rollup";
import { TRUNCATES } from "../decks/spine-desktop";
import { StatusPillBadge } from "../decks/status-pill";
import { ArtWash, COVER_INK_SHADOW } from "../ui/art-wash";

export const RESUME_COUNT = 2;

const partnerCopy = deckImportCopy.commander;

/**
 * Most recently played first, then most recently created.
 *
 * *Left off* is not *made*: a deck played last week outranks a deck created this
 * morning, so a played deck beats an unplayed one whatever the timestamps say,
 * and only within a group does the newer one win. Ties break on `id` so two
 * renders of the same list agree.
 *
 * The copy over `[...decks]` is load-bearing — the caller's array is the same
 * one the rail renders in `listDecksWithStats`'s order, and sorting in place
 * would silently reorder the rail beside this section.
 */
export function resumeDecks(decks: readonly DeckListItem[]): DeckListItem[] {
  return [...decks]
    .sort((a, b) => {
      const at = a.lastPlayedAt?.getTime() ?? null;
      const bt = b.lastPlayedAt?.getTime() ?? null;
      if (at !== null && bt === null) return -1;
      if (at === null && bt !== null) return 1;
      const diff =
        at !== null && bt !== null ? bt - at : b.createdAt.getTime() - a.createdAt.getTime();
      return diff !== 0 ? diff : a.id.localeCompare(b.id);
    })
    .slice(0, RESUME_COUNT);
}

/**
 * The copies clause's figure, or null for no clause.
 *
 * The roll-up and only the roll-up. It excludes basics, as every Shopping
 * surface does, and knows about seniority; `deck.toBuyCount` is
 * `built − ownedCount` and does neither, so the two are different definitions of
 * "to buy" and falling back from one to the other would put a count on this row
 * that covers different cards from the one the deck tile prints for the same
 * deck. A deck with no entry draws the count alone — the `87 / 99` beside it
 * already says how far along it is.
 */
function toBuyCopies(shopping: ShoppingRollup, deckId: string): number | null {
  const copies = shopping.byDeck.get(deckId)?.copies ?? 0;
  return copies > 0 ? copies : null;
}

function ResumeRow({ deck, copies }: { deck: DeckListItem; copies: number | null }) {
  const { partnerName } = deck;
  const count = `${deck.built} / ${deckBodySize(partnerName !== null)}`;
  // Decision 23. The long form leaves negative room for a name at all — 62px of
  // pill, 28px of gaps and a 113px count against the 200px this line gets — so
  // something has to not render, and it is never a partly truncated figure:
  // `86 / 9…` reads as a different number in a way `Bruse Ta…` does not. A pair
  // row therefore drops the clause outright. One boolean, no measurement, and
  // not a new state — a deck with no roll-up entry already draws the count
  // alone. The figure survives in the row's accessible name.
  const clause = copies !== null && partnerName === null;
  return (
    <Link
      href={`/decks/${deck.id}`}
      // The whole row is the target — no per-row button, because a button would
      // be a second way to do the one thing the row already does.
      // The height is stated, not a floor: the wash inside it is a hard 168px, so
      // a row allowed to grow past that would show an unwashed strip.
      // A4, and it is the round's largest single reversal: this row was a 72px
      // band with a 99px portrait beside it, and it is a 168px `cover` band with
      // the text on the wash. The whole exception goes with it — the 72 band's
      // `.95/.22` figures, its `--surface-inset` ground, the 116px type inset and
      // decision 3's stated no-shadow exemption were all one arrangement, and
      // they were justified by nothing reading on the art. Every string on this
      // row now stands on the wash, so every string takes `COVER_INK_SHADOW`.
      //
      // The rule that chose it is the box's own aspect rather than a viewport:
      // two-up at 380–520px and 168px tall this row is 2.3–3.1:1, which is
      // `cover` by the 3:1 threshold, and the home redesign reshaping the section
      // to three or four items makes each one narrower still.
      className="relative flex h-[168px] min-w-0 flex-1 items-end overflow-hidden rounded-[12px] border border-[color:var(--border)]"
    >
      <ArtWash
        strategy="cover"
        height={168}
        // The block's MEASURED height: 12px bottom inset, a 19px pill row, a 4px
        // gap and a 14.5px name at 1.2 for 18 — 53. NOT the handoff's 40, which
        // describes a block one row shorter than the one that ships; a ramp keyed
        // to 40 holds 13px below this block's top and leaves the deck name on a
        // rising scrim. Cutting the commander's name shortened the row's content,
        // not its block: the pill row it sat in is still there.
        labelAtPx={53}
        artCropUri={deck.commanderArtCropUri}
        colorIdentity={deck.commanderColorIdentity}
      />

      <span
        data-resume-text
        data-wash-label
        className="relative flex min-w-0 flex-auto flex-col gap-[4px] px-[13px] pb-[12px]"
      >
        {/* The DECK name, not the commander's. The frame prints the commander
            in both rows only because a new deck is named after its commander by
            default; a renamed deck must show the name its owner gave it, as the
            rail and the deck tile both already do. */}
        <span
          className="truncate font-display text-[14.5px] font-semibold text-[color:var(--fg)]"
          style={{ lineHeight: 1.2, textShadow: COVER_INK_SHADOW }}
        >
          {deck.name}
        </span>

        {/* A4 deletes decision 3's no-shadow exemption for this row, and it
            deletes it for EVERY string: the exemption existed because the type
            started at a 116px inset clear of the portrait, and a `cover` band
            puts all of it on the wash. The shadow sits on the row rather than on
            each child so the pair line and the count carry it too — the status
            pill is opaque and needs none, and inherits nothing it can show. */}
        <span
          className="flex min-w-0 items-center gap-[14px]"
          style={{ textShadow: COVER_INK_SHADOW }}
        >
          <StatusPillBadge
            status={deck.statusPill}
            // §ResumeRow — status pill: shorter and tighter than the tile's, and
            // in flow rather than pinned to art. Only the geometry moves; the
            // fill and the label stay where they are written once.
            className="flex h-[19px] flex-none items-center rounded-[5px] px-[7px] font-mono text-[10px]"
          />
          {/* The commander names the portrait beside it. It takes the row's
              shadow like everything else in the block now: the 116px inset that
              earned decision 9's no-shadow exception went with the portrait, and
              this row's ink stands on a cover wash from edge to edge.

              Decision 19 — a pair prints SHORT names, the substring before the
              first comma: `Ishai + Bruse Tarl` is 18 characters against 55 for
              the full pair, and the row has no room for the second. Shortening
              is pair-only, because the pair is what disambiguates two names the
              way the title disambiguates one, so no single-commander row
              changes a word.

              Two spans with the joiner leading the shrinking one, so the `+` is
              never the character truncation eats: the worst case is
              `Ishai + Br…`, which still says *pair*. Both commanders are named
              in full, primary first, in the row's accessible name below —
              truncation is a layout compromise, never an information one. */}
          {/* The commander's name is CUT on a single-commander row: the band
              below it is 168px of that commander's art, so the name repeats what
              the picture says. It is kept on a pair row, and the reason is the
              same one — a pair's band shows ONE of two commanders, so the art
              cannot say it there. The row's accessible name carries both in full
              either way. */}
          {partnerName === null ? (
            // Cut from the drawing, NOT from the accessible name. The band that
            // makes the visible name redundant is `aria-hidden` art, so dropping
            // the string outright would take the commander out of this row's
            // accessible name altogether — the one thing a picture cannot say to
            // a screen reader. Same device the pair row below already uses.
            //
            // Only where there IS art. The cut is earned by the picture saying
            // the same thing, and a deck whose commander has no crop draws the
            // identity gradient instead — which says nothing — so hiding the
            // name there would leave a sighted reader with no way to tell which
            // deck this is.
            deck.commanderArtCropUri === null ? (
              <span
                className="min-w-0 flex-1 truncate font-mono text-[10.5px] text-[color:var(--fg-body)]"
                style={{ textShadow: COVER_INK_SHADOW }}
              >
                {deck.commanderName}
              </span>
            ) : (
              <span className="sr-only">{deck.commanderName}</span>
            )
          ) : (
            <>
              <span
                aria-hidden
                className="flex min-w-0 flex-1 gap-[4px] overflow-hidden font-mono text-[10.5px] text-[color:var(--fg-body)]"
              >
                <span style={TRUNCATES}>{shortCommanderName(deck.commanderName)}</span>
                <span style={{ ...TRUNCATES, flexShrink: 1000 }}>
                  {`+ ${shortCommanderName(partnerName)}`}
                </span>
              </span>
              {/* The one thing the pixels are allowed to drop and this is not:
                  both names in full, primary first, and the clause the pair row
                  does not draw. It stands in for the shortened names above
                  rather than following them, so the row is not read twice. */}
              <span className="sr-only">
                {copies === null
                  ? partnerCopy.pairAria(deck.commanderName, partnerName)
                  : `${partnerCopy.pairAria(deck.commanderName, partnerName)} · ${partnerCopy.pairRowBuyAria(copies)}`}
              </span>
            </>
          )}
          {/* Decision 19 inverts what this line used to do. The count was the
              shrinking child and collapsed to zero width before the name lost a
              character — right for one name, wrong now that the denominator
              carries the pair's other signal. It is pinned; the names above are
              the only thing that gives. */}
          {/* The figure and its clause are two children of one group rather than
              one string, so that the clause, and never the figure, is what a
              narrow row eats into: `86 / 9…` reads as a different number in a
              way `3 car…` does not. That is also the latent bug this fixes — the
              two shared a span that truncated to `86 / 98 · 3 t…`.

              The name beside them takes its width from a zero basis and the
              figure cannot shrink at all, so on a single row the clause is the
              only child with anything left to give.

              The group deliberately does NOT carry `min-w-0`: its automatic
              minimum is its min-content width, which is the figure's — the
              clause waives its own with `min-w-0`. So the group shrinks exactly
              as far as the clause has left to give and then stops, which is what
              pins the figure. With `min-w-0` here the group keeps going and the
              unshrinkable figure inside is clipped by the row instead, printing
              the `86 / 9` this whole arrangement exists to prevent. */}
          <span className="flex gap-[4px] font-mono text-[10.5px] text-[color:var(--fg-faint)]">
            <span className="flex-none whitespace-nowrap">{count}</span>
            {clause && (
              <span className="min-w-0 truncate">
                {`· ${refreshCopy.decks.detailCopies(copies!)}`}
              </span>
            )}
          </span>
        </span>
      </span>
    </Link>
  );
}

export function ResumeDecks({
  decks,
  shopping,
}: {
  decks: DeckListItem[];
  shopping: ShoppingRollup;
}) {
  // A heading over nothing is worse than silence.
  if (decks.length === 0) return null;

  return (
    <section className="hidden sm:flex sm:flex-col sm:gap-[11px]">
      {/* §SectionLabel, with this instance's own `margin-top: 6`. */}
      <h2 className="m-0 mt-[6px] flex-none font-mono text-[10px] font-normal tracking-[0.14em] text-[color:var(--fg-faint)] uppercase">
        {refreshCopy.home.resumeHeading}
      </h2>

      <div className="flex gap-[12px]">
        {decks.map((deck) => (
          <ResumeRow key={deck.id} deck={deck} copies={toBuyCopies(shopping, deck.id)} />
        ))}
      </div>
    </section>
  );
}
