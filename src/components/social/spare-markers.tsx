"use client";
// Friends' spares on a deck's rows (Social R2 PR A; handoff R3 `Spares` S1 to S4, foil addendum #1875): one read of every
// card the deck is buying, the row's one other-ways press (⇄ and the spare glyph) on line 2 at both widths, the Shopping
// key's item, and the spares-only modal the press opens when the swap tools are off.
//
// Spares land after the page, so a row draws the glyph only once the read arrives; the press keeps no slot (#1875: neither
// is no press). Off, the provider is not mounted and every piece here draws nothing.

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { FriendSpare } from "../../lib/social/spares";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import { printedFaceName } from "../../lib/collection/browse";
import { spareCopy } from "../../lib/copy/social";
import { MAX_SPARES_BATCH } from "../../lib/social/client-rules";
import { useSwapTools } from "../../lib/swaps/context";
import { CardDetailTrigger } from "../cards/card-detail-provider";
import { BuyTag } from "../decks/buy-tag";
import { HoverPreviewProvider } from "../decks/hover-preview";
import { ModalChrome } from "../decks/receipt-modal";
import { ReplacingLine, Thumb } from "../decks/stand-ins-sheet";
import { FriendSpareSection, SpareGlyph } from "./friend-spares";

/** The route's own batch cap: a longer list is read in pieces, never cut. One constant, so the two cannot part. */
export const SPARES_PAGE_BATCH = MAX_SPARES_BATCH;

/**
 * Every asked card's spares, read in batches after the page. A batch that fails reads as none (G3): the marker is
 * absent on failure, never an error a row has to draw.
 */
export async function fetchSpares(oracleIds: readonly string[]): Promise<FriendSpare[]> {
  const out: FriendSpare[] = [];
  for (let i = 0; i < oracleIds.length; i += SPARES_PAGE_BATCH) {
    const ids = oracleIds.slice(i, i + SPARES_PAGE_BATCH);
    try {
      const res = await fetch(`/api/friend-spares?ids=${ids.map(encodeURIComponent).join(",")}`, { cache: "no-store" });
      if (!res.ok) continue;
      const body = (await res.json()) as { spares?: FriendSpare[] } | null;
      if (Array.isArray(body?.spares)) out.push(...body.spares);
    } catch {
      // Absent on failure: the next batch still reads.
    }
  }
  return out;
}

type Ctx = {
  /** The cards with a spare, and their friends. */
  byCard: ReadonlyMap<string, FriendSpare[]>;
  /** The card whose spares-only modal is open (swap tools off), or null. */
  opened: DeckDetailCard | null;
  open: (card: DeckDetailCard) => void;
  close: () => void;
};

const SparesContext = createContext<Ctx | null>(null);

/** Null outside the provider: the switch is off, and no row reserves the column. */
export function usePageSpares(): Ctx | null {
  return useContext(SparesContext);
}

export function FriendSparesProvider({
  oracleIds,
  newestAsOf,
  children,
}: {
  /** The cards the deck is buying: one read covers every row that can carry a marker. */
  oracleIds: readonly string[];
  newestAsOf: Date | null;
  children: React.ReactNode;
}) {
  const key = useMemo(() => [...new Set(oracleIds)].sort().join(","), [oracleIds]);
  const [spares, setSpares] = useState<FriendSpare[]>([]);
  const [opened, setOpened] = useState<DeckDetailCard | null>(null);
  useEffect(() => {
    if (!key) return;
    let live = true;
    void fetchSpares(key.split(",")).then((rows) => {
      if (live) setSpares(rows);
    });
    return () => {
      live = false;
    };
  }, [key]);
  const value = useMemo<Ctx>(() => {
    // Only the cards asked for NOW: a card that left the list (bought, cut, proxied) drops its spare at once, the
    // empty list included, rather than when a later read lands.
    const asked = new Set(key ? key.split(",") : []);
    const byCard = new Map<string, FriendSpare[]>();
    for (const s of spares) if (asked.has(s.oracleId)) byCard.set(s.oracleId, [...(byCard.get(s.oracleId) ?? []), s]);
    return { byCard, opened, open: setOpened, close: () => setOpened(null) };
  }, [spares, opened, key]);
  return (
    <SparesContext.Provider value={value}>
      {children}
      {opened ? (
        <SparesSheet card={opened} spares={value.byCard.get(opened.oracleId) ?? []} newestAsOf={newestAsOf} onClose={value.close} />
      ) : null}
    </SparesContext.Provider>
  );
}

/**
 * The row's one other-ways press (#1875: a single press on the card row's second line, at both widths): ⇄ when a
 * cheaper stand-in can be looked for, the spare glyph when a friend holds a spare, both in that order, and nothing at
 * all when neither (no slot is kept: the buy tag sits at the right). It opens the stand-ins modal, which names the
 * friends too (PR 8a), or with the swap tools off the spares-only modal.
 */
export function OtherWaysPress({
  card,
  openStandIns,
  standIn,
  standInAria,
  limitFigure,
  className = "",
}: {
  card: DeckDetailCard;
  /** Opens the row's stand-ins modal: a deck row with the swap tools on whose card may be cut (never a locked one).
   *  Absent, the press opens the spares-only modal. */
  openStandIns?: () => void;
  /** The row may look for cheaper stand-ins (the swap tools' over-limit rule, decided by the row). */
  standIn: boolean;
  /** The row's shipped name for ⇄ alone. */
  standInAria: string;
  /** The limit `over` names, for the press's name when it holds both. */
  limitFigure: string;
  /** The row's line-2 placement classes. */
  className?: string;
}) {
  const ctx = usePageSpares();
  const tools = useSwapTools();
  const spare = ctx?.byCard.has(card.oracleId) ?? false;
  const swap = standIn && tools !== null && openStandIns !== undefined;
  if (!swap && !spare) return null;
  const name = printedFaceName(card);
  const label = swap && spare ? spareCopy.pressBothAria(name, limitFigure) : swap ? standInAria : spareCopy.markerAria(name);
  const on = tools && openStandIns ? tools.standIns?.oracleId === card.oracleId : ctx?.opened?.oracleId === card.oracleId;
  return (
    <button
      type="button"
      data-testid="other-ways"
      aria-label={label}
      aria-haspopup="dialog"
      aria-expanded={on}
      onClick={() => (tools && openStandIns ? openStandIns() : ctx?.open(card))}
      // The phone keeps the shipped 44px-tall hit around the 36px press it draws, as wide as the press (#1875 sets it
      // flush beside the tag); from md the hit is the press.
      className={`flex h-[44px] flex-none cursor-pointer items-center justify-center border-0 bg-transparent p-0 md:h-auto${className}`}
    >
      <span
        aria-hidden="true"
        // No pressed fill (#1875 draws none): the open modal is the state, and aria-expanded says it.
        className="flex h-[36px] items-center gap-[8px] rounded-[9px] bg-transparent px-[10px] [border:1px_solid_var(--border-strong)] md:h-[26px] md:gap-[6px] md:rounded-[6px] md:px-[7px]"
      >
        {swap ? <span className="font-mono text-[16px] leading-none text-[color:var(--warning)] md:text-[14px]">⇄</span> : null}
        {spare ? (
          <span className="flex text-[color:var(--fact)]" data-testid="spare-glyph">
            <SpareGlyph size={16} />
          </span>
        ) : null}
      </span>
    </button>
  );
}

/** The key's item, drawn only while a spare is (S2: none in S1). */
export function SpareKeyItem({ className }: { className: string }) {
  const ctx = usePageSpares();
  if (!ctx || ctx.byCard.size === 0) return null;
  return (
    <span className={className} data-testid="spare-key">
      <span className="flex w-[18px] justify-center text-[color:var(--fact)]">
        <SpareGlyph size={16} />
      </span>
      {spareCopy.key}
    </span>
  );
}

/**
 * The spares-only modal (plan, "Stand-ins modal"): opened by the press where no stand-ins can be read (the swap tools
 * off here; the cart in PR B). The stand-ins modal's shell and Replacing box, with no deck line and no job line,
 * since both come from the stand-ins read; then the friends.
 */
export function SparesSheet({
  card,
  spares,
  newestAsOf,
  onClose,
}: {
  card: DeckDetailCard;
  spares: readonly FriendSpare[];
  newestAsOf: Date | null;
  onClose: () => void;
}) {
  const name = printedFaceName(card);
  return (
    <HoverPreviewProvider waitForMove>
      <ModalChrome title={spareCopy.modalTitleSpares} closeLabel={spareCopy.close} onClose={onClose} width={640}>
        <div data-testid="spares-sheet" className="flex flex-col gap-[12px] px-[16px] pb-[24px] pt-[14px] md:gap-[14px] md:px-[18px] md:pb-[18px] md:pt-[16px]">
          <section
            className="flex flex-col gap-[6px] rounded-[10px] border border-[color:var(--border)] px-[13px] pb-[12px] pt-[11px]"
            style={{ background: "var(--bg)" }}
          >
            <span className="font-mono text-[9.5px] uppercase tracking-[0.12em]" style={{ color: "var(--fg-faint)" }}>
              {spareCopy.replacing}
            </span>
            <ReplacingLine imageUri={card.imageUri ?? null}>
              <Thumb imageUri={card.imageUri ?? null} side="head" />
              <span aria-hidden="true" className="h-[7px] w-[7px] flex-none rounded-full" style={{ border: "1px dashed var(--fg-faint)" }} />
              <CardDetailTrigger
                oracleId={card.oracleId}
                name={name}
                className="cursor-pointer border-0 bg-transparent p-0 text-left text-[14px] font-semibold"
                style={{ color: "var(--fg)", borderBottom: "1px dotted var(--accent)" }}
              >
                {name}
              </CardDetailTrigger>
              <BuyTag variant="row" price={card.price ?? null} newestAsOf={newestAsOf} />
            </ReplacingLine>
          </section>
          <FriendSpareSection spares={spares} />
        </div>
      </ModalChrome>
    </HoverPreviewProvider>
  );
}
