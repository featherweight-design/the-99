"use client";

import { useId } from "react";

import type { DependencyWire, BenchmarksWire } from "../../lib/benchmarks/wire";
import type { Step } from "../../lib/benchmarks/types";
import { deckBenchmarksCopy as copy } from "../../lib/copy/deck-benchmarks";
import { formatShortDeckDate } from "../../lib/decks/format";
import { InfoTip } from "../ui/info-tip";

/** Which ledger an opener asks for: a graded benchmark, or one dependency row. */
export type LedgerKey = "velocity" | "flow" | "interaction" | "win" | DependencyWire["row"];

type Grade = "velocity" | "flow" | "interaction" | "win";
const GRADES: readonly Grade[] = ["velocity", "flow", "interaction", "win"];

/**
 * One hue (the `--fact` blue, h 250), each step more saturated: a grade is never a success or a
 * warning colour (handoff README, design call 2). Segment i of 1..step takes `STEP_INK[i - 1]`.
 */
const STEP_INK = ["oklch(0.68 0.02 250)", "oklch(0.69 0.045 250)", "oklch(0.70 0.07 250)", "oklch(0.71 0.10 250)", "oklch(0.72 0.135 250)"] as const;

const trim = (n: number, digits = 2) => String(Number(n.toFixed(digits)));
const percent = (odds: number) => `${Math.round(odds * 100)}%`;

/** The [before, bold run, after] of a grade's figure line, and how many ledger entries it opens. */
function gradeFigure(b: BenchmarksWire, g: Grade): { parts: readonly string[]; count: number } {
  switch (g) {
    case "velocity":
      return {
        parts: copy.figure.velocity(trim(b.velocity.points), trim(b.velocity.averageManaValue, 1)),
        count: b.velocity.counted.length + b.velocity.notCounted.length,
      };
    case "flow":
      return { parts: copy.figure.flow(b.flow.engines, b.flow.oneShots), count: b.flow.lines.length };
    case "interaction":
      return { parts: copy.figure.interaction(b.interaction.answers, b.interaction.cheapInstant), count: b.interaction.lines.length };
    case "win":
      return b.win
        ? { parts: copy.figure.win(b.win.lines.length, percent(b.win.odds)), count: b.win.lines.length }
        : { parts: [], count: 0 };
  }
}

function dependencyFigure(d: DependencyWire): readonly string[] {
  switch (d.row) {
    case "graveyard": return copy.deps.figure.graveyard(d.count, d.commander);
    case "artifacts": return copy.deps.figure.artifacts(d.count, d.payoffs, d.activated);
    case "enchantments": return copy.deps.figure.enchantments(d.count, d.payoffs);
    case "creatures": return copy.deps.figure.creatures(d.payoffs);
    case "activated": return copy.deps.figure.activated(d.count, d.commander);
    case "combat": return copy.deps.figure.combat(d.routes);
  }
}

/** A card listed once across a row's groups is counted once. */
const ledgerCount = (d: DependencyWire) => new Set(d.groups.flatMap((g) => g.cards.map((c) => c.oracleId))).size;

function stepOf(b: BenchmarksWire, g: Grade): Step | null {
  return g === "win" ? (b.win?.step ?? null) : b[g].step;
}

/**
 * "How it plays": a reading's evidence benchmarks, last in the Analysis tab under "What is in this
 * deck" (handoff `addendum_evidence_benchmarks`, design calls 1 to 5). Four grade tiles, then the
 * Dependencies box. The block belongs to the reading: drawn with it, stale with it (its caption
 * says so), and never busy on its own.
 *
 * ONE LIST AT BOTH WIDTHS where the handoff allows it. The grades are two drawings (tiles at 1300, a
 * box of rows at 390), so `layout` picks one of them in markup rather than CSS hiding a second copy
 * of every control: `auto` follows the viewport through the `md:` breakpoint for the tile/row
 * container, while each tile is drawn once and restyled. `rows` forces the phone drawing at any
 * width (E1), for the About specimen in its 760 column.
 *
 * `onOpen` is the ledger's (plan PR 4). Without it no opener is drawn, so the block never offers a
 * control that does nothing.
 */
export function BenchmarksBlock({
  benchmarks,
  stale = false,
  analyzedAt,
  layout = "auto",
  onOpen,
}: {
  benchmarks: BenchmarksWire;
  stale?: boolean;
  /** The reading's ISO instant, for the stale caption's date. */
  analyzedAt: string;
  layout?: "auto" | "rows";
  onOpen?: (key: LedgerKey) => void;
}) {
  const rows = layout === "rows";
  const tipId = useId();
  const w = (tile: string, row: string) => (rows ? row : `${row} ${tile}`);
  return (
    <section data-benchmarks className={w("md:gap-[11px]", "flex flex-col gap-[9px]")}>
      <div className={w("md:flex-row md:items-baseline md:gap-[14px] md:flex-wrap", "flex flex-col gap-[4px]")}>
        <h3 className={w("md:text-[10px] md:tracking-[0.16em]", "m-0 font-mono font-normal uppercase text-[9.5px] tracking-[0.14em] text-[color:var(--fg-faint)]")}>
          {copy.heading}
        </h3>
        <span className={w("md:text-[10.5px] md:leading-normal", "font-mono text-[9.5px] leading-[1.5] text-[color:var(--fg-faint)] [text-wrap:pretty]")}>
          {stale ? copy.captionStale(formatShortDeckDate(new Date(analyzedAt))) : copy.caption}
        </span>
      </div>

      <div
        data-grades
        className={w(
          "md:grid md:grid-cols-[repeat(4,minmax(0,1fr))] md:items-stretch md:gap-[10px] md:overflow-visible md:rounded-none md:border-0 md:bg-transparent",
          "flex flex-col overflow-hidden rounded-[11px] border border-[color:var(--border)] bg-[color:var(--surface)]",
        )}
      >
        {GRADES.map((g) => (
          <GradeTile key={g} grade={g} benchmarks={benchmarks} rows={rows} onOpen={onOpen} />
        ))}
      </div>

      <div
        data-dependencies
        className={w("md:rounded-[9px]", "relative flex flex-col rounded-[11px] border border-[color:var(--border)] bg-[color:var(--surface-sunken)]")}
      >
        <div className={w("md:min-h-0 md:px-[16px] md:pb-[10px] md:pt-[12px]", "flex min-h-[44px] items-center gap-[8px] px-[13px]")}>
          <span className={w("md:text-[12px]", "text-[12.5px] font-semibold text-[color:var(--fg)]")}>{copy.deps.name}</span>
          <InfoTip id={tipId} lines={[copy.deps.tip]} label={copy.deps.tipAria} />
        </div>
        {benchmarks.dependencies.length === 0 ? (
          <div
            data-dependencies-none
            className={w("md:mx-[12px] md:mb-[12px] md:gap-[5px] md:rounded-[7px] md:px-[14px]", "mx-[10px] mb-[10px] flex flex-col gap-[6px] rounded-[8px] border border-dashed border-[color:var(--border-dashed)] p-[12px]")}
          >
            <p className={w("md:text-[13px]", "m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-body)]")}>{copy.deps.noneHead}</p>
            <p className={w("md:text-[12px]", "m-0 text-[11.5px] leading-[1.5] text-[color:var(--fg-muted)] [text-wrap:pretty]")}>{copy.deps.noneLine}</p>
            <span className={w("md:text-[10px]", "font-mono text-[9.5px] leading-[1.5] text-[color:var(--fg-faint)]")}>{copy.deps.checked}</span>
          </div>
        ) : (
          benchmarks.dependencies.map((d) => <DependencyRow key={d.row} dep={d} rows={rows} onOpen={onOpen} />)
        )}
      </div>
    </section>
  );
}

function GradeTile({ grade, benchmarks, rows, onOpen }: { grade: Grade; benchmarks: BenchmarksWire; rows: boolean; onOpen?: (key: LedgerKey) => void }) {
  const w = (tile: string, row: string) => (rows ? row : `${row} ${tile}`);
  const name = copy.names[grade];
  const step = stepOf(benchmarks, grade);
  if (step === null) {
    // No combo line: no meter (five empty segments would read as zero) and no opener. A dashed
    // panel at full height, inside the row on the phone (design call 5).
    return (
      <div data-grade={grade} data-no-combo className={w("md:rounded-[9px] md:border md:border-dashed md:border-[color:var(--border-dashed)] md:p-0", "border-b border-[color:var(--border)] p-[10px]")}>
        <div className={w("md:min-h-0 md:justify-start md:gap-[8px] md:rounded-none md:border-0 md:px-[14px] md:pb-[11px] md:pt-[12px]", "flex min-h-[104px] flex-col justify-center gap-[7px] rounded-[8px] border border-dashed border-[color:var(--border-dashed)] px-[12px] py-[10px]")}>
          <div className={w("md:flex-col md:items-start md:gap-[8px]", "flex items-baseline justify-between gap-[10px]")}>
            <span className={w("md:text-[12px]", "text-[12.5px] font-semibold text-[color:var(--fg)]")}>{name}</span>
            <span className={w("md:text-[14px] md:leading-[1.3]", "text-[13px] font-medium text-[color:var(--fg-body)]")}>{copy.noCombo}</span>
          </div>
          <span className={w("md:text-[10.5px] md:leading-[1.45]", "text-[11.5px] leading-[1.5] text-[color:var(--fg-muted)] [text-wrap:pretty]")}>{copy.noComboLine}</span>
        </div>
      </div>
    );
  }
  const word = copy.steps[step - 1];
  const { parts, count } = gradeFigure(benchmarks, grade);
  const [pre, strong, post] = parts;
  return (
    <div
      data-grade={grade}
      data-step={step}
      className={w(
        "md:gap-[8px] md:rounded-[9px] md:border md:border-[color:var(--border-strong)] md:bg-[color:var(--surface)] md:px-[14px] md:pb-[11px] md:pt-[12px] md:min-w-0",
        "flex flex-col border-b border-[color:var(--border)] px-[13px] pt-[12px]",
      )}
    >
      <div className={w("md:flex-col md:items-start md:gap-[8px]", "flex items-baseline justify-between gap-[10px]")}>
        <span className={w("md:text-[12px]", "text-[12.5px] font-semibold text-[color:var(--fg)]")}>{name}</span>
        <span className={w("md:text-[18px]", "font-[family-name:var(--display)] text-[15px] font-bold leading-[1.1] text-[color:var(--fg)]")}>{word}</span>
      </div>
      <span role="img" aria-label={copy.stepAria(name, word, step)} className={w("md:mt-0", "mt-[9px] grid grid-cols-[repeat(5,minmax(0,1fr))] gap-[3px]")}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={w("md:h-[6px]", "block h-[7px] rounded-[2px]")}
            style={i <= step ? { background: STEP_INK[i - 1] } : { background: "var(--elevated)", boxShadow: "inset 0 0 0 1px var(--border-strong)" }}
          />
        ))}
      </span>
      <span className={w("md:mt-0 md:flex-1 md:text-[10.5px] md:leading-[1.45]", "mt-[8px] text-[11.5px] leading-[1.5] text-[color:var(--fg-muted)] [text-wrap:pretty]")}>
        {pre}<b className="font-semibold text-[color:var(--fg)]">{strong}</b>{post}
      </span>
      {onOpen && count > 0 ? (
        <span className={w("md:justify-start", "flex justify-end")}>
          <Opener label={grade === "win" ? copy.openCombo(count) : copy.open(count)} aria={copy.openAria(name, word)} rows={rows} onPress={() => onOpen(grade)} />
        </span>
      ) : (
        <span aria-hidden="true" className={w("md:hidden", "h-[12px]")} />
      )}
    </div>
  );
}

function DependencyRow({ dep, rows, onOpen }: { dep: DependencyWire; rows: boolean; onOpen?: (key: LedgerKey) => void }) {
  const w = (tile: string, row: string) => (rows ? row : `${row} ${tile}`);
  const name = copy.deps.rows[dep.row];
  const strength = copy.deps.strength[dep.strength];
  const [pre, strong, post] = dependencyFigure(dep);
  const count = ledgerCount(dep);
  return (
    <div
      data-dependency={dep.row}
      data-strength={dep.strength}
      className={w(
        "md:grid md:min-h-[46px] md:grid-cols-[220px_minmax(0,1fr)_minmax(0,1.15fr)_120px] md:items-center md:gap-[18px] md:px-[16px] md:py-[9px]",
        "flex flex-col gap-[6px] border-t border-[color:var(--border)] px-[13px] pt-[11px]",
      )}
    >
      <div className="flex min-w-0 items-center gap-[9px]">
        <StrengthTag strength={dep.strength} label={strength} />
        <span className="text-[13px] font-semibold text-[color:var(--fg)]">{name}</span>
      </div>
      <span className={w("md:text-[12px] md:leading-[1.45]", "text-[11.5px] leading-[1.5] text-[color:var(--fg-muted)] [text-wrap:pretty]")}>
        {pre}<b className="font-semibold text-[color:var(--fg)]">{strong}</b>{post}
      </span>
      <span className={w("md:flex md:flex-col md:gap-[2px] md:min-w-0 md:text-[12px] md:leading-[1.45]", "text-[11.5px] leading-[1.5] text-[color:var(--fg-body)] [text-wrap:pretty]")}>
        <span className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-[color:var(--fg-faint)]">{copy.deps.brokenBy}</span>
        {/* Inline on the phone, after a no-break space; stacked under the label at 1300. */}
        <span className={rows ? "" : "md:hidden"}>{"\u00a0 "}</span>
        <span>{copy.deps.hate[dep.row]}</span>
      </span>
      {onOpen && count > 0 ? (
        <span className={w("md:justify-end", "flex justify-end")}>
          <Opener label={copy.open(count)} aria={copy.deps.rowAria(name, strength)} rows={rows} onPress={() => onOpen(dep.row)} />
        </span>
      ) : (
        // Combat Heavy has no route out of combat, so no card to list and no opener (audit rule 3).
        <span aria-hidden="true" className={w("md:hidden", "h-[11px]")} />
      )}
    </div>
  );
}

function StrengthTag({ strength, label }: { strength: "heavy" | "light"; label: string }) {
  return (
    <span
      data-strength-tag={strength}
      className={
        "inline-block min-w-[50px] flex-none whitespace-nowrap rounded-[4px] border px-[6px] py-[2px] text-center font-mono text-[9px] uppercase tracking-[0.12em] "
        + (strength === "heavy"
          ? "border-[color:var(--fact)] bg-[color-mix(in_oklab,var(--fact)_14%,transparent)] text-[color:var(--fg)]"
          : "border-[color:var(--border-strong)] text-[color:var(--fg-muted)]")
      }
    >
      {label}
    </span>
  );
}

/** The findings' own opener shape: mono, accent, dotted. At 390 a 44px row with an arrow. */
function Opener({ label, aria, rows, onPress }: { label: string; aria: string; rows: boolean; onPress: () => void }) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-label={aria}
      onClick={onPress}
      className={
        "inline-flex min-h-[44px] cursor-pointer items-center font-mono text-[10px] text-[color:var(--accent)] hover:text-[color:var(--accent-hover)] "
        + (rows ? "" : "md:min-h-0 md:text-[9.5px]")
      }
    >
      <span className="whitespace-nowrap border-b border-dotted border-[color:var(--accent)]">
        {label}
        <span aria-hidden="true" className={rows ? "" : "md:hidden"}> →</span>
      </span>
    </button>
  );
}
