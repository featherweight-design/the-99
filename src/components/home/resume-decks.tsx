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
import { ART_STRIPES, cssUrl } from "../../lib/collection/browse";
import { refreshCopy } from "../../lib/copy/refresh";
import { MATURE_DECK_SIZE } from "../../lib/decks/availability";
import type { DeckListItem } from "../../lib/decks/read";
import type { ShoppingRollup } from "../../lib/decks/shopping-rollup";
import { StatusPillBadge } from "../decks/status-pill";

export const RESUME_COUNT = 2;

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
 * The unowned clause's figure, or null for no clause.
 *
 * The roll-up and only the roll-up. It excludes basics, as every Shopping
 * surface does; `deck.toBuyCount` is `built − ownedCount` and does not, so the
 * two are different definitions of "unowned" and falling back from one to the
 * other would put a count on this row that covers different cards from the one
 * the deck tile prints for the same deck. A deck with no entry draws the count
 * alone — the `87 / 99` beside it already says how far along it is.
 */
function unownedCopies(shopping: ShoppingRollup, deckId: string): number | null {
  const copies = shopping.byDeck.get(deckId)?.copies ?? 0;
  return copies > 0 ? copies : null;
}

function ResumeRow({ deck, copies }: { deck: DeckListItem; copies: number | null }) {
  const count = `${deck.built} / ${MATURE_DECK_SIZE}`;
  return (
    <Link
      href={`/decks/${deck.id}`}
      // The whole row is the target — no per-row button, because a button would
      // be a second way to do the one thing the row already does.
      className="flex min-w-0 flex-1 items-center gap-[11px] rounded-[12px] border border-[color:var(--border)] bg-[color:var(--surface-inset)] px-[12px] py-[10px]"
    >
      {/* §ResumeRow — art spine. The stripes are the fallback for a commander
          whose printing carries no image, the same one the tile and the hero
          use; a second placeholder would be a second answer. */}
      <span
        className="h-[42px] w-[30px] flex-none rounded-[5px]"
        aria-hidden
        style={{
          background: deck.commanderImageUri
            ? `${cssUrl(deck.commanderImageUri)} center/cover`
            : ART_STRIPES,
        }}
      />

      <span className="flex min-w-0 flex-auto flex-col gap-[4px]">
        {/* The DECK name, not the commander's. The frame prints the commander
            in both rows only because a new deck is named after its commander by
            default; a renamed deck must show the name its owner gave it, as the
            rail and the deck tile both already do. */}
        <span className="truncate font-display text-[14.5px] font-semibold text-[color:var(--fg)]">
          {deck.name}
        </span>

        <span className="flex items-center gap-[8px]">
          <StatusPillBadge
            status={deck.statusPill}
            // §ResumeRow — status pill: shorter and tighter than the tile's, and
            // in flow rather than pinned to art. Only the geometry moves; the
            // fill and the label stay where they are written once.
            className="flex h-[19px] flex-none items-center rounded-[5px] px-[7px] font-mono text-[10px]"
          />
          <span className="truncate font-mono text-[10.5px] text-[color:var(--fg-faint)]">
            {copies === null
              ? count
              : `${count} · ${refreshCopy.decks.detailUnowned(copies)}`}
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
          <ResumeRow key={deck.id} deck={deck} copies={unownedCopies(shopping, deck.id)} />
        ))}
      </div>
    </section>
  );
}
