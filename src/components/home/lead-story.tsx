"use client";
// Home's lead story (menu and Home handoff, direction B; property table `menu-home-home.md` § Lead story): the first
// UNSEEN item by the lead priority, drawn big at the top of the main column. The card at card shape, tilted -4deg, the
// friend's face on its corner when a friend is the news, its art crop blurred behind the band. It is never repeated in
// the list below (`splitLead`), and once seen it drops back into it.
//
// A spare request that leads while its ask is still answerable (`item.ask`; spare requests PR 3d, board `Friend-Side`)
// carries Yes and No and the days left on the story, the same answer as Waiting on you's row (`spare-answer.tsx`); an
// answer turns the story into that row's receipt for the visit. The action revalidates `/friends`, and any revalidation
// in an action re-renders the page it was pressed from, so Home's lead moves on (the answered ask has left the feed)
// as the action lands. `LeadSlot` therefore HOLDS the story from the press: the same item, so the same instance, keeps
// its receipt for the visit; a failed answer lets it go again. A server lead the held story displaces is drawn by What's
// new as one of its rows (`held-lead.tsx`), so it is never marked seen without being drawn.

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
import { AnswerPresses, receiptText, useLandFocus, useSpareAnswer, useSpareToast, type Answer, type SpareToast } from "../social/spare-answer";
import { useHeldLead } from "./held-lead";

type Face = Pick<ProfileCommander, "artCropUri"> | null;

/** Home's lead, held once its ask is pressed (see the head): the server's lead until then. */
export function LeadSlot({ lead, now, face }: { lead: FeedView | null; now: string; face?: Face }) {
  const [held, setHeld] = useState<{ item: FeedView; face: Face } | null>(null);
  // Published to What's new (`held-lead.tsx`), which draws a server lead this slot displaces as one of its rows.
  const publish = useHeldLead();
  // The failure toast lives here, not in the story: a failed answer releases the hold, and the story that showed it may
  // then be replaced or gone (the server's lead moved on while the answer was out).
  const toast = useSpareToast();
  const shown = held ?? (lead ? { item: lead, face: face ?? null } : null);
  if (!shown) return toast.node;
  const hold = (on: boolean) => {
    setHeld(on ? shown : null);
    publish?.setKey(on ? shown.item.key : null);
  };
  return (
    <>
      <LeadStory key={shown.item.key} item={shown.item} now={now} face={shown.face} onHold={hold} toast={toast} />
      {toast.node}
    </>
  );
}

export function LeadStory({
  item,
  now,
  face,
  className = "",
  onHold,
  toast: shared,
}: {
  item: FeedView;
  now: string;
  face?: Face;
  className?: string;
  /** Called true as an answer is pressed and false when it fails, so the slot keeps this story through the redraw. */
  onHold?: (on: boolean) => void;
  /** A toast owned by the slot, which outlives this story; without one the story keeps its own. */
  toast?: SpareToast;
}) {
  const feed = feedText(item);
  const ask = item.ask ?? null;
  const [answered, setAnswered] = useState<Answer | null>(null);
  const root = useRef<HTMLElement | null>(null);
  const land = useLandFocus(root);
  const { busy, answer, toast } = useSpareAnswer(shared);
  const friend = item.friend?.displayName ?? "";
  const cardName = item.card?.name ?? "";
  const receipt = ask && answered ? receiptText(answered, shortName(cardName), friend) : null;
  const text = receipt
    ? { title: receipt.title, line: receipt.detail, press: null }
    : ask
      ? { title: feed.title, line: spareCopy.request.incomingDetail(ask.spare, friend, ask.copies, ask.deckName), press: null }
      : feed;
  async function press(a: Answer, from: Element) {
    if (!ask || busy) return;
    onHold?.(true);
    if (!(await answer(ask.id, a))) {
      onHold?.(false);
      return;
    }
    setAnswered(a);
    land('[data-testid="spare-receipt-status"]', from);
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
          <span className="min-w-0">{receipt ? receipt.kind : feedCopy.home.kicker[item.kind]}</span>
          <small className="ml-auto flex-none whitespace-nowrap text-[10.5px] tracking-normal text-[color:var(--fg-muted)] normal-case">{receipt ? refreshCopy.home.elapsed.justNow : feedAge(item.at, now)}</small>
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
              onAnswer={(a, from) => void press(a, from)} size="lead" />
          </div>
        )}
      </div>
      {!shared && toast}
    </section>
  );
}
