"use client";

import { useEffect, useId, useRef } from "react";

import { comboModal, type ComboModal } from "../../lib/bracket/combo-modal";
import type { Finding } from "../../lib/bracket/findings";
import { SPELLBOOK_SOURCE } from "../../lib/bracket/sources";
import { cssUrl } from "../../lib/collection/browse";
import { deckAnalysisCopy } from "../../lib/copy/deck-analysis";
import { useDialogA11y } from "../../lib/a11y/dialog";
import type { CardRef } from "../../lib/profile/types";
import { CardDetailTrigger, useCardDetail, type SheetFooter, type Sibling } from "../cards/card-detail-provider";
import { CostPips } from "../ui/cost-pips";
import { useMinWidth } from "../ui/use-min-width";
import { FindingMark } from "./finding-mark";

/**
 * What a receipt tile draws for a card: the name printed on the copy the player owns, and its art.
 *
 * RESOLVED AT THE DRAW, from the deck page's own rows, never carried on the profile. The profile
 * is a cached document keyed on the deck's cards, and a printing is a fact about the READER's
 * collection — an art pick would retire a profile whose every figure is unchanged. Every card a
 * finding names is one of this deck's own rows or its commander, so the deck page always holds
 * the answer; a card missing from the map draws a plain plate and its oracle name.
 */
export type FindingArt = ReadonlyMap<string, { name: string; imageUri: string | null }>;

const copy = deckAnalysisCopy;

/**
 * The receipt: one chrome, two bodies — a tile grid for a list of cards, and the pair with its
 * steps for a combo.
 *
 * THE CARD MODAL STACKS ON IT (verdict addendum, ruling 1). A tile opens the card and this sheet
 * stays: dismissing the card lands on the receipt, dismissing the receipt lands on the tab, in the
 * order they were opened. Three pieces make that true, and each is somewhere else:
 *
 * - `useDialogA11y` ignores a key pressed inside another dialog, so Escape in the card modal
 *   closes that modal and not this one.
 * - The card modal mounts AFTER the provider's children at the same `z-50`, so it paints above
 *   this sheet without either one naming a z-index for the other.
 * - `registerSheet` tells the provider this sheet is underneath, and the card modal then drops
 *   its backdrop and, on a phone, starts lower so this sheet's header stays in view.
 *
 * DEPTH STOPS AT TWO. Nothing in this sheet but a card opens anything, and nothing in the card
 * modal opens a third sheet. The Spellbook link leaves the app, which is a different action.
 *
 * NO FACT MARK ON A TILE (ruling 2). The header already names the fact, so the same glyph on all
 * five members of a homogeneous set would carry nothing.
 */
export function ReceiptModal({
  finding,
  art,
  onClose,
}: {
  finding: Finding;
  art: FindingArt;
  onClose: () => void;
}) {
  const label = copy.findings.labels[finding.id];
  const siblings = finding.cards.map((c) => {
    const drawn = art.get(c.oracleId);
    return { oracleId: c.oracleId, name: drawn?.name ?? c.name, imageUri: drawn?.imageUri ?? null };
  });
  return (
    <ModalChrome
      mark={<FindingMark id={finding.id} />}
      width={760}
      title={label}
      aside={finding.count}
      closeLabel={copy.receipt.closeAria(label)}
      onClose={onClose}
    >
      {finding.combos ? (
        finding.combos.map((combo) => (
          <ComboBody key={combo.variantId} combo={comboModal(combo)} art={art} />
        ))
      ) : (
        <ul
          className="m-0 list-none grid grid-cols-2 md:grid-cols-4 gap-x-[11px] gap-y-[14px] md:gap-x-[12px] md:gap-y-[18px] px-[16px] py-[14px] md:px-[20px] md:pt-[18px] md:pb-[22px]"
          data-testid="receipt-grid"
        >
          {finding.cards.map((card) => (
            <li key={card.oracleId} className="min-w-0">
              <ReceiptTile card={card} art={art} siblings={siblings} />
            </li>
          ))}
        </ul>
      )}
    </ModalChrome>
  );
}

/**
 * The sheet every body the Analysis tab opens is drawn in: the receipt, the reasoning behind a
 * lean, what would have to go, and how we make these decisions. An optional mark, a title, an
 * optional aside (a count, or a qualifier), and close.
 *
 * FOUR WIDTHS, one per body (Analysis tab handoff §3): 760 for the receipt's four tiles across,
 * 700 for the reasoning's two plates and for what would have to go, 560 for how we make these
 * decisions, and 640 for the swap tools' stand-ins sheet (audit F7). `ground` is the reasoning's `--elevated` against everyone else's `--surface-raised`.
 *
 * `backLabel` is what a card stacked on this sheet calls it: `← {backLabel}` in the card's close
 * slot. It defaults to the title, which is right for every sheet but what would have to go,
 * whose title is a sentence and whose way back is the target bracket's name.
 */
export function ModalChrome({
  mark,
  title,
  aside,
  closeLabel,
  onClose,
  width,
  backLabel = title,
  phoneBackLabel,
  ground = "var(--surface-raised)",
  titleClassName = "truncate leading-tight text-[15px] md:text-[16px]",
  stackFooter,
  overCard,
  children,
}: {
  mark?: React.ReactNode;
  title: string;
  aside?: React.ReactNode;
  closeLabel: string;
  onClose: () => void;
  width: 560 | 640 | 700 | 760;
  backLabel?: string;
  /** What a card stacked on this sheet calls it on the phone, where that differs (stacked sheets R1, s2). */
  phoneBackLabel?: string;
  ground?: string;
  /**
   * The title's size and how it fits. Every title is one truncated line but what would have to
   * go's, which is a sentence: 14px on a phone and wrapping to a second line inside the pinned
   * 43px header rather than losing its end, as the 390 frame draws it.
   */
  titleClassName?: string;
  /** What a card stacked over this sheet draws in place of its Mana Pool link (the stand-ins' Take). */
  stackFooter?: SheetFooter;
  /**
   * The sheet opened over a card (the swap tools' door, addendum §3). The card stays under it, at
   * full size on the phone (stacked sheets R1, call 7), with this sheet at its usual 52 and 40px down
   * on desktop, over a lighter scrim; its close is the way back to that card, `← {name}` at both
   * widths, named `Back to {name}`.
   */
  overCard?: { name: string; backAria: string };
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const { registerSheet, openOracleId, revealing } = useCardDetail();
  useDialogA11y(ref, onClose);
  // The footer is read through a ref, so a sheet whose state moves does not re-register itself (and
  // flicker the stacked card's way back) on every render.
  const footerRef = useRef(stackFooter);
  useEffect(() => {
    footerRef.current = stackFooter;
  });
  const hasFooter = stackFooter !== undefined;
  const onCard = overCard !== undefined;
  useEffect(
    () => registerSheet(backLabel, hasFooter ? (id, layout, priced) => footerRef.current?.(id, layout, priced) ?? null : undefined, onCard, phoneBackLabel),
    [registerSheet, backLabel, hasFooter, onCard, phoneBackLabel],
  );

  // The card in front of this one. The sheet steps down a ground behind it, which is the second
  // half of what lets a reader see where a dismissal lands.
  // While the card drops (`revealing`) the sheet already draws as itself, so it fades back at its own
  // ground rather than stepped down and then snapping.
  const behind = openOracleId !== null && !revealing;
  // On the phone a card REPLACES this sheet (stacked sheets R1, call 1): the sheet stays mounted
  // with its scroll kept, but it is not drawn, not pressable and not announced while the card is up.
  // Desktop keeps the stepped ground beside the card.
  //
  // NOT `inert`, though the handoff names it. The card closes, and hands focus back to its opener in
  // this sheet, in the commit BEFORE this sheet re-renders without the flag, so an inert sheet
  // refused the focus and it fell to <body> (measured in Chromium and WebKit at 390). The card's own
  // dialog already traps Tab, so `inert` added nothing a keyboard reader could reach.
  const narrow = !useMinWidth("(min-width: 768px)");
  // Covered for assistive technology and presses until the card has really closed (#1268): the card
  // is still the modal dialog while it drops. Only the drawing comes back early.
  const covered = openOracleId !== null && narrow;
  const hidden = covered && !revealing;

  return (
    <div
      className={
        "fixed inset-0 z-50 flex items-end justify-center "
        // Over a card, the sheet's top sits 40px under the card's, which is centred at its own height.
        + (onCard ? "md:items-start md:pt-[calc((100vh-min(620px,85vh))/2+40px)]" : "md:items-center")
        // Fading under the card's rise, and back under its drop (stacked sheets R1, motion).
        + (hidden ? " motion-safe:transition-opacity motion-safe:duration-[240ms]" : " motion-safe:transition-opacity motion-safe:duration-200")
      }
      role="presentation"
      onClick={onClose}
      aria-hidden={covered || undefined}
      data-hidden-under-card={covered || undefined}
      style={{
        background: `color-mix(in oklab, var(--bg) ${onCard ? 60 : 72}%, transparent)`,
        opacity: hidden ? 0 : undefined,
        pointerEvents: covered ? "none" : undefined,
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="receipt-modal"
        data-behind={behind || undefined}
        onClick={(e) => e.stopPropagation()}
        className={
          // Phone: a sheet from 52px down, over a card too (stacked sheets R1, call 7: the card under
          // it no longer steps down to 52, so neither does this sheet to 96). Desktop: centered.
          "flex flex-col w-full rounded-t-[14px] border-t h-[calc(100%-52px)] "
          + "md:h-auto md:rounded-[14px] md:border overflow-hidden "
          // Over a card its top is pushed down, so its height is capped to end 20px above the fold.
          + (onCard ? "md:max-h-[calc((100vh+min(620px,85vh))/2-60px)] " : "md:max-h-[85vh] ")
          + WIDTH_CLASS[width]
          // Behind a card its edge steps down with its ground, as the addendum's §5a draws it.
          + (behind ? "border-[color:var(--border)]" : "border-[color:var(--border-strong)]")
        }
        style={{
          background: behind ? "var(--surface-sunken)" : ground,
          boxShadow: "var(--modal-shadow)",
        }}
      >
        <div
          className="flex flex-none items-center gap-[9px] md:gap-[10px] h-[43px] px-[16px] md:h-auto md:px-[18px] md:py-[14px] border-b border-b-[color:var(--border)] border-[color:var(--border)]"
          style={{ opacity: behind ? 0.55 : undefined }}
        >
          {mark}
          <h2
            id={titleId}
            className={"m-0 min-w-0 font-display font-bold " + titleClassName}
            style={{ color: behind ? "var(--fg-muted)" : "var(--fg)" }}
          >
            {title}
          </h2>
          {aside != null ? (
            <span className="min-w-0 truncate font-mono text-[11.5px] md:text-[12px]" style={{ color: "var(--fg-faint)" }}>
              {aside}
            </span>
          ) : null}
          {/* Over a card, the way back to it is `← {card}` at both widths (stacked sheets R1, call 7),
              in place of the ×. 44px to press: the header is pinned to 43px on the phone, so the
              pill's 32px plate carries an invisible band reaching the full height. */}
          {overCard ? (
            <button
              type="button"
              onClick={onClose}
              aria-label={overCard.backAria}
              className="relative inline-flex ml-auto min-w-0 max-w-[60%] flex-none items-center gap-[6px] h-[32px] px-[12px] rounded-full text-[12.5px] font-semibold leading-none whitespace-nowrap cursor-pointer text-[color:var(--fg)] bg-[color:var(--elevated)] [border:1px_solid_var(--border-strong)] before:absolute before:inset-x-0 before:-inset-y-[6px] before:content-['']"
            >
              <span aria-hidden="true">←</span>
              <span className="min-w-0 truncate">{overCard.name}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="ml-auto -mr-[10px] md:-my-[14px] flex flex-none h-[44px] w-[44px] items-center justify-center bg-transparent border-0 font-mono text-[14px] cursor-pointer text-[color:var(--fg-faint)]"
            >
              ×
            </button>
          )}
        </div>
        {/* Behind a card the body steps down further than the header (0.35 against 0.55): the
            header is the strip that says where a dismissal lands, and the body is only context.
            `overscroll-contain` (Hugh, 2026-10-03) stops a scroll of this body at either end
            from chaining into the page behind the modal. */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain" style={{ opacity: behind ? 0.35 : undefined }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// Literal class strings, so Tailwind sees each one.
const WIDTH_CLASS = {
  560: "md:w-[560px] ",
  640: "md:w-[640px] ",
  700: "md:w-[700px] ",
  760: "md:w-[760px] ",
} as const;

/** A card: its art, its name under it, and a press that opens the card modal on top. */
export function ReceiptTile({
  card,
  art,
  siblings,
  width,
}: {
  card: CardRef;
  art: FindingArt;
  siblings: readonly Sibling[];
  /** A fixed plate width, for the combo body. The grid sizes its own. */
  width?: number;
}) {
  const drawn = art.get(card.oracleId);
  const name = drawn?.name ?? card.name;
  return (
    <CardDetailTrigger
      oracleId={card.oracleId}
      name={name}
      siblings={siblings}
      testId="receipt-tile"
      // The grid's tiles are the 760 receipt's (3a); the combo body's fixed plates are unchanged.
      className={"flex w-full flex-col items-stretch text-left " + (width ? "gap-[5px] md:gap-[6px]" : "gap-[6px] md:gap-[7px]")}
      style={width ? { width } : undefined}
    >
      <span
        className={"block w-full border border-[color:var(--border-strong)] bg-cover bg-center " + (width ? "rounded-[6px]" : "rounded-[8px]")}
        style={{
          aspectRatio: "63 / 88",
          backgroundColor: "var(--elevated)",
          backgroundImage: drawn?.imageUri ? cssUrl(drawn.imageUri) : undefined,
        }}
      />
      {/* 11.5 / 12px in the receipt's grid, where a tile is ~172px at both widths; the combo body's
          fixed 96px plates keep the smaller name, since that body is unchanged. */}
      <span className={(width ? "text-[11px] md:text-[10.5px]" : "text-[11.5px] md:text-[12px]") + " leading-[1.3]"} style={{ color: "var(--fg-body)" }}>
        {name}
      </span>
    </CardDetailTrigger>
  );
}

/**
 * One combo: the pair, what it produces, what it costs to execute, Spellbook's steps, and what
 * must already be true. Every word in the body but the labels is Spellbook's.
 */
function ComboBody({ combo, art }: { combo: ComboModal; art: FindingArt }) {
  const names = combo.cards.map((c) => art.get(c.oracleId)?.name ?? c.name);
  const siblings = combo.cards.map((c) => ({ oracleId: c.oracleId, name: art.get(c.oracleId)?.name ?? c.name, imageUri: art.get(c.oracleId)?.imageUri ?? null }));
  return (
    <section className="border-b border-b-[color:var(--border)] border-[color:var(--border)] last:border-b-0" data-testid="receipt-combo">
      <div className="flex flex-col md:flex-row gap-[14px] md:gap-[16px] px-[16px] py-[14px] md:px-[18px] md:py-[16px]">
        <div className="flex flex-none gap-[7px]">
          {combo.cards.map((card) => (
            <ReceiptTile key={card.oracleId} card={card} art={art} siblings={siblings} width={96} />
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-[11px]">
          <h3
            className="m-0 font-display font-bold text-[16px] md:text-[17px] leading-[1.25]"
            style={{ color: "var(--fg)" }}
          >
            {names.map((n, i) => (
              <span key={i}>
                {i > 0 ? <span style={{ color: "var(--fg-faint)", fontWeight: 400 }}> + </span> : null}
                {n}
              </span>
            ))}
          </h3>
          {combo.produces.length > 0 ? (
            <ul className="m-0 p-0 list-none flex flex-wrap gap-[6px]">
              {combo.produces.map((p) => (
                <li
                  key={p}
                  className="font-mono text-[9.5px] uppercase tracking-[0.1em] rounded-[5px] border border-[color:var(--border-strong)] px-[9px] py-[4px]"
                  style={{ color: "var(--fg-body)" }}
                >
                  {p}
                </li>
              ))}
            </ul>
          ) : null}
          <Field label={copy.receipt.manaNeeded}>
            <Mana mana={combo.mana} />
          </Field>
          {combo.steps.length > 0 ? (
            <Field label={copy.receipt.steps} gap={6}>
              <ol
                className="m-0 pl-[17px] flex flex-col gap-[5px] text-[12.5px] leading-[1.5]"
                style={{ color: "var(--fg-muted)" }}
              >
                {combo.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </Field>
          ) : null}
          {/* Under the steps, and absent rather than empty on the 36% where Spellbook sent
              nothing — the modal already reads correctly without it. */}
          {combo.prerequisites ? (
            <Field label={copy.receipt.prerequisites}>
              <span className="text-[12.5px] leading-[1.5]" style={{ color: "var(--fg-muted)" }}>
                {combo.prerequisites}
              </span>
            </Field>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-[12px] border-t border-[color:var(--border)] px-[16px] pt-[12px] pb-[14px] md:px-[18px]">
        <span className="font-mono text-[10.5px]" style={{ color: "var(--fg-faint)" }}>
          {copy.receipt.assembled}
        </span>
        <a
          href={SPELLBOOK_SOURCE.variantUrl(combo.variantId)}
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex min-h-[44px] items-center font-mono text-[10.5px] no-underline text-[color:var(--accent)]"
        >
          <span className="border-b border-b-[color:var(--accent)] border-[color:var(--accent)]">{copy.provenance.source(copy.receipt.spellbook)}</span>
        </a>
      </div>
    </section>
  );
}

function Field({ label, gap = 5, children }: { label: string; gap?: 5 | 6; children: React.ReactNode }) {
  return (
    <div className={"flex flex-col " + (gap === 6 ? "gap-[6px]" : "gap-[5px]")}>
      <span className="font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: "var(--fg-faint)" }}>
        {label}
      </span>
      {children}
    </div>
  );
}

/**
 * The execution cost as a STATE — never a figure with a blank. Zero is the free combo and the
 * alarming one, so it gets words; null is genuinely unknown and says so.
 */
function Mana({ mana }: { mana: ComboModal["mana"] }) {
  const text = "font-mono text-[12px]";
  if (mana.kind === "free") {
    return <span className={text} style={{ color: "var(--fg-body)" }} data-mana="free">{copy.receipt.manaFree}</span>;
  }
  if (mana.kind === "unknown") {
    return <span className={text} style={{ color: "var(--fg-faint)" }} data-mana="unknown">{copy.receipt.manaUnknown}</span>;
  }
  // Pips where Spellbook sent them, the figure where it sent only a value.
  return mana.pips ? (
    <span className="flex" data-mana="costs">
      <CostPips cost={mana.pips} size={14} spoken />
    </span>
  ) : (
    <span className={text} style={{ color: "var(--fg-body)" }} data-mana="costs">{mana.value}</span>
  );
}
