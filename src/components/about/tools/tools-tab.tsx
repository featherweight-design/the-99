// About's Tools tab (discovery R2·5; README-r2 C2 and R2b's Written for you; boards `ShowcaseDesk` and
// `ShowcasePhone`). Unmounted until R2·6b swaps `/about`: no route renders it, and its tests render it directly.
//
// One DOM at every width. From `md` the groups are grids (three columns of 354 at 1280); below it each group is one
// sideways row of 300-wide cards with the next one peeking, and its head counts the cards instead of naming the group.

import Link from "next/link";
import { PendingReporter } from "../../shell/pending-reporter";
import { aboutShapeCopy, showcaseCopy, writtenForYouCopy } from "../../../lib/copy/discovery";
import { shotFor, toolShotId } from "../../../lib/about/shots";
import type { ShowcaseGroup, WrittenRow } from "../../../lib/discovery/showcase";
import { entryHref, ToolCard } from "./tool-card";

const GROUP_HEAD = "m-0 font-display text-[19px] font-semibold text-[color:var(--fg)] md:text-[21px]";
const SUB = "font-mono text-[12px] text-[color:var(--fg-faint)]";

function Group({ group, theme }: { group: ShowcaseGroup; theme: string | undefined }) {
  const { label, sub } = showcaseCopy.groups[group.group];
  return (
    <section aria-label={label} data-tool-group={group.group} className="mt-[30px] md:mt-[40px]">
      <div className="mb-[12px] flex items-baseline justify-between gap-[10px] px-[16px] md:mb-[16px] md:justify-start md:gap-[12px] md:px-0">
        <h2 className={GROUP_HEAD}>{label}</h2>
        <span className={`${SUB} hidden md:inline`}>{sub}</span>
        <span className={`${SUB} md:hidden`}>{showcaseCopy.swipe(group.cards.length)}</span>
      </div>
      <ul
        role="list"
        className="m-0 flex list-none snap-x snap-mandatory scroll-px-[16px] gap-[12px] overflow-x-auto px-[16px] pb-[4px] md:grid md:snap-none md:grid-cols-2 md:gap-[22px] md:overflow-visible md:px-0 md:pb-0 xl:grid-cols-3"
      >
        {group.cards.map((card) => (
          <li key={card.id} className="w-[300px] flex-none snap-start md:w-auto">
            <ToolCard card={card} shot={shotFor(theme, toolShotId(card.id))} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function WrittenForYou({ rows, free, allowance }: { rows: readonly WrittenRow[]; free: string; allowance: string }) {
  const chip =
    "self-baseline justify-self-end whitespace-nowrap rounded-full border border-[color:var(--accent-dim)] px-[9px] py-[2px] font-mono text-[11px] text-[color:var(--accent)] [grid-area:chip] md:self-center";
  return (
    <section aria-label={writtenForYouCopy.title} data-written-for-you className="mx-[16px] mt-[30px] md:mx-0 md:mt-[40px]">
      <div className="mb-[12px] flex items-baseline justify-between gap-[10px] md:mb-[16px] md:justify-start md:gap-[12px]">
        <h2 className={GROUP_HEAD}>{writtenForYouCopy.title}</h2>
        <span className={SUB}>{writtenForYouCopy.sub}</span>
      </div>
      <div className="flex flex-col rounded-[14px] border border-[color:var(--accent-dim)] bg-[color:var(--surface)] px-[16px] pb-[4px] pt-[16px] md:px-[24px] md:pb-[8px] md:pt-[20px]">
        <p className="m-0 mb-[12px] text-[14px] leading-[1.55] text-[color:var(--fg-body)] md:mb-[14px] md:text-[14.5px]">
          {writtenForYouCopy.intro(allowance)}
        </p>
        <ul role="list" className="m-0 list-none p-0">
          {rows.map((r) => (
            <li
              key={r.id}
              data-written-row={r.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-[10px] gap-y-[4px] border-t border-t-[color:var(--border)] py-[12px] [grid-template-areas:'name_chip'_'what_what'_'where_where'] md:min-h-[52px] md:grid-cols-[300px_minmax(0,1fr)_170px] md:items-center md:gap-x-[18px] md:gap-y-[2px] md:py-0 md:[grid-template-areas:'name_what_chip'_'where_what_chip']"
            >
              <span className="text-[14.5px] font-semibold text-[color:var(--fg)] [grid-area:name] md:self-end md:text-[15px]">{r.name}</span>
              <span className="font-mono text-[11px] text-[color:var(--fg-faint)] [grid-area:where] md:self-start">{r.where}</span>
              <span className="text-[13.5px] leading-[1.5] text-[color:var(--fg-body)] [grid-area:what] md:text-[14px]">{r.what}</span>
              <span className={chip}>
                <span aria-hidden className="md:hidden">{r.short}</span>
                <span className="sr-only md:not-sr-only">{r.cost}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-x-[20px] gap-y-[8px] border-t border-t-[color:var(--border)] pt-[12px]">
          <span className="text-[13.5px] text-[color:var(--fg-muted)]">{free}</span>
          <Link
            href={entryHref("credits")}
            className="py-[10px] font-mono text-[12.5px] text-[color:var(--accent)] hover:underline"
          >
            {writtenForYouCopy.how}
            <PendingReporter href={entryHref("credits")} />
          </Link>
        </div>
      </div>
    </section>
  );
}

export type ToolsTabProps = {
  groups: readonly ShowcaseGroup[];
  /** Null when no spender is visible to this reader. */
  written: { rows: readonly WrittenRow[]; free: string } | null;
  /** The reader's own daily allowance, spelled as the credits entry spells it. */
  allowance: string;
  /** The theme cookie's value: each picture is the reader's theme's capture, else the default's. */
  theme: string | undefined;
};

export function ToolsTab({ groups, written, allowance, theme }: ToolsTabProps) {
  return (
    <div data-about-tools>
      {groups.map((g) => (
        <Group key={g.group} group={g} theme={theme} />
      ))}
      {written && <WrittenForYou rows={written.rows} free={written.free} allowance={allowance} />}
      <div className="mx-[16px] mt-[34px] flex flex-col items-start gap-[4px] border-t border-t-[color:var(--border)] pt-[18px] md:mx-0 md:mt-[48px] md:flex-row md:items-center md:justify-between md:gap-[20px] md:pt-[22px]">
        <span className="text-[14px] text-[color:var(--fg-muted)]">{aboutShapeCopy.toReference}</span>
        <Link
          href="/about?tab=reference"
          className="py-[10px] text-[14.5px] font-semibold text-[color:var(--accent)] hover:underline"
        >
          {aboutShapeCopy.toReferencePress}
          <PendingReporter href="/about?tab=reference" />
        </Link>
      </div>
    </div>
  );
}
