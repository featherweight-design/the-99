"use client";

import { useId, type ReactNode } from "react";

import type { Step } from "../../lib/benchmarks/types";
import type { RampWhy } from "../../lib/benchmarks/velocity";
import type { BenchmarksWire, DependencyWire, LedgerWireCard, WinLineWire } from "../../lib/benchmarks/wire";
import { deckBenchmarksCopy as copy } from "../../lib/copy/deck-benchmarks";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import type { SiblingCard } from "../cards/card-detail-provider";
import { CardDetailTrigger } from "../cards/card-detail-provider";
import { AvailabilityMarker } from "../ui/availability-marker";
import { CostPips, CostTrack } from "../ui/cost-pips";
import { OwnershipDot } from "../ui/ownership-dot";
import { ROW_SHELL } from "../ui/row-shell";
import { STEP_INK, StrengthTag, type LedgerKey } from "./benchmarks-block";
import { HoverPreviewProvider, usePreviewRow } from "./hover-preview";
import { ComboBody, ModalChrome, type FindingArt } from "./receipt-modal";

const L = copy.ledger;

/** The Deck stats card a graded ledger is built on (audit build rule 6). */
export type StatsCard = "curve" | "jobs";

/**
 * What the deck page knows about each of its cards' copies, by oracle id: whether the player owns
 * it and the availability its decklist row draws. A card absent from it (a commander, a card no
 * longer in the list) draws no marker.
 */
export type LedgerAvailability = ReadonlyMap<string, { owned: boolean; availability: DeckDetailCard["availability"] }>;

type Row = { card: LedgerWireCard; why: string | null; points?: number };
type Group = { head: string; rows: Row[] };
type Ledger = {
  title: string;
  mark: ReactNode;
  aside?: string;
  step: Step | null;
  reading: string;
  hate?: string;
  note?: string;
  stats?: { label: string; card: StatsCard };
  groups: Group[];
  lines: WinLineWire[];
};

const trim = (n: number, digits = 2) => String(Number(n.toFixed(digits)));
const percent = (odds: number) => `${Math.round(odds * 100)}%`;
const byName = (a: Row, b: Row) => a.card.name.localeCompare(b.card.name);
/** Decision 1: points descending, then mana value ascending, then name. */
const byPoints = (a: Row, b: Row) => (b.points ?? 0) - (a.points ?? 0) || a.card.manaValue - b.card.manaValue || byName(a, b);
/** A dependency group: the commander first, then by name. */
const commanderFirst = (a: Row, b: Row) => Number(b.card.commander) - Number(a.card.commander) || byName(a, b);

const KINDS = ["Creature", "Instant", "Sorcery", "Artifact", "Enchantment", "Planeswalker", "Battle"];
/** The card's own type, from the front face's type line, for `why.speedCost` and `why.wipe`. */
function kindOf(card: LedgerWireCard): string {
  const front = card.typeLine.split("//")[0];
  return (KINDS.find((k) => new RegExp(`\\b${k}\\b`).test(front)) ?? front.trim()).toLowerCase();
}

function rampWhy(card: LedgerWireCard, why: RampWhy): string {
  switch (why) {
    case "ramp": return L.why.speedCost(kindOf(card), card.manaValue);
    case "land": return L.why.landOut(card.manaValue);
    case "burst": return L.why.burst(card.manaValue);
    case "costReduction": return L.why.costReduction;
    case "tooLate": return L.why.tooLate(card.manaValue);
  }
}

function dependencyWhy(dep: DependencyWire, card: LedgerWireCard): string | null {
  if (dep.row === "graveyard" && card.uses) {
    const g = L.why.graveyard;
    const parts: string[] = [];
    if (card.uses.fills) parts.push(g.fills);
    if (card.uses.returns) parts.push(g.returns);
    if (card.uses.grows) parts.push(g.grows);
    // A keyword that plays from the graveyard is the card's own rules word, drawn as it is printed.
    parts.push(...card.uses.keywords.map((k) => k.toLowerCase()));
    return parts.length > 0 ? parts.join(", ") : null;
  }
  if (dep.row === "combat" && card.winsOutright) return L.why.winsOutright;
  // Artifacts, enchantments, creatures and activated carry no why: the copy module keys none.
  return null;
}

function dependencyReading(d: DependencyWire): string {
  switch (d.row) {
    case "graveyard": return L.readings.graveyard(d.count, d.commander);
    case "artifacts": return L.readings.artifacts(d.count, d.payoffs, d.activated);
    case "enchantments": return L.readings.enchantments(d.count, d.payoffs);
    case "creatures": return L.readings.creatures(d.payoffs);
    case "activated": return L.readings.activated(d.count);
    case "combat": return L.readings.combat(d.routes);
  }
}

function dependencyNote(d: DependencyWire, art: FindingArt): string | undefined {
  if (d.row === "graveyard") {
    const lands = d.landsLeftOut ?? [];
    return lands.length > 0 ? L.landsLeftOut(lands.map((c) => art.get(c.oracleId)?.name ?? c.name).join(", ")) : undefined;
  }
  if (d.row === "artifacts" || d.row === "enchantments") return L.onceNote;
  if (d.row === "combat") return L.reachNote;
  return undefined;
}

/** A graded ledger's header mark: the step as five small cells, the block's meter in miniature. */
function MiniMeter({ step }: { step: Step }) {
  return (
    <span aria-hidden="true" data-mini-meter={step} className="grid flex-none grid-cols-[repeat(5,5px)] gap-[2px]">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="block h-[9px] w-[5px] rounded-[1.5px]"
          style={i <= step ? { background: STEP_INK[i - 1] } : { background: "var(--elevated)", boxShadow: "inset 0 0 0 1px var(--border-strong)" }}
        />
      ))}
    </span>
  );
}

/** What a ledger draws, or null when the reading has nothing behind that opener. */
export function buildLedger(b: BenchmarksWire, key: LedgerKey, art: FindingArt): Ledger | null {
  const graded = (title: string, step: Step, rest: Omit<Ledger, "title" | "mark" | "aside" | "step">): Ledger => ({
    title, mark: <MiniMeter step={step} />, aside: copy.steps[step - 1], step, ...rest,
  });
  switch (key) {
    case "velocity": {
      const v = b.velocity;
      const rows = (lines: typeof v.counted): Row[] => lines.map((l) => ({ card: l.card, points: l.points, why: rampWhy(l.card, l.why) })).sort(byPoints);
      return graded(copy.names.velocity, v.step, {
        reading: L.readings.velocity(v.lands, trim(v.points), trim(v.averageManaValue, 1)),
        note: v.commanderTurn !== null && v.commanderName ? L.expectedTurn(v.commanderName, v.commanderTurn) : undefined,
        stats: { label: L.linkCurve, card: "curve" },
        groups: [{ head: L.counted, rows: rows(v.counted) }, { head: L.readNotCounted, rows: rows(v.notCounted) }],
        lines: [],
      });
    }
    case "flow": {
      const f = b.flow;
      return graded(copy.names.flow, f.step, {
        reading: L.readings.flow(f.points, f.lines.length),
        stats: { label: L.linkJobs, card: "jobs" },
        groups: [{
          head: L.counted,
          rows: f.lines.map((l) => ({ card: l.card, points: l.points, why: l.repeatable ? L.why.repeatable : L.why.oneShot })).sort(byPoints),
        }],
        lines: [],
      });
    }
    case "interaction": {
      const i = b.interaction;
      return graded(copy.names.interaction, i.step, {
        reading: L.readings.interaction(i.answers, i.cheapInstant),
        stats: { label: L.linkJobs, card: "jobs" },
        groups: [{
          head: L.counted,
          rows: i.lines.map((l) => ({
            card: l.card,
            points: l.weight,
            why: l.kind === "counterspell" ? L.why.counterspell(l.card.manaValue)
              : l.kind === "wipe" ? L.why.wipe(kindOf(l.card), l.card.manaValue)
              : L.why.speedCost(kindOf(l.card), l.card.manaValue),
          })).sort(byPoints),
        }],
        lines: [],
      });
    }
    case "win": {
      if (!b.win) return null;
      return graded(copy.names.win, b.win.step, {
        reading: L.readings.win(percent(b.win.odds)),
        note: L.readings.winNote,
        groups: [],
        lines: [...b.win.lines].sort((x, y) => y.odds - x.odds),
      });
    }
    default: {
      const d = b.dependencies.find((x) => x.row === key);
      if (!d) return null;
      return {
        title: L.ledgerTitle(copy.deps.rows[d.row]),
        mark: <StrengthTag strength={d.strength} label={copy.deps.strength[d.strength]} ledger />,
        step: null,
        reading: dependencyReading(d),
        hate: copy.deps.hate[d.row],
        note: dependencyNote(d, art),
        groups: d.groups.map((g) => ({
          head: L.groups[g.group],
          rows: (g.cards as LedgerWireCard[]).map((card) => ({ card, why: dependencyWhy(d, card) })).sort(commanderFirst),
        })),
        lines: [],
      };
    }
  }
}

/**
 * The Benchmark Ledger: the cards behind one grade or one dependency (handoff
 * `addendum_evidence_benchmarks`, `evidence-benchmarks-ledger.md`). The receipt's own chrome at 760
 * (R1), the decklist's card row (R2 to R6), and win speed from the receipt's combo body (R7).
 *
 * Every row is a `CardDetailTrigger` whose siblings are ALL the ledger's rows in display order, so
 * the stacked card's Prev/Next walks the ledger across its groups; the card stacks over this sheet
 * as it does over the receipt, and depth stays at two. The Stats link (R8) closes the sheet first,
 * then hands the deck page the card to scroll to.
 */
export function BenchmarkLedger({
  benchmarks,
  which,
  art,
  availability,
  onClose,
  onStats,
}: {
  benchmarks: BenchmarksWire;
  which: LedgerKey;
  art: FindingArt;
  availability?: LedgerAvailability;
  onClose: () => void;
  /** Switch the deck page to Deck stats and scroll to the card. Absent: no link is drawn. */
  onStats?: (card: StatsCard) => void;
}) {
  const ledger = buildLedger(benchmarks, which, art);
  if (!ledger) return null;
  const sibling = (c: { oracleId: string; name: string }): SiblingCard => ({
    oracleId: c.oracleId, name: art.get(c.oracleId)?.name ?? c.name, imageUri: art.get(c.oracleId)?.imageUri ?? null,
  });
  const seen = new Set<string>();
  const siblings = [
    ...ledger.groups.flatMap((g) => g.rows.map((r) => r.card)),
    ...ledger.lines.flatMap((l) => l.cards),
  ].filter((c) => !seen.has(c.oracleId) && !!seen.add(c.oracleId)).map(sibling);
  const graded = ledger.step !== null;
  const link = ledger.stats && onStats ? ledger.stats : null;

  return (
    <ModalChrome mark={ledger.mark} title={ledger.title} aside={ledger.aside} closeLabel={L.closeAria(ledger.title)} onClose={onClose} width={760}>
      <HoverPreviewProvider className="pb-[24px] md:pb-[12px]">
        <div data-ledger-summary className="flex flex-col gap-[12px] border-b border-b-[color:var(--border)] bg-[color:var(--surface)] px-[16px] py-[14px] md:gap-[14px] md:px-[20px] md:py-[16px]">
          <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--fg-body)] [text-wrap:pretty]">{ledger.reading}</p>
          {ledger.step !== null ? <Scale title={ledger.title} step={ledger.step} /> : null}
          {ledger.hate ? (
            <p data-broken-by className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-muted)] [text-wrap:pretty]">
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">{copy.deps.brokenBy}</span>
              {"  "}
              {ledger.hate}
            </p>
          ) : null}
          {ledger.note || link ? (
            <div className="flex flex-wrap items-center justify-between gap-x-[14px] gap-y-[4px] md:gap-x-[18px] md:gap-y-[8px]">
              {ledger.note ? (
                <span data-ledger-note className="min-w-0 flex-[1_1_300px] font-mono text-[10.5px] leading-[1.55] text-[color:var(--fg-faint)] [text-wrap:pretty]">{ledger.note}</span>
              ) : null}
              {link ? (
                <button
                  type="button"
                  data-stats-link={link.card}
                  onClick={() => {
                    onClose();
                    onStats?.(link.card);
                  }}
                  className="inline-flex min-h-[44px] cursor-pointer items-center gap-[7px] whitespace-nowrap border-0 bg-transparent p-0 font-mono text-[10.5px] text-[color:var(--accent)] hover:text-[color:var(--accent-hover)] md:min-h-[24px]"
                >
                  <span className="border-b border-dotted border-b-[color:var(--accent)]">{link.label}</span>
                  <span aria-hidden="true">→</span>
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {ledger.groups.filter((g) => g.rows.length > 0).map((g) => (
          <section key={g.head} data-ledger-group className="flex flex-col gap-[4px] px-[12px] pt-[16px] md:px-[20px] md:pt-[18px]">
            <div className="mb-[4px] flex items-baseline gap-[8px] border-b border-b-[color:var(--border)] px-[2px] pb-[4px] pt-[2px]">
              <h3 className="m-0 font-display text-[15px] font-bold leading-[1.2] text-[color:var(--fg)]">{g.head}</h3>
              <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">{g.rows.length}</span>
            </div>
            <ul className="m-0 flex list-none flex-col gap-[4px] p-0">
              {g.rows.map((r) => (
                <LedgerRow key={r.card.oracleId} row={r} graded={graded} art={art} siblings={siblings} availability={availability?.get(r.card.oracleId)} />
              ))}
            </ul>
          </section>
        ))}

        {ledger.lines.map((line) => (
          <ComboBody
            key={line.variantId}
            combo={line}
            art={art}
            siblings={siblings}
            stats={
              <div data-line-stats className="flex flex-wrap items-end gap-x-[22px] gap-y-[8px]">
                <span className="flex flex-col gap-[4px]">
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">{L.byT8}</span>
                  <span className="font-mono text-[14px] font-semibold text-[color:var(--fg)]">{percent(line.odds)}</span>
                </span>
                {line.foundBy.length > 0 ? (
                  <span data-found-by className="flex flex-col gap-[4px]">
                    <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">{L.foundBy}</span>
                    <span className="text-[12.5px] text-[color:var(--fg-muted)]">{line.foundBy.map((c) => art.get(c.oracleId)?.name ?? c.name).join(" · ")}</span>
                  </span>
                ) : null}
              </div>
            }
          />
        ))}
      </HoverPreviewProvider>
    </ModalChrome>
  );
}

function Scale({ title, step }: { title: string; step: Step }) {
  const word = copy.steps[step - 1];
  return (
    <span role="img" aria-label={copy.stepAria(title, word, step)} className="grid grid-cols-[repeat(5,minmax(0,1fr))] gap-[4px]">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="flex min-w-0 flex-col gap-[5px]">
          <span
            className="block h-[7px] rounded-[2px] md:h-[8px]"
            style={i <= step ? { background: STEP_INK[i - 1] } : { background: "var(--elevated)", boxShadow: "inset 0 0 0 1px var(--border-strong)" }}
          />
          <span className={"font-mono text-[8.5px] leading-[1.3] md:text-[9.5px] " + (i === step ? "font-semibold text-[color:var(--fg)]" : "text-[color:var(--fg-faint)]")}>
            {copy.steps[i - 1]}
          </span>
        </span>
      ))}
    </span>
  );
}

/** DecklistRow's padding (R2): its shell, its ground and its hover. */
const ROW_PADDING = "pl-[8px] pr-[4px] md:px-[9px] md:py-[7px]";

function LedgerRow({
  row,
  graded,
  art,
  siblings,
  availability,
}: {
  row: Row;
  graded: boolean;
  art: FindingArt;
  siblings: readonly SiblingCard[];
  availability?: { owned: boolean; availability: DeckDetailCard["availability"] };
}) {
  const drawn = art.get(row.card.oracleId);
  const name = drawn?.name ?? row.card.name;
  const preview = usePreviewRow(drawn?.imageUri);
  const describedId = useId();
  const why = row.why ? (row.card.commander ? L.why.commanderPrefix : "") + row.why : null;
  const points = graded && row.points !== undefined ? (row.points > 0 ? `+${trim(row.points)}` : "0") : null;
  const said = [why, points].filter(Boolean).join(", ");
  return (
    <li {...preview} data-card-row className="min-w-0">
      <CardDetailTrigger
        oracleId={row.card.oracleId}
        name={name}
        siblings={siblings}
        imageUri={drawn?.imageUri}
        describedBy={said ? describedId : undefined}
        className={
          `${ROW_SHELL} ${ROW_PADDING} w-full min-h-[52px] md:min-h-[34px] text-left bg-[color:var(--surface-rail)] hover:bg-[color:var(--elevated-hover)] `
          + "[--row-bg:var(--surface-rail)] hover:[--row-bg:var(--elevated-hover)]"
        }
      >
        {availability ? <OwnershipDot owned={availability.owned} className="h-[7px] w-[7px] md:h-[8px] md:w-[8px]" /> : null}
        <span className="flex min-w-0 flex-auto flex-col justify-center gap-[3px] overflow-hidden md:flex-row md:items-baseline md:justify-start md:gap-[9px]">
          <span className="truncate text-[14px] text-[color:var(--fg)] md:flex-[0_1_auto] md:text-[13.5px]">{name}</span>
          <span className="flex min-w-0 items-center gap-[8px] md:contents">
            {row.card.manaCost ? (
              <span className="flex flex-none md:hidden">
                <CostPips cost={row.card.manaCost} size={13} />
              </span>
            ) : null}
            {why ? <span data-why className="min-w-0 truncate font-mono text-[10.5px] text-[color:var(--fg-muted)]">{why}</span> : null}
          </span>
        </span>
        <span className="hidden flex-none md:flex">
          <CostTrack cost={row.card.manaCost} />
        </span>
        {availability?.availability ? (
          <AvailabilityMarker
            bareOne
            availability={availability.availability}
            seam="var(--row-bg)"
            selfExcluded
            nameless
            className="shrink-0 font-mono text-[11px] md:text-[11.5px]"
          />
        ) : null}
        {points !== null ? (
          <span
            data-points
            className={"w-[40px] flex-none text-right font-mono text-[12px] " + (row.points! > 0 ? "font-semibold text-[color:var(--fg)]" : "font-normal text-[color:var(--fg-faint)]")}
          >
            {points}
          </span>
        ) : null}
        {said ? <span id={describedId} className="sr-only">{said}</span> : null}
      </CardDetailTrigger>
    </li>
  );
}
