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
import { feedCopy } from "../../lib/copy/feed";
import { spareCopy } from "../../lib/copy/social";
import { formatCents } from "../../lib/decks/price";
import type { FeedView } from "../../lib/feed/home";
import type { ProfileCommander } from "../../lib/social/commander";
import { ComboGlyph } from "../cards/combo-glyph";
import { useCardDetailIfAny } from "../cards/card-detail-provider";
import { usePreviewRow } from "../decks/hover-preview";
import { PendingReporter } from "../shell/pending-reporter";
import { Face } from "../social/face";
import { CommanderThumb } from "../ui/commander-thumb";
import { NEW_TAB_SUFFIX } from "../ui/external-link";
import { LinkOutLabel } from "../ui/link-out-icon";
import { KICKER_AGE } from "./kicker-age";
import { DismissButton } from "./dismiss";
import { TradeAskLabel, tradeAskAria, useTradeAsk } from "../social/trade-ask";
import { useAnswerSheet } from "../home/answer-sheet";
import { feedAge } from "../../lib/feed/age";

const c = feedCopy.home;

/** A friend's face, by public id: the Home friends read's own faces, so no new read draws them. */
export type FeedFaces = ReadonlyMap<string, Pick<ProfileCommander, "artCropUri"> | null>;

/** What an item says: its title, its line, and its press label (null: no press yet, the later round's spare request). */
export function feedText(item: FeedView): { title: string; line: ReactNode; press: string | null } {
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
            {c.line.priceDrop}
          </>
        ) : null,
        // Only with somewhere to go: a card the catalog no longer holds has no name to send to Mana Pool.
        press: item.outbound ? c.press.priceDrop : null,
      };
    case "trade-match":
      return { title: c.title.tradeMatch(friend, card), line: c.line.tradeMatch, press: item.askable ? c.press.tradeMatchAsk(friend) : c.press.tradeMatch(friend) };
    case "spare-request":
      if (item.answer) return { ...answerText(item, friend, card), press: c.press.answer };
      return { title: c.title.spareRequest(friend, card), line: c.line.spareRequest, press: null };
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
        // Only with somewhere to go: a stored address that is not a magic.wizards.com page draws no press (`wizardsPostUrl`).
        press: item.outbound ? (item.kind === "commander-decklists" ? c.press.readPost : c.press.readOnWizards) : null,
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
  if (seesLists(item) && item.href) {
    return (
      <Link href={item.href} aria-hidden tabIndex={-1} data-feed-picture className={`${shape} block`}>
        {inner}
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
function answerText(item: FeedView, friend: string, card: string): { title: string; line: string | null } {
  const m = spareCopy.request.mine;
  const d = item.answerDetail;
  if (item.answer === "yes") return { title: m.canSpare(friend, card), line: d ? (d.canBuy ? m.acceptedDetail : m.acceptedDetailNoBuy) : null };
  return {
    title: m.keeping(friend, card),
    line: d ? (d.others.length === 0 ? m.nobodyElse : m.othersHave(d.others[0], d.others.length - 1)) : null,
  };
}

/**
 * Whether a press label carries a friend's name ("See ‹name›’s spares", up to `DISPLAY_NAME_MAX` characters), so it may
 * wrap. Every other label is a short fixed phrase, drawn on one line as the announcements boards draw it (Home-Rows,
 * Lead-Story); a 30-character name in one line would run past a 390 row.
 */
export const pressWraps = (item: FeedView): boolean => item.kind === "trade-match";

/** The press: a link to the item's place, or a button opening the shipped card detail. Stretched over the row. */
export function FeedPress({
  item,
  label,
  className,
  stretch,
  describedBy,
  filled = false,
}: {
  item: FeedView;
  label: string;
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
        {label}
      </button>
    );
  }
  // A trade match the page can open in place (product call 8): its sheet over this page, that friend first; once asked,
  // the press says Requested or Accepted, as the friend's tab does, and still opens the sheet.
  const asking = tradeAskOf(item, trade !== null && trade.has(item.card?.oracleId ?? ""));
  if (trade && asking) {
    const state = trade.stateFor(asking.oracleId, asking.friendPublicId);
    return (
      <button
        type="button"
        data-feed-press
        data-trade-ask-press
        aria-haspopup="dialog"
        aria-label={state ? tradeAskAria(c.press.tradeMatchAsk(asking.friendName), state) : undefined}
        onClick={(e) => trade.open(asking.oracleId, asking.friendPublicId, e.currentTarget)}
        className={twMerge("cursor-pointer border-0 bg-transparent p-0 text-left", className, stretch)}
        aria-describedby={describedBy}
      >
        {state ? <TradeAskLabel state={state} filled={filled} /> : label}
      </button>
    );
  }
  // Off the app (a price drop's card on Mana Pool): a new tab, drawn as card details' link out is (its own label), the link-out icon and
  // the spoken new-tab suffix (`ExternalLink`'s), never a router link.
  if (item.outbound) {
    return (
      <a href={item.outbound} target="_blank" rel="noopener" data-feed-press className={`${className} ${stretch}`} aria-describedby={describedBy}>
        {/* One inline run, so a press that wraps (the lead's button on a phone) keeps the icon on the label's last word,
            bound as `ExternalLink` binds it, rather than standing alone as a flex item. */}
        <LinkOutLabel>{label}</LinkOutLabel>
        <span className="sr-only">{NEW_TAB_SUFFIX}</span>
      </a>
    );
  }
  if (item.href) {
    return (
      <Link href={item.href} data-feed-press className={`${className} ${stretch}`} aria-describedby={describedBy}>
        {label}
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
      onClick={(e) => detail.open(opens, undefined, undefined, { art: item.card?.oracleId === opens ? item.card.image : null, opener: e.currentTarget, ...(item.kind === "combo" ? { combo: true } : {}) })}
      className={twMerge("cursor-pointer border-0 bg-transparent p-0 text-left", className, stretch)}
      aria-describedby={describedBy}
    >
      {label}
    </button>
  );
}

/** A trade match whose Ask opens in place: the card and the friend, else null (the press keeps its link). */
function tradeAskOf(item: FeedView, held: boolean): { oracleId: string; friendPublicId: string; friendName: string } | null {
  if (item.kind !== "trade-match" || !item.askable || !held || !item.card || !item.friend) return null;
  return { oracleId: item.card.oracleId, friendPublicId: item.friend.publicId, friendName: item.friend.displayName };
}

/** The 46x64 picture: the card at card shape with the friend's face on its corner, or the combo mark. */
function Picture({ item, face }: { item: FeedView; face: Pick<ProfileCommander, "artCropUri"> | null | undefined }) {
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
        className="row-span-2 flex h-[64px] w-[46px] items-center justify-center self-start rounded-[4px] [border:1px_solid_var(--border-strong)] bg-[color:var(--surface-raised)] text-[color:var(--fact)] md:row-span-1 md:self-center"
      >
        <ComboGlyph />
      </span>
    );
  }
  const box = "relative z-[1] row-span-2 h-[64px] w-[46px] self-start md:row-span-1 md:self-center";
  if (item.post) return <PostPicture item={item} box={box} />;
  const art = (
    <>
      <span className="block rounded-[3px] shadow-[0_2px_6px_rgba(0,0,0,.45)]">
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

export function FeedItemRow({ item, now, face, onDismiss }: {
  item: FeedView;
  now: string;
  face?: Pick<ProfileCommander, "artCropUri"> | null;
  /** The ✕ (Hugh's ruling 2026-10-27): hides the item for good. Absent, the row draws none. */
  onDismiss?: (from: HTMLElement) => void;
}) {
  const titleId = useId();
  const text = feedText(item);
  const lists = listsText(item);
  const two = seesLists(item);
  const waiting = item.kind === "spare-request" && !item.answer;
  const kickerInk = !item.unseen ? "text-[color:var(--fg-locked)]" : waiting ? "text-[color:var(--accent-text)]" : "text-[color:var(--fg-faint)]";
  return (
    <li
      data-feed-item={item.kind}
      data-unseen={item.unseen || undefined}
      className="relative grid grid-cols-[46px_minmax(0,1fr)] gap-x-[12px] px-[14px] py-[12px] md:grid-cols-[46px_minmax(0,1fr)_auto] md:items-center md:gap-x-[14px] md:px-[16px]"
    >
      <Picture item={item} face={face} />
      <div className="flex min-w-0 flex-col gap-[3px]">
        <div className="flex min-w-0 items-center gap-[7px]">
          {item.unseen && <span data-feed-unseen aria-hidden className="h-[6px] w-[6px] flex-none rotate-45 bg-[color:var(--accent)]" />}
          <span className={`truncate font-mono text-[9.5px] font-medium tracking-[.12em] uppercase ${kickerInk}`}>{item.answer ? c.answerKicker : c.kicker[item.kind]}</span>
          {/* The time follows the kind at both widths (small items R1b: `Trade match · 6h ago`). */}
          <small data-feed-age className={`${KICKER_AGE} text-[color:var(--fg-locked)]`}>{feedAge(item.at, now)}</small>
        </div>
        <p id={titleId} className="m-0 font-sans [overflow-wrap:anywhere] text-[14px] leading-[1.35] font-semibold text-[color:var(--fg)]">{text.title}</p>
        {/* A post's summary can run to a paragraph: two lines, then an ellipsis (Row-States §2). The title never clamps. */}
        {text.line && <p data-feed-line className={`m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-body)] ${item.post ? "line-clamp-2" : ""}`}>{text.line}</p>}
        {lists && <p data-feed-lists className="m-0 mt-[1px] font-mono text-[10.5px] text-[color:var(--fg-muted)]">{lists}</p>}
      </div>
      {/* The action line (board `Dismiss-X`, `.d4n .ac`): the press, then the ✕ at its end. Under the text on a phone
          (the text column's 3px gap plus 2px), the row's third column from desktop. A row with no press keeps the line
          for its ✕ alone. */}
      {(text.press || onDismiss) && (
        <div data-feed-actions className="col-start-2 mt-[5px] flex min-w-0 flex-nowrap items-center gap-[8px] md:col-start-3 md:row-start-1 md:mt-0 md:justify-end md:gap-[12px]">
          {two && text.press ? (
            // Board `.fi .ac .two`: one line on a phone (16px apart), stacked and right-aligned from `md` (28px each).
            <span data-feed-two className="flex min-w-0 flex-wrap items-center gap-x-[16px] gap-y-0 md:flex-col md:flex-nowrap md:items-end">
              <FeedPress
                item={two.lists}
                label={`${c.press.seeLists} ›`}
                describedBy={titleId}
                stretch="after:absolute after:inset-0 after:content-['']"
                className="flex min-h-[32px] items-center font-sans text-[13px] font-medium whitespace-nowrap text-[color:var(--accent-text)] md:min-h-[28px]"
              />
              {/* Above the stretched See the lists (`z-[1]`), so a press on it goes out to the post. */}
              <FeedPress
                item={two.post}
                label={text.press}
                describedBy={titleId}
                stretch=""
                className="relative z-[1] flex min-h-[32px] items-center font-sans text-[13px] font-medium whitespace-nowrap text-[color:var(--fg-muted)] md:min-h-[28px]"
              />
            </span>
          ) : text.press && (
            <FeedPress
              item={item}
              // An outbound press ends in its link-out icon (`FeedPress`), not the in-app ›.
              label={item.outbound ? text.press : `${text.press} ›`}
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
