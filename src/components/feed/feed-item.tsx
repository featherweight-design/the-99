"use client";
// One What's new item (menu and Home handoff, `Feed-Kinds.dc.html`; property table
// `docs/superpowers/design-tables/menu-home-feed-item.md`). One row shape for every kind: the picture (the card at card
// shape, never the art crop, or the shipped two-card-combo mark), a mono kicker naming the kind with the item's age,
// one title, one line, one press. The whole row is the press (a stretched link or button); its label names where it
// goes. Unseen items carry the accent diamond; a seen kicker steps down to `--fg-locked`.
//
// A Wizards post (announcements handoff, boards Home-Rows and Row-States) is the same row: its hero cropped into the
// picture's slot (never a card's shadow; the post-glyph plate when it is missing or fails), its title, its summary
// clamped at two lines, a Commander decklists post's mono count of lists, and one press out to the post. A Commander
// decklists post whose lists are in (`href`, Announcements UI 6b; board Home-Rows `.fi .ac .two`) carries two: See the
// lists, in the app and stretched over the row, then the quiet Read the post out to it (`--fg-muted`). On a phone they
// share the action line; from `md` they stack in the third column, right-aligned, in-app on top.

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import { storeCopy } from "../../lib/copy/store";
import { STORE_INFO } from "../../lib/stores/info";
import { feedCopy } from "../../lib/copy/feed";
import { spareCopy } from "../../lib/copy/social";
import { cardList, tradeCopy } from "../../lib/copy/trades";
import { TRADE_WAITING_EVENTS } from "../../lib/feed/kinds";
import { PersonText, personAttrs, type PersonParts, type ThirdPartyName } from "../../lib/person-name";
import { formatCents } from "../../lib/decks/price";
import type { FeedView } from "../../lib/feed/home";
import type { ProfileCommander } from "../../lib/social/commander";
import { ComboGlyph } from "../cards/combo-glyph";
import { comboSheetOpenOpts } from "../cards/card-detail-context";
import { comboViewHref } from "../../lib/feed/combo-view-href";
import { useCardDetailIfAny } from "../cards/card-detail-provider";
import { usePreviewRow } from "../decks/hover-preview";
import { PendingReporter } from "../shell/pending-reporter";
import { Face } from "../social/face";
import { CommanderThumb } from "../ui/commander-thumb";
import { NEW_TAB_SUFFIX } from "../ui/external-link";
import { LinkOutLabel } from "../ui/link-out-icon";
import { KICKER_AGE } from "./kicker-age";
import { DismissButton } from "./dismiss";
import { FeedAskBack } from "../social/trade-sheet-host";
import { AnswerPresses, receiptText, useSpareAnswer, type Answer } from "../social/spare-answer";
import { TradeAskLabel, tradeAskAria, useTradeAsk } from "../social/trade-ask";
import { useAnswerSheet } from "../home/answer-sheet";
import { feedAge } from "../../lib/feed/age";
import { shortName } from "../../lib/cards/short-name";
import { dropLines, saleAhead } from "../../lib/feed/drop-lines";

const c = feedCopy.home;

/** A friend's face, by public id: the Home friends read's own faces, so no new read draws them. */
export type FeedFaces = ReadonlyMap<string, Pick<ProfileCommander, "artCropUri"> | null>;

/** What an item says: its title, its line, and its press label (null: no press yet, the later round's spare request). */
export function feedText(item: FeedView): { title: string | PersonParts; line: ReactNode; press: string | PersonParts | null } {
  const card = item.card?.name ?? "";
  const friend = item.friend?.displayName ?? "";
  switch (item.kind) {
    case "new-set":
      return { title: c.title.newSet(item.name ?? ""), line: item.setSize ? c.line.newSet(item.setSize) : null, press: c.press.newSet };
    case "new-precon":
      return {
        title: c.title.newPrecon(item.name ?? ""),
        line: item.owned ? c.line.newPrecon(item.owned.owned, item.owned.of) : null,
        press: c.press.newPrecon,
      };
    case "price-drop":
      return {
        title: c.title.priceDrop(card),
        line: item.drop ? (
          <>
            <span className="font-mono text-[12px]">
              <s className="text-[color:var(--fg-faint)]">{formatCents(item.drop.fromCents)}</s>{" "}
              <span data-feed-drop className="text-[color:var(--success)]">↓ {formatCents(item.drop.toCents)}</span>
            </span>{" "}
            {item.drop.printing ? c.line.priceDropAt(item.drop.printing) : c.line.priceDrop}
          </>
        ) : null,
        // Only with somewhere to go: a card the catalog no longer holds has no name to send to a store.
        press: item.outbound ? (item.store ? storeCopy.feedBuy(STORE_INFO[item.store]) : c.press.priceDrop) : null,
      };
    case "trade-match":
      // Rolled up (Cart on your wishlist Q1): the friend's day of matches, and the press to their spares, no card named.
      if (item.rollup && item.friend) {
        const n = item.rollup.keys.length;
        return { title: c.title.tradeMatchRolled(item.friend.displayName, n), line: c.line.tradeMatchRolled(item.rollup.cards.map((x) => x.name), n), press: c.press.tradeMatch(friend) };
      }
      return { title: c.title.tradeMatch(friend, card), line: c.line.tradeMatch, press: item.askable ? c.press.tradeMatchAsk(friend) : c.press.tradeMatch(friend) };
    case "spare-request":
      if (item.offer) {
        // An OFFER (You have it): the friend's answer to the reader's offer, or the offer made to the reader.
        const o = spareCopy.request.offer;
        if (item.answer) return item.answer === "yes"
          ? { title: o.answered.yes(friend, card), line: o.answered.yesLine, press: c.press.offerAnswer }
          : { title: o.answered.no(friend, card), line: o.answered.noLine, press: c.press.offerAnswer };
        return { title: c.title.spareOffer(friend, card), line: c.line.spareOffer, press: null };
      }
      if (item.answer) return { ...answerText(item, friend, card), press: c.press.answer };
      return { title: c.title.spareRequest(friend, card), line: c.line.spareRequest, press: null };
    case "trade": {
      // Friend trades PR 2: the event picks the title and the line; a trade whose sides are gone has no `trade`, and draws
      // the kicker alone with no press (the href stays, the row is not a dead link).
      const t = item.trade;
      const f = tradeCopy.feed;
      if (!t) return { title: c.kicker.trade, line: null, press: null };
      const theirs = cardList(t.theirs.map((x) => x.name));
      const yours = cardList(t.yours.map((x) => x.name));
      const line = t.event === "offer" ? f.offerLine(theirs, yours) : t.event === "counter" ? f.counterLine(theirs, yours) : t.event === "accept" ? f.acceptLine : f.declineLine;
      return { title: f.title(t.event, item.friend?.displayName ?? ""), line, press: t.event === "counter" ? f.pressCounter : f.press };
    }
    case "combo":
      return {
        title: item.combo ? c.title.combo(item.combo.pieces[0], item.combo.pieces[1]) : c.kicker.combo,
        line: item.combo ? c.line.combo(item.combo.added) : null,
        press: c.press.combo,
      };
    case "secret-lair":
    case "commander-decklists":
    case "wizards-news":
      return {
        title: item.post?.title ?? c.kicker[item.kind],
        line: item.post?.summary ?? null,
        // Only with somewhere to go: a stored address that is not a magic.wizards.com page draws no press out
        // (`wizardsPostUrl`). A decklists post with its lists in still has See the lists, in the app (`href`): beside
        // Read the post it is drawn by `seesLists`; alone, it is the one press.
        press: item.outbound
          ? (item.kind === "commander-decklists" ? c.press.readPost : c.press.readOnWizards)
          : item.kind === "commander-decklists" && item.href ? c.press.seeLists : null,
      };
  }
}

/** A Commander decklists post's lists line ("3 of 5 lists so far", "All 5 lists"), or null. */
export function listsText(item: FeedView): string | null {
  const l = item.post?.lists;
  if (!l) return null;
  return l.n >= l.of ? c.line.listsAll(l.n) : c.line.listsSoFar(l.n, l.of);
}

/**
 * A Commander decklists post with both presses: See the lists in the app (`href`) and Read the post out (`outbound`).
 * Each press is drawn from the item with the other address taken away, so `FeedPress` draws the one it names.
 */
export function seesLists(item: FeedView): { lists: FeedView; post: FeedView } | null {
  if (item.kind !== "commander-decklists" || !item.href || !item.outbound) return null;
  return { lists: { ...item, outbound: null }, post: { ...item, href: null } };
}

/** The post glyph, a page of lines, drawn in the plate that stands for a missing or failed hero (board Row-States §3). */
export function PostGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 3.5h10a1.5 1.5 0 0 1 1.5 1.5v10A1.5 1.5 0 0 1 15 16.5H5A1.5 1.5 0 0 1 3.5 15V5A1.5 1.5 0 0 1 5 3.5z" />
      <path d="M6.5 7h7M6.5 10h7M6.5 13h4" />
    </svg>
  );
}

/** A post's hero, while it is there and has not failed to load: one failure and the plate takes its place for good. */
export function usePostHero(item: FeedView): { hero: string | null; onError: () => void } {
  const [failed, setFailed] = useState<string | null>(null);
  const hero = item.post?.hero ?? null;
  return { hero: hero && hero !== failed ? hero : null, onError: () => setFailed(hero) };
}

/** The post's hero cropped into the 46x64 slot (radius 4, centre crop, no card shadow), or the plate with the post glyph. */
function PostPicture({ item, box }: { item: FeedView; box: string }) {
  const { hero, onError } = usePostHero(item);
  const inner = hero ? (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- a Wizards hero, cropped by its box; a failure draws the plate */}
      <img src={hero} alt="" onError={onError} data-feed-hero className="absolute inset-0 block h-full w-full object-cover" />
      <span className="absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_rgba(0,0,0,.25)]" />
    </>
  ) : (
    <span data-feed-post-plate className="flex h-full w-full items-center justify-center rounded-[inherit] [border:1px_solid_var(--border-strong)] bg-[color:var(--surface-raised)] text-[color:var(--fact)]">
      <PostGlyph />
    </span>
  );
  const shape = `${box} overflow-hidden rounded-[4px] ${hero ? "bg-[color:var(--surface-sunken)]" : ""}`;
  // A decklists post with its lists in goes where the row's stretched press goes: See the lists, in the app.
  if (item.kind === "commander-decklists" && item.href) {
    return (
      <Link href={item.href} aria-hidden tabIndex={-1} data-feed-picture className={`${shape} block`}>
        {inner}
        <PendingReporter href={item.href} />
      </Link>
    );
  }
  if (item.outbound) {
    return (
      <a href={item.outbound} target="_blank" rel="noopener" aria-hidden tabIndex={-1} data-feed-picture className={`${shape} block`}>
        {inner}
      </a>
    );
  }
  return <span aria-hidden data-feed-picture className={`${shape} block`}>{inner}</span>;
}

/** An answer to the reader's own ask: Your requests' own words for it (`spareCopy.request.mine`). */
function answerText(item: FeedView, friend: string | ThirdPartyName, card: string): { title: string | PersonParts; line: ReactNode } {
  const m = spareCopy.request.mine;
  const d = item.answerDetail;
  if (item.answer === "yes") return { title: m.canSpare(friend, card), line: d ? (d.standalone ? m.acceptedDetailNoBuy : m.acceptedDetail) : null };
  return {
    title: m.keeping(friend, card),
    line: d ? (d.others.length === 0 ? m.nobodyElse : <PersonText text={m.othersHave(d.others[0], d.others.length - 1)} />) : null,
  };
}

/**
 * Whether a press label carries a friend's name ("See ‹name›’s spares", up to `DISPLAY_NAME_MAX` characters), so it may
 * wrap. Every other label is a short fixed phrase, drawn on one line as the announcements boards draw it (Home-Rows,
 * Lead-Story); a 30-character name in one line would run past a 390 row.
 */
export const pressWraps = (item: FeedView): boolean => item.kind === "trade-match";

/** A press label ending in the in-app `›`, as parts when it names someone so the name stays marked. */
export function withChevron(press: string | PersonParts): string | PersonParts {
  return typeof press === "string" ? `${press} ›` : [...press, " ›"];
}

/** The press: a link to the item's place, or a button opening the shipped card detail. Stretched over the row. */
export function FeedPress({
  item,
  label,
  className,
  stretch,
  describedBy,
  filled = false,
  onComboOpen,
  onComboClosed,
}: {
  item: FeedView;
  label: string | PersonParts;
  /** Called after a combo row's press has opened its combo view: the Show all sheet gives way to it (#3371). */
  onComboOpen?: () => void;
  /** The reader closed that combo view: the sheet comes back. */
  onComboClosed?: () => void;
  className: string;
  /** The lead's filled button: a Requested or Accepted label takes the button's ink (`TradeAskLabel`). */
  filled?: boolean;
  /** Classes that stretch the press over its row (an `::after` over the positioned row). */
  stretch: string;
  describedBy?: string;
}) {
  const detail = useCardDetailIfAny();
  const trade = useTradeAsk();
  const answers = useAnswerSheet();
  // An answer to the reader's own ask, on a page that can open it (Home's What's new): its one request over the page
  // (small items item 3), never a trip to /friends.
  if (answers && item.answer) {
    return (
      <button
        type="button"
        data-feed-press
        aria-haspopup="dialog"
        aria-busy={answers.pending === item.key || undefined}
        onClick={(e) => answers.open(item, e.currentTarget)}
        className={twMerge("cursor-pointer border-0 bg-transparent p-0 text-left", className, stretch)}
        aria-describedby={describedBy}
      >
        <PersonText text={label} />
      </button>
    );
  }
  // A trade match the page can open in place (product call 8): its sheet over this page, that friend first; once asked,
  // the press says Requested or Accepted, as the friend's tab does, and still opens the sheet.
  const asking = tradeAskOf(item, trade !== null && trade.has(item.card?.oracleId ?? ""));
  if (trade && asking) {
    const state = trade.stateFor(asking.oracleId, asking.friendPublicId);
    const pressClass = twMerge("cursor-pointer border-0 bg-transparent p-0 text-left", className, stretch);
    return (
      <button
        type="button"
        data-feed-press
        data-trade-ask-press
        aria-haspopup="dialog"
        {...(state ? personAttrs({ "aria-label": tradeAskAria(c.press.tradeMatchAsk(asking.friendName), state) }, pressClass) : { className: pressClass })}
        onClick={(e) => trade.open(asking.oracleId, asking.friendPublicId, e.currentTarget)}
        aria-describedby={describedBy}
      >
        {state ? <TradeAskLabel state={state} filled={filled} /> : <PersonText text={label} />}
      </button>
    );
  }
  // Off the app (a price drop's card at the reader's store): a new tab, drawn as card details' link out is (its own label), the link-out icon and
  // the spoken new-tab suffix (`ExternalLink`'s), never a router link.
  if (item.outbound) {
    return (
      <a href={item.outbound} target="_blank" rel="noopener" data-feed-press className={`${className} ${stretch}`} aria-describedby={describedBy}>
        {/* One inline run, so a press that wraps (the lead's button on a phone) keeps the icon on the label's last word,
            bound as `ExternalLink` binds it, rather than standing alone as a flex item. */}
        {/* An outbound press (a card at the reader’s store, a post) names nobody, so its label is a plain string. */}
        {typeof label === "string" ? <LinkOutLabel>{label}</LinkOutLabel> : <PersonText text={label} />}
        <span className="sr-only">{NEW_TAB_SUFFIX}</span>
      </a>
    );
  }
  if (item.href) {
    return (
      <Link href={item.href} data-feed-press className={`${className} ${stretch}`} aria-describedby={describedBy}>
        <PersonText text={label} />
        <PendingReporter href={item.href} />
      </Link>
    );
  }
  const opens = item.opens;
  if (!opens || !detail) return null;
  return (
    <button
      type="button"
      data-feed-press
      onClick={(e) => {
        detail.open(opens, undefined, undefined, { art: item.card?.oracleId === opens ? item.card.image : null, opener: e.currentTarget, ...(item.kind === "combo" ? { ...comboSheetOpenOpts(item.combo?.variantId, item.combo?.added), onComboClosed } : {}) });
        if (item.kind === "combo") onComboOpen?.();
      }}
      className={twMerge("cursor-pointer border-0 bg-transparent p-0 text-left", className, stretch)}
      aria-describedby={describedBy}
    >
      <PersonText text={label} />
    </button>
  );
}

/** A trade match whose Ask opens in place: the card and the friend, else null (the press keeps its link). */
function tradeAskOf(item: FeedView, held: boolean): { oracleId: string; friendPublicId: string; friendName: ThirdPartyName } | null {
  if (item.kind !== "trade-match" || !item.askable || !held || !item.card || !item.friend) return null;
  return { oracleId: item.card.oracleId, friendPublicId: item.friend.publicId, friendName: item.friend.displayName };
}

/**
 * `true` draws the phone grid at every width (the Show all sheet); `"rail"` draws it from 1180, where What's new sits in the
 * right rail, and the wide layout below that, where it stays in the main column. Tailwind reads whole class names, so each
 * `md:` piece of the wide layout is written out once more for the rail, by `rowMd`.
 */
export type RowCompact = boolean | "rail";
const rowMd = (compact: RowCompact, wide: string, rail: string): string => (compact === true ? "" : compact === "rail" ? rail : wide);

/** The rolled row's fan behind the first card, nearest first (board N1): offset left and up, turned, and dimmed. */
const ROLLED_FAN = [
  "-left-[6px] top-[0px] -rotate-[6deg] brightness-[.7]",
  "-left-[11px] -top-[1px] -rotate-[12deg] brightness-[.5]",
] as const;

/** The 46x64 picture: the card at card shape with the friend's face on its corner, or the combo mark. */
function Picture({ item, face, compact }: { item: FeedView; face: Pick<ProfileCommander, "artCropUri"> | null | undefined; compact: RowCompact }) {
  // Every card row previews its card on hover (Hugh, 2026-10-12), on the picture, since the row carries prose; from
  // What's new's provider. A combo's picture is the mark, and previews nothing. The press is stretched over the whole
  // row (an `::after` later in the DOM), so the picture sits ABOVE it (`z-[1]`) to be hovered at all, and a press on
  // it is the row's press (a link when the row links, else passed to its button).
  const hover = usePreviewRow(item.kind === "combo" ? null : item.card?.image ?? null);
  const trade = useTradeAsk();
  const answers = useAnswerSheet();
  // A press that opens in place (a trade match's sheet, or an answer's sheet on Home) takes the picture's press too.
  const inPlace = tradeAskOf(item, trade !== null && trade.has(item.card?.oracleId ?? "")) !== null || (answers !== null && !!item.answer);
  if (item.kind === "combo") {
    return (
      <span
        aria-hidden
        data-feed-combo
        className={`row-span-2 flex h-[64px] w-[46px] items-center justify-center self-start rounded-[4px] [border:1px_solid_var(--border-strong)] bg-[color:var(--surface-raised)] text-[color:var(--fact)] ${rowMd(compact, "md:row-span-1 md:self-center", "md:max-[1179px]:row-span-1 md:max-[1179px]:self-center")}`}
      >
        <ComboGlyph />
      </span>
    );
  }
  const box = `relative z-[1] row-span-2 h-[64px] w-[46px] self-start ${rowMd(compact, "md:row-span-1 md:self-center", "md:max-[1179px]:row-span-1 md:max-[1179px]:self-center")}`;
  if (item.post) return <PostPicture item={item} box={box} />;
  const art = (
    <>
      {/* A trade: the reader's first card fanned behind the friend's (friend trades handoff, the feed item). */}
      {item.trade?.yours[0]?.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.trade.yours[0].image} alt="" data-feed-trade-yours className="absolute -left-[5px] top-[1px] block h-[60px] w-[43px] -rotate-[9deg] rounded-[3px] object-cover opacity-90 shadow-[0_2px_6px_rgba(0,0,0,.45)]" />
      ) : null}
      {/* A rolled trade match (Cart on your wishlist Q1, board N1): up to two more cards fanned behind the first, each
          further left, higher and darker; a card with no image is passed over, as the trade fan does. */}
      {(item.rollup?.cards.slice(1).filter((b) => b.image).slice(0, 2) ?? []).map((b, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={b.oracleId} src={b.image!} alt="" data-feed-rolled-card
          className={`absolute block h-[60px] w-[43px] rounded-[3px] object-cover shadow-[0_2px_6px_rgba(0,0,0,.45)] bg-[color:var(--surface-raised)] ${ROLLED_FAN[i]}`} />
      )).reverse()}
      <span className={`block rounded-[3px] shadow-[0_2px_6px_rgba(0,0,0,.45)] ${item.trade ? "relative rotate-[3deg]" : item.rollup ? "relative" : ""}`}>
        <CommanderThumb imageUri={item.card?.image ?? null} colorIdentity={item.card?.colorIdentity ?? null} size="feed" />
      </span>
      {item.friend && (
        <span data-feed-face className="absolute right-[-6px] bottom-[-5px] h-[24px] w-[24px] overflow-hidden rounded-[7px] [border:1.5px_solid_var(--surface-inset)]">
          <Face name={item.friend.displayName} commander={face ?? null} size={24} className="h-full! w-full! rounded-none!" />
        </span>
      )}
    </>
  );
  // A linked row's picture is a real link to the same place (out of the tab order, hidden from readers: the press is
  // the named link), so a modified or middle press behaves natively. A row that opens the card's detail passes the
  // press on to its button.
  if (item.outbound) {
    return (
      <a href={item.outbound} target="_blank" rel="noopener" aria-hidden tabIndex={-1} data-feed-picture {...hover} className={box}>
        {art}
      </a>
    );
  }
  if (item.href && !inPlace) {
    return (
      <Link href={item.href} aria-hidden tabIndex={-1} data-feed-picture {...hover} className={box}>
        {art}
        <PendingReporter href={item.href} />
      </Link>
    );
  }
  return (
    <span
      aria-hidden
      data-feed-picture
      {...hover}
      onClick={(e) => e.currentTarget.closest("li")?.querySelector<HTMLElement>("[data-feed-press]")?.click()}
      className={`${box} cursor-pointer`}
    >
      {art}
    </span>
  );
}

export function FeedItemRow({ item, now, face, onDismiss, onComboOpen, onComboClosed, when, zone = null, compact = false }: {
  item: FeedView;
  /** The phone grid at any width (What's new in the rail and its Show all sheet, G17): the picture beside the text, the press under it. */
  compact?: RowCompact;
  /** A combo row's press opened its combo view: the Show all sheet closes so the view is not left under a held page (#3371). */
  onComboOpen?: () => void;
  /** The reader closed the combo view that press opened: the Show all sheet comes back, where it was. */
  onComboClosed?: () => void;
  now: string;
  /** The reader's IANA zone (the zone cookie), or null: a drop's sale lines then read in the store's zone, labelled. */
  zone?: string | null;
  /**
   * The kicker's time as words, in place of the age (`6h ago`): the Announcements archive's date (`Oct 28`; small items 11
   * item 3), where a post's age is no use. The archive also draws the row seen (`unseen: false`) and passes no `onDismiss`,
   * so the same row carries no diamond and no ✕.
   */
  when?: string;
  face?: Pick<ProfileCommander, "artCropUri"> | null;
  /** The ✕ (Hugh's ruling 2026-10-27): hides the item for good. Absent, the row draws none. */
  onDismiss?: (from: HTMLElement) => void;
}) {
  const titleId = useId();
  const base = feedText(item);
  const lists = listsText(item);
  const two = seesLists(item);
  // A new-combo item: See the combo (the row's stretched press) beside See your combos, the Collection's combos view.
  const comboView = item.kind === "combo" && item.combo ? comboViewHref(item.combo.variantId) : null;
  // A spare request waits until answered; a trade waits per event (`TRADE_WAITING_EVENTS`: an offer or a counter).
  const waiting = (item.kind === "spare-request" && !item.answer) || (item.kind === "trade" && !!item.trade && TRADE_WAITING_EVENTS.includes(item.trade.event));
  // Q18 A: a waiting ask or offer answers in its own row, and the receipt lands in place of its lines.
  const ask = waiting ? item.ask ?? null : null;
  const [answered, setAnswered] = useState<Answer | null>(null);
  const { busy, answer, toast } = useSpareAnswer();
  const friend = item.friend?.displayName ?? "";
  const cardName = item.card?.name ?? "";
  const offer = ask?.offer !== undefined;
  const receipt = ask && answered ? receiptText(answered, shortName(cardName), friend, offer) : null;
  const text = receipt
    ? { title: receipt.title, line: <PersonText text={receipt.detail} />, press: null }
    : ask
      ? { ...base, line: <PersonText text={ask.offer ? spareCopy.request.offer.detail(friend, ask.spare, ask.offer.want) : spareCopy.request.incomingDetail(ask.spare, friend, ask.copies, ask.deckName)} /> }
      : base;
  const dismiss = receipt || busy ? undefined : onDismiss;
  async function press(a: Answer) {
    if (!ask || busy) return;
    if (await answer(ask.id, a, offer)) setAnswered(a);
  }
  // A Secret Lair drop whose sale is ahead says when, in place of its summary (and, off the archive, of its age).
  const sale = item.post?.sale;
  const drop = sale && item.kind === "secret-lair" && saleAhead(sale, new Date(now)) ? dropLines(sale, new Date(now), zone) : null;
  const ageInk = drop?.state === "queue" && !when ? "text-[color:var(--accent-text)]" : drop?.state === "live" && !when ? "text-[color:var(--success)]" : "text-[color:var(--fg-locked)]";
  const kickerInk = !item.unseen ? "text-[color:var(--fg-locked)]" : waiting ? "text-[color:var(--accent-text)]" : "text-[color:var(--fg-faint)]";
  return (
    <li
      data-feed-item={item.kind}
      data-feed-key={item.key}
      data-unseen={item.unseen || undefined}
      className={`relative grid grid-cols-[46px_minmax(0,1fr)] gap-x-[12px] px-[14px] py-[12px] ${rowMd(compact, "md:grid-cols-[46px_minmax(0,1fr)_auto] md:items-center md:gap-x-[14px] md:px-[16px]", "md:max-[1179px]:grid-cols-[46px_minmax(0,1fr)_auto] md:max-[1179px]:items-center md:max-[1179px]:gap-x-[14px] md:max-[1179px]:px-[16px]")}`}
    >
      <Picture item={item} face={face} compact={compact} />
      {/* An ask's ✕ sits in the row's corner (below), so the text column keeps clear of it at every width: a compact or rail
          row keeps the phone layout past `md`. The 44px box at 4px from the edge reaches 34px past the row's padding. */}
      <div data-feed-text className={`flex min-w-0 flex-col gap-[3px] ${ask && dismiss ? "pr-[34px]" : ""}`}>
        <div className="flex min-w-0 items-center gap-[7px]">
          {item.unseen && <span data-feed-unseen aria-hidden className="h-[6px] w-[6px] flex-none rotate-45 bg-[color:var(--accent)]" />}
          <span className={`truncate font-mono text-[9.5px] font-medium tracking-[.12em] uppercase ${kickerInk}`}>{receipt ? receipt.kind : item.answer ? (item.offer ? c.offerAnswerKicker : c.answerKicker) : item.offer ? c.offerKicker : c.kicker[item.kind]}</span>
          {/* The time follows the kind at both widths (small items R1b: `Trade match · 6h ago`). */}
          <small data-feed-age className={`${KICKER_AGE} ${ageInk}`}>{when ?? drop?.age ?? feedAge(item.at, now)}</small>
        </div>
        <p id={titleId} className="m-0 font-sans [overflow-wrap:anywhere] text-[14px] leading-[1.35] font-semibold text-[color:var(--fg)]"><PersonText text={text.title} /></p>
        {/* A post's summary can run to a paragraph: two lines, then an ellipsis (Row-States §2). The title never clamps. */}
        {drop ? (
          <>
            <p data-feed-drop={drop.state} className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg)]">{drop.sale}</p>
            {drop.queue && <p className="m-0 -mt-[2px] text-[12.5px] leading-[1.5] text-[color:var(--fg-body)]">{drop.queue}</p>}
            <p className="m-0 mt-[1px] font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-muted)]">{drop.store}</p>
          </>
        ) : text.line && <p data-feed-line className={`m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-body)] ${item.post ? "line-clamp-2" : ""}`}>{text.line}</p>}
        {lists && <p data-feed-lists className="m-0 mt-[1px] font-mono text-[10.5px] text-[color:var(--fg-muted)]">{lists}</p>}
      </div>
      {/* The action line (board `Dismiss-X`, `.d4n .ac`): the press, then the ✕ at its end. Under the text on a phone
          (the text column's 3px gap plus 2px), the row's third column from desktop. A row with no press keeps the line
          for its ✕ alone. */}
      {ask && !receipt && (
        <div data-feed-actions data-row-ask className="col-start-2 mt-[7px] flex min-w-0 items-center md:max-[1179px]:col-start-2">
          <AnswerPresses friend={friend} card={cardName} daysLeft={ask.daysLeft} busy={busy?.answer ?? null} locked={busy !== null} onAnswer={(a) => void press(a)} size="row" offer={offer} />
        </div>
      )}
      {/* Make it a trade (A1): a Yes to an ask, not to an offer, on the receipt's action line. */}
      {ask && answered === "yes" && !offer && (
        <div data-feed-actions className="col-start-2 mt-[7px] flex min-w-0 items-center md:max-[1179px]:col-start-2">
          <FeedAskBack item={item} answered={answered} size="row" />
        </div>
      )}
      {ask && dismiss && <span data-row-x className="absolute right-[4px] top-[4px] md:right-[8px] md:top-[8px]"><DismissButton title={text.title} onPress={dismiss} /></span>}
      {toast}
      {!ask && (text.press || onDismiss) && (
        <div data-feed-actions className={`col-start-2 mt-[5px] flex min-w-0 flex-nowrap items-center gap-[8px] ${rowMd(compact, "md:col-start-3 md:row-start-1 md:mt-0 md:justify-end md:gap-[12px]", "md:max-[1179px]:col-start-3 md:max-[1179px]:row-start-1 md:max-[1179px]:mt-0 md:max-[1179px]:justify-end md:max-[1179px]:gap-[12px]")}`}>
          {two && text.press ? (
            // Board `.fi .ac .two`: one line on a phone (16px apart), stacked and right-aligned from `md` (28px each).
            <span data-feed-two className={`flex min-w-0 flex-wrap items-center gap-x-[16px] gap-y-0 ${rowMd(compact, "md:flex-col md:flex-nowrap md:items-end", "md:max-[1179px]:flex-col md:max-[1179px]:flex-nowrap md:max-[1179px]:items-end")}`}>
              <FeedPress
                item={two.lists}
                label={`${c.press.seeLists} ›`}
                describedBy={titleId}
                stretch="after:absolute after:inset-0 after:content-['']"
                className={`flex min-h-[32px] items-center font-sans text-[13px] font-medium whitespace-nowrap text-[color:var(--accent-text)] ${rowMd(compact, "md:min-h-[28px]", "md:max-[1179px]:min-h-[28px]")}`}
              />
              {/* Above the stretched See the lists (`z-[1]`), so a press on it goes out to the post. */}
              <FeedPress
                item={two.post}
                label={text.press}
                describedBy={titleId}
                stretch=""
                className={`relative z-[1] flex min-h-[32px] items-center font-sans text-[13px] font-medium whitespace-nowrap text-[color:var(--fg-muted)] ${rowMd(compact, "md:min-h-[28px]", "md:max-[1179px]:min-h-[28px]")}`}
              />
            </span>
          ) : comboView && text.press ? (
            <span data-feed-two className={`flex min-w-0 flex-wrap items-center gap-x-[16px] gap-y-0 ${rowMd(compact, "md:flex-col md:flex-nowrap md:items-end", "md:max-[1179px]:flex-col md:max-[1179px]:flex-nowrap md:max-[1179px]:items-end")}`}>
              <FeedPress
                item={item}
                label={withChevron(text.press)}
                describedBy={titleId}
                onComboOpen={onComboOpen}
                onComboClosed={onComboClosed}
                stretch="after:absolute after:inset-0 after:content-['']"
                className={`flex min-h-[32px] items-center font-sans text-[13px] font-medium whitespace-nowrap text-[color:var(--accent-text)] ${rowMd(compact, "md:min-h-[28px]", "md:max-[1179px]:min-h-[28px]")}`}
              />
              {/* A sibling of the stretched press, above it (`z-[1]`), never inside it: a link nested in a button is invalid. */}
              <Link
                href={comboView}
                data-feed-combos-view
                aria-describedby={titleId}
                className={`relative z-[1] flex min-h-[32px] items-center font-sans text-[13px] font-medium whitespace-nowrap text-[color:var(--fg-muted)] ${rowMd(compact, "md:min-h-[28px]", "md:max-[1179px]:min-h-[28px]")}`}
              >
                {`${c.press.combosView} ›`}
                <PendingReporter href={comboView} />
              </Link>
            </span>
          ) : text.press && (
            <FeedPress
              item={item}
              onComboOpen={onComboOpen}
                onComboClosed={onComboClosed}
              // An outbound press ends in its link-out icon (`FeedPress`), not the in-app ›.
              label={item.outbound ? text.press : withChevron(text.press)}
              describedBy={titleId}
              stretch="after:absolute after:inset-0 after:content-['']"
              className={`flex min-h-[32px] min-w-0 items-center font-sans text-[13px] font-medium text-[color:var(--accent-text)] ${pressWraps(item) ? "[overflow-wrap:anywhere]" : "whitespace-nowrap"}`}
            />
          )}
          {onDismiss && <DismissButton title={text.title} onPress={onDismiss} />}
        </div>
      )}
    </li>
  );
}
