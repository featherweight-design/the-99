"use client";
// One What's new item (menu and Home handoff, `Feed-Kinds.dc.html`; property table
// `docs/superpowers/design-tables/menu-home-feed-item.md`). One row shape for every kind: the picture (the card at card
// shape, never the art crop, or the shipped two-card-combo mark), a mono kicker naming the kind with the item's age,
// one title, one line, one press. The whole row is the press (a stretched link or button); its label names where it
// goes. Unseen items carry the accent diamond; a seen kicker steps down to `--fg-locked`.

import Link from "next/link";
import { useId, type ReactNode } from "react";
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
        press: c.press.priceDrop,
      };
    case "trade-match":
      return { title: c.title.tradeMatch(friend, card), line: c.line.tradeMatch, press: c.press.tradeMatch(friend) };
    case "spare-request":
      if (item.answer) return { ...answerText(item, friend, card), press: c.press.answer };
      return { title: c.title.spareRequest(friend, card), line: c.line.spareRequest, press: null };
    case "combo":
      return {
        title: item.combo ? c.title.combo(item.combo.pieces[0], item.combo.pieces[1]) : c.kicker.combo,
        line: item.combo ? c.line.combo(item.combo.added) : null,
        press: c.press.combo,
      };
  }
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

/** The press: a link to the item's place, or a button opening the shipped card detail. Stretched over the row. */
export function FeedPress({
  item,
  label,
  className,
  stretch,
  describedBy,
}: {
  item: FeedView;
  label: string;
  className: string;
  /** Classes that stretch the press over its row (an `::after` over the positioned row). */
  stretch: string;
  describedBy?: string;
}) {
  const detail = useCardDetailIfAny();
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

/** The 46x64 picture: the card at card shape with the friend's face on its corner, or the combo mark. */
function Picture({ item, face }: { item: FeedView; face: Pick<ProfileCommander, "artCropUri"> | null | undefined }) {
  // Every card row previews its card on hover (Hugh, 2026-10-12), on the picture, since the row carries prose; from
  // What's new's provider. A combo's picture is the mark, and previews nothing. The press is stretched over the whole
  // row (an `::after` later in the DOM), so the picture sits ABOVE it (`z-[1]`) to be hovered at all, and a press on
  // it is the row's press (a link when the row links, else passed to its button).
  const hover = usePreviewRow(item.kind === "combo" ? null : item.card?.image ?? null);
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
  const box = "relative z-[1] row-span-2 h-[64px] w-[46px] self-start md:row-span-1 md:self-center";
  // A linked row's picture is a real link to the same place (out of the tab order, hidden from readers: the press is
  // the named link), so a modified or middle press behaves natively. A row that opens the card's detail passes the
  // press on to its button.
  if (item.href) {
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

export function FeedItemRow({ item, now, face }: { item: FeedView; now: string; face?: Pick<ProfileCommander, "artCropUri"> | null }) {
  const titleId = useId();
  const text = feedText(item);
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
          <small className="ml-auto flex-none font-mono text-[10.5px] text-[color:var(--fg-locked)]">{feedAge(item.at, now)}</small>
        </div>
        <p id={titleId} className="m-0 font-sans [overflow-wrap:anywhere] text-[14px] leading-[1.35] font-semibold text-[color:var(--fg)]">{text.title}</p>
        {text.line && <p className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-body)]">{text.line}</p>}
      </div>
      {text.press && (
        <div className="col-start-2 mt-[9px] flex min-w-0 flex-wrap items-center gap-[8px] md:col-start-3 md:row-start-1 md:mt-0 md:justify-end">
          <FeedPress
            item={item}
            label={`${text.press} ›`}
            describedBy={titleId}
            stretch="after:absolute after:inset-0 after:content-['']"
            className="flex min-h-[32px] min-w-0 items-center font-sans text-[13px] font-medium [overflow-wrap:anywhere] text-[color:var(--accent-text)]"
          />
        </div>
      )}
    </li>
  );
}
