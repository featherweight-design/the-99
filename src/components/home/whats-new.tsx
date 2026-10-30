"use client";
// Home's What's new (menu and Home handoff, direction B; property table `menu-home-home.md` § What's new). Three
// states, from one read (`loadHomeFeed`):
// - kinds on, items: five rows, then "Show all N" expanding in place; Today / Earlier labels only when the shown list
//   holds both;
// - kinds on, nothing in the window: one quiet line naming the kinds that are on;
// - nothing in the window and something to offer (`chosen: false`; small items 5, `Offer-Empty`): the quiet line, then
//   the offer line under it; with no kind on, the offer line alone. The full opt-in panel is retired
//   (`ERRATUM-offer-empty.md`).
// While the reader has never chosen, the items end with the offer line too (announcements call 3, `Offer`): Pick ▾
// opens the shipped boxes in place, and its ✕ saves an empty choice (sticking while any kind is on). Saving the boxes turns the kinds on
// through Settings' own action, and from then on the switches live in Settings alone.
// The lead story is not in this list (`splitLead`); the head's count is every unseen item, the badge's own figure.

import { displaceLead, useHeldLead } from "./held-lead";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { closeFeedOfferAction, saveFeedKinds } from "../../app/settings/feed-actions";
import { feedCopy } from "../../lib/copy/feed";
import { nameList } from "../../lib/copy/deck-analysis";
import type { FeedView, HomeFeed } from "../../lib/feed/home";
import type { FeedKind } from "../../lib/feed/kinds";
import { FeedItemRow, type FeedFaces } from "../feed/feed-item";
import { FEED_SHOWN, ShowAllFooter, useShowAll } from "../feed/show-all";
import { DismissButton, useFeedDismiss } from "../feed/dismiss";
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
  // The offer line follows the rows; with nothing in the window (`chosen: false`) it follows the quiet line, or stands
  // alone in the box when no kind is on.
  const offer = chosen ? (feed.items.length > 0 && feed.offer && feed.offer.length > 0 ? feed.offer : null) : feed.offer.length > 0 ? feed.offer : null;
  // After its ✕ this visit, the quiet line alone: with no kind on, its lead alone (nothing to name).
  const [offerGone, setOfferGone] = useState(false);
  // The lead alone and nothing more: the head stands over no box, since the quiet line would contradict the lead.
  if (chosen && feed.items.length === 0 && feed.lead) return dismissed.toast;

  return (
    <section aria-labelledby="home-whats-new" data-dismiss-scope data-whats-new={chosen ? (feed.items.length > 0 ? "items" : "quiet") : feed.on.length > 0 ? "quiet" : "offer"} className={`flex flex-col gap-[12px] min-[1180px]:gap-[11px] ${className}`}>
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
          (feed.on.length > 0 || !offer || offerGone) && <Quiet on={feed.on} />
        ) : feed.items.length === 0 ? (
          <Quiet on={feed.on} />
        ) : (
          <AnswerSheetProvider now={now} onSeen={(key) => setOpened((prev) => new Set(prev).add(key))} onCleared={dismissed.dismiss}>
            <HoverPreviewProvider className="flex flex-col">
              <Rows items={feed.items} now={now} faces={faces} expanded={expanded} onExpand={expand} onDismiss={dismissed.dismiss} />
            </HoverPreviewProvider>
          </AnswerSheetProvider>
        )}
        {offer && <Offer key={offer.join(",")} offer={offer} rule={chosen || feed.on.length > 0} onClosed={setOfferGone} />}
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
  // Each kind's own inline form (announcements G1): lowercasing a name would print "secret lair". With no kind on (the
  // offer closed this visit), the lead alone: there is nothing to name.
  const names = nameList(on.map((k) => c.quietName[k]));
  return (
    <div data-feed-quiet className="flex flex-col gap-[6px] p-[14px]">
      <p className="m-0 text-[13px] leading-[1.55] text-[color:var(--fg-body)]">
        <b className="text-[color:var(--fg)]">{c.quietLead}</b>
        {names && ` ${c.quietRest(names)}`}
      </p>
    </div>
  );
}

/**
 * The shipped boxes (handoff call 7), drawn by the opened offer: the kinds offered, every box empty, Show these, and the
 * foot. Saving writes through Settings' own action and redraws the page, after which the
 * reader has chosen.
 */
function KindBoxes({ offer }: { offer: FeedKind[] }) {
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
    <>
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
          className="h-[44px] flex-1 whitespace-nowrap rounded-[10px] px-[16px] text-[14px] font-medium disabled:opacity-50 md:h-[32px] md:flex-none md:rounded-[8px] md:px-[14px] md:text-[12.5px]"
        >
          {c.offer.save}
        </PrimaryButton>
      </div>
      {failed && (
        <p role="alert" className="m-0 mt-[6px] text-[12.5px] text-[color:var(--danger)]">
          {feedCopy.news.failed}
        </p>
      )}
      <p className="m-0 mt-[8px] font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-faint)]">{c.offer.foot}</p>
    </>
  );
}

/** The offer line's top rule, under the rows or the quiet line it follows. */
const OFFER_RULE = "[border-top:1px_solid_var(--border)]";

/**
 * The offer (announcements call 3, board `Offer`): while the reader has never chosen, the last line of What's new.
 * Pick ▾ opens the shipped boxes in place (`KindBoxes`); the ✕, closed or opened, saves an empty choice (sticking while any kind is on)
 * (`closeFeedOfferAction`): the line leaves at once, focus goes to the section's head, and a failed write puts it back
 * with the reason. `rule`: the top rule, off when the line stands alone in the box; `onClosed` tells What's new, which
 * then draws the quiet line in its place.
 */
function Offer({ offer, rule, onClosed }: { offer: FeedKind[]; rule: boolean; onClosed: (closed: boolean) => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [closed, setClosed] = useState(false);
  const [failed, setFailed] = useState(false);
  const opened = useRef<HTMLDivElement>(null);
  const o = c.offer;
  // Pick leaves with the closed line, so focus moves to the first box it opened rather than falling to the page.
  useEffect(() => {
    if (open) opened.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, [open]);

  async function close() {
    setClosed(true);
    onClosed(true);
    setFailed(false);
    document.getElementById("home-whats-new")?.focus();
    try {
      // Closed, or the feed went off for this reader meanwhile: either way the page's next render decides.
      await closeFeedOfferAction();
      router.refresh();
    } catch {
      setClosed(false);
      onClosed(false);
      setFailed(true);
    }
  }

  if (closed) return null;
  if (open) {
    return (
      <div ref={opened} data-feed-offer="open" className={`${rule ? OFFER_RULE : ""} flex flex-col gap-[4px] px-[14px] pt-[12px] pb-[14px]`}>
        <div className="flex items-start gap-[10px]">
          <p className="m-0 flex-1 text-[13px] leading-[1.55] text-[color:var(--fg-muted)]">
            <b className="font-medium text-[color:var(--fg)]">{o.lead}</b> {o.openRest}
          </p>
          <DismissButton title="" label={o.closeAria} onPress={close} margin="mt-[-10px] mr-[-10px]" />
        </div>
        <KindBoxes offer={offer} />
        {failed && (
          <p role="alert" className="m-0 mt-[6px] text-[12.5px] text-[color:var(--danger)]">
            {feedCopy.news.failed}
          </p>
        )}
      </div>
    );
  }
  return (
    <div data-feed-offer="closed" className={rule ? OFFER_RULE : undefined}>
      <div className="flex items-center gap-[10px] py-[6px] pr-[4px] pl-[14px]">
        <p className="m-0 min-w-0 flex-1 text-[12.5px] leading-[1.5] text-[color:var(--fg-muted)]">
          <b className="font-medium text-[color:var(--fg)]">{o.lead}</b> {o.rest}
        </p>
        <button
          type="button"
          aria-expanded={false}
          onClick={() => setOpen(true)}
          className="flex min-h-[44px] flex-none cursor-pointer items-center gap-[5px] border-0 bg-transparent px-[6px] py-0 font-sans text-[13px] font-medium text-[color:var(--accent-text)] md:min-h-[32px]"
        >
          {o.pick}
          <span aria-hidden>▾</span>
        </button>
        <DismissButton title="" label={o.closeAria} onPress={close} margin="m-0" />
      </div>
      {failed && (
        <p role="alert" className="m-0 px-[14px] pb-[10px] text-[12.5px] text-[color:var(--danger)]">
          {feedCopy.news.failed}
        </p>
      )}
    </div>
  );
}
