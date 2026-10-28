"use client";

// CartView — Shopping for all decks, by card (handoff A2–A4, K2/K3, T1/T2, E1–E3, P1). The
// selections are state for this visit only (Hugh's answer to Q1): leaving the page drops them, and
// nothing here writes (lock 8). Every figure is a sum over the server's rows (`lib/decks/cart`), so
// a deck's number here is its tile's number.

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { allDecksCartCopy as copy } from "../../../lib/copy/all-decks-cart";
import type { ProvenanceForm } from "../../../lib/decks/price";
import { cartTotal, checkoutLinks, ownFact, selectLine, type CartPayload, type SelectedLine } from "../../../lib/decks/cart";
import {
  DEFAULT_SORTS, MAX_QUERY, byCardOrder, cardCompare, matchesQuery, parseQuery, parseSort, searchLines, sortDecks, sortGroups,
  type CartSorts,
} from "../../../lib/decks/cart-sort";
import { CartChassis } from "./cart-chassis";
import { CartCheckout } from "./cart-checkout";
import { CartCardLine, CartHeldSlot } from "./cart-line";
import { CartColumns, SpareColumnContext } from "./cart-columns";
import { NameFitProvider } from "./cart-facts";
import { CartGotItProvider, useCartGotIt } from "./cart-got-it";
import { BackBand } from "./back-band";
import { ShoppingKeyBuy, ShoppingKeySpare } from "../shopping-key";
import { FriendSparesProvider, SparesSheetHost, usePageSpares } from "../../social/spare-markers";
import { CartDeckGroup } from "./cart-deck-group";
import { DeckSelect } from "./deck-select";
import { ViewSwitch, type CartViewMode } from "./view-switch";
import {
  ByFriendEmpty, ByFriendList, ByFriendReading, friendGroups, spareReadStatus, useByFriend, type ByFriend, type HeldLines,
} from "./cart-by-friend";
import { SocialToast, type SocialToastState } from "../../social/social-toast";
import { mirrorUrl } from "../../../lib/url/mirror";
import { PendingReporter } from "../../shell/pending-reporter";
import { HoverPreviewProvider } from "../hover-preview";
import { CardDetailProvider } from "../../cards/card-detail-provider";
import { TOUCH_HIT } from "../../ui/touch-hit";
import { UNDER_HEADER } from "../../ui/under-header";

type LineCompare = (a: SelectedLine, b: SelectedLine) => number;

/**
 * The lines to draw: the selected ones, and each line bought this visit that the read no longer lists, kept as a held
 * slot where it was (S3), sorted among the rest by the line as it was drawn before the press. A line gone from the
 * read and bought for a deck still selected: the slot belongs to the selection it was bought in, and unselecting
 * those decks takes it out with every other line of theirs. By card and By friend both draw from this.
 */
function useWithHeld(
  lines: SelectedLine[], read: ReadonlySet<string>, selected: ReadonlySet<string>, shape: { compare?: LineCompare; query?: string } = {},
): { lines: SelectedLine[]; held: HeldLines } {
  const { compare = byCardOrder, query = "" } = shape;
  const gotIt = useCartGotIt();
  return useMemo(() => {
    // A slot the search leaves out goes with the rest of the lines it leaves out.
    const gone = [...(gotIt?.held.values() ?? [])].filter((h) =>
      !read.has(h.line.oracleId) && [...h.deckIds].some((d) => selected.has(d)) && matchesQuery(h.line.name, query));
    // `lines` arrive in the by-card order: only a sort of the reader's choosing, or a held slot to place, re-sorts.
    const placed = gone.length === 0 ? lines : [...lines, ...gone.map((h) => h.line)];
    return {
      lines: gone.length === 0 && compare === byCardOrder ? lines : [...placed].sort(compare),
      held: new Map(gone.map((h) => [h.line.oracleId, h.added])),
    };
  }, [gotIt, lines, read, selected, compare, query]);
}

/** Who holds what, for the own fact (G1): each deck's place in the selections' order, and every holding deck's name. */
type Holders = { rank: ReadonlyMap<string, number>; names: ReadonlyMap<string, string> };

/** The by-card list (`useWithHeld`'s lines, a held one as its slot), its rows' names fitted by one observer. */
function ByCardList({
  lines, read, selected, deckNames, holders, newestAsOf, compare, query,
}: {
  lines: SelectedLine[];
  /** The reader's order (`cardCompare`), and the search a held slot is held to as well. */
  compare: LineCompare;
  query: string;
  /** Every line the READ lists, selected or not: a line only unselected is not gone. */
  read: ReadonlySet<string>;
  selected: ReadonlySet<string>;
  deckNames: Map<string, string>;
  holders: Holders;
  newestAsOf: Date | null;
}) {
  const drawn = useWithHeld(lines, read, selected, { compare, query });
  const spares = usePageSpares();
  return (
    <NameFitProvider>
      <ul className="m-0 list-none p-0">
        {drawn.lines.map((line) => {
          const added = drawn.held.get(line.oracleId);
          return added !== undefined
            ? <CartHeldSlot key={line.oracleId} name={line.name} added={added} />
            : (
              <CartCardLine
                key={line.oracleId}
                line={line}
                deckNames={deckNames}
                own={ownFact(line, selected, holders.rank, holders.names)}
                spares={spares?.byCard.get(line.oracleId) ?? []}
                newestAsOf={newestAsOf}
              />
            );
        })}
      </ul>
    </NameFitProvider>
  );
}

export function CartView({
  cart,
  provenance,
  initialView = "card",
  focusDeckId = null,
  initialQuery = "",
  initialSort = null,
  buyEnabled = false,
  socialFriends = false,
  spareAsks = false,
  hasFriends = true,
}: {
  cart: CartPayload;
  provenance: ProvenanceForm | null;
  /** I got it on a cart line (cart PR 6): `SHOPPING_MARK_BOUGHT_ENABLED` and its collection switch. */
  buyEnabled?: boolean;
  /** `SOCIAL_FRIENDS_ENABLED` for the reader: friends' spares on the cart's lines (Social R2 PR B, S5). */
  socialFriends?: boolean;
  /** `SPARE_REQUESTS_ENABLED` for the reader: the lines' spares modal offers Ask (from the cart, for no one deck). */
  spareAsks?: boolean;
  /** The reader has a friend (`hasFriend`): By friend with nothing to draw says "No friends yet" without one (Empty-One C). */
  hasFriends?: boolean;
  /** From `?view=deck`, or any `?deck=`: the tile's link lands on that deck's group. `?view=friend` lands By friend
   *  (the page sends it only with spare requests on), which draws its reading state until the read lands (v2 G2). */
  initialView?: CartViewMode;
  /** `?deck=<id>` (A5): that deck's group starts open. Unselected or absent, everything folds (A5-t). */
  focusDeckId?: string | null;
  /** `?q`: the search, for every view (v2 call 5). Trimmed and capped by `parseQuery`. */
  initialQuery?: string;
  /** `?sort`, raw: read for the view the page opens on, and no sort at all for any other view's value (A15). */
  initialSort?: string | null;
}) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set(cart.decks.map((d) => d.id)));
  const [view, setView] = useState<CartViewMode>(initialView);
  const [query, setQuery] = useState(() => parseQuery(initialQuery));
  // Sort is per view (call 5): each view keeps its own for the visit, and the URL carries the one on screen.
  const [sorts, setSorts] = useState<CartSorts>(() => ({ ...DEFAULT_SORTS, [initialView]: parseSort(initialView, initialSort) }));
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set(focusDeckId ? [focusDeckId] : []));
  // The address mirrors the view, the search and the sort of the view on screen (G3), as `?view` already did. Every
  // parameter this page does not own is read back off the live URL and kept; a default is an absence.
  const writeUrl = (next: { view: CartViewMode; query: string; sorts: CartSorts }, dropDeck = false) => {
    const live = new URLSearchParams(window.location.search);
    if (dropDeck) live.delete("deck");
    if (next.view === "card") live.delete("view"); else live.set("view", next.view);
    if (next.query.trim()) live.set("q", next.query); else live.delete("q");
    const sort = next.sorts[next.view];
    if (sort === DEFAULT_SORTS[next.view]) live.delete("sort"); else live.set("sort", sort);
    const qs = live.toString();
    mirrorUrl(qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
  };
  // A sort that arrived on the wrong view, or a search past its cap, is stripped from the address once (A15).
  useEffect(() => { writeUrl({ view, query, sorts }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const chooseView = (next: CartViewMode) => {
    setView(next);
    // Mirrored, not routed: the payload already holds both views. Dropping `?deck=` too, which was a one-time
    // focus for arrival.
    writeUrl({ view: next, query, sorts }, true);
  };
  const chooseQuery = (typed: string) => {
    // The cap holds for typing and pasting as it does for an arrival; spaces stay while the reader types.
    const next = typed.slice(0, MAX_QUERY);
    setQuery(next);
    writeUrl({ view, query: next, sorts });
  };
  const chooseSort = (drawn: CartViewMode, next: string) => {
    const nextSorts = { ...sorts, [drawn]: parseSort(drawn, next) };
    setSorts(nextSorts);
    // The address names the view's sort only while the view on screen is the one asked for (a By friend drawn as By card,
    // with spare requests off, keeps its own sort for the visit and does not write the card's over it).
    if (drawn === view) writeUrl({ view, query, sorts: nextSorts });
  };
  const fold = (id: string) => setOpen((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  // By friend's folded panels (call 7): every panel starts open, and a fold is kept for the visit, across view switches.
  const [friendShut, setFriendShut] = useState<ReadonlySet<string>>(() => new Set());
  const foldFriend = (publicId: string) => setFriendShut((prev) => {
    const next = new Set(prev);
    if (next.has(publicId)) next.delete(publicId); else next.add(publicId);
    return next;
  });
  const newestAsOf = useMemo(() => (cart.newestAsOf ? new Date(cart.newestAsOf) : null), [cart.newestAsOf]);
  const deckNames = useMemo(() => new Map(cart.decks.map((d) => [d.id, d.name])), [cart.decks]);
  const holders = useMemo<Holders>(() => ({
    rank: new Map(cart.decks.map((d, i) => [d.id, i])),
    names: new Map([...cart.holders.map((h) => [h.id, h.name] as const), ...cart.decks.map((d) => [d.id, d.name] as const)]),
  }), [cart.decks, cart.holders]);
  const sparesIds = useMemo(() => cart.lines.map((l) => l.oracleId), [cart.lines]);

  // Commanders first, then the cards most SELECTED decks need, then A to Z (A2, A3): the order is
  // re-read as decks are selected, and a line no selected deck needs drops out.
  const selectedLines = useMemo(() => cart.lines
    .map((l) => selectLine(l, selected))
    .filter((l): l is SelectedLine => l !== null)
    .sort(byCardOrder), [cart.lines, selected]);
  // Search narrows the same selected lines in every view (call 5); the chassis counts against `selectedLines`.
  const lines = useMemo(() => searchLines(selectedLines, query), [selectedLines, query]);
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
  // The selected cards: whether their spares read failed decides the spare column and the toast (B2), a search aside.
  const sparesRead = useMemo(() => selectedLines.map((l) => l.oracleId), [selectedLines]);
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
  // By deck: the decks in the reader's order, and with a search only the decks it leaves a card of (a group with
  // no line would be a header over nothing). The lines in a deck keep the shipped order.
  const deckGroups = useMemo(() => sortDecks(cart.decks, sorts.deck)
    .map((d) => ({ deck: d, lines: searchLines(groupLines.get(d.id) ?? [], query) }))
    .filter((g) => query.trim() === "" || g.lines.length > 0), [cart.decks, sorts.deck, groupLines, query]);
  const brews = cart.decks.some((d) => d.brew && selected.has(d.id));
  // The cards the list draws now, which the key's spare item names only while one of them shows the glyph: the
  // selected lines by card, the open selected decks' lines by deck (a folded or unselected group draws none).
  const drawnIds = useMemo(() => new Set(byDeck
    ? deckGroups.filter((g) => selected.has(g.deck.id) && open.has(g.deck.id)).flatMap((g) => g.lines.map((l) => l.oracleId))
    : lines.map((l) => l.oracleId)), [byDeck, deckGroups, selected, open, lines]);

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
    <SpareReadState ids={sparesRead} view={view}>
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
                  query={query}
                  sparesRead={sparesRead}
                />
                <CartChassisRow
                  view={view}
                  lines={lines}
                  of={selectedLines.length}
                  read={readIds}
                  selected={selected}
                  query={query}
                  onQuery={chooseQuery}
                  sorts={sorts}
                  onSort={chooseSort}
                  deckGroups={deckGroups}
                  sparesRead={sparesRead}
                  hasFriends={hasFriends}
                />
              </div>
              {/* Desktop: the list is its own scroll box, filling what the page leaves, so the controls above
                  it stay put; focusable and named, so a keyboard reader can scroll it. Phone: the page scrolls. */}
              {/* The provider sits OUTSIDE the scroll box: it draws the modal where it is mounted, and the dialog's
                  scroll lock looks for a scrollable ancestor, so mounted inside it would let the cart scroll behind. */}
              {byDeck ? null : <ByCardColumns view={view} lines={lines} read={readIds} selected={selected} query={query} hasFriends={hasFriends} />}
              <CardDetailProvider>
              {/* The spares-only modal a line's spare press opens (S5): inside this provider, since it opens card details. */}
              <SparesSheetHost />
              <div
                tabIndex={0}
                role="region"
                aria-label={copy.list.regionAria}
                // The scrollbar's gutter is kept whether or not the list overflows, and the column header keeps the same one, so a
                // classic scrollbar narrows both alike and the rows stay under their columns. By friend reserves its
                // sticky panel header's 53px (52 tall plus its rule) so focus scrolling never parks a control under it.
                className={`md:-mx-[13px] md:min-h-[120px] md:flex-1 md:overflow-y-auto md:overscroll-contain md:[scrollbar-gutter:stable] md:border-b md:border-b-[color:var(--border)] md:px-[13px] ${
                  view === "friend" ? "md:scroll-pt-[53px]" : ""
                }`}
              >
                <HoverPreviewProvider>
                {byDeck ? (
                  // Largest first unless the reader chose another order; an unselected deck keeps its place.
                  // One name-fit observer for every open group's rows (G6: per list, never per row).
                  deckGroups.length === 0 ? <NoMatch query={query} of={selectedLines.length} onDrop={() => chooseQuery("")} /> : <NameFitProvider>{deckGroups.map(({ deck: d, lines: deckLines }) => (
                    <CartDeckGroup
                      key={d.id}
                      deck={d}
                      lines={deckLines}
                      on={selected.has(d.id)}
                      open={open.has(d.id)}
                      priced={cart.priced}
                      deckNames={deckNames}
                      holders={holders}
                      selected={selected}
                      newestAsOf={newestAsOf}
                      onToggle={() => toggle(d.id)}
                      onFold={() => fold(d.id)}
                    />
                  ))}</NameFitProvider>
                ) : (
                  <CardOrFriendList
                    view={view}
                    lines={lines}
                    of={selectedLines.length}
                    read={readIds}
                    selected={selected}
                    query={query}
                    onDrop={() => chooseQuery("")}
                    sorts={sorts}
                    deckNames={deckNames}
                    holders={holders}
                    newestAsOf={newestAsOf}
                    friendShut={friendShut}
                    onFoldFriend={foldFriend}
                    hasFriends={hasFriends}
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
    </SpareReadState>
  );
  // Friends' spares (S5): one read of every card the cart lists, both views, outside the scroll box with the rest.
  const withSpares = socialFriends ? (
    <FriendSparesProvider oracleIds={sparesIds} newestAsOf={newestAsOf} hostSheet={false} requests={spareAsks} deckId={null}>{page}</FriendSparesProvider>
  ) : page;
  return buyEnabled ? (
    <CartGotItProvider deckNames={deckNames} newestAsOf={newestAsOf}>{withSpares}</CartGotItProvider>
  ) : withSpares;
}

/**
 * The column header (v2 call 1) above the list's scroll box: By card's while By card draws rows, By friend's while it
 * draws panels, and none over the no-match block.
 */
function ByCardColumns({
  view, lines, read, selected, query, hasFriends,
}: {
  view: CartViewMode;
  lines: SelectedLine[];
  read: ReadonlySet<string>;
  selected: ReadonlySet<string>;
  query: string;
  hasFriends: boolean;
}) {
  const drawn = useWithHeld(lines, read, selected, { query });
  const byFriend = useByFriend(drawn.lines, drawn.held);
  const v = shown(view, byFriend !== null);
  if (drawn.lines.length === 0) return null;
  // By friend's header stands over its panels and their skeletons, never over a dashed block (Empty-One B, R2 C).
  if (v === "friend") return friendBody(byFriend, hasFriends) === "panels" || friendBody(byFriend, hasFriends) === "reading" ? <CartColumns view="friend" /> : null;
  if (v !== "card") return null;
  return <CartColumns />;
}

/**
 * The view drawn. By friend is a view from first paint whenever spare requests are on (v2 G2), whatever its read says;
 * with them off (`useByFriend` null) it has no Ask to offer and draws as By card.
 */
function shown(view: CartViewMode, byFriend: boolean): CartViewMode {
  return view === "friend" && !byFriend ? "card" : view;
}

/** What By friend's list place holds: its panels, their skeleton, or one of the dashed blocks. */
function friendBody(b: ByFriend | null, hasFriends: boolean): "panels" | "reading" | "none" | "noFriends" | "failed" {
  if (!b) return "none";
  if (b.status === "groups") return "panels";
  // Without a friend there is nothing to wait for or to find (Empty-One C): the friend count read decides.
  if (!hasFriends && b.status !== "failed") return "noFriends";
  return b.status;
}

/**
 * Row 3 and the rest of the chassis for the view drawn (it replaced the list head): the search, the drawn view's sort and
 * the cart's sentence. `lines` are the lines the search leaves and `of` the selected lines before it. The sort is read and
 * set for the view DRAWN, since By friend draws as By card with spare requests off (and only then).
 */
function CartChassisRow({
  view, lines, of, read, selected, query, onQuery, sorts, onSort, deckGroups, sparesRead, hasFriends,
}: {
  view: CartViewMode;
  lines: SelectedLine[];
  of: number;
  read: ReadonlySet<string>;
  selected: ReadonlySet<string>;
  query: string;
  onQuery: (next: string) => void;
  sorts: CartSorts;
  onSort: (drawn: CartViewMode, next: string) => void;
  deckGroups: { deck: CartPayload["decks"][number]; lines: CartPayload["lines"] }[];
  /** The selected cards, whose read failing drops By card's spare clause (B2). */
  sparesRead: readonly string[];
  /** No friend: By friend's sentence is `0 friends`, reading or not, as its block is Empty-One C (`friendBody`). */
  hasFriends: boolean;
}) {
  const drawn = useWithHeld(lines, read, selected, { query });
  const friendView = useByFriend(drawn.lines, drawn.held);
  const byFriend = friendGroups(friendView);
  const spares = usePageSpares();
  const v = shown(view, friendView !== null);
  const failed = spares !== null && spareReadStatus(sparesRead, spares.loaded, spares.failed) === "failed";
  const sentence = (() => {
    if (v === "deck") {
      // The selected decks the search leaves, and the copies they still need of its lines.
      const kept = deckGroups.filter((g) => selected.has(g.deck.id));
      const copies = kept.reduce((n, g) => n + g.lines.reduce((m, l) => m + (l.rows.find((r) => r.deckId === g.deck.id)?.quantity ?? 0), 0), 0);
      // A search says how many cards are left, in any view (Controls C).
      return query.trim() ? copy.result.filtered(lines.length, of) : copy.result.byDeck(kept.length, copies);
    }
    if (v === "friend" && friendView && drawn.lines.length > 0) {
      // Loading C/D says what the view waits for, R2 C/D that it failed, Empty-One B/C `0 friends`.
      // The sentence follows the list's place (`friendBody`): No friends wins over reading.
      const body = friendBody(friendView, hasFriends);
      if (body === "reading") return copy.result.readingByFriend;
      if (body === "failed") return copy.result.failedByFriend;
      const groups = byFriend?.groups ?? [];
      return copy.result.byFriend(groups.length, groups.reduce((n, g) => n + g.spares, 0));
    }
    if (query.trim()) return copy.result.filtered(lines.length, of);
    // A failed read has no clause to give (R2 A): nothing may say how many cards have a spare.
    const withSpare = spares && !failed ? lines.filter((l) => (spares.byCard.get(l.oracleId)?.length ?? 0) > 0).length : 0;
    return withSpare > 0 ? copy.result.byCard(lines.length, withSpare) : copy.result.byCardNoSpare(lines.length);
  })();
  return (
    <CartChassis
      view={v}
      query={query}
      onQuery={onQuery}
      sort={sorts[v]}
      onSort={(next) => onSort(v, next)}
      resultLine={sentence}
      // By friend's own sentence says it is reading (Loading C), so the trailing clause is By card's and By deck's.
      reading={v !== "friend" && spares !== null && lines.some((l) => !spares.loaded.has(l.oracleId))}
    />
  );
}

/** A search that leaves nothing: the chassis's no-match shape, naming the one fix (call 10). */
function NoMatch({ query, of, onDrop }: { query: string; of: number; onDrop: () => void }) {
  const term = query.trim();
  return (
    <div data-cart-no-match className="flex flex-col items-start gap-[8px] rounded-[12px] border border-dashed border-[color:var(--border-dashed)] px-[22px] py-[26px]">
      <h2 className="m-0 text-[15px] font-semibold text-[color:var(--fg)]">{copy.noMatch.title}</h2>
      <p className="m-0 max-w-[440px] text-[13px] leading-[1.55] text-[color:var(--fg-body)]">{copy.noMatch.body(term, of)}</p>
      <button
        type="button"
        onClick={onDrop}
        className="mt-[4px] flex h-[44px] items-center gap-[8px] rounded-[10px] border border-[color:var(--border-strong)] px-[14px] text-[14px] text-[color:var(--fg)]"
      >
        {copy.noMatch.drop(term)}
      </button>
    </div>
  );
}

/** By card, or By friend: its panels, their skeleton while the read is out, or a dashed block. */
function CardOrFriendList({
  view, lines, of, read, selected, query, onDrop, sorts, deckNames, holders, newestAsOf, friendShut, onFoldFriend, hasFriends,
}: {
  view: CartViewMode;
  lines: SelectedLine[];
  of: number;
  read: ReadonlySet<string>;
  selected: ReadonlySet<string>;
  query: string;
  onDrop: () => void;
  sorts: CartSorts;
  deckNames: Map<string, string>;
  holders: Holders;
  newestAsOf: Date | null;
  friendShut: ReadonlySet<string>;
  onFoldFriend: (publicId: string) => void;
  hasFriends: boolean;
}) {
  const spares = usePageSpares();
  // By friend's lines keep the By card order whatever By card is sorted by (call 5): the panels are what it sorts.
  const drawn = useWithHeld(lines, read, selected, { query });
  const friendView = useByFriend(drawn.lines, drawn.held);
  const byFriend = friendGroups(friendView);
  const compare = useMemo(
    () => cardCompare(sorts.card, (id) => (spares?.byCard.get(id) ?? spares?.seen.get(id))?.reduce((n, s) => n + s.spare, 0) ?? 0),
    [sorts.card, spares],
  );
  const panels = useMemo(() => (byFriend ? sortGroups(byFriend.groups, sorts.friend) : null), [byFriend, sorts.friend]);
  // The held slot a purchase left counts: a search matching only the card just bought still draws it.
  if (drawn.lines.length === 0) return <NoMatch query={query} of={of} onDrop={onDrop} />;
  const body = view === "friend" && friendView ? friendBody(friendView, hasFriends) : null;
  if (body === "reading") return <ByFriendReading />;
  if (body === "none" || body === "noFriends") return <ByFriendEmpty kind={body} lines={drawn.lines.length} />;
  if (body === "failed") return <ByFriendEmpty kind="failed" onRetry={spares?.retry} />;
  if (body === "panels" && byFriend && panels) {
    return (
      <ByFriendList
        groups={panels}
        requests={byFriend.requests}
        held={drawn.held}
        deckNames={deckNames}
        ownOf={(line) => ownFact(line, selected, holders.rank, holders.names)}
        shut={friendShut}
        onFold={onFoldFriend}
        newestAsOf={newestAsOf}
      />
    );
  }
  return <ByCardList lines={lines} read={read} selected={selected} deckNames={deckNames} holders={holders} newestAsOf={newestAsOf} compare={compare} query={query} />;
}

/**
 * The row above the list: the view switch and the key. The switch draws By deck with two decks or more (E1) and By friend
 * from first paint with spare requests on (v2 G2: reading, empty or failed alike), and nothing with only By card. The key names the buy
 * press while a line has one (I got it on, by card or by friend) and the spare glyph while a line draws it (S5), which By
 * friend never does: its line's press is the Ask. Nothing at all with none of the three.
 */
function CartKeyRow({
  view, onView, byDeckView, lines, read, selected, showBuy, drawn, query, sparesRead,
}: {
  view: CartViewMode;
  onView: (v: CartViewMode) => void;
  byDeckView: boolean;
  lines: SelectedLine[];
  read: ReadonlySet<string>;
  selected: ReadonlySet<string>;
  showBuy: boolean;
  drawn: ReadonlySet<string>;
  /** The search, so the switch agrees with the list about which held slots are drawn. */
  query: string;
  /** The selected cards: after a failed read the spare item is hidden (B2). */
  sparesRead: readonly string[];
}) {
  const spares = usePageSpares();
  const withHeld = useWithHeld(lines, read, selected, { query });
  // By friend's segment shows from first paint with spare requests on (v2 G2), reading, empty or failed alike.
  const friendView = useByFriend(withHeld.lines, withHeld.held) !== null;
  const v = shown(view, friendView);
  const viewSwitch = byDeckView || friendView
    // An explicit `?view=deck` with one deck keeps its own segment, so the switch always shows the view it is on.
    ? <ViewSwitch view={v} onView={onView} deck={byDeckView || v === "deck"} friend={friendView} />
    : null;
  // While a drawn line's spares are still being read, the item shows ahead of them (v2 Loading A, plan A4): the glyph is
  // about to appear on the rows.
  const reading = spares !== null && [...drawn].some((id) => !spares.loaded.has(id));
  const failed = spares !== null && spareReadStatus(sparesRead, spares.loaded, spares.failed) === "failed";
  const showSpare = v !== "friend" && spares !== null && !failed && (reading || [...drawn].some((id) => spares.byCard.has(id)));
  if (!viewSwitch && !showBuy && !showSpare) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-[14px] gap-y-[10px]">
      {viewSwitch ?? <span />}
      {showBuy || showSpare ? (
        <span className="flex flex-wrap items-center gap-x-[14px] gap-y-[6px]">
          {showSpare ? <ShoppingKeySpare among={drawn} reading={reading} /> : null}
          {showBuy ? <ShoppingKeyBuy /> : null}
        </span>
      ) : null}
    </div>
  );
}

/**
 * The selected cards' friends' spares read, for the whole page (addendum R2 B2). After a failure the spare column is
 * closed for By card's and By deck's header and rows until Try again lands, and the shared toast says so once, with Try
 * again, at its shipped place. By friend says it in its list place instead, so it draws no toast; and one failure is said
 * once, so switching views never repeats it. A new failure, after a retry, is said again.
 */
function SpareReadState({ ids, view, children }: { ids: readonly string[]; view: CartViewMode; children: React.ReactNode }) {
  const spares = usePageSpares();
  const failed = spares !== null && spareReadStatus(ids, spares.loaded, spares.failed) === "failed";
  const [said, setSaid] = useState(false);
  const [toast, setToast] = useState<SocialToastState | null>(null);
  const [seq, setSeq] = useState(0);
  // Adjusted during render: the toast belongs to this failure, and leaves when it ends or By friend takes over saying it.
  if (failed && !said) {
    setSaid(true);
    if (view !== "friend" && spares) {
      setSeq(seq + 1);
      setToast({ id: seq + 1, text: copy.failedRead.toast, retry: { label: copy.failedRead.retry, run: spares.retry } });
    }
  }
  if (!failed && said) setSaid(false);
  if (toast && (!failed || view === "friend")) setToast(null);
  return (
    <SpareColumnContext.Provider value={!failed}>
      {children}
      <SocialToast toast={toast} onDone={() => setToast(null)} />
    </SpareColumnContext.Provider>
  );
}
