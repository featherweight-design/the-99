"use client";
// Home's What's new (menu and Home handoff, direction B; property table `menu-home-home.md` § What's new). Three
// states, from one read (`loadHomeFeed`):
// - kinds on, items: five rows, then "Show all N" expanding in place; Today / Earlier labels only when the shown list
//   holds both;
// - kinds on, nothing in the window: one quiet line naming the kinds that are on;
// - every kind off (the default): the inline opt-in, the news boxes and Show these (handoff call 7). Saving turns
//   them on through Settings' own action, and from then on the switches live in Settings alone.
// The lead story is not in this list (`splitLead`); the head's count is every unseen item, the badge's own figure.

import { displaceLead, useHeldLead } from "./held-lead";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveFeedKinds } from "../../app/settings/feed-actions";
import { feedCopy } from "../../lib/copy/feed";
import { nameList } from "../../lib/copy/deck-analysis";
import type { FeedView, HomeFeed } from "../../lib/feed/home";
import type { FeedKind } from "../../lib/feed/kinds";
import { FeedItemRow, type FeedFaces } from "../feed/feed-item";
import { FEED_SHOWN, ShowAllFooter, useShowAll } from "../feed/show-all";
import { useFeedDismiss } from "../feed/dismiss";
import { AnswerSheetProvider } from "./answer-sheet";
import { HOME_HEADING_ID } from "./arrivals-banner";
import { HoverPreviewProvider } from "../decks/hover-preview";
import { PendingReporter } from "../shell/pending-reporter";
import { Checkbox } from "../ui/checkbox";
import { PrimaryButton } from "../ui/button";

const c = feedCopy.home;

export { FEED_SHOWN };

const DAY_MS = 86_400_000;

/** The shown rows, split into Today (the last 24 hours) and Earlier; labels draw only when both hold rows. Pure. */
export function feedGroups(items: readonly FeedView[], now: string, expanded: boolean): { today: FeedView[]; earlier: FeedView[]; hidden: number } {
  const shown = expanded ? items : items.slice(0, FEED_SHOWN);
  const floor = new Date(now).getTime() - DAY_MS;
  return {
    today: shown.filter((i) => new Date(i.at).getTime() > floor),
    earlier: shown.filter((i) => new Date(i.at).getTime() <= floor),
    hidden: items.length - shown.length,
  };
}

const HEAD = "m-0 flex items-baseline gap-[8px] font-mono text-[10px] font-normal tracking-[.14em] text-[color:var(--fg-faint)] uppercase";
const ROWS = "m-0 list-none p-0 [&>li+li]:[border-top:1px_solid_var(--border)]";
const DAY = "m-0 px-[14px] pt-[9px] font-mono text-[9px] font-medium tracking-[.14em] text-[color:var(--fg-locked)] uppercase";

export function WhatsNew({ feed: served, now, faces, className = "" }: { feed: HomeFeed; now: string; faces?: FeedFaces; className?: string }) {
  const { expanded, root, expand } = useShowAll();
  // A lead the held spare-request receipt displaces is drawn here, among the rows (`held-lead.tsx`).
  const heldLead = useHeldLead();
  const displaced = displaceLead(served, heldLead?.key ?? null);
  // A row hidden this visit (✕) leaves the list and, while unseen, the count, before the refresh redraws both.
  // The last row's ✕ lands on the section's own head while the section stays (Copilot round 4); Home's heading only when
  // it leaves (the lead alone left standing).
  const dismissed = useFeedDismiss(() => document.getElementById("home-whats-new") ?? document.getElementById(HOME_HEADING_ID));
  // An answer opened over Home this visit (small items item 3) loses its diamond and its place in the count at once.
  const [opened, setOpened] = useState<ReadonlySet<string>>(() => new Set());
  const feed = withoutOpened(withoutHidden(displaced, dismissed.hidden, heldLead?.gone ?? null), opened);
  const chosen = feed.chosen;
  const count = chosen && feed.unseen > 0 ? feed.unseen : 0;
  // The lead alone and nothing more: the head stands over no box, since the quiet line would contradict the lead.
  if (chosen && feed.items.length === 0 && feed.lead) return dismissed.toast;

  return (
    <section aria-labelledby="home-whats-new" data-dismiss-scope data-whats-new={chosen ? (feed.items.length > 0 ? "items" : "quiet") : "opt-in"} className={`flex flex-col gap-[12px] min-[1180px]:gap-[11px] ${className}`}>
      <h2 id="home-whats-new" tabIndex={-1} className={HEAD}>
        {c.head}
        {count > 0 && <em className="tracking-[.14em] text-[color:var(--fg-locked)] not-italic lowercase">{c.newCount(count)}</em>}
        {chosen && (
          <Link href="/settings" className="ml-auto flex items-center gap-[4px] font-sans text-[12.5px] tracking-normal text-[color:var(--fg-muted)] normal-case">
            {c.choose}
            <i aria-hidden className="text-[15px] leading-none text-[color:var(--fg-faint)] not-italic">›</i>
            <PendingReporter href="/settings" />
          </Link>
        )}
      </h2>
      <div ref={root} className="flex flex-col overflow-hidden rounded-[14px] [border:1px_solid_var(--border)] bg-[color:var(--surface-inset)]">
        {!chosen ? (
          <OptIn key={feed.offer.join(",")} offer={feed.offer} alsoOn={feed.alsoOn} />
        ) : feed.items.length === 0 ? (
          <Quiet on={feed.on} />
        ) : (
          <AnswerSheetProvider now={now} onSeen={(key) => setOpened((prev) => new Set(prev).add(key))} onCleared={dismissed.dismiss}>
            <HoverPreviewProvider className="flex flex-col">
              <Rows items={feed.items} now={now} faces={faces} expanded={expanded} onExpand={expand} onDismiss={dismissed.dismiss} />
            </HoverPreviewProvider>
          </AnswerSheetProvider>
        )}
      </div>
      {dismissed.toast}
    </section>
  );
}

/** The feed with the answers opened over Home this visit drawn seen, and the unseen count less those that were unseen. */
export function withoutOpened(feed: HomeFeed, opened: ReadonlySet<string>): HomeFeed {
  if (!feed.chosen || opened.size === 0) return feed;
  const seen = feed.items.filter((i) => i.unseen && opened.has(i.key)).length;
  if (seen === 0) return feed;
  return { ...feed, items: feed.items.map((i) => (opened.has(i.key) ? { ...i, unseen: false } : i)), unseen: feed.unseen - seen };
}

/**
 * The feed less what this visit hid: its rows, and the lead when the slot's ✕ hid it (`goneLead`), the unseen count less
 * those that were unseen.
 */
function withoutHidden(feed: HomeFeed, hidden: ReadonlySet<string>, goneLead: string | null): HomeFeed {
  if (!feed.chosen) return feed;
  const gone = feed.items.filter((i) => hidden.has(i.key));
  const lead = feed.lead && feed.lead.key === goneLead ? feed.lead : null;
  if (gone.length === 0 && !lead) return feed;
  const unseen = gone.filter((i) => i.unseen).length + (lead?.unseen ? 1 : 0);
  return { ...feed, items: feed.items.filter((i) => !hidden.has(i.key)), lead: lead ? null : feed.lead, unseen: feed.unseen - unseen };
}

function Rows({ items, now, faces, expanded, onExpand, onDismiss }: {
  items: FeedView[]; now: string; faces?: FeedFaces; expanded: boolean; onExpand: () => void; onDismiss: (key: string, from: HTMLElement) => void;
}) {
  const { today, earlier, hidden } = feedGroups(items, now, expanded);
  const labelled = today.length > 0 && earlier.length > 0;
  const row = (i: FeedView) => (
    <FeedItemRow key={i.key} item={i} now={now} face={i.friend ? faces?.get(i.friend.publicId) ?? null : null} onDismiss={(from) => onDismiss(i.key, from)} />
  );
  return (
    <>
      {labelled && <p className={DAY}>{c.today}</p>}
      {today.length > 0 && <ul className={ROWS}>{today.map(row)}</ul>}
      {labelled && <p className={`${DAY} [border-top:1px_solid_var(--border)]`}>{c.earlier}</p>}
      {earlier.length > 0 && <ul className={`${ROWS} ${!labelled && today.length > 0 ? "[border-top:1px_solid_var(--border)]" : ""}`}>{earlier.map(row)}</ul>}
      <ShowAllFooter hidden={hidden} total={items.length} onExpand={onExpand} />
    </>
  );
}

function Quiet({ on }: { on: FeedKind[] }) {
  const names = nameList(on.map((k) => feedCopy.news.kinds[k].name.toLowerCase()));
  return (
    <div data-feed-quiet className="flex flex-col gap-[6px] p-[14px]">
      <p className="m-0 text-[13px] leading-[1.55] text-[color:var(--fg-body)]">
        <b className="text-[color:var(--fg)]">{c.quietLead}</b> {c.quietRest(names)}
      </p>
    </div>
  );
}

/** The inline opt-in: the kinds this reader can be offered, every box empty, and one Show these. */
function OptIn({ offer, alsoOn }: { offer: FeedKind[]; alsoOn: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState<FeedKind[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function save() {
    if (on.length === 0 || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const r = await saveFeedKinds(on, offer);
      // Saved, or the feed went off for this reader meanwhile: either way the page's next render decides. A refusal
      // (a kind went unavailable under the page) redraws too, so the boxes it offers are the current ones.
      if (r.ok || r.reason === "off") router.refresh();
      else {
        setFailed(true);
        router.refresh();
      }
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div data-feed-opt-in className="flex flex-col gap-[4px] p-[14px]">
      <h3 className="m-0 font-display text-[17px] font-bold text-[color:var(--fg)]">{c.optIn.title}</h3>
      <p className="m-0 mb-[6px] text-[13px] leading-[1.55] text-[color:var(--fg-muted)]">{alsoOn ? c.optIn.lineAlsoOn : c.optIn.line}</p>
      <ul className="m-0 list-none p-0 md:grid md:grid-cols-2 md:gap-x-[24px]">
        {offer.map((kind) => {
          const k = feedCopy.news.kinds[kind];
          return (
            <li key={kind} className="[&+li]:[border-top:1px_solid_var(--border)] md:[&:nth-child(2)]:[border-top:0]">
              <label className="flex min-h-[44px] cursor-pointer items-start gap-[12px] py-[8px]">
                <Checkbox
                  checked={on.includes(kind)}
                  disabled={busy}
                  onChange={(v) => setOn((prev) => (v ? [...prev.filter((x) => x !== kind), kind] : prev.filter((x) => x !== kind)))}
                  className="mt-[1px]"
                />
                <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                  <b className="font-sans text-[14px] font-medium text-[color:var(--fg)]">{k.name}</b>
                  <span className="text-[12.5px] leading-[1.45] text-[color:var(--fg-muted)]">{k.line}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <div className="mt-[8px] flex gap-[8px]">
        <PrimaryButton
          onClick={save}
          disabled={on.length === 0 || busy}
          aria-busy={busy || undefined}
          className="h-[44px] flex-1 rounded-[10px] px-[16px] text-[14px] font-medium disabled:opacity-50 md:h-[32px] md:flex-none md:rounded-[8px] md:px-[14px] md:text-[12.5px]"
        >
          {c.optIn.save}
        </PrimaryButton>
      </div>
      {failed && (
        <p role="alert" className="m-0 mt-[6px] text-[12.5px] text-[color:var(--danger)]">
          {feedCopy.news.failed}
        </p>
      )}
      <p className="m-0 mt-[8px] font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-faint)]">{c.optIn.foot}</p>
    </div>
  );
}
