import type { NoticeSummary } from "../../lib/notices/summary-sql";
import { deckNoticesCopy } from "../../lib/copy/notices";

/**
 * The deck's notice on its /decks tile (the tile marker addendum, #953, amending HANDOFF §1 and §1a
 * for the tile alone): ONE 18px `!` mark in the tag's old slot, after the bracket chip, or after the
 * status pill with no chip. The header keeps the full tag and the Notices sheet.
 *
 * Ink (Hugh, H7): `--danger` while any legality entry stands, read or unread (H8: the tile draws no
 * read look; the header keeps it), and `--fact` for unread data. Both kinds together are one red
 * mark, never two. A 1px hairline of the ink at 70% on the H5 tint, mixed INTO the tile's ground so
 * its contrast is one opaque colour `status-style.test.ts` can measure (3:1, a graphic: F23).
 *
 * Presentation: aria-hidden, since the tile link's name carries `noticeSpoken`.
 */
export function NoticeMark({
  notice,
  ground = "--surface-inset",
}: {
  notice: NonNullable<NoticeSummary>;
  /** The token the tint mixes into: the tile's ground, or `--bg` for the key's sample on the page. */
  ground?: "--surface-inset" | "--bg";
}) {
  const ink = notice.kind === "unread" ? "--fact" : "--danger";
  return (
    <span
      data-notice-mark={notice.kind === "unread" ? "unread" : "notLegal"}
      aria-hidden="true"
      className="inline-flex size-[18px] flex-none items-center justify-center rounded-full font-mono text-[12px] font-semibold leading-none"
      style={{
        border: `1px solid color-mix(in oklab, var(${ink}) 70%, transparent)`,
        background: `color-mix(in oklab, var(${ink}) 14%, var(${ground}))`,
        color: `var(${ink})`,
      }}
    >
      !
    </span>
  );
}

/** The mark's desktop tooltip: one sentence, naming both counts when both kinds stand (F20). */
export function noticeSentence(notice: NonNullable<NoticeSummary>): string {
  const t = deckNoticesCopy.mark.tooltip;
  if (notice.kind === "unread") return t.unread(notice.count);
  return notice.dataUnread > 0 ? t.both(notice.count, notice.dataUnread) : t.notLegal(notice.count);
}

/** The sentence the tile's link says for its notice, or null for none. Both parts when both stand. */
export function noticeSpoken(notice: NoticeSummary): string | null {
  if (!notice) return null;
  if (notice.kind === "unread") return deckNoticesCopy.tag.spoken.unread(notice.count);
  const legal = deckNoticesCopy.tag.spoken.notLegal(notice.count);
  return notice.dataUnread > 0 ? `${legal}, ${deckNoticesCopy.tag.spoken.unread(notice.dataUnread)}` : legal;
}

/** The header's notice, which also draws READ data (quiet), unlike the tile. */
export type HeaderNotice = { kind: "unread" | "read" | "notLegalUnread" | "notLegalRead"; count: number };

/** The header's notice from the deck's full read, or null for none. Legality wins, as on the tile. */
export function headerNotice(n: {
  dataCount: number;
  dataUnread: number;
  violationCount: number;
  violationsUnread: boolean;
}): HeaderNotice | null {
  if (n.violationCount > 0) return { kind: n.violationsUnread ? "notLegalUnread" : "notLegalRead", count: n.violationCount };
  if (n.dataCount > 0) return { kind: n.dataUnread > 0 ? "unread" : "read", count: n.dataCount };
  return null;
}

/**
 * The deck header's tag (HANDOFF §1): the full face, a button that opens Notices, with a 44px hit
 * area by the bracket chip's `after:` inset method. Read data is QUIET: no dot, `--fg-locked` on a
 * `--border` hairline. Legality reads as on the tile, `--fg` words with the red on the hairline, the
 * dot and the tint (H5), and loses only its dot once read.
 */
export function HeaderNoticeTag({ notice, onOpen }: { notice: HeaderNotice; onOpen: () => void }) {
  const legal = notice.kind === "notLegalUnread" || notice.kind === "notLegalRead";
  const dot = notice.kind === "unread" || notice.kind === "notLegalUnread";
  const quiet = notice.kind === "read";
  const ink = legal ? "--danger" : "--fact";
  const aria = legal
    ? deckNoticesCopy.tag.aria.notLegal(notice.count)
    : quiet
      ? deckNoticesCopy.tag.aria.read(notice.count)
      : deckNoticesCopy.tag.aria.unread(notice.count);
  return (
    <button
      type="button"
      data-notice-tag={notice.kind}
      aria-label={aria}
      onClick={onOpen}
      // Classes rather than an inline style: on a button, an inline colour outranks every hover
      // utility (the repo's lint rule). The three inks are fixed, so each is a literal class.
      className={`relative inline-flex h-[22px] flex-none items-center whitespace-nowrap rounded-[6px] border font-mono text-[10px] after:absolute after:inset-x-0 after:-inset-y-[11px] after:content-[''] md:h-[24px] md:text-[11px] md:after:-inset-y-[10px] ${
        dot ? "gap-[6px] pr-[8px] pl-[7px] md:pr-[9px] md:pl-[8px]" : "px-[8px] md:px-[9px]"
      } ${
        // On the phone the chips row sits on the art band, so every face takes an opaque ground
        // there (P39): `--bg` for the data faces, and the legal tint mixed INTO `--bg` rather than
        // over the art, where its contrast would be whatever the art is.
        quiet
          ? "border-[color:var(--border)] bg-[color:var(--bg)] text-[color:var(--fg-locked)] md:bg-transparent"
          : legal
            ? "border-[color:color-mix(in_oklab,var(--danger)_70%,transparent)] bg-[color:color-mix(in_oklab,var(--danger)_14%,var(--bg))] text-[color:var(--fg)]"
            : "border-[color:color-mix(in_oklab,var(--fact)_55%,transparent)] bg-[color:var(--bg)] text-[color:var(--fact)] md:bg-transparent"
      }`}
    >
      {dot && <span data-notice-dot className="size-[6px] flex-none rounded-full" style={{ background: `var(${ink})` }} />}
      {legal ? deckNoticesCopy.tag.notLegal : deckNoticesCopy.tag.count(notice.count)}
    </button>
  );
}
