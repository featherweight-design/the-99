"use client";

import { useEffect, useId, useRef } from "react";

import { comboModal, type ComboModal } from "../../lib/bracket/combo-modal";
import type { Finding } from "../../lib/bracket/findings";
import { SPELLBOOK_SOURCE } from "../../lib/bracket/sources";
import { cssUrl } from "../../lib/collection/browse";
import { deckAnalysisCopy } from "../../lib/copy/deck-analysis";
import { useDialogA11y } from "../../lib/a11y/dialog";
import type { CardRef } from "../../lib/profile/types";
import { CardDetailTrigger, useCardDetail } from "../cards/card-detail-provider";
import { CostPips } from "../ui/cost-pips";
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
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const { registerSheet, openOracleId } = useCardDetail();
  useDialogA11y(ref, onClose);
  useEffect(() => registerSheet(), [registerSheet]);

  const label = copy.findings.labels[finding.id];
  // The card in front of this one. The receipt steps down a ground behind it, which is the
  // second half of what lets a reader see where a dismissal lands.
  const behind = openOracleId !== null;
  const siblings = finding.cards.map((c) => c.oracleId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      role="presentation"
      onClick={onClose}
      style={{ background: "color-mix(in oklab, var(--bg) 72%, transparent)" }}
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
          // Phone: a sheet from 52px down — the canvas's figure, and the top of the strip the
          // stacked card sheet leaves visible. Desktop: 560px, centered.
          "flex flex-col w-full h-[calc(100%-52px)] rounded-t-[14px] border-t "
          + "md:h-auto md:max-h-[85vh] md:w-[560px] md:rounded-[14px] md:border overflow-hidden "
          // Behind a card its edge steps down with its ground, as the addendum's §5a draws it.
          + (behind ? "border-[color:var(--border)]" : "border-[color:var(--border-strong)]")
        }
        style={{
          background: behind ? "var(--surface-sunken)" : "var(--surface-raised)",
          boxShadow: "var(--modal-shadow)",
        }}
      >
        <div
          className="flex flex-none items-center gap-[9px] md:gap-[10px] h-[43px] px-[16px] md:h-auto md:px-[18px] md:py-[14px] border-b border-[color:var(--border)]"
          style={{ opacity: behind ? 0.55 : undefined }}
        >
          <FindingMark id={finding.id} />
          <h2
            id={titleId}
            className="m-0 font-display font-bold text-[15px] md:text-[16px] leading-tight"
            style={{ color: behind ? "var(--fg-muted)" : "var(--fg)" }}
          >
            {label}
          </h2>
          <span className="font-mono text-[11.5px] md:text-[12px]" style={{ color: "var(--fg-faint)" }}>
            {finding.count}
          </span>
          {/* 44px to press. The header around it is pinned to 43px on the phone, because the
              stacked card sheet starts at 96 and this sheet at 52 behind a 1px border: a header
              any taller is cut along its bottom edge by the sheet that exists to show it. The
              probe measured 46 before the pin. On desktop nothing stacks over the header, so it
              keeps its padding and the control is pulled back into it. */}
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.receipt.closeAria(label)}
            className="ml-auto -mr-[10px] md:-my-[14px] flex h-[44px] w-[44px] items-center justify-center bg-transparent border-0 font-mono text-[14px] cursor-pointer text-[color:var(--fg-faint)]"
          >
            ×
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {finding.combos ? (
            finding.combos.map((combo) => (
              <ComboBody key={combo.variantId} combo={comboModal(combo)} art={art} />
            ))
          ) : (
            <ul
              className="m-0 list-none grid grid-cols-2 md:grid-cols-5 gap-[11px] md:gap-[9px] px-[16px] py-[14px] md:px-[18px] md:py-[16px]"
              data-testid="receipt-grid"
            >
              {finding.cards.map((card) => (
                <li key={card.oracleId} className="min-w-0">
                  <ReceiptTile card={card} art={art} siblings={siblings} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/** A card: its art, its name under it, and a press that opens the card modal on top. */
function ReceiptTile({
  card,
  art,
  siblings,
  width,
}: {
  card: CardRef;
  art: FindingArt;
  siblings: string[];
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
      className="flex w-full flex-col items-stretch gap-[5px] md:gap-[6px] text-left"
      style={width ? { width } : undefined}
    >
      <span
        className="block w-full rounded-[6px] border border-[color:var(--border-strong)] bg-cover bg-center"
        style={{
          aspectRatio: "63 / 88",
          backgroundColor: "var(--elevated)",
          backgroundImage: drawn?.imageUri ? cssUrl(drawn.imageUri) : undefined,
        }}
      />
      <span className="text-[11px] md:text-[10.5px] leading-[1.3]" style={{ color: "var(--fg-body)" }}>
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
  const siblings = combo.cards.map((c) => c.oracleId);
  const names = combo.cards.map((c) => art.get(c.oracleId)?.name ?? c.name);
  return (
    <section className="border-b border-[color:var(--border)] last:border-b-0" data-testid="receipt-combo">
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
          <span className="border-b border-[color:var(--accent)]">{copy.provenance.source(copy.receipt.spellbook)}</span>
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
