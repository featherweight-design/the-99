// A Good to know rule's small diagram (About visual build, plan `2026-10-27-about-visual.md`, PR 4; handoff
// `design/design_handoff_the99_about_visual/`, call 2, the boards' `.dg` atoms).
//
// Drawn from the app's own pieces with fixture props, never a screenshot: the card row's shell (`ROW_SHELL`), its
// ownership dot, lock mark, proxy tag and the decklist's changed-row edge; the shipped buy tag, priced through the real
// `priceState`; the deck tile's status pill over the commander gradient; the bracket mark; the role counter cell. The
// fixtures and their words are the rule's (`ABOUT_RULES[id].diagram`), already cut to the reader's switches.

import type { CSSProperties } from "react";
import type {
  AboutDiagramColumn, AboutDiagramPart, AboutDiagramPrice, AboutDiagramTone, AboutRuleDiagram,
} from "../../../lib/copy/about-pages";
import { BRACKET_NAMES } from "../../../lib/copy/deck-analysis";
import { commanderGradient } from "../../../lib/cards/gradients";
import type { PriceFact } from "../../../lib/decks/price";
import { ROW_SHELL } from "../../ui/row-shell";
import { OwnershipDot } from "../../ui/ownership-dot";
import { BracketMark } from "../../decks/bracket-mark";
import { BuyTag } from "../../decks/buy-tag";
import { LockMark } from "../../decks/lock-mark";
import { ProxyTag } from "../../decks/proxy-tag";
import { RoleCounterCell } from "../../decks/role-counter-cell";
import { StatusPillBadge } from "../../decks/status-pill";

/** The price table's newest row, for the fixtures: a live price is read at it, a sold-out one a day before. */
const NEWEST = new Date("2026-10-27T09:00:00Z");
const STALE = new Date("2026-10-26T09:00:00Z");

function priceFact(p: AboutDiagramPrice): PriceFact | null {
  if (p.state === "absent") return null;
  if (p.state === "soldOut") return { cents: 100, foilCents: null, etchedCents: null, asOf: STALE };
  if (p.state === "foilOnly") return { cents: null, foilCents: p.cents, etchedCents: null, asOf: NEWEST };
  return { cents: p.cents, foilCents: null, etchedCents: null, asOf: NEWEST };
}

const TONE: Record<AboutDiagramTone, string> = {
  muted: "var(--fg-muted)",
  accent: "var(--accent-text)",
  success: "var(--success)",
  short: "var(--avail-hard-fg)",
};

const MONO = "font-mono text-[10px] font-medium tracking-[0.04em]";

function Part({ p }: { p: AboutDiagramPart }) {
  switch (p.part) {
    case "caption":
      return (
        <span
          className={`${MONO} ${p.muted ? "text-[color:var(--fg-muted)]" : "uppercase text-[color:var(--fg-faint)]"}`}
          data-diagram-part="caption"
        >
          {p.text}
        </span>
      );
    case "row": {
      const style: CSSProperties = p.edge ? { boxShadow: "inset 2px 0 0 0 var(--accent)" } : {};
      return (
        <div
          data-diagram-part="row"
          className={`${ROW_SHELL} min-w-0 whitespace-nowrap border border-[color:var(--border)] bg-[color:var(--surface-raised)] text-[color:var(--fg)] ${
            p.compact ? "h-[22px] px-[8px] text-[11px]" : "h-[30px] px-[10px] text-[12.5px]"
          } ${p.gone ? "line-through opacity-55" : p.dim ? "opacity-75" : ""}`}
          style={style}
        >
          {p.dot ? <OwnershipDot owned={p.dot === "owned"} size={8} /> : null}
          <span className="min-w-0 flex-auto overflow-hidden text-ellipsis">{p.name}</span>
          {p.proxy ? <ProxyTag variant="row" /> : null}
          {p.lock ? <LockMark /> : null}
          {p.tag ? (
            <span className="flex-none font-mono text-[10px] font-medium" style={{ color: TONE[p.tag.tone] }}>
              {p.tag.text}
            </span>
          ) : null}
          {p.price ? <BuyTag variant="row" price={priceFact(p.price)} newestAsOf={NEWEST} /> : null}
        </div>
      );
    }
    case "tile":
      return (
        <div
          data-diagram-part="tile"
          className="flex w-[84px] flex-col overflow-hidden rounded-[9px] border border-[color:var(--border-strong)] bg-[color:var(--surface-raised)]"
        >
          <div className="h-[46px]" style={{ background: commanderGradient([...p.colors]) }} />
          <span className="overflow-hidden text-ellipsis whitespace-nowrap px-[7px] pb-[2px] pt-[5px] text-[11px] font-semibold text-[color:var(--fg)]">
            {p.name}
          </span>
          <StatusPillBadge
            status={p.status}
            className="mx-[7px] mb-[7px] self-start rounded-[4px] px-[5px] font-mono text-[9px] leading-[15px]"
          />
        </div>
      );
    case "void":
      return (
        <div
          data-diagram-part="void"
          className={`${MONO} flex h-[94px] w-[84px] items-center justify-center rounded-[9px] px-[8px] text-center text-[color:var(--fg-faint)] [border:1.5px_dashed_var(--border-dashed)]`}
        >
          {p.text}
        </div>
      );
    case "buy":
      return (
        <div data-diagram-part="buy" className="flex items-center gap-[10px]">
          <span className="flex min-w-[96px] flex-none justify-center">
            <BuyTag variant="row" price={priceFact(p.price)} newestAsOf={NEWEST} />
          </span>
          <span className={`${MONO} text-[color:var(--fg-muted)]`}>{p.note}</span>
        </div>
      );
    case "medal":
      return (
        <div data-diagram-part="medal" className="flex flex-col items-center gap-[12px]">
          <BracketMark bracket={p.bracket} px={44} />
          <span className={`${MONO} uppercase text-[color:var(--fg-faint)]`}>{BRACKET_NAMES[p.bracket]}</span>
        </div>
      );
    case "between":
      return (
        <div data-diagram-part="between" className="flex flex-col items-center gap-[6px] text-[color:var(--fg-faint)]">
          <span className={p.glyph.length > 1 ? `${MONO} text-[color:var(--fg-muted)]` : "text-[16px]"}>{p.glyph}</span>
          {p.label ? <span className={MONO}>{p.label}</span> : null}
        </div>
      );
    case "cells":
      return (
        <div data-diagram-part="cells" className="flex w-[250px] gap-[8px]">
          {p.cells.map((c) => (
            <RoleCounterCell key={c.label} label={c.label} have={c.have} target={c.target} advisory={false} />
          ))}
        </div>
      );
    case "split": {
      const ink = { success: "var(--success)", fact: "var(--fact)", accent: "var(--accent)" } as const;
      return (
        <div data-diagram-part="split" className="flex w-[250px] flex-col gap-[10px]">
          <div className="flex h-[12px] gap-[2px] overflow-hidden rounded-[4px]">
            {p.parts.map((s) => (
              <i key={s.label} className="block h-full" style={{ flex: s.n, background: ink[s.tone] }} />
            ))}
          </div>
          <div className="flex flex-col gap-[5px]">
            {p.parts.map((s) => (
              <span key={s.label} className="flex items-center gap-[6px] text-[12px] text-[color:var(--fg-body)]">
                <i className="block h-[9px] w-[9px] rounded-[2px]" style={{ background: ink[s.tone] }} />
                {s.label}
                <span className={`${MONO} ml-auto text-[color:var(--fg-faint)]`}>{s.n}</span>
              </span>
            ))}
          </div>
        </div>
      );
    }
    case "chips":
      return (
        <div data-diagram-part="chips" className="flex flex-wrap gap-[6px]">
          {p.chips.map((c) => (
            <span
              key={c.text}
              className={`inline-flex h-[24px] items-center whitespace-nowrap rounded-full px-[9px] text-[11.5px] ${
                c.never
                  ? "border border-dashed border-[color:var(--border-strong)] text-[color:var(--fg-faint)] line-through"
                  : "border border-[color:var(--border-strong)] text-[color:var(--fg-body)]"
              }`}
            >
              {c.text}
            </span>
          ))}
        </div>
      );
  }
}

function Stack({ column: { parts, w, gap = 6, center = false } }: { column: AboutDiagramColumn }) {
  return (
    <div
      className={`flex min-w-0 max-w-full flex-none flex-col ${center ? "items-center" : ""}`}
      style={{ gap, ...(w === undefined ? {} : { width: w }) }}
    >
      {parts.map((p, i) => (
        <Part key={i} p={p} />
      ))}
    </div>
  );
}

/** One rule's diagram, centred in its card's 150px plate. */
export function RuleDiagram({ diagram }: { diagram: AboutRuleDiagram }) {
  const { head = [], columns, foot = [], gap = 10 } = diagram;
  return (
    <div data-diagram={diagram.kind} className="flex max-w-full flex-col items-center gap-[10px]">
      {head.length ? <Stack column={{ parts: head, center: true }} /> : null}
      <div className="flex max-w-full items-center justify-center" style={{ gap }}>
        {columns.map((c, i) => (
          <Stack key={i} column={c} />
        ))}
      </div>
      {foot.length ? <Stack column={{ parts: foot, center: true }} /> : null}
    </div>
  );
}
