// /collection/proxies — the list.
//
// READ-ONLY by ruling. A row belongs to several decks and the sheet's control is
// per deck, so unmarking happens in the deck, reached by the deck names on each
// row. The alternative — a trailing cluster of N unmark controls per row — puts
// state-changing targets in a list whose job is to be read, where a mis-tap
// silently puts a deck back on the shopping list.

import { faceCosts } from "../../lib/cards/faces";
import Link from "next/link";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { CardDetailTrigger } from "../cards/card-detail-provider";
import { CostPips } from "../ui/cost-pips";
import { ACTION_SIZE, GhostButton, PrimaryButton } from "../ui/button";
import { formatCents, priceOf, priceState, provenanceForm } from "../../lib/decks/price";
import { proxyCopy } from "../../lib/copy/proxies";
import type { ProxyRow } from "../../lib/decks/proxy-list";

/** The two states that carry a real amount. `soldOut` does not: its figure is a
 *  last-known price for something nobody is selling. */
const costableState = (state: ReturnType<typeof priceState> | undefined) =>
  state === "priced" || state === "foilOnly";

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
        <GhostButton href="/decks" className={ACTION_SIZE}>{c.action}</GhostButton>
      ) : (
        <PrimaryButton href="/decks" className={ACTION_SIZE}>{c.noDecksAction}</PrimaryButton>
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
  // COSTABLE, not `priced`. `costToComplete` states the shared rule: a foil-only
  // card is genuinely for sale and contributes at its foil price, while a
  // sold-out one contributes nothing — its row is a last-known figure for
  // something nobody is selling, and quoting it puts a number in a total the
  // reader cannot spend.
  const costable = rows.filter((r) => r.price && costableState(states.get(r.oracleId)));
  const total = costable.reduce(
    (n, r) => n + (r.price ? priceOf(r.price, states.get(r.oracleId)!) ?? 0 : 0),
    0,
  );
  // The non-costable states are DIFFERENT facts and the copy says so. `absent`
  // covers TWO of them — no price row at all, and a live row whose three price
  // columns are all null — so the presence of the fact is what tells them apart.
  // Folded together, an existing ManaPool row was made to claim it had never
  // been stocked.
  const soldOut = rows.filter((r) => states.get(r.oracleId) === "soldOut").length;
  const neverStocked = rows.filter(
    (r) => states.get(r.oracleId) === "absent" && !r.price,
  ).length;
  // TABLE-level staleness, which row-to-row comparison cannot see: when the
  // newest run itself is old, every figure here is current relative to the
  // others and out of date against the shop. Disclosed once, beside the total,
  // exactly as the price strip does it.
  const provenance = newestAsOf ? provenanceForm(newestAsOf, new Date()) : null;

  return (
    // A SECTION, not a `main`: the shell already renders one around every route,
    // and a nested main landmark is invalid — it exposes two ambiguous main
    // regions to a screen reader.
    //
    // Centred from `md` at its existing max width (Hugh's ruling, #1222 follow-up —
    // reverses R2's left anchor, which started "What you're printing" under the Proxies
    // tab). The way back is the place head's Cards tab above it, which is why the
    // breadcrumb is gone.
    <section className="mx-auto w-full max-w-[900px] px-[16px] py-[20px] md:px-[34px] md:py-[28px]">
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
              {costable.length > 0 ? formatCents(total) : proxyCopy.cost.noneCostable}
            </span>{" "}
            {costable.length > 0 && (
              <span className="font-mono text-[11px]" style={{ color: "var(--fg-faint)" }}>
                {proxyCopy.cost.line(costable.length, rows.length)}
              </span>
            )}
            {/* The caveat, which is what makes the gap above it legible: a
                figure that covers 7 of 9 has to say WHY the other two are out,
                and "never stocked" is not the same fact as "sold out". This list
                can only tell the first — a card with no price row at all — so it
                says that one and nothing it cannot stand behind. */}
            {neverStocked > 0 && (
              <span className="ml-[6px] font-mono text-[11px]" style={{ color: "var(--fg-locked)" }}>
                {proxyCopy.cost.unpriced(neverStocked)}
              </span>
            )}
            {provenance?.behind && (
              <span className="ml-[6px] font-mono text-[11px]" style={{ color: "var(--fg-locked)" }}>
                {proxyCopy.cost.stale(provenance.when)}
              </span>
            )}
            {soldOut > 0 && (
              <span className="ml-[6px] font-mono text-[11px]" style={{ color: "var(--fg-locked)" }}>
                {proxyCopy.cost.soldOut(soldOut)}
              </span>
            )}
          </div>

          <CardDetailProvider>
            <ul className="m-0 list-none p-0">
              {rows.map((row) => (
                <li
                  key={row.oracleId}
                  className="relative flex items-center gap-[12px] rounded-[10px] px-[12px] py-[11px] min-h-[44px] hover:bg-[color:var(--elevated)]"
                >
                  <span className="min-w-0 flex-1">
                    {/* The whole row opens the card (H20): the card name's
                        button is stretched over the row by its `::after`, and
                        each deck link sits above that stretch on its own layer,
                        so neither swallows the other. The row itself stays a
                        container, never a button: a button cannot hold links. */}
                    <CardDetailTrigger
                      oracleId={row.oracleId}
                      name={row.name}
                      ariaLabel={proxyCopy.row.cardAria(row.name)}
                      className="text-[13px] block truncate text-left after:absolute after:inset-0 after:rounded-[10px] after:content-['']"
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
                          className="relative z-[1] truncate text-[color:var(--fg-muted)] underline underline-offset-2 decoration-[color:var(--border-strong)] hover:decoration-current"
                        >
                          {deck.name}
                        </Link>
                      ))}
                      {/* Ruling 3's case is otherwise invisible here — a legend
                          looks like any other card in this list. */}
                      {row.commander && (
                        <span
                          title={proxyCopy.row.commanderAria}
                          className="relative z-[1] rounded-[4px] px-[5px] py-[1px] text-[color:var(--fg-muted)] border border-[color:var(--border-strong)]"
                        >
                          {proxyCopy.row.commander}
                        </span>
                      )}
                    </span>
                  </span>

                  {/* EVERY printed cost, not the front face's alone. This sheet
                      stands in for the card you play with, and a proxy of
                      `Repudiate // Replicate` carrying one of its two costs is a
                      card you cannot cast the other half of.

                      The gate asks the same question the run does — does this
                      card print ANY cost — rather than `hasFrontFaceCost`, which
                      the rows use. A land-front, spell-back card has no front
                      cost and a real back one, and on this sheet that cost is
                      exactly what the reader needs. */}
                  {faceCosts(row.manaCost).length > 0 && (
                    // SPOKEN, which this row never did: the pips are aria-hidden
                    // and the card trigger's label is the name alone, so no cost
                    // was in the accessible tree at all — and the half this change
                    // adds would have been missing in the same way.
                    //
                    // A SIBLING of the trigger rather than part of its label,
                    // which is the pattern every cost-bearing surface here uses
                    // (`deck-card-tile.tsx` says why: a trigger's own accessible
                    // name replaces everything nested inside it, so a cost spoken
                    // in there is spoken nowhere). The cost is therefore read in
                    // browse mode and not announced on focus — the same trade the
                    // decklist rows make, and not one to change on this surface
                    // alone.
                    <CostPips cost={row.manaCost} allFaces spoken />
                  )}

                  {/* A BARE FIGURE, never a buy tag: `isShoppingCard` has just
                      removed every one of these from every Shopping list, and
                      drawing the tag they were removed from would put two
                      surfaces in direct disagreement. */}
                  <span
                    className={`font-mono text-[11.5px] flex-none ${
                      costableState(states.get(row.oracleId))
                        ? "text-[color:var(--fg-body)]"
                        : "text-[color:var(--fg-locked)]"
                    }`}
                  >
                    {/* `priced` OR `foilOnly`: the strip counts a live foil-only
                        card at its foil price, so a row saying `no stock` beside
                        it would have the same screen disagreeing with itself. */}
                    {row.price && costableState(states.get(row.oracleId))
                      ? formatCents(priceOf(row.price, states.get(row.oracleId)!) ?? 0)
                      : proxyCopy.row.noStock}
                  </span>
                </li>
              ))}
            </ul>
          </CardDetailProvider>
        </>
      )}
    </section>
  );
}
