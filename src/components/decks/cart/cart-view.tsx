"use client";

// CartView — Shopping for all decks, by card (handoff A2–A4, K2/K3, T1/T2, E1–E3, P1). The
// selections are state for this visit only (Hugh's answer to Q1): leaving the page drops them, and
// nothing here writes (lock 8). Every figure is a sum over the server's rows (`lib/decks/cart`), so
// a deck's number here is its tile's number.

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { allDecksCartCopy as copy } from "../../../lib/copy/all-decks-cart";
import type { ProvenanceForm } from "../../../lib/decks/price";
import { cartTotal, checkoutLinks, selectLine, type CartPayload, type SelectedLine } from "../../../lib/decks/cart";
import { CartCheckout } from "./cart-checkout";
import { CartHeldSlot, CartLine } from "./cart-line";
import { CartGotItProvider, useCartGotIt } from "./cart-got-it";
import { BackBand } from "./back-band";
import { ShoppingKeyBuy, ShoppingKeySpare } from "../shopping-key";
import { FriendSparesProvider, SparesSheetHost, usePageSpares } from "../../social/spare-markers";
import { CartDeckGroup } from "./cart-deck-group";
import { DeckSelect } from "./deck-select";
import { ViewSwitch, type CartViewMode } from "./view-switch";
import { ByFriendList, byFriendHead, friendGroups, useByFriend, type HeldLines } from "./cart-by-friend";
import { mirrorUrl } from "../../../lib/url/mirror";
import { PendingReporter } from "../../shell/pending-reporter";
import { HoverPreviewProvider } from "../hover-preview";
import { CardDetailProvider } from "../../cards/card-detail-provider";
import { TOUCH_HIT } from "../../ui/touch-hit";
import { UNDER_HEADER } from "../../ui/under-header";

/** By card: commanders first, then the cards most selected decks need, then A to Z (A2, A3). */
function byCardOrder(a: SelectedLine, b: SelectedLine): number {
  return Number(b.commander) - Number(a.commander)
    || b.selectedRows.length - a.selectedRows.length
    || a.name.localeCompare(b.name);
}

/**
 * The lines to draw: the selected ones, and each line bought this visit that the read no longer lists, kept as a held
 * slot where it was (S3), sorted among the rest by the line as it was drawn before the press. A line gone from the
 * read and bought for a deck still selected: the slot belongs to the selection it was bought in, and unselecting
 * those decks takes it out with every other line of theirs. By card and By friend both draw from this.
 */
function useWithHeld(lines: SelectedLine[], read: ReadonlySet<string>, selected: ReadonlySet<string>): { lines: SelectedLine[]; held: HeldLines } {
  const gotIt = useCartGotIt();
  return useMemo(() => {
    const gone = [...(gotIt?.held.values() ?? [])].filter((h) =>
      !read.has(h.line.oracleId) && [...h.deckIds].some((d) => selected.has(d)));
    if (gone.length === 0) return { lines, held: new Map() };
    return {
      lines: [...lines, ...gone.map((h) => h.line)].sort(byCardOrder),
      held: new Map(gone.map((h) => [h.line.oracleId, h.added])),
    };
  }, [gotIt, lines, read, selected]);
}

/** The by-card list (`useWithHeld`'s lines, a held one as its slot). */
function ByCardList({
  lines, read, selected, deckNames, newestAsOf,
}: {
  lines: SelectedLine[];
  /** Every line the READ lists, selected or not: a line only unselected is not gone. */
  read: ReadonlySet<string>;
  selected: ReadonlySet<string>;
  deckNames: Map<string, string>;
  newestAsOf: Date | null;
}) {
  const drawn = useWithHeld(lines, read, selected);
  return (
    <ul className="m-0 list-none p-0">
      {drawn.lines.map((line) => {
        const added = drawn.held.get(line.oracleId);
        return added !== undefined
          ? <CartHeldSlot key={line.oracleId} name={line.name} added={added} />
          : <CartLine key={line.oracleId} line={line} deckNames={deckNames} newestAsOf={newestAsOf} />;
      })}
    </ul>
  );
}

export function CartView({
  cart,
  provenance,
  initialView = "card",
  focusDeckId = null,
  buyEnabled = false,
  socialFriends = false,
  spareAsks = false,
}: {
  cart: CartPayload;
  provenance: ProvenanceForm | null;
  /** I got it on a cart line (cart PR 6): `SHOPPING_MARK_BOUGHT_ENABLED` and its collection switch. */
  buyEnabled?: boolean;
  /** `SOCIAL_FRIENDS_ENABLED` for the reader: friends' spares on the cart's lines (Social R2 PR B, S5). */
  socialFriends?: boolean;
  /** `SPARE_REQUESTS_ENABLED` for the reader: the lines' spares modal offers Ask (from the cart, for no one deck). */
  spareAsks?: boolean;
  /** From `?view=deck`, or any `?deck=`: the tile's link lands on that deck's group. `?view=friend` lands By friend
   *  (the page sends it only with spare requests on), drawn as By card until a line has a friend's spare. */
  initialView?: CartViewMode;
  /** `?deck=<id>` (A5): that deck's group starts open. Unselected or absent, everything folds (A5-t). */
  focusDeckId?: string | null;
}) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set(cart.decks.map((d) => d.id)));
  const [view, setView] = useState<CartViewMode>(initialView);
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set(focusDeckId ? [focusDeckId] : []));
  const chooseView = (next: CartViewMode) => {
    setView(next);
    // Mirrored, not routed: the payload already holds both views. Dropping `?deck=` too, which
    // was a one-time focus for arrival. Every parameter this view does not own is read back off
    // the live URL and kept; the default view is an absence.
    const live = new URLSearchParams(window.location.search);
    live.delete("deck");
    if (next === "card") live.delete("view"); else live.set("view", next);
    const query = live.toString();
    mirrorUrl(query ? `${window.location.pathname}?${query}` : window.location.pathname);
  };
  const fold = (id: string) => setOpen((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const newestAsOf = useMemo(() => (cart.newestAsOf ? new Date(cart.newestAsOf) : null), [cart.newestAsOf]);
  const deckNames = useMemo(() => new Map(cart.decks.map((d) => [d.id, d.name])), [cart.decks]);
  const sparesIds = useMemo(() => cart.lines.map((l) => l.oracleId), [cart.lines]);

  // Commanders first, then the cards most SELECTED decks need, then A to Z (A2, A3): the order is
  // re-read as decks are selected, and a line no selected deck needs drops out.
  const lines = useMemo(() => cart.lines
    .map((l) => selectLine(l, selected))
    .filter((l): l is SelectedLine => l !== null)
    .sort(byCardOrder), [cart.lines, selected]);
  // Desktop is one screen tall (Hugh, 2026-10-11), so the list scrolls in its own box and the sort, the
  // decks and the checkout stay on screen; the phone's page scrolls as one (2026-10-13) and ignores the
  // height. The top is measured rather than assumed, since the shell header above it has no fixed
  // height. Re-bound when the cart empties or fills, since the empty page draws no list to size.
  const pageRef = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState<number | null>(null);
  const hasList = cart.decks.length > 0;
  useEffect(() => {
    const el = pageRef.current;
    if (!el) return;
    const measure = () => setTop(Math.max(0, el.getBoundingClientRect().top + window.scrollY));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [hasList]);
  // K1, once per visit: armed when the Mana Pool link is pressed, shown when the tab comes back,
  // and never again once dismissed. Held here, so nothing that remounts the list resets it.
  const [band, setBand] = useState<"off" | "armed" | "shown" | "dismissed">("off");
  const arm = (e: React.MouseEvent) => {
    // Only with buying on: the band tells the player to press buy, which is inert without it.
    if (buyEnabled && (e.target as HTMLElement).closest("a[href]")) setBand((b) => (b === "off" ? "armed" : b));
  };
  useEffect(() => {
    if (band !== "armed") return;
    const onVisible = () => {
      if (document.visibilityState === "visible") setBand("shown");
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [band]);
  const readIds = useMemo(() => new Set(cart.lines.map((l) => l.oracleId)), [cart.lines]);
  const total = cartTotal(cart.decks, selected);
  const links = useMemo(() => checkoutLinks(cart.lines, selected), [cart.lines, selected]);
  const deckCount = cart.decks.filter((d) => selected.has(d.id)).length;
  // An explicit `?view=deck` or `?deck=` arrival is honoured with one deck too; only the switch
  // hides there (E1), since both views list the same cards.
  const byDeck = view === "deck";
  // The buy key names the press, which a line has by card (S0) and a deck's group does not.
  const showKey = buyEnabled && !byDeck && lines.length > 0;
  // Each deck's lines for its group: its own commander first, then A to Z.
  const groupLines = useMemo(() => {
    const out = new Map<string, typeof cart.lines>();
    for (const line of cart.lines) {
      for (const r of line.rows) {
        const list = out.get(r.deckId) ?? [];
        list.push(line);
        out.set(r.deckId, list);
      }
    }
    for (const [deckId, list] of out) {
      const isCmd = (l: (typeof list)[number]) => l.rows.some((r) => r.deckId === deckId && r.commander);
      list.sort((a, b) => Number(isCmd(b)) - Number(isCmd(a)) || a.name.localeCompare(b.name));
    }
    return out;
  }, [cart]);
  const brews = cart.decks.some((d) => d.brew && selected.has(d.id));
  // The cards the list draws now, which the key's spare item names only while one of them shows the glyph: the
  // selected lines by card, the open selected decks' lines by deck (a folded or unselected group draws none).
  const drawnIds = useMemo(() => new Set(byDeck
    ? cart.decks.filter((d) => selected.has(d.id) && open.has(d.id)).flatMap((d) => (groupLines.get(d.id) ?? []).map((l) => l.oracleId))
    : lines.map((l) => l.oracleId)), [byDeck, cart.decks, selected, open, groupLines, lines]);

  const toggle = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const all = (on: boolean) => setSelected(on ? new Set(cart.decks.map((d) => d.id)) : new Set());

  const header = (
    <header className="flex flex-col gap-[4px] border-b border-b-[color:var(--border)] px-[16px] pt-[16px] pb-[12px] md:px-[22px] md:pt-[20px] md:pb-[16px]">
      <Link href="/decks" className={`${TOUCH_HIT} self-start font-mono text-[11px] text-[color:var(--fg-faint)]`}>
        <span aria-hidden>‹ </span>{copy.page.back}
        <PendingReporter href="/decks" />
      </Link>
      <h1 className="m-0 font-display text-[22px] font-bold text-[color:var(--fg)]">{copy.title}</h1>
      <p className="m-0 font-mono text-[11px] text-[color:var(--fg-faint)]">
        {cart.decks.length === 0
          ? copy.page.subNone(cart.totalDecks)
          : `${copy.page.sub(cart.decks.length, cart.totalDecks)}${brews ? ` · ${copy.page.brews}` : ""}`}
      </p>
    </header>
  );

  // E3: no deck is missing a card. Reached by a direct visit, or by buying the last card, when the
  // receipt must stay up over it: the empty page renders inside the same provider as the full one.
  const empty = cart.decks.length === 0 ? (
      <div className="flex min-w-0 flex-auto flex-col bg-[color:var(--bg)] font-sans">
        {header}
        <div className="flex min-h-[600px] flex-1 items-center justify-center px-[24px] py-[40px] md:min-h-[480px] md:px-[22px] md:py-[60px]">
          <div className="flex max-w-[420px] flex-col items-center gap-[8px] text-center">
            <h2 className="m-0 font-display text-[20px] text-[color:var(--fg)]">{copy.empty.title}</h2>
            <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--fg-body)]">{copy.empty.body(cart.totalDecks)}</p>
            <Link href="/decks" data-cart-empty-back className="flex min-h-[44px] items-center text-[13.5px] text-[color:var(--accent-text)]">
              {copy.empty.back}
              <PendingReporter href="/decks" />
            </Link>
          </div>
        </div>
      </div>
  ) : null;

  // Desktop is one screen tall with the list scrolling in its own box. `flex-none`: the shell's
  // column is `min-h-screen` (100vh), taller than 100dvh while the browser's bars show, and a
  // growing page would take that slack and scroll the document. The PHONE has no fixed height at
  // all (Hugh, 2026-10-13): the page scrolls as one, the checkout and the deck picker scroll away
  // with it, and the switch and the list heading stay pinned at the top while the cards go by.
  // A box that took what the checkout and the picker left showed about two rows at 390px.
  const pageHeight = top === null
    ? "md:h-dvh"
    : "md:h-[calc(100dvh-var(--cart-top))]";
  const page = empty ?? (
    <div
      ref={pageRef}
      className={`flex min-w-0 flex-none flex-col bg-[color:var(--bg)] font-sans md:min-h-[420px] ${pageHeight}`}
      style={top === null ? undefined : ({ "--cart-top": `${top}px` } as CSSProperties)}
    >
      {header}
      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_auto] gap-[12px] px-[16px] pt-[12px] pb-[12px] md:grid-cols-[280px_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)] md:gap-x-[24px] md:px-[22px] md:pt-[18px] md:pb-[18px]">
        {/* Phone: the checkout heads the page, above the decks (Hugh, 2026-10-11). Desktop: the
            decks, then the checkout under them, the decks scrolling inside the column. */}
        <div className="flex min-h-0 min-w-0 flex-col gap-[12px] md:gap-[14px]">
          <DeckSelect decks={cart.decks} selected={selected} priced={cart.priced} onToggle={toggle} onAll={all} />
          <div
            data-cart-checkout
            tabIndex={-1}
            onClickCapture={arm}
            onAuxClickCapture={arm}
            className="order-1 flex-none outline-none md:order-2"
          >
            <CartCheckout total={total} deckCount={deckCount} priced={cart.priced} provenance={provenance} links={links} />
          </div>
        </div>

        <section className="flex min-h-0 min-w-0 flex-col gap-[12px]">
          {deckCount === 0 ? (
            // A4: every deck unselected. The list's place holds the way back, not an empty list.
            <div className="flex flex-col gap-[8px] rounded-[12px] border border-dashed border-[color:var(--border-dashed)] px-[20px] py-[22px]">
              <h2 className="m-0 text-[15px] font-semibold text-[color:var(--fg)]">{copy.none.title}</h2>
              <p className="m-0 text-[13px] leading-[1.55] text-[color:var(--fg-body)]">{copy.none.body}</p>
              <button
                type="button"
                onClick={() => all(true)}
                className="mt-[4px] h-[44px] self-start rounded-[9px] border border-[color:var(--border-strong)] px-[16px] text-[13.5px] text-[color:var(--fg)]"
              >
                {copy.none.action(cart.decks.length)}
              </button>
            </div>
          ) : (
            <>
              {band === "shown" ? <BackBand onDismiss={() => setBand("dismissed")} /> : null}
              {/* The controls and the list heading: pinned at the top of the phone's page while the cards
                  scroll under them, and plain blocks on desktop, where the list has its own box. */}
              <div
                data-cart-controls
                className={`sticky ${UNDER_HEADER} z-[2] -mx-[16px] flex flex-col gap-[12px] border-b border-b-[color:var(--border)] bg-[color:var(--bg)] px-[16px] py-[10px] md:static md:mx-0 md:border-b-0 md:bg-transparent md:p-0`}
              >
                {/* The switch has nothing to switch between with one deck (E1); the buy key sits
                    beside it, alone, while there is a line to press. */}
                <CartKeyRow
                  view={view}
                  onView={chooseView}
                  byDeckView={cart.decks.length >= 2}
                  lines={lines}
                  read={readIds}
                  selected={selected}
                  showBuy={showKey}
                  drawn={drawnIds}
                />
                <ListHead
                  view={view}
                  lines={lines}
                  read={readIds}
                  selected={selected}
                  byDeck={copy.list.headByDeck(deckCount, total.copies)}
                />
              </div>
              {/* Desktop: the list is its own scroll box, filling what the page leaves, so the controls above
                  it stay put; focusable and named, so a keyboard reader can scroll it. Phone: the page scrolls. */}
              {/* The provider sits OUTSIDE the scroll box: it draws the modal where it is mounted, and the dialog's
                  scroll lock looks for a scrollable ancestor, so mounted inside it would let the cart scroll behind. */}
              <CardDetailProvider>
              {/* The spares-only modal a line's spare press opens (S5): inside this provider, since it opens card details. */}
              <SparesSheetHost />
              <div
                tabIndex={0}
                role="region"
                aria-label={copy.list.regionAria}
                className="md:-mx-[13px] md:min-h-[120px] md:flex-1 md:overflow-y-auto md:overscroll-contain md:border-b md:border-b-[color:var(--border)] md:px-[13px]"
              >
                <HoverPreviewProvider>
                {byDeck ? (
                  // Largest first, in the selections' own order; an unselected deck keeps its place.
                  cart.decks.map((d) => (
                    <CartDeckGroup
                      key={d.id}
                      deck={d}
                      lines={groupLines.get(d.id) ?? []}
                      on={selected.has(d.id)}
                      open={open.has(d.id)}
                      priced={cart.priced}
                      deckNames={deckNames}
                      selected={selected}
                      newestAsOf={newestAsOf}
                      onToggle={() => toggle(d.id)}
                      onFold={() => fold(d.id)}
                    />
                  ))
                ) : (
                  <CardOrFriendList
                    view={view}
                    lines={lines}
                    read={readIds}
                    selected={selected}
                    deckNames={deckNames}
                    newestAsOf={newestAsOf}
                  />
                )}
                </HoverPreviewProvider>
                <div
                  aria-hidden
                  className="pointer-events-none sticky bottom-0 -mt-[36px] hidden h-[36px] md:block"
                  style={{ background: "linear-gradient(to bottom, transparent, var(--bg))" }}
                />
              </div>
              </CardDetailProvider>
            </>
          )}
        </section>
      </div>
    </div>
  );
  // Friends' spares (S5): one read of every card the cart lists, both views, outside the scroll box with the rest.
  const withSpares = socialFriends ? (
    <FriendSparesProvider oracleIds={sparesIds} newestAsOf={newestAsOf} hostSheet={false} requests={spareAsks} deckId={null}>{page}</FriendSparesProvider>
  ) : page;
  return buyEnabled ? (
    <CartGotItProvider deckNames={deckNames} newestAsOf={newestAsOf}>{withSpares}</CartGotItProvider>
  ) : withSpares;
}

/** The view drawn: By friend falls back to By card while it has no panels to draw (`friendGroups` null). */
function shown(view: CartViewMode, byFriend: boolean): CartViewMode {
  return view === "friend" && !byFriend ? "card" : view;
}

/** The list head for the view drawn. */
function ListHead({ view, lines, read, selected, byDeck }: {
  view: CartViewMode; lines: SelectedLine[]; read: ReadonlySet<string>; selected: ReadonlySet<string>; byDeck: string;
}) {
  const drawn = useWithHeld(lines, read, selected);
  const byFriend = friendGroups(useByFriend(drawn.lines, drawn.held));
  const v = shown(view, byFriend !== null);
  return (
    <h2 className="m-0 font-mono text-[10px] font-normal uppercase tracking-[0.12em] text-[color:var(--fg-faint)]">
      {v === "deck" ? byDeck : v === "friend" && byFriend ? byFriendHead(byFriend.groups) : copy.list.headByCard(lines.length)}
    </h2>
  );
}

/** By card, or By friend while it has something to draw. */
function CardOrFriendList({
  view, lines, read, selected, deckNames, newestAsOf,
}: {
  view: CartViewMode;
  lines: SelectedLine[];
  read: ReadonlySet<string>;
  selected: ReadonlySet<string>;
  deckNames: Map<string, string>;
  newestAsOf: Date | null;
}) {
  const drawn = useWithHeld(lines, read, selected);
  const byFriend = friendGroups(useByFriend(drawn.lines, drawn.held));
  if (view === "friend" && byFriend) {
    return <ByFriendList groups={byFriend.groups} requests={byFriend.requests} held={drawn.held} deckNames={deckNames} newestAsOf={newestAsOf} />;
  }
  return <ByCardList lines={lines} read={read} selected={selected} deckNames={deckNames} newestAsOf={newestAsOf} />;
}

/**
 * The row above the list: the view switch and the key. The switch draws By deck with two decks or more (E1) and By friend
 * while a selected line has a friend's spare with spare requests on, and nothing with only By card. The key names the buy
 * press while a line has one (I got it on, by card or by friend) and the spare glyph while a line draws it (S5), which By
 * friend never does: its line's press is the Ask. Nothing at all with none of the three.
 */
function CartKeyRow({
  view, onView, byDeckView, lines, read, selected, showBuy, drawn,
}: {
  view: CartViewMode;
  onView: (v: CartViewMode) => void;
  byDeckView: boolean;
  lines: SelectedLine[];
  read: ReadonlySet<string>;
  selected: ReadonlySet<string>;
  showBuy: boolean;
  drawn: ReadonlySet<string>;
}) {
  const spares = usePageSpares();
  const withHeld = useWithHeld(lines, read, selected);
  const byFriend = friendGroups(useByFriend(withHeld.lines, withHeld.held));
  const v = shown(view, byFriend !== null);
  const viewSwitch = byDeckView || byFriend
    // An explicit `?view=deck` with one deck keeps its own segment, so the switch always shows the view it is on.
    ? <ViewSwitch view={v} onView={onView} deck={byDeckView || v === "deck"} friend={byFriend !== null} />
    : null;
  const showSpare = v !== "friend" && spares !== null && [...drawn].some((id) => spares.byCard.has(id));
  if (!viewSwitch && !showBuy && !showSpare) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-[14px] gap-y-[10px]">
      {viewSwitch ?? <span />}
      {showBuy || showSpare ? (
        <span className="flex flex-wrap items-center gap-x-[14px] gap-y-[6px]">
          {showSpare ? <ShoppingKeySpare among={drawn} /> : null}
          {showBuy ? <ShoppingKeyBuy /> : null}
        </span>
      ) : null}
    </div>
  );
}
