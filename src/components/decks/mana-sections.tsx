"use client";

// Mana Balance's two folded sections (Tuning hub handoff R3b, design table `ManaSection`,
// `PatternRows`, `LandFacts`): the hardest costs per color, and the lands. The header is the
// Consider panel's shelf header; a section's body is mounted only while it is open.

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { manaBalanceCopy as copy } from "../../lib/copy/mana-balance";
import type { BalanceColor, ColorEvidence, LandEvidence, PatternEvidence } from "../../lib/tuning/mana-balance";
import { colorName, colorWord } from "../../lib/tuning/mana-view";
import { useCardDetail } from "../cards/card-detail-provider";
import { PIP_STYLE } from "./mana-color-parts";

/** Names a pattern row shows before `+N more`. */
const NAMES_SHOWN = 3;

export function ManaSection({ id, label, clause, open, onToggle, tight = false, children }: {
  id: string;
  /** Set 12 after the section above it rather than the panel's 18 (R3b). */
  tight?: boolean;
  label: string;
  clause: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const bodyId = useId();
  return (
    <section data-mana-section={id} aria-label={label} className={`border-t border-t-[color:var(--border-strong)] ${tight ? "-mt-[6px]" : ""}`}>
      <h3 className="m-0">
        <button
          type="button"
          aria-expanded={open}
          // The body is unmounted while folded, so the reference would dangle.
          aria-controls={open ? bodyId : undefined}
          onClick={onToggle}
          className="flex min-h-[52px] w-full cursor-pointer items-center gap-x-[8px] border-none bg-transparent p-0 text-left md:min-h-[44px] md:gap-x-[10px]"
        >
          <span aria-hidden className={`inline-block text-[color:var(--fg-muted)] transition-transform duration-150 ${open ? "rotate-90" : ""}`}>▸</span>
          <span className="flex flex-col gap-x-[10px] gap-y-[2px] md:flex-row md:items-baseline">
            <span className="font-sans text-[16px] font-semibold leading-[1.2] text-[color:var(--fg)] md:text-[17px]">{label}</span>
            <span className="font-mono text-[10.5px] text-[color:var(--fg-muted)] md:text-[11px]">{clause}</span>
          </span>
        </button>
      </h3>
      {open ? <div id={bodyId} className="mt-[9px] md:mt-[11px]">{children}</div> : null}
    </section>
  );
}

/** The single-select color chips: a radiogroup, so the arrow keys move the selection. */
function ColorChips({ colors, picked, onPick }: { colors: BalanceColor[]; picked: BalanceColor; onPick: (c: BalanceColor) => void }) {
  const refs = useRef(new Map<BalanceColor, HTMLButtonElement>());
  const onKey = (e: KeyboardEvent, i: number) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = colors[(i + step + colors.length) % colors.length];
    onPick(next);
    refs.current.get(next)?.focus();
  };
  return (
    <div role="radiogroup" aria-label={copy.patterns.chips} className="-mx-[2px] flex gap-[6px] overflow-x-auto px-[2px] pb-[2px] md:flex-wrap md:overflow-visible">
      {colors.map((c, i) => {
        const on = c === picked;
        return (
          <button
            key={c}
            ref={(el) => { if (el) refs.current.set(c, el); else refs.current.delete(c); }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            data-mana-chip={c}
            onClick={() => onPick(c)}
            onKeyDown={(e) => onKey(e, i)}
            className={`inline-flex h-[44px] flex-none cursor-pointer items-center gap-[7px] whitespace-nowrap rounded-full px-[12px] text-[12px] md:h-[30px] ${
              on
                ? "border border-[color:var(--fg-body)] bg-[var(--fg-body)] font-semibold text-[color:var(--bg)]"
                : "border border-[color:var(--border-strong)] bg-transparent font-medium text-[color:var(--fg-muted)]"
            }`}
          >
            <span aria-hidden className="size-[12px] flex-none rounded-full" style={{ background: PIP_STYLE[c].bg }} />
            {colorName(c)}
          </button>
        );
      })}
    </div>
  );
}

function CardNames({ pattern, ids }: { pattern: PatternEvidence; ids: Readonly<Record<string, string>> }) {
  const [all, setAll] = useState(false);
  const { open } = useCardDetail();
  const siblings = pattern.cards.flatMap((c) => (ids[c.name] ? [ids[c.name]] : []));
  const shown = all ? pattern.cards : pattern.cards.slice(0, NAMES_SHOWN);
  const hidden = pattern.cards.length - NAMES_SHOWN;
  return (
    <span className="text-[12.5px] leading-[1.55] text-[color:var(--fg-body)]">
      {shown.map((c, i) => {
        const id = ids[c.name];
        return (
          <span key={c.name}>
            {id ? (
              <button
                type="button"
                onClick={(e) => open(id, siblings, undefined, { opener: e.currentTarget })}
                className="cursor-pointer border-b border-dotted border-b-[color:var(--accent)] text-left"
              >
                {c.name}
              </button>
            ) : c.name}
            {c.copies > 1 ? <span className="font-mono text-[10px] text-[color:var(--fg-faint)]"> {copy.patterns.copies(c.copies)}</span> : null}
            {c.commander ? " " : null}
            {c.commander ? (
              <span className="rounded-[4px] border border-[color:var(--border-strong)] px-[4px] align-[1px] font-mono text-[9px] uppercase tracking-[0.1em] text-[color:var(--fg-muted)]">
                {copy.patterns.commander}
              </span>
            ) : null}
            {i < shown.length - 1 ? ", " : null}
          </span>
        );
      })}
      {hidden > 0 ? (
        <>
          {" "}
          <button
            type="button"
            aria-expanded={all}
            onClick={() => setAll((v) => !v)}
            className="inline-flex min-h-[44px] cursor-pointer items-center font-mono text-[11px] text-[color:var(--accent)] md:min-h-0"
          >
            {all ? copy.patterns.fewer : copy.patterns.more(hidden)}
          </button>
        </>
      ) : null}
    </span>
  );
}

/** A `You have N · Needs M` figure that may wrap only at its ` · `, the dot kept on the first line, so the
 *  longest (`Needs at most`) stays inside its column instead of running past it. */
function SeparatedFigure({ text }: { text: string }) {
  const parts = text.split(" · ");
  return parts.map((part, i) => (
    <span key={i}>
      {i > 0 ? " " : null}
      <span className="whitespace-nowrap">{i < parts.length - 1 ? `${part} ·` : part}</span>
    </span>
  ));
}

function haveNeeds(p: PatternEvidence, have: number): { text: string; known: boolean } {
  if (p.karsten.kind === "known") return { text: copy.patterns.haveNeeds(have, p.karsten.sources), known: true };
  if (p.karsten.kind === "atMost") return { text: copy.patterns.haveNeedsAtMost(have, p.karsten.sources), known: true };
  return { text: copy.patterns.none, known: false };
}

/** Hardest costs' body: a chip per pipped color (none for a one-color deck), then that color's
 *  costs, hardest first, each beside Karsten's figure for it. */
export function PatternRows({ colors, initial, ids }: { colors: readonly ColorEvidence[]; initial: BalanceColor; ids: Readonly<Record<string, string>> }) {
  const pipped = colors.filter((c) => c.pips.withCommander > 0 && c.patterns.length > 0);
  const [picked, setPicked] = useState<BalanceColor>(initial);
  const current = pipped.find((c) => c.color === picked) ?? pipped[0];
  if (!current) return null;
  return (
    <div className="flex flex-col gap-[10px]">
      {pipped.length > 1 ? <ColorChips colors={pipped.map((c) => c.color)} picked={current.color} onPick={setPicked} /> : null}
      <div className="border-t border-t-[color:var(--border)]">
        <div aria-hidden="true" className="hidden grid-cols-[72px_minmax(0,1fr)_200px] gap-[14px] border-b border-b-[color:var(--border)] px-[2px] py-[8px] font-mono text-[9.5px] uppercase tracking-[0.12em] text-[color:var(--fg-locked)] md:grid">
          <span>{copy.patterns.head.cost}</span>
          <span>{copy.patterns.head.cards}</span>
          <span className="text-right">{copy.patterns.head.needed}</span>
        </div>
        <ul data-mana-patterns={current.color}>
          {current.patterns.map((p) => {
            const figure = haveNeeds(p, current.sources.total);
            return (
              <li
                key={p.pattern}
                data-mana-pattern={p.pattern}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-x-[14px] gap-y-[5px] border-b border-b-[color:var(--border)] px-[2px] py-[10px] md:grid-cols-[72px_minmax(0,1fr)_200px]"
              >
                <span className="flex items-baseline gap-[6px] whitespace-nowrap">
                  <span className="font-mono text-[13px] font-semibold text-[color:var(--fg)]">{p.pattern}</span>
                  <span className="font-mono text-[10px] text-[color:var(--fg-faint)]">{copy.patterns.copies(p.copies)}</span>
                </span>
                <span className="col-span-3 row-start-2 md:col-span-1 md:row-start-auto"><CardNames pattern={p} ids={ids} /></span>
                <span className={`col-start-3 row-start-1 min-w-0 text-right font-mono text-[12px] md:col-start-auto md:row-start-auto ${figure.known ? "text-[color:var(--fg)]" : "text-[color:var(--fg-muted)]"}`}>
                  <SeparatedFigure text={figure.text} />
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="font-mono text-[10.5px] leading-[1.55] text-[color:var(--fg-faint)]">{copy.patterns.foot(colorName(current.color))}</p>
    </div>
  );
}

type TappedKey = "always" | "unless" | "fetch";

function FactRow({ label, figure, note, names }: { label: string; figure: string; note: string; names?: readonly { name: string; copies: number }[] }) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const discloses = !!names && names.length > 0;
  const face = (
    <>
      <span className="text-[13px] leading-[1.4] text-[color:var(--fg-body)]">{label}</span>
      <span className="text-right font-mono text-[13px] font-medium text-[color:var(--fg)]">{figure}</span>
      <span className="col-span-3 font-mono text-[11px] leading-[1.5] text-[color:var(--fg-muted)] md:col-span-1">{note}</span>
      <span aria-hidden className="col-start-3 row-start-1 text-right font-mono text-[12px] text-[color:var(--fg-muted)] md:col-start-auto md:row-start-auto">
        {discloses ? (open ? "⌃" : "›") : ""}
      </span>
    </>
  );
  const grid = "grid min-h-[44px] w-full border-b border-b-[color:var(--border)] grid-cols-[minmax(0,1fr)_auto_16px] items-baseline gap-x-[12px] gap-y-[2px] px-[2px] py-[9px] text-left md:min-h-0 md:grid-cols-[minmax(0,1fr)_64px_minmax(0,1.3fr)_16px]";
  return (
    <li data-land-fact>
      {discloses ? (
        <button type="button" aria-expanded={open} aria-controls={open ? listId : undefined} onClick={() => setOpen((v) => !v)} className={`${grid} cursor-pointer`}>
          {face}
        </button>
      ) : (
        <div className={grid}>{face}</div>
      )}
      {discloses && open ? (
        <p id={listId} className="border-b border-b-[color:var(--border)] px-[2px] py-[10px] text-[12px] leading-[1.5] text-[color:var(--fg-muted)]">
          {names.map((n) => (n.copies > 1 ? `${n.name} ${copy.patterns.copies(n.copies)}` : n.name)).join(", ")}
        </p>
      ) : null}
    </li>
  );
}

/** Lands' body: six facts, the three tapped ones disclosing which lands, and the formula's caveat. */
export function LandFacts({ lands, cards, commander, commanders }: { lands: LandEvidence; cards: number; commander: string; commanders: number }) {
  const t = lands.tapped;
  const tapped: { key: TappedKey; label: string; note: string }[] = [
    { key: "always", label: copy.lands.always, note: copy.lands.alwaysNote },
    { key: "unless", label: copy.lands.unless, note: copy.lands.unlessNote },
    { key: "fetch", label: copy.lands.fetch, note: copy.lands.fetchNote },
  ];
  const avg = lands.averageManaValue.toFixed(2);
  return (
    <div className="flex flex-col gap-[8px]">
      <ul className="border-t border-t-[color:var(--border)]">
        <FactRow label={copy.lands.count} figure={String(lands.count)} note={copy.lands.countOf(cards)} />
        {tapped.map((r) => (
          // A row reading 0 says nothing about which kind of land: no note and nothing to open.
          <FactRow key={r.key} label={r.label} figure={String(t[r.key])} note={t[r.key] > 0 ? r.note : ""} names={t[r.key] > 0 ? t.names[r.key] : undefined} />
        ))}
        <FactRow label={copy.lands.average} figure={avg} note={copy.lands.averageNote(commander, commanders)} />
        <FactRow label={copy.lands.formulaLabel} figure={lands.karstenLands.toFixed(1)} note={copy.lands.formula(avg, lands.cheapRamp)} />
      </ul>
      <p className="max-w-[660px] text-[12px] leading-[1.55] text-[color:var(--fg-muted)]">{copy.lands.caveat(lands.cheapRamp)}</p>
    </div>
  );
}

/** Hardest costs' clause: the colors it lists, in prose. */
export const hardestClause = (colors: readonly BalanceColor[]) => copy.sections.hardest.clause(colors.map(colorWord).join(", "));
