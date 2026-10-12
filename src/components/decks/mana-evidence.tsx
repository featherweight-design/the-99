"use client";

// Mana Balance's evidence (Tuning hub handoff R3b, design table `ManaEvidenceTable`,
// `NeedsExplainer`, `KarstenCitation`): each color's pips and sources, drawn with the Colors card's
// own bars and shares, beside what its tightest cost needs. Nothing here judges a figure: no
// tint, no warning color and no order but W U B R G (R3: no verdict).

import { useId, useRef, useState } from "react";

import { deckStatsCopy } from "../../lib/copy/deck-stats";
import { KARSTEN_ARTICLE_URL, manaBalanceCopy as copy } from "../../lib/copy/mana-balance";
import { colorRows, type ColorRow } from "../../lib/mana/color-rows";
import type { BalanceColor, ColorEvidence } from "../../lib/tuning/mana-balance";
import { colorName, neededFor, type ClientManaBalance } from "../../lib/tuning/mana-view";
import { PIP_STYLE, SourceBar } from "./mana-color-parts";

const capitalized = (s: string) => s[0].toUpperCase() + s.slice(1);
const MINI = "font-mono text-[9px] uppercase tracking-[0.12em] text-[color:var(--fg-locked)] md:hidden";
const FIGURE = "whitespace-nowrap font-mono text-[11px] text-[color:var(--fg-body)]";
const SUB = "font-mono text-[10px] leading-[1.45] text-[color:var(--fg-faint)]";
const GRID = "grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-[14px] gap-y-[8px] md:grid-cols-[104px_minmax(0,1fr)_minmax(0,1fr)_172px] md:gap-[16px]";

export function ColorDisc({ c, size }: { c: BalanceColor | "C"; size: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex flex-none items-center justify-center rounded-full font-mono font-semibold"
      style={{ width: size, height: size, fontSize: size >= 18 ? 10 : size <= 12 ? 7.5 : 8, background: PIP_STYLE[c].bg, color: PIP_STYLE[c].ink }}
    >
      {c}
    </span>
  );
}

function neededText(e: ColorEvidence): { figure: string; sub: string | null } {
  if (e.needed) {
    const { card, more, code } = neededFor(e.needed);
    return { figure: String(e.needed.requires), sub: copy.table.neededFor(card, more, code) };
  }
  return { figure: "—", sub: e.pips.withCommander > 0 ? copy.table.noPublished : copy.table.noPips };
}

function Row({ row, e, widest }: { row: ColorRow; e: ColorEvidence; widest: number }) {
  const sources = row.lands + row.other;
  const needed = neededText(e);
  const pipsText = row.pips ? copy.table.share(row.pips, row.pipShare) : "0";
  const sourcesText = sources ? copy.table.share(sources, row.sourceShare) : "0";
  const split = sources ? copy.table.split(row.lands, row.other) : null;
  const name = colorName(e.color);
  return (
    <li
      data-mana-row={e.color}
      aria-label={copy.table.rowAria(name, pipsText, [sourcesText, split].filter(Boolean).join(", "), [needed.figure === "—" ? "" : needed.figure, needed.sub].filter(Boolean).join(", "))}
      className={`${GRID} items-start border-b border-b-[color:var(--border)] px-[2px] py-[11px]`}
    >
      <span aria-hidden="true" className="flex items-center gap-[8px]">
        <ColorDisc c={e.color} size={18} />
        <span className="text-[13px] text-[color:var(--fg)]">{name}</span>
      </span>
      <span aria-hidden="true" className="order-last flex min-w-0 flex-col gap-[4px] md:order-none">
        <span className={MINI}>{copy.table.head.pips}</span>
        <span className="flex items-center gap-[8px]">
          {row.pips ? <span className="h-[14px] min-w-[8px] flex-none rounded-[3px]" style={{ width: `${(row.pipShare / widest) * 60}%`, background: PIP_STYLE[e.color].bg }} /> : null}
          <span className={row.pips ? FIGURE : `${FIGURE} text-[color:var(--fg-locked)]`}>{pipsText}</span>
        </span>
      </span>
      <span aria-hidden="true" className="order-last flex min-w-0 flex-col gap-[4px] md:order-none">
        <span className={MINI}>{copy.table.head.sources}</span>
        <span className="flex items-center gap-[8px]">
          <SourceBar c={e.color} lands={row.lands} other={row.other} widthPct={(row.sourceShare / widest) * 60} />
          <span className={sources ? FIGURE : `${FIGURE} text-[color:var(--fg-locked)]`}>{sourcesText}</span>
        </span>
        {split ? <span className={SUB}>{split}</span> : null}
      </span>
      <span aria-hidden="true" className="flex min-w-0 flex-col items-end gap-[3px] text-right md:items-start md:text-left">
        <span className={MINI}>{copy.table.head.needed}</span>
        <span className={`font-mono text-[13px] font-medium ${e.needed ? "text-[color:var(--fg)]" : "text-[color:var(--fg-locked)]"}`}>{needed.figure}</span>
        {needed.sub ? <span className={SUB}>{needed.sub}</span> : null}
      </span>
    </li>
  );
}

/** The colorless line: `{C}` pips and colorless sources, drawn under the colored rows (or alone). */
export function ColorlessLine({ row, share = true }: { row: ColorRow; share?: boolean }) {
  return (
    <p data-mana-colorless className="flex flex-wrap items-center gap-x-[12px] gap-y-[6px] border-b border-b-[color:var(--border)] px-[2px] py-[10px]">
      <span className="flex items-center gap-[8px]">
        <ColorDisc c="C" size={18} />
        <span className="text-[13px] text-[color:var(--fg-body)]">{capitalized(deckStatsCopy.colors.names.C)}</span>
      </span>
      <span className="font-mono text-[11px] text-[color:var(--fg-body)]">{copy.table.colorless(row.pips, row.lands + row.other, share ? row.sourceShare : null)}</span>
    </p>
  );
}

export function ManaEvidenceTable({ balance }: { balance: ClientManaBalance }) {
  const { rows, widest } = colorRows(balance.supply);
  const colored = rows.filter((r): r is ColorRow & { c: BalanceColor } => r.c !== "C");
  const colorless = rows.find((r) => r.c === "C");
  const byColor = new Map(balance.colors.map((e) => [e.color, e]));
  return (
    <div data-mana-table className="border-t border-t-[color:var(--border)]">
      <div aria-hidden="true" className={`hidden border-b border-b-[color:var(--border)] px-[2px] py-[8px] font-mono text-[9.5px] uppercase tracking-[0.12em] text-[color:var(--fg-locked)] md:grid ${GRID}`}>
        <span>{copy.table.head.color}</span>
        <span>{copy.table.head.pips}</span>
        <span>{copy.table.head.sources}</span>
        <span>{copy.table.head.needed}</span>
      </div>
      <ul>
        {colored.map((r) => <Row key={r.c} row={r} e={byColor.get(r.c)!} widest={widest} />)}
      </ul>
      {colorless ? <ColorlessLine row={colorless} /> : null}
    </div>
  );
}

export function LinkOut() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" className="block flex-none" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3.5h6.5V10M12.5 3.5 4 12" />
    </svg>
  );
}

function ArticleLink({ label }: { label: string }) {
  return (
    <a
      href={KARSTEN_ARTICLE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={copy.newTab(label)}
      className="inline-flex items-center gap-[4px] whitespace-nowrap font-medium text-[color:var(--accent)] hover:text-[color:var(--accent-hover)]"
    >
      {label}
      <LinkOut />
    </a>
  );
}

/**
 * "What Needs means": the one place, with the citation, that names Frank Karsten (brief ruling 2).
 * One tree for both states, as `StripRationale` draws it, so the trigger keeps focus on toggling.
 */
export function NeedsExplainer() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <div
      data-needs-explainer
      className={open ? "flex flex-col gap-[7px] rounded-[9px] border border-[color:var(--border)] border-l-[3px] border-l-[color:var(--accent)] bg-[var(--surface-sunken)] px-[13px] py-[11px]" : ""}
    >
      <div className="flex items-baseline justify-between gap-[10px]">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((was) => !was)}
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          className="inline-flex min-h-[44px] cursor-pointer items-center font-mono text-[11px] text-[color:var(--accent)] md:min-h-[32px]"
        >
          <span className={open ? "" : "border-b border-b-[color:var(--accent-dim)] pb-[1px]"}>{copy.needs.toggle}</span>
        </button>
        {open ? (
          <button
            type="button"
            onClick={() => { setOpen(false); triggerRef.current?.focus(); }}
            className="inline-flex min-h-[44px] cursor-pointer items-center font-mono text-[11px] text-[color:var(--fg-faint)] hover:text-[color:var(--fg-body)] md:min-h-[32px]"
          >
            {copy.needs.close}
          </button>
        ) : null}
      </div>
      {open ? (
        <div id={panelId} role="region" aria-label={copy.needs.toggle} className="flex flex-col gap-[7px]">
          <p className="text-[12px] leading-[1.55] text-[color:var(--fg-body)] [text-wrap:pretty]">
            <b className="font-semibold text-[color:var(--fg)]">{copy.needs.needsLabel}</b> {copy.needs.needsBody}
          </p>
          <p className="text-[12px] leading-[1.55] text-[color:var(--fg-body)] [text-wrap:pretty]">
            <b className="font-semibold text-[color:var(--fg)]">{copy.needs.sourceLabel}</b> {copy.needs.sourceBody} <ArticleLink label={copy.needs.sourceLink} />. {copy.needs.sourceTail}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** The panel's last line. The colorless deck has no Needed column, so it cites the land formula alone. */
export function KarstenCitation({ landOnly }: { landOnly: boolean }) {
  return (
    <p data-mana-citation className="max-w-[700px] border-t border-t-[color:var(--border)] pt-[12px] text-[12px] leading-[1.6] text-[color:var(--fg-muted)] [text-wrap:pretty]">
      {landOnly ? copy.cite.landOnlyBefore : copy.cite.before} <ArticleLink label={copy.cite.link} />, {landOnly ? copy.cite.landOnlyAfter : copy.cite.after}
    </p>
  );
}
