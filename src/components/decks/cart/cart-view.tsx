"use client";

// CartView — Shopping for all decks, by card (handoff A2–A4, K2/K3, T1/T2, E1–E3, P1). The
// selections are state for this visit only (Hugh's answer to Q1): leaving the page drops them, and
// nothing here writes (lock 8). Every figure is a sum over the server's rows (`lib/decks/cart`), so
// a deck's number here is its tile's number.

import Link from "next/link";
import { useMemo, useState } from "react";
import { allDecksCartCopy as copy } from "../../../lib/copy/all-decks-cart";
import type { ProvenanceForm } from "../../../lib/decks/price";
import { cartTotal, checkoutLinks, selectLine, type CartPayload, type SelectedLine } from "../../../lib/decks/cart";
import { CartCheckout } from "./cart-checkout";
import { CartLine } from "./cart-line";
import { CartDeckGroup } from "./cart-deck-group";
import { DeckSelect } from "./deck-select";
import { ViewSwitch, type CartViewMode } from "./view-switch";
import { mirrorUrl } from "../../../lib/url/mirror";
import { PendingReporter } from "../../shell/pending-reporter";

export function CartView({
  cart,
  provenance,
  initialView = "card",
  focusDeckId = null,
}: {
  cart: CartPayload;
  provenance: ProvenanceForm | null;
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
    .sort((a, b) =>
      Number(b.commander) - Number(a.commander)
      || b.selectedRows.length - a.selectedRows.length
      || a.name.localeCompare(b.name)), [cart.lines, selected]);
  const total = cartTotal(cart.decks, selected);
  const links = useMemo(() => checkoutLinks(cart.lines, selected), [cart.lines, selected]);
  const deckCount = cart.decks.filter((d) => selected.has(d.id)).length;
  // An explicit `?view=deck` or `?deck=` arrival is honoured with one deck too; only the switch
  // hides there (E1), since both views list the same cards.
  const byDeck = view === "deck";
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

  // E3: no deck is missing a card. Reached only by a direct visit; nothing links here then.
  if (cart.decks.length === 0) {
    return (
      <div className="flex min-w-0 flex-auto flex-col bg-[color:var(--bg)] font-sans">
        {header}
        <div className="flex min-h-[600px] flex-1 items-center justify-center px-[24px] py-[40px] md:min-h-[480px] md:px-[22px] md:py-[60px]">
          <div className="flex max-w-[420px] flex-col items-center gap-[8px] text-center">
            <h2 className="m-0 font-display text-[20px] text-[color:var(--fg)]">{copy.empty.title}</h2>
            <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--fg-body)]">{copy.empty.body(cart.totalDecks)}</p>
            <Link href="/decks" className="flex min-h-[44px] items-center text-[13.5px] text-[color:var(--accent)]">
              {copy.empty.back}
              <PendingReporter href="/decks" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-auto flex-col bg-[color:var(--bg)] font-sans">
      {header}
      <div className="grid grid-cols-1 gap-[14px] px-[16px] pt-[14px] pb-0 [grid-template-areas:'selections'_'list'_'checkout'] md:grid-cols-[280px_minmax(0,1fr)] md:grid-rows-[auto_1fr] md:items-start md:gap-x-[24px] md:gap-y-[14px] md:px-[22px] md:pt-[18px] md:pb-0 md:[grid-template-areas:'selections_list'_'checkout_list']">
        <DeckSelect decks={cart.decks} selected={selected} priced={cart.priced} onToggle={toggle} onAll={all} />

        <section className="flex min-w-0 flex-col gap-[12px] [grid-area:list]">
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
              {/* The switch has nothing to switch between with one deck (E1). */}
              {cart.decks.length >= 2 ? (
                <div className="flex flex-wrap items-center justify-between gap-x-[14px] gap-y-[10px]">
                  <ViewSwitch view={view} onView={chooseView} />
                </div>
              ) : null}
              <h2 className="m-0 font-mono text-[10px] font-normal uppercase tracking-[0.12em] text-[color:var(--fg-faint)]">
                {byDeck ? copy.list.headByDeck(deckCount, total.copies) : copy.list.headByCard(lines.length)}
              </h2>
              {/* P1: on a phone the list is its own scroll box so the checkout stays docked under
                  it. Focusable and named, so a keyboard reader can scroll it. */}
              <div
                tabIndex={0}
                role="region"
                aria-label={copy.list.regionAria}
                className="-mx-[13px] max-h-[460px] overflow-y-auto overscroll-contain border-b border-b-[color:var(--border)] px-[13px] md:mx-0 md:max-h-none md:overflow-visible md:border-b-0 md:px-0"
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
                  <ul className="m-0 list-none p-0">
                    {lines.map((line) => (
                      <CartLine key={line.oracleId} line={line} deckNames={deckNames} newestAsOf={newestAsOf} />
                    ))}
                  </ul>
                )}
                <div
                  aria-hidden
                  className="pointer-events-none sticky bottom-0 -mt-[36px] h-[36px] md:hidden"
                  style={{ background: "linear-gradient(to bottom, transparent, var(--bg))" }}
                />
              </div>
            </>
          )}
        </section>

        {/* Docked: under the list on a phone (P1, full bleed on the rail), and sticky under the
            selections on desktop. */}
        <div className="sticky bottom-[var(--tabbar-h)] z-20 -mx-[16px] mt-[8px] border-t border-t-[color:var(--border-strong)] bg-[color:var(--surface-rail)] px-[16px] pt-[10px] pb-[16px] [grid-area:checkout] md:top-[18px] md:bottom-auto md:mx-0 md:mt-0 md:border-t-0 md:bg-transparent md:p-0">
          <CartCheckout total={total} deckCount={deckCount} priced={cart.priced} provenance={provenance} links={links} />
        </div>
      </div>
    </div>
  );
}
