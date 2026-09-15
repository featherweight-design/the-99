// /collection/proxies — the list.
//
// READ-ONLY by ruling. A row belongs to several decks and the sheet's control is
// per deck, so unmarking happens in the deck, reached by the deck names on each
// row. The alternative — a trailing cluster of N unmark controls per row — puts
// state-changing targets in a list whose job is to be read, where a mis-tap
// silently puts a deck back on the shopping list.

import Link from "next/link";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { CardDetailTrigger } from "../cards/card-detail-provider";
import { CostPips } from "../ui/cost-pips";
import { GhostButton, PrimaryButton } from "../ui/button";
import { formatCents, priceOf, priceState } from "../../lib/decks/price";
import { proxyCopy } from "../../lib/copy/proxies";
import type { ProxyRow } from "../../lib/decks/proxy-list";

function Empty({ hasDecks }: { hasDecks: boolean }) {
  // Two branches naming two different preconditions. An empty state that names
  // the wrong one sends the reader somewhere that cannot help them.
  const c = proxyCopy.empty;
  return (
    <div className="px-[14px] pt-[24px] pb-[28px] text-center">
      <p className="font-display font-semibold text-[18px] m-0" style={{ color: "var(--fg)" }}>
        {hasDecks ? c.heading : c.noDecksHeading}
      </p>
      <p
        className="text-[13.5px] leading-[1.6] mt-[8px] mx-auto mb-[16px] max-w-[320px]"
        style={{ color: "var(--fg-body)" }}
      >
        {hasDecks ? c.body : c.noDecksBody}
      </p>
      {/* Ghost where the act lives elsewhere, filled where there genuinely IS
          one next act — a player with no decks has exactly one. */}
      {hasDecks ? (
        <GhostButton href="/decks">{c.action}</GhostButton>
      ) : (
        <PrimaryButton href="/decks">{c.noDecksAction}</PrimaryButton>
      )}
    </div>
  );
}

export function ProxyListView({
  rows,
  newestAsOf,
  hasDecks,
  hasCollection,
}: {
  rows: ProxyRow[];
  /** The newest run in the price table — what `priceState` compares each row's
   *  own `asOf` against to tell live stock from a frozen last-known figure. */
  newestAsOf: Date | null;
  hasDecks: boolean;
  hasCollection: boolean;
}) {
  const deckCount = new Set(rows.flatMap((r) => r.decks.map((d) => d.id))).size;
  // Each row's STATE, via the app's own rule rather than a null check: a card
  // can be priced, foil-only at a different figure, sold out with a frozen
  // price, or never stocked at all, and only the first belongs in a total.
  const states = new Map(rows.map((r) => [r.oracleId, priceState(r.price, newestAsOf)]));
  const priced = rows.filter((r) => states.get(r.oracleId) === "priced");
  const total = priced.reduce(
    (n, r) => n + (r.price ? priceOf(r.price, "priced") ?? 0 : 0),
    0,
  );
  const unpriced = rows.length - priced.length;

  return (
    <main className="mx-auto w-full max-w-[900px] px-[16px] py-[20px] md:px-[34px] md:py-[28px]">
      <p className="font-mono text-[11px] mb-[6px]" style={{ color: "var(--fg-faint)" }}>
        {proxyCopy.page.breadcrumb}
      </p>
      <h1 className="font-display text-[24px] md:text-[28px]" style={{ color: "var(--fg)" }}>
        {proxyCopy.page.title}
      </h1>

      {rows.length === 0 ? (
        <Empty hasDecks={hasDecks} />
      ) : (
        <>
          <p className="mt-[4px] mb-[14px] text-[13px]" style={{ color: "var(--fg-muted)" }}>
            {hasCollection
              ? proxyCopy.page.subtitleWithCollection(rows.length, deckCount)
              : proxyCopy.page.subtitle(rows.length, deckCount)}
          </p>

          {/* The money, and it ALWAYS states its own gap: a bare total would
              quietly cover fewer cards than the list above it. */}
          <div
            className="rounded-[10px] px-[12px] py-[10px] mb-[14px]"
            style={{ background: "var(--surface-rail)" }}
          >
            <span className="font-mono text-[11px]" style={{ color: "var(--fg-faint)" }}>
              {proxyCopy.cost.label}
            </span>{" "}
            <span className="font-mono text-[13px]" style={{ color: "var(--fg)" }}>
              {priced.length > 0 ? formatCents(total) : proxyCopy.cost.noneCostable}
            </span>{" "}
            {priced.length > 0 && (
              <span className="font-mono text-[11px]" style={{ color: "var(--fg-faint)" }}>
                {proxyCopy.cost.line(priced.length, rows.length)}
              </span>
            )}
            {/* The caveat, which is what makes the gap above it legible: a
                figure that covers 7 of 9 has to say WHY the other two are out,
                and "never stocked" is not the same fact as "sold out". This list
                can only tell the first — a card with no price row at all — so it
                says that one and nothing it cannot stand behind. */}
            {unpriced > 0 && (
              <span className="ml-[6px] font-mono text-[11px]" style={{ color: "var(--fg-locked)" }}>
                {proxyCopy.cost.unpriced(unpriced)}
              </span>
            )}
          </div>

          <CardDetailProvider>
            <ul className="m-0 list-none p-0">
              {rows.map((row) => (
                <li
                  key={row.oracleId}
                  className="flex items-center gap-[12px] rounded-[10px] px-[12px] py-[11px] min-h-[44px] hover:bg-[color:var(--elevated)]"
                >
                  <span className="min-w-0 flex-1">
                    {/* The row is a CONTAINER, never a button: the card name
                        opens the sheet and each deck name is its own link, so a
                        row-level target would swallow both. */}
                    <CardDetailTrigger
                      oracleId={row.oracleId}
                      name={row.name}
                      ariaLabel={proxyCopy.row.cardAria(row.name)}
                      className="text-[13px] block truncate text-left"
                    >
                      {row.name}
                    </CardDetailTrigger>
                    {/* The printing identity the loader carries, which is what
                        tells two same-named cards apart — and what the commander
                        plate sits after. */}
                    {(row.setCode || row.rarity) && (
                      <span className="mt-[2px] block font-mono text-[10.5px] uppercase tracking-[0.06em] text-[color:var(--fg-faint)]">
                        {[row.setCode, row.rarity].filter(Boolean).join(" · ")}
                      </span>
                    )}
                    <span className="mt-[2px] flex flex-wrap items-center gap-x-[8px] gap-y-[2px] font-mono text-[11px]">
                      {row.decks.map((deck) => (
                        <Link
                          key={deck.id}
                          href={`/decks/${deck.id}`}
                          aria-label={proxyCopy.row.deckAria(deck.name)}
                          className="truncate text-[color:var(--fg-muted)] underline underline-offset-2 decoration-[color:var(--border-strong)] hover:decoration-current"
                        >
                          {deck.name}
                        </Link>
                      ))}
                      {/* Ruling 3's case is otherwise invisible here — a legend
                          looks like any other card in this list. */}
                      {row.commander && (
                        <span
                          title={proxyCopy.row.commanderAria}
                          className="rounded-[4px] px-[5px] py-[1px] text-[color:var(--fg-muted)] border border-[color:var(--border-strong)]"
                        >
                          {proxyCopy.row.commander}
                        </span>
                      )}
                    </span>
                  </span>

                  {row.manaCost && <CostPips cost={row.manaCost} />}

                  {/* A BARE FIGURE, never a buy tag: `isShoppingCard` has just
                      removed every one of these from every Shopping list, and
                      drawing the tag they were removed from would put two
                      surfaces in direct disagreement. */}
                  <span
                    className={`font-mono text-[11.5px] flex-none ${
                      states.get(row.oracleId) === "priced"
                        ? "text-[color:var(--fg-body)]"
                        : "text-[color:var(--fg-locked)]"
                    }`}
                  >
                    {states.get(row.oracleId) === "priced"
                      ? formatCents(row.price ? priceOf(row.price, "priced") ?? 0 : 0)
                      : proxyCopy.row.noStock}
                  </span>
                </li>
              ))}
            </ul>
          </CardDetailProvider>
        </>
      )}
    </main>
  );
}
