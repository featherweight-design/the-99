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
import { ShoppingKeyBuy } from "../shopping-key";
import { CartDeckGroup } from "./cart-deck-group";
import { DeckSelect } from "./deck-select";
import { ViewSwitch, type CartViewMode } from "./view-switch";
import { mirrorUrl } from "../../../lib/url/mirror";
import { PendingReporter } from "../../shell/pending-reporter";

/** By card: commanders first, then the cards most selected decks need, then A to Z (A2, A3). */
function byCardOrder(a: SelectedLine, b: SelectedLine): number {
  return Number(b.commander) - Number(a.commander)
    || b.selectedRows.length - a.selectedRows.length
    || a.name.localeCompare(b.name);
}

/**
 * The by-card list, with a line bought this visit that the read no longer lists kept as a held
 * slot where it was (S3), sorted among the rest by the line as it was drawn before the press.
 */
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
  const gotIt = useCartGotIt();
  // Gone from the read, and bought for a deck still selected: the slot belongs to the selection
  // it was bought in, and unselecting those decks takes it out with every other line of theirs.
  const gone = [...(gotIt?.held.values() ?? [])].filter((h) =>
    !read.has(h.line.oracleId) && h.line.selectedRows.some((r) => selected.has(r.deckId)));
  const rows = [
    ...lines.map((line) => ({ line, added: 0, held: false })),
    ...gone.map((h) => ({ line: h.line, added: h.added, held: true })),
  ].sort((a, b) => byCardOrder(a.line, b.line));
  return (
    <ul className="m-0 list-none p-0">
      {rows.map((r) => (r.held
        ? <CartHeldSlot key={r.line.oracleId} name={r.line.name} added={r.added} />
        : <CartLine key={r.line.oracleId} line={r.line} deckNames={deckNames} newestAsOf={newestAsOf} />))}
    </ul>
  );
}

export function CartView({
  cart,
  provenance,
  initialView = "card",
  focusDeckId = null,
  buyEnabled = false,
}: {
  cart: CartPayload;
  provenance: ProvenanceForm | null;
  /** I got it on a cart line (cart PR 6): `SHOPPING_MARK_BOUGHT_ENABLED` and its collection switch. */
  buyEnabled?: boolean;
  /** From `?view=deck`, or any `?deck=`: the tile's link lands on that deck's group. */
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
    if (next === "deck") live.set("view", "deck"); else live.delete("view");
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

  // Commanders first, then the cards most SELECTED decks need, then A to Z (A2, A3): the order is
  // re-read as decks are selected, and a line no selected deck needs drops out.
  const lines = useMemo(() => cart.lines
    .map((l) => selectLine(l, selected))
    .filter((l): l is SelectedLine => l !== null)
    .sort(byCardOrder), [cart.lines, selected]);
  // The page is one screen tall at both widths (Hugh, 2026-10-11), so the list scrolls in its own
  // box and the sort, the decks and the checkout stay on screen. Its top is measured rather than
  // assumed: the phone's shell header above it has no fixed height. Re-bound when the cart empties
  // or fills, since the empty page draws no list to size.
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

  const toggle = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const all = (on: boolean) => setSelected(on ? new Set(cart.decks.map((d) => d.id)) : new Set());

  const header = (
    <header className="flex flex-col gap-[4px] border-b border-b-[color:var(--border)] px-[16px] pt-[16px] pb-[12px] md:px-[22px] md:pt-[20px] md:pb-[16px]">
      <Link href="/decks" className="self-start font-mono text-[11px] text-[color:var(--fg-faint)]">
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
            <Link href="/decks" data-cart-empty-back className="flex min-h-[44px] items-center text-[13.5px] text-[color:var(--accent)]">
              {copy.empty.back}
              <PendingReporter href="/decks" />
            </Link>
          </div>
        </div>
      </div>
  ) : null;

  // `flex-none`: the shell's column is `min-h-screen` (100vh), taller than 100dvh while the
  // browser's bars show, and a growing page would take that slack and scroll the document.
  // Until the top is measured the phone reserves the shell header's usual height, so the first
  // paint is not a header taller than the screen. The phone also clears an open About sheet, as
  // the shell's own padding does. The list never shrinks under 120px: with the phone's deck
  // select open, the page scrolls rather than squeezing the list to nothing.
  const pageHeight = top === null
    ? "h-[calc(100dvh-var(--tabbar-h)-var(--about-sheet-h,0px)-64px)] md:h-dvh"
    : "h-[calc(100dvh-var(--tabbar-h)-var(--about-sheet-h,0px)-var(--cart-top))] md:h-[calc(100dvh-var(--cart-top))]";
  const page = empty ?? (
    <div
      ref={pageRef}
      className={`flex min-h-[420px] min-w-0 flex-none flex-col bg-[color:var(--bg)] font-sans ${pageHeight}`}
      style={top === null ? undefined : ({ "--cart-top": `${top}px` } as CSSProperties)}
    >
      {header}
      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] gap-[12px] px-[16px] pt-[12px] pb-[12px] md:grid-cols-[280px_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)] md:gap-x-[24px] md:px-[22px] md:pt-[18px] md:pb-[18px]">
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
              {/* The switch has nothing to switch between with one deck (E1); the buy key sits
                  beside it, alone, while there is a line to press. */}
              {cart.decks.length >= 2 || showKey ? (
                <div className="flex flex-wrap items-center justify-between gap-x-[14px] gap-y-[10px]">
                  {cart.decks.length >= 2 ? <ViewSwitch view={view} onView={chooseView} /> : <span />}
                  {showKey ? <ShoppingKeyBuy /> : null}
                </div>
              ) : null}
              <h2 className="m-0 font-mono text-[10px] font-normal uppercase tracking-[0.12em] text-[color:var(--fg-faint)]">
                {byDeck ? copy.list.headByDeck(deckCount, total.copies) : copy.list.headByCard(lines.length)}
              </h2>
              {/* The list is its own scroll box at both widths, filling what the page leaves, so the
                  controls above it stay put. Focusable and named, so a keyboard reader can scroll it. */}
              <div
                tabIndex={0}
                role="region"
                aria-label={copy.list.regionAria}
                className="-mx-[13px] min-h-[120px] flex-1 overflow-y-auto overscroll-contain border-b border-b-[color:var(--border)] px-[13px]"
              >
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
                  <ByCardList
                    lines={lines}
                    read={readIds}
                    selected={selected}
                    deckNames={deckNames}
                    newestAsOf={newestAsOf}
                  />
                )}
                <div
                  aria-hidden
                  className="pointer-events-none sticky bottom-0 -mt-[36px] h-[36px]"
                  style={{ background: "linear-gradient(to bottom, transparent, var(--bg))" }}
                />
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
  return buyEnabled ? (
    <CartGotItProvider deckNames={deckNames} newestAsOf={newestAsOf}>{page}</CartGotItProvider>
  ) : page;
}
