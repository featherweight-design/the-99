"use client";
// Home's lead story (menu and Home handoff, direction B; property table `menu-home-home.md` § Lead story): the first
// UNSEEN item by the lead priority, drawn big at the top of the main column. The card at card shape, tilted -4deg, the
// friend's face on its corner when a friend is the news, its art crop blurred behind the band. It is never repeated in
// the list below (`splitLead`), and once seen it drops back into it.

import type { FeedView } from "../../lib/feed/home";
import { feedCopy } from "../../lib/copy/feed";
import type { ProfileCommander } from "../../lib/social/commander";
import { FeedPress, feedAge, feedText } from "../feed/feed-item";
import { Face } from "../social/face";
import { ArtLayer } from "../ui/art-layer";
import { CommanderThumb } from "../ui/commander-thumb";

export function LeadStory({
  item,
  now,
  face,
  className = "",
}: {
  item: FeedView;
  now: string;
  face?: Pick<ProfileCommander, "artCropUri"> | null;
  className?: string;
}) {
  const text = feedText(item);
  const art = item.card?.art ?? null;
  const image = item.card?.image ?? null;
  return (
    <section
      data-lead-story={item.kind}
      data-feed-lead
      aria-labelledby="home-lead-title"
      className={`relative flex gap-[16px] overflow-hidden rounded-[14px] [border:1px_solid_var(--accent)] bg-[color:var(--surface-rail)] p-[16px_16px_16px_14px] md:items-center md:gap-[28px] md:p-[20px_24px_20px_26px] ${className}`}
    >
      {art && (
        <div aria-hidden data-lead-blur className="pointer-events-none absolute inset-[-40px] opacity-[.28] [filter:blur(34px)_saturate(1.25)]">
          <ArtLayer src={art} />
        </div>
      )}
      <div aria-hidden className="relative m-[6px_2px_0_4px] h-[134px] w-[96px] flex-none -rotate-4 md:m-0 md:h-[168px] md:w-[120px]">
        <span className="block rounded-[5px] shadow-[0_10px_24px_rgba(0,0,0,.6)] md:hidden">
          <CommanderThumb imageUri={image} colorIdentity={null} size="lead" />
        </span>
        <span className="hidden rounded-[6px] shadow-[0_10px_24px_rgba(0,0,0,.6)] md:block">
          <CommanderThumb imageUri={image} colorIdentity={null} size="leadWide" />
        </span>
        {item.friend && (
          <span data-lead-face className="absolute right-[-10px] bottom-[-8px] h-[36px] w-[36px] rotate-4 overflow-hidden rounded-[10px] [border:2px_solid_var(--surface-rail)]">
            <Face name={item.friend.displayName} commander={face ?? null} size={36} className="h-full! w-full! rounded-none!" />
          </span>
        )}
      </div>
      <div className="relative flex min-w-0 flex-1 flex-col gap-[6px]">
        <p className="m-0 flex items-center gap-[8px] font-mono text-[10px] font-medium tracking-[.14em] text-[color:var(--accent-text)] uppercase">
          {feedCopy.home.kicker[item.kind]}
          <small className="ml-auto text-[10.5px] tracking-normal text-[color:var(--fg-muted)] normal-case">{feedAge(item.at, now)}</small>
        </p>
        <h3 id="home-lead-title" className="m-0 font-display text-[18px] leading-[1.25] font-bold text-[color:var(--fg)] md:text-[22px]">
          {text.title}
        </h3>
        {text.line && <p className="m-0 text-[13px] leading-[1.5] text-[color:var(--fg-body)] md:max-w-[640px] md:text-[13.5px]">{text.line}</p>}
        {text.press && (
          <div className="mt-[6px] flex min-w-0 flex-wrap gap-[8px]">
            <FeedPress
              item={item}
              label={text.press}
              stretch=""
              className="inline-flex min-h-[40px] max-w-full min-w-0 items-center justify-center rounded-[8px] bg-[color:var(--accent)] px-[16px] py-[6px] text-center font-sans text-[13.5px] font-semibold [overflow-wrap:anywhere] text-[color:var(--bg)] md:min-h-[36px] md:text-[13px]"
            />
          </div>
        )}
      </div>
    </section>
  );
}
