// A friend's Decks tab (menu and Home PR 7; handoff G4; friend decks handoff call 6). Each tile is the owner's /decks
// tile read-only: the same art band and identity block (`DeckTileArt`), no ⋯, no status, the card count alone, and the
// whole tile a press to the deck's own page.

import Link from "next/link";
import type { FriendDeck } from "../../lib/social/decks";
import { PersonText, personAttrs, type ThirdPartyName } from "../../lib/person-name";
import { socialCopy } from "../../lib/copy/social";
import { commanderRepeats } from "../../lib/decks/commander-repeats";
import { colorLabel } from "../../lib/decks/format";
import { DeckTileArt } from "../decks/deck-tile-art";
import { PendingReporter } from "../shell/pending-reporter";

const p = socialCopy.friendPage;

export function FriendDecksTab({ name, decks, publicId }: {
  name: ThirdPartyName;
  decks: FriendDeck[];
  /** The friend's public id, for each tile's press. */
  publicId?: string;
}) {
  if (decks.length === 0) {
    return (
      <div className="mt-[16px] flex flex-col gap-[6px] rounded-[12px] px-[20px] py-[22px] [border:1px_dashed_var(--border-dashed)] md:mt-[18px] md:px-[32px] md:py-[30px]">
        <p className="m-0 font-display text-[18px] font-bold text-[color:var(--fg)] [overflow-wrap:anywhere] md:text-[19px]"><PersonText text={p.decks.emptyTitle(name)} /></p>
        <p className="m-0 max-w-[600px] text-[14px] leading-[1.6] text-[color:var(--fg-muted)] [overflow-wrap:anywhere]"><PersonText text={p.decks.emptyBody(name)} /></p>
      </div>
    );
  }
  return (
    <>
      <p className="m-0 mt-[12px] font-mono text-[11px] text-[color:var(--fg-faint)]">{p.decks.line}</p>
      <ul className="m-0 mt-[12px] grid list-none grid-cols-1 gap-[12px] p-0 md:grid-cols-3 md:gap-[14px]">
        {decks.map((d, i) => (
          <li key={d.id} data-testid="friend-deck" className="sm:h-full">
            <FriendDeckTile deck={d} href={publicId ? `/friends/${publicId}/decks/${d.id}` : null} deferArt={i >= 4} />
          </li>
        ))}
      </ul>
    </>
  );
}

/**
 * One friend's deck as the owner's /decks tile draws it, read-only: the same shell and `DeckTileArt` band (no art crop
 * draws the commander gradient there, never the full card image: G5), the card count alone below, and the whole tile a
 * press to the deck's page. The identity block is presentation; the press names the same things in order.
 */
function FriendDeckTile({ deck, href, deferArt }: { deck: FriendDeck; href: string | null; deferArt: boolean }) {
  const colour = colorLabel(deck.colorIdentity);
  const hidden = commanderRepeats(deck.name, deck.commanderName, deck.partnerName);
  const commanderLine = deck.partnerName ? `${deck.commanderName} + ${deck.partnerName}` : deck.commanderName;
  const cards = socialCopy.friendDeck.cards(deck.built);
  const label = p.decks.tileAria(deck.name, hidden ? null : commanderLine, colour, cards);
  return (
    <article
      className="art-lift-host @container relative flex min-w-0 flex-col overflow-hidden rounded-[14px] sm:h-full"
      style={{ background: "var(--surface-inset)", border: "1px solid var(--border)" }}
    >
      <DeckTileArt
        artCropUri={deck.artCropUri}
        colorIdentity={deck.colorIdentity}
        name={deck.name}
        commanderName={deck.commanderName}
        partnerName={deck.partnerName}
        colour={colour}
        commanderHidden={hidden}
        deferArt={deferArt}
      />
      <div
        aria-hidden="true"
        data-friend-deck-count
        className="flex flex-1 items-center px-[13px] pt-[10px] pb-[12px] font-mono text-[11px] text-[color:var(--fg-muted)]"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        {cards}
      </div>
      {/* The band and the count are presentation: the press names them, and with no press a line a screen reader reads
          does. The ring is drawn inside the tile, whose `overflow-hidden` would clip the app's outset one. */}
      {href ? (
        <Link href={href} {...personAttrs({ "aria-label": label }, "absolute inset-0 rounded-[14px] focus-visible:outline-offset-[-2px]")}>
          <PendingReporter href={href} />
        </Link>
      ) : (
        <span className="sr-only"><PersonText text={label} /></span>
      )}
    </article>
  );
}
