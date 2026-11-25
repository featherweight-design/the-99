"use client";

// Collection quick filters (R2): the combos view, drawn in place of the card list while Two-card combos is pressed.
// Pairs, not cards: own both (Find a deck, How it works) or own one (the missing card, its price or the draft that
// wants it, Add to wishlist). One request fetches both sides (`useCollectionCombos`), so both toggle counts are known
// when the list draws; the Collection's filters narrow the pairs in `browser.tsx`. The route is `private, no-store`
// and the list payload carries only the chip's count.
import { useEffect, useState } from "react";
import { addToWishlistAction } from "../../app/collection/wishlist/actions";
import { comboOpenOpts, useCardDetail } from "../cards/card-detail-context";
import { ComboGlyph } from "../cards/combo-glyph";
import { PreviewButton } from "../ui/preview-button";
import { RowSkeleton } from "../ui/tile-skeleton";
import { useStoreInfo } from "../stores/store-provider";
import { formatCents } from "../../lib/cards/price-fact";
import { quickFilterCopy } from "../../lib/copy/quick-filters";
import { isInfiniteOrGameEnding } from "../../lib/spellbook/combo-features";
import type { CollectionComboPair, CollectionComboSides, ComboPiece, ComboSide } from "../../lib/combos/collection-combos";

const copy = quickFilterCopy.combos;

/** The result word: Spellbook's own name for what the loop makes, the unbounded or game-ending one first. */
export function comboResultWord(produces: readonly string[]): string | null {
  return produces.find((f) => isInfiniteOrGameEnding([f])) ?? produces[0] ?? null;
}

export type CombosLoad = { kind: "loading" } | { kind: "failed" } | { kind: "ready"; sides: CollectionComboSides };

/**
 * Both sides in one request, fetched when the view is first open and kept for as long as `version` (the list
 * payload the page served) is the same one: a refresh that brings new cards fetches again, a toggle or a filter
 * costs nothing. A failed fetch is asked for again by the next press of the chip or Try again.
 */
export function useCollectionCombos(open: boolean, version: unknown): { load: CombosLoad; retry: () => void } {
  const [held, setHeld] = useState<{ version: unknown; load: CombosLoad } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const current = held !== null && held.version === version ? held.load : null;
  const settled = current?.kind === "ready";
  useEffect(() => {
    if (!open || settled) return;
    let live = true;
    const land = (load: CombosLoad) => live && setHeld({ version, load });
    fetch("/api/collection-combos", { credentials: "same-origin" })
      .then((r) => (r.ok ? (r.json() as Promise<CollectionComboSides | null>) : null))
      .then((sides) => land(sides ? { kind: "ready", sides } : { kind: "failed" }))
      .catch(() => land({ kind: "failed" }));
    return () => {
      live = false;
    };
  }, [open, settled, version, attempt]);
  // A retry drops the failed entry first, so the view shows loading again and the press reads as taken.
  const retry = () => {
    setHeld(null);
    setAttempt((n) => n + 1);
  };
  return { load: current ?? { kind: "loading" }, retry };
}

/** A card of the pair. With `onOpen` (the desktop card) it is a row card: hover preview plus the press that opens its details. */
function Piece({ piece, width, missing, onOpen }: { piece: ComboPiece; width: number; missing: boolean; onOpen?: (piece: ComboPiece, opener: HTMLElement) => void }) {
  const h = Math.round(width * 1.395);
  if (missing) {
    return (
      <span
        data-combo-missing
        style={{ width, height: h }}
        className="flex flex-none flex-col items-center justify-center gap-[2px] rounded-[8px] border border-dashed border-[color:var(--border-dashed)] text-center"
      >
        <span aria-hidden className="text-[16px] text-[color:var(--fg-muted)]">+</span>
        {width > 100 ? (
          <>
            <span className="px-[6px] text-[12px] font-semibold text-[color:var(--fg-body)]">{piece.name}</span>
            <span className="font-mono text-[10px] text-[color:var(--fg-faint)]">{copy.notOwned}</span>
          </>
        ) : null}
      </span>
    );
  }
  const art = piece.imageUri ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={piece.imageUri} alt="" loading="lazy" style={{ width, height: h }} className="flex-none rounded-[8px] object-cover" />
  ) : (
    <span aria-hidden style={{ width, height: h }} className="flex-none rounded-[8px] border border-[color:var(--border)] bg-[color:var(--surface)]" />
  );
  if (!onOpen) return art;
  return (
    <PreviewButton
      imageUri={piece.imageUri}
      type="button"
      data-combo-card
      aria-label={piece.name}
      onClick={(e) => onOpen(piece, e.currentTarget)}
      className="flex-none cursor-pointer border-0 bg-transparent p-0"
    >
      {art}
    </PreviewButton>
  );
}

/** Own both: the deck that holds the pair, or the plain fact that none does. Own one: what the missing card is and costs, or who wants it. */
function useFact(pair: CollectionComboPair, side: ComboSide): string {
  const store = useStoreInfo().name;
  if (side === "both") return pair.heldIn ? copy.bothIn(pair.heldIn.name) : copy.inNoDeck;
  const missing = pair.a.oracleId === pair.missingId ? pair.a : pair.b;
  const tail =
    pair.wantedBy && pair.wantedBy.length > 0
      ? copy.wantedBy(pair.wantedBy[0].name)
      : typeof pair.missingCents === "number"
        ? copy.priced(formatCents(pair.missingCents), store)
        : null;
  return tail ? `${copy.missing(missing.name)} · ${tail}` : copy.missing(missing.name);
}

function PairCard({
  pair,
  side,
  isNew,
  wide,
  onOpen,
  onOpenPiece,
  onFind,
}: {
  pair: CollectionComboPair;
  side: ComboSide;
  isNew: boolean;
  wide: boolean;
  onOpen: (pair: CollectionComboPair, opener: HTMLElement) => void;
  onOpenPiece: (piece: ComboPiece, opener: HTMLElement) => void;
  onFind: (pair: CollectionComboPair, opener: HTMLElement) => void;
}) {
  const fact = useFact(pair, side);
  const result = comboResultWord(pair.produces);
  const width = wide ? 118 : 54;
  const [wished, setWished] = useState(false);
  const missingPiece = pair.missingId === pair.a.oracleId ? pair.a : pair.b;
  // Own one: the card you own leads (left, bold), the missing one follows. Own both keeps the pair's order.
  const [first, second] = side === "one" && missingPiece === pair.a ? [pair.b, pair.a] : [pair.a, pair.b];
  const names = (
    <span data-combo-title className="min-w-0 text-[14px] font-semibold leading-[1.3] text-[color:var(--fg)] md:text-[15px]">
      {first.name} <span className="font-normal text-[color:var(--fg-muted)]">+ {second.name}</span>
      {isNew ? (
        <span data-combo-new className="ml-[8px] rounded-[4px] border border-[color:var(--accent)] px-[5px] font-mono text-[10px] font-normal text-[color:var(--accent-text)]">{copy.newTag}</span>
      ) : null}
    </span>
  );
  const pieces = (
    <span className="flex flex-none items-center gap-[10px]">
      <Piece piece={first} width={width} missing={side === "one" && pair.missingId === first.oracleId} onOpen={wide ? onOpenPiece : undefined} />
      <ComboGlyph />
      <Piece piece={second} width={width} missing={side === "one" && pair.missingId === second.oracleId} onOpen={wide ? onOpenPiece : undefined} />
    </span>
  );
  const text = (
    <span className="flex min-w-0 flex-1 flex-col gap-[4px] text-left">
      {names}
      {result ? <span className="text-[13px] text-[color:var(--fg-body)]">{result}</span> : null}
      <span className="font-mono text-[11px] leading-[1.45] text-[color:var(--fg-muted)]">{fact}</span>
    </span>
  );
  if (!wide) {
    return (
      <li>
        <PreviewButton
          imageUri={first.imageUri}
          type="button"
          data-combo-pair
          aria-label={quickFilterCopy.combos.pairLabel(first.name, second.name)}
          onClick={(e) => onOpen(pair, e.currentTarget)}
          className="flex w-full cursor-pointer items-center gap-[12px] rounded-[10px] border border-solid border-[color:var(--border)] bg-transparent p-[12px] text-left"
        >
          {pieces}
          {text}
          <span aria-hidden className="flex-none text-[color:var(--fg-muted)]">›</span>
        </PreviewButton>
      </li>
    );
  }
  return (
    <li data-combo-pair className="flex gap-[18px] rounded-[10px] border border-solid border-[color:var(--border)] p-[20px]">
      {pieces}
      <span className="flex min-w-0 flex-1 flex-col gap-[10px]">
        {text}
        <span className="flex flex-wrap items-center gap-[14px]">
          {side === "both" ? (
            <button type="button" data-combo-find onClick={(e) => onFind(pair, e.currentTarget)} className="min-h-[44px] cursor-pointer rounded-[8px] border border-solid border-[color:var(--border)] bg-transparent px-[14px] text-[13px] font-semibold text-[color:var(--fg)]">
              {copy.findADeck}
            </button>
          ) : (
            <button
              type="button"
              data-combo-wish
              disabled={wished}
              onClick={() => {
                setWished(true);
                void addToWishlistAction(missingPiece.oracleId).then((r) => !r.ok && setWished(false), () => setWished(false));
              }}
              className="min-h-[44px] cursor-pointer rounded-[8px] border border-solid border-[color:var(--border)] bg-transparent px-[14px] text-[13px] font-semibold text-[color:var(--fg)] disabled:cursor-default disabled:text-[color:var(--fg-muted)]"
            >
              {wished ? copy.wishlisted : copy.addToWishlist}
            </button>
          )}
          <button type="button" data-combo-how onClick={(e) => onOpen(pair, e.currentTarget)} className="min-h-[44px] cursor-pointer border-0 bg-transparent p-0 text-[13px] text-[color:var(--fg-body)] underline">
            {copy.howItWorks}
          </button>
        </span>
      </span>
    </li>
  );
}

export function CombosView({
  side,
  onSide,
  load,
  retry,
  pairs,
  counts,
  filtered,
  newVariantId,
  wide,
}: {
  side: ComboSide;
  onSide: (side: ComboSide) => void;
  load: CombosLoad;
  retry: () => void;
  /** The pairs on screen: the side's pairs the Collection's filters leave. */
  pairs: CollectionComboPair[];
  /** Both toggle counts after the filters, null until the pairs have loaded. */
  counts: Record<ComboSide, number> | null;
  /** A filter is narrowing the view: an empty list says so rather than that the reader has no combos. */
  filtered: boolean;
  newVariantId: string | null;
  wide: boolean;
}) {
  const detail = useCardDetail();
  const open = (pair: CollectionComboPair, opener: HTMLElement, view?: "fits") => {
    // Find a deck looks for a home for the card the reader holds; on Own one that is never the missing piece.
    const target = view && pair.missingId === pair.a.oracleId ? pair.b : pair.a;
    detail.open(target.oracleId, undefined, undefined, { art: target.imageUri, opener, ...(view ? { view } : comboOpenOpts(pair.variantId)) });
  };
  const count = (s: ComboSide) => counts?.[s] ?? null;
  return (
    <section data-combos-view className="px-[16px] pb-[24px] pt-[12px] md:px-[34px]" aria-busy={load.kind === "loading" || undefined}>
      <div className="flex flex-wrap items-center gap-[12px]">
        <div role="group" aria-label={copy.toggleLabel} className="inline-flex gap-[2px] rounded-[10px] border border-solid border-[color:var(--border)] p-[3px]">
          {(["both", "one"] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={side === s}
              onClick={() => onSide(s)}
              className={`min-h-[44px] cursor-pointer rounded-[8px] border-0 px-[14px] text-[14px] ${side === s ? "bg-[color:var(--surface)] font-semibold text-[color:var(--fg)]" : "bg-transparent text-[color:var(--fg-muted)]"}`}
            >
              {s === "both" ? copy.ownBoth : copy.ownOne}
              {count(s) !== null ? <span className="ml-[6px] font-mono text-[12px] text-[color:var(--accent-text)]">{count(s)}</span> : null}
            </button>
          ))}
        </div>
        <p className="m-0 text-[13px] text-[color:var(--fg-muted)]">{side === "both" ? copy.ownBothLine : copy.ownOneLine}</p>
      </div>
      {load.kind === "failed" ? (
        <p className="mt-[12px] flex flex-wrap items-center gap-[10px] font-mono text-[11.5px] text-[color:var(--fg-faint)]">
          {copy.loadFailed}
          <button type="button" onClick={retry} className="min-h-[44px] cursor-pointer border-0 bg-transparent p-0 font-mono text-[11.5px] text-[color:var(--fg-body)] underline">
            {copy.tryAgain}
          </button>
        </p>
      ) : load.kind === "ready" && pairs.length === 0 ? (
        <p className="mt-[16px] text-[13px] text-[color:var(--fg-muted)]">{filtered ? copy.noMatch : side === "both" ? copy.emptyBoth : copy.emptyOne}</p>
      ) : load.kind === "loading" ? (
        <ul aria-hidden data-combos-loading className="anim-skeleton m-0 mt-[14px] grid list-none gap-[12px] p-0" style={wide ? { gridTemplateColumns: "repeat(auto-fill, minmax(520px, 1fr))" } : undefined}>
          {Array.from({ length: wide ? 4 : 6 }, (_, i) => (
            <RowSkeleton key={i} index={i} />
          ))}
        </ul>
      ) : (
        <ul className="m-0 mt-[14px] grid list-none gap-[12px] p-0" style={wide ? { gridTemplateColumns: "repeat(auto-fill, minmax(520px, 1fr))" } : undefined}>
          {pairs.map((p) => (
            <PairCard key={p.variantId} pair={p} side={side} isNew={newVariantId === p.variantId} wide={wide} onOpen={(pr, el) => open(pr, el)} onOpenPiece={(pc, el) => detail.open(pc.oracleId, undefined, undefined, { art: pc.imageUri, opener: el })} onFind={(pr, el) => open(pr, el, "fits")} />
          ))}
        </ul>
      )}
    </section>
  );
}
