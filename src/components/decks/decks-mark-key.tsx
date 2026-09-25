import { deckNoticesCopy } from "../../lib/copy/notices";
import type { DeckListItem } from "../../lib/decks/read";
import { MarkKey, type MarkKeyEntry } from "./mark-key";
import { NoticeMark } from "./notice-tag";

/**
 * The /decks key for the tile's notice mark (tile marker addendum §3): how a phone player, with no
 * hover, learns what a red or blue-grey `!` means. The shipped `MarkKey`, as the tile list's FIRST
 * item, at both widths. An `<li>` spanning the grid, since the tiles are a `<ul>` (F21).
 *
 * CONDITIONAL, like the row key's `buy` and `proxy`: an entry is drawn only when a tile in the
 * decks SHOWN (the current shelf and filter) draws that mark, and the line is absent when none does.
 *
 * The sample is the real mark, re-grounded: the key sits on the page, so its tint mixes into `--bg`
 * (the canvas) rather than the tile's `--surface-inset`.
 */
export function DecksMarkKey({ decks }: { decks: readonly Pick<DeckListItem, "notice">[] }) {
  const copy = deckNoticesCopy.mark.key;
  const marks: MarkKeyEntry[] = [];
  if (decks.some((d) => d.notice && d.notice.kind !== "unread")) {
    marks.push({ id: "notLegal", sample: <NoticeMark notice={{ kind: "notLegalUnread", count: 1, dataUnread: 0 }} ground="--bg" />, word: copy.notLegal });
  }
  if (decks.some((d) => d.notice?.kind === "unread")) {
    marks.push({ id: "unread", sample: <NoticeMark notice={{ kind: "unread", count: 1 }} ground="--bg" />, word: copy.unread });
  }
  if (marks.length === 0) return null;
  return (
    <li data-decks-mark-key className="col-span-full flex-none">
      <MarkKey marks={marks} regionAria={copy.regionAria} />
    </li>
  );
}
