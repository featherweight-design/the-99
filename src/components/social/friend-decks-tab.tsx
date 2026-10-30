// A friend's Decks tab (menu and Home PR 7; handoff G4; friend decks handoff call 6). With `SOCIAL_FRIENDS_ENABLED` on for
// the reader, each tile is the owner's /decks tile read-only: the same art band and identity block (`DeckTileArt`), no ⋯,
// no status, the card count alone, and the whole tile a press to the deck's own page when the owner's read carried its
// id. Off, the tab is as it shipped: view-only tiles with the status and the count, and no press.

import Link from "next/link";
import type { CSSProperties } from "react";
import type { FriendDeck, OpenFriendDeck, ShippedFriendDeck } from "../../lib/social/decks";
import { PersonText, type ThirdPartyName } from "../../lib/person-name";
import { socialCopy } from "../../lib/copy/social";
import { commanderRepeats } from "../../lib/decks/commander-repeats";
import { colorLabel } from "../../lib/decks/format";
import { statusPillStyle } from "../../lib/decks/status-style";
import { StatusPillBadge } from "../decks/status-pill";
import { DeckTileArt } from "../decks/deck-tile-art";
import { PendingReporter } from "../shell/pending-reporter";
import type { StatusPill } from "../../lib/decks/status";

const p = socialCopy.friendPage;
const PILL_IN_FLOW = "inline-flex h-[19px] items-center self-start rounded-[5px] px-[7px] font-mono text-[10px]";

export function FriendDecksTab({ name, decks, publicId, open = false }: {
  name: ThirdPartyName;
  decks: FriendDeck[];
  /** The friend's public id, for each tile's press. */
  publicId?: string;
  /**
   * `SOCIAL_FRIENDS_ENABLED` for the reader. With decks drawn the READ decides: its tiles are the open kind only while the
   * owner's switch is on too, so a mixed pair draws the tab as it shipped rather than tiles that promise a press. With
   * none, this alone picks the empty body.
   */
  open?: boolean;
}) {
  if (decks.length === 0) {
    return (
      <div className="mt-[16px] flex flex-col gap-[6px] rounded-[12px] px-[20px] py-[22px] [border:1px_dashed_var(--border-dashed)] md:mt-[18px] md:px-[32px] md:py-[30px]">
        <p className="m-0 font-display text-[18px] font-bold text-[color:var(--fg)] [overflow-wrap:anywhere] md:text-[19px]"><PersonText text={p.decks.emptyTitle(name)} /></p>
        <p className="m-0 max-w-[600px] text-[14px] leading-[1.6] text-[color:var(--fg-muted)] [overflow-wrap:anywhere]"><PersonText text={open ? p.decks.emptyBodyOpen(name) : p.decks.emptyBody(name)} /></p>
      </div>
    );
  }
  const opened = decks.filter((d): d is OpenFriendDeck => d.id !== null);
  if (opened.length === decks.length) {
    return (
      <>
        <p className="m-0 mt-[12px] font-mono text-[11px] text-[color:var(--fg-faint)]">{p.decks.lineOpen}</p>
        <ul className="m-0 mt-[12px] grid list-none grid-cols-1 gap-[12px] p-0 md:grid-cols-3 md:gap-[14px]">
          {opened.map((d, i) => (
            <li key={d.id} data-testid="friend-deck" className="sm:h-full">
              <FriendDeckTile deck={d} href={publicId ? `/friends/${publicId}/decks/${d.id}` : null} deferArt={i >= 4} />
            </li>
          ))}
        </ul>
      </>
    );
  }
  return (
    <>
      <p className="m-0 mt-[12px] font-mono text-[11px] text-[color:var(--fg-faint)]"><PersonText text={p.decks.line(name)} /></p>
      <ul className="m-0 mt-[12px] grid list-none grid-cols-1 gap-[12px] p-0 md:grid-cols-4 md:gap-[16px]">
        {decks.filter((d): d is ShippedFriendDeck => d.id === null).map((d, i) => {
          const fill = Math.min(100, Math.round((d.built / d.bodySize) * 100));
          const pill = friendPillStyle(d.status);
          const color = pill.color as string;
          return (
            <li key={i} data-testid="friend-deck" className="overflow-hidden rounded-[12px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-inset)]">
              <div className="relative h-[120px]" style={{ background: "var(--surface-sunken)" }}>
                {d.artCropUri && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.artCropUri} alt="" loading={i < 4 ? "eager" : "lazy"} className="block h-full w-full object-cover" />
                )}
                <span aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 40%, color-mix(in oklab, var(--bg) 90%, transparent))" }} />
                <b className="absolute bottom-[8px] left-[12px] right-[12px] z-[2] truncate font-display text-[14px] font-bold text-[color:var(--fg)]">{d.name}</b>
              </div>
              <div className="flex flex-col gap-[8px] px-[12px] pb-[12px] pt-[10px]">
                <span className="truncate font-mono text-[10.5px] text-[color:var(--fg-body)]">
                  {d.commanderName}
                  {d.partnerName ? ` + ${d.partnerName}` : ""}
                </span>
                <StatusPillBadge status={d.status} className={PILL_IN_FLOW} style={pill} />
                <span className="flex items-center gap-[10px]">
                  <span className="h-[3px] flex-1 overflow-hidden rounded-[2px] bg-[color:var(--border-strong)]">
                    <i className="block h-full" style={{ width: `${fill}%`, background: color }} />
                  </span>
                  <small className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{p.decks.figure(d.built, d.bodySize, d.status === "To buy" ? d.toBuy : 0)}</small>
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/**
 * One friend's deck as the owner's /decks tile draws it, read-only: the same shell and `DeckTileArt` band (no art crop
 * draws the commander gradient there, never the full card image: G5), the card count alone below, and the whole tile a
 * press to the deck's page. The identity block is presentation; the press names the same things in order.
 */
function FriendDeckTile({ deck, href, deferArt }: { deck: OpenFriendDeck; href: string | null; deferArt: boolean }) {
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
        <Link href={href} className="absolute inset-0 rounded-[14px] focus-visible:outline-offset-[-2px]" aria-label={label}>
          <PendingReporter href={href} />
        </Link>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </article>
  );
}

/**
 * The board's pill on a friend's deck tile (`Friends` 1e), on this surface only, for the three statuses the board
 * draws (Complete, To buy, Building): no hairline edge, and Building in
 * `--fg-body` on its own 18% plate. Every other value is the app's own (`statusPillStyle`), which already draws what
 * the board draws (Complete in `--success`, To buy in `--accent`, each on its 18% plate); the app-wide pills are
 * unchanged (d9, 2026-10-22).
 */
const BOARD_DRAWN: ReadonlySet<StatusPill> = new Set(["Complete", "To buy", "Building"]);

export function friendPillStyle(status: StatusPill): CSSProperties {
  const base = statusPillStyle(status);
  const building = status === "Building"
    ? { color: "var(--fg-body)", background: "color-mix(in srgb, var(--fg-body) 18%, var(--bg))" }
    : {};
  // Only the statuses the board draws lose the edge: Over's red and Draft's dashed edge carry their status in it.
  return BOARD_DRAWN.has(status) ? { ...base, ...building, border: "none" } : base;
}
