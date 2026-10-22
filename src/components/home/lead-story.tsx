"use client";
// Home's lead story (menu and Home handoff, direction B; property table `menu-home-home.md` § Lead story): the first
// UNSEEN item by the lead priority, drawn big at the top of the main column. The card at card shape, tilted -4deg, the
// friend's face on its corner when a friend is the news, its art crop blurred behind the band. It is never repeated in
// the list below (`splitLead`), and once seen it drops back into it.
//
// A spare request that leads while its ask is still answerable (`item.ask`; spare requests PR 3d, board `Friend-Side`)
// carries Yes and No and the days left on the story, the same answer as Waiting on you's row (`spare-answer.tsx`); an
// answer turns the story into that row's receipt for the visit. The action revalidates `/friends`, never Home.

import { useRef, useState } from "react";
import type { FeedView } from "../../lib/feed/home";
import { spareCopy } from "../../lib/copy/social";
import { shortName } from "../../lib/cards/short-name";
import { refreshCopy } from "../../lib/copy/refresh";
import { feedCopy } from "../../lib/copy/feed";
import type { ProfileCommander } from "../../lib/social/commander";
import { FeedPress, feedText } from "../feed/feed-item";
import { feedAge } from "../../lib/feed/age";
import { Face } from "../social/face";
import { ArtLayer } from "../ui/art-layer";
import { CommanderThumb } from "../ui/commander-thumb";
import { AnswerPresses, receiptText, useLandFocus, useSpareAnswer, type Answer } from "../social/spare-answer";

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
  const feed = feedText(item);
  const ask = item.ask ?? null;
  const [answered, setAnswered] = useState<Answer | null>(null);
  const root = useRef<HTMLElement | null>(null);
  const land = useLandFocus(root);
  const { busy, answer, toast } = useSpareAnswer();
  const friend = item.friend?.displayName ?? "";
  const cardName = item.card?.name ?? "";
  const receipt = ask && answered ? receiptText(answered, shortName(cardName), friend) : null;
  const text = receipt
    ? { title: receipt.title, line: receipt.detail, press: null }
    : ask
      ? { title: feed.title, line: spareCopy.request.incomingDetail(ask.spare, friend, ask.copies, ask.deckName), press: null }
      : feed;
  async function press(a: Answer) {
    if (!ask || !(await answer(ask.id, a))) return;
    setAnswered(a);
    land('[data-testid="spare-receipt-status"]');
  }
  const art = item.card?.art ?? null;
  const image = item.card?.image ?? null;
  return (
    <section
      ref={root}
      data-lead-story={item.kind}
      data-answered={answered ?? undefined}
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
          <CommanderThumb imageUri={image} colorIdentity={item.card?.colorIdentity ?? null} size="lead" />
        </span>
        <span className="hidden rounded-[6px] shadow-[0_10px_24px_rgba(0,0,0,.6)] md:block">
          <CommanderThumb imageUri={image} colorIdentity={item.card?.colorIdentity ?? null} size="leadWide" />
        </span>
        {item.friend && (
          <span data-lead-face className="absolute right-[-10px] bottom-[-8px] h-[36px] w-[36px] rotate-4 overflow-hidden rounded-[10px] [border:2px_solid_var(--surface-rail)]">
            <Face name={item.friend.displayName} commander={face ?? null} size={36} className="h-full! w-full! rounded-none!" />
          </span>
        )}
      </div>
      <div data-testid={receipt ? "spare-receipt-status" : undefined} tabIndex={receipt ? -1 : undefined} className="relative flex min-w-0 flex-1 flex-col gap-[6px]">
        <p className={`m-0 flex items-center gap-[8px] font-mono text-[10px] font-medium tracking-[.14em] uppercase ${answered === "yes" ? "text-[color:var(--success)]" : answered === "no" ? "text-[color:var(--fg-muted)]" : "text-[color:var(--accent-text)]"}`}>
          {receipt ? receipt.kind : feedCopy.home.kicker[item.kind]}
          <small className="ml-auto text-[10.5px] tracking-normal text-[color:var(--fg-muted)] normal-case">{receipt ? refreshCopy.home.elapsed.justNow : feedAge(item.at, now)}</small>
        </p>
        <h3 id="home-lead-title" className="m-0 font-display [overflow-wrap:anywhere] text-[18px] leading-[1.25] font-bold text-[color:var(--fg)] md:text-[22px]">
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
        {ask && !receipt && (
          <div className="mt-[6px] min-w-0">
            <AnswerPresses friend={friend} card={cardName} daysLeft={ask.daysLeft} busy={busy?.answer ?? null} locked={busy !== null}
              onAnswer={(a) => void press(a)} size="lead" />
          </div>
        )}
      </div>
      {toast}
    </section>
  );
}
