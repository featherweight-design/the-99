import type { NoticeSummary } from "../../lib/notices/summary-sql";
import { deckNoticesCopy } from "../../lib/copy/notices";

/**
 * The deck's notice on its tile (HANDOFF §1 and §1a): one tag after the bracket chip, or after the
 * status pill when there is no chip. Condensed here: `● 3` for data, `● Not legal` for legality.
 * The more serious face wins, which the summary has already decided.
 *
 * A 1px hairline of the ink (55%, legality 70%) and the chip's height. Data inks in `--fact` and
 * draws no plate. Legality takes `--fg` TEXT with the red on its hairline, its dot and a 14% tint
 * (H5, the `Over` pill's treatment): `--danger` reads 3.85–4.21:1 on the tile's ground, under 4.5
 * for 10–11px text. A legality set the player has
 * READ keeps its tag and loses its dot (readiness F14); read data draws nothing on the tile, so the
 * summary never hands one here.
 *
 * Presentation: the tile's link carries the words (`deckNoticesCopy.tag.spoken`).
 */
export function NoticeTag({ notice }: { notice: NonNullable<NoticeSummary> }) {
  const legal = notice.kind !== "unread";
  const dot = notice.kind !== "notLegalRead";
  const ink = legal ? "--danger" : "--fact";
  return (
    <span
      data-notice-tag={notice.kind}
      className={`inline-flex h-[22px] flex-none items-center whitespace-nowrap rounded-[6px] font-mono text-[10px] md:h-[24px] md:text-[11px] ${
        legal
          ? dot ? "gap-[6px] pr-[8px] pl-[7px] md:pr-[9px] md:pl-[8px]" : "px-[8px] md:px-[9px]"
          : "gap-[5px] px-[7px]"
      }`}
      style={{
        border: `1px solid color-mix(in oklab, var(${ink}) ${legal ? "70%" : "55%"}, transparent)`,
        // Mixed INTO the tile's ground rather than over it, so the tint is one opaque colour and
        // its contrast is the one `status-style.test.ts` measures.
        background: legal ? "color-mix(in oklab, var(--danger) 14%, var(--surface-inset))" : undefined,
        color: legal ? "var(--fg)" : `var(${ink})`,
      }}
    >
      {dot && <span data-notice-dot className="size-[6px] flex-none rounded-full" style={{ background: `var(${ink})` }} />}
      {legal ? deckNoticesCopy.tag.notLegal : notice.count}
    </span>
  );
}

/** The sentence the tile's link says for its notice, or null for none. */
export function noticeSpoken(notice: NoticeSummary): string | null {
  if (!notice) return null;
  return notice.kind === "unread"
    ? deckNoticesCopy.tag.spoken.unread(notice.count)
    : deckNoticesCopy.tag.spoken.notLegal(notice.count);
}
