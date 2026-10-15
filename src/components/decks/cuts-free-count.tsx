"use client";

import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";

import { creditsCopy } from "../../lib/copy/credits";
import { deckCutsCopy } from "../../lib/copy/deck-cuts";
import { overCopy } from "../../lib/copy/decks-builder";
import { freeCount, hasCredit } from "../../lib/model/allowance-rule";
import { cutsAsk } from "../../lib/tuning/cuts-ask";
import type { CountRow } from "../../lib/tuning/cuts-count";
import type { CutsPanel } from "../../lib/tuning/cuts-state";
import { DECK_TOTAL } from "../../lib/decks/deck-size";
import { CreditButton } from "../ui/credit-button";
import { CreditsText } from "../ui/credits-text";
import { useAiSweepRef } from "../ui/use-ai-sweep";

/**
 * Proposed cuts' free count (Tuning hub R2, canvas C1): the heading, the lead, the Look deeper offer
 * and "What we counted". ONE tree for two mounts: `CutsPanelView` renders it around whatever its
 * state draws, and the About entry's figure renders it from a fixture (`PROPOSED_CUTS`), so the
 * entry can never describe a count the panel stopped drawing (STATES-about-r3.md §G3).
 *
 * The panel's other states slot in rather than fork it: `band` replaces the offer (a run in
 * flight, a failure, a refusal; `null` draws none), and `after` sits between it and the count (a
 * refusal message, the named cuts). With neither, it is the count before any spend.
 */

const copy = deckCutsCopy.panel;

export const overWords = (n: number) => overCopy.trim.words[n] ?? String(n);

/** The credit line under the offer, from the reader's allowance. */
export function cutsStanding(panel: CutsPanel): string {
  const a = panel.allowance;
  if (a.paused) return creditsCopy.paused(a.paused.until);
  if (a.ownerShare) return creditsCopy.ownerShare(new Date());
  if (!hasCredit(a)) return creditsCopy.spent(a.limit, a.reopensAt ?? a.nextAt);
  return creditsCopy.standing(freeCount(a), a.limit, a.nextAt);
}

/** Look deeper cannot be pressed: no credit, the cap paused, the owner's share spent, or nothing it may name. */
export function cutsBlocked(panel: CutsPanel): boolean {
  return !hasCredit(panel.allowance) || !!panel.allowance.paused || panel.allowance.ownerShare === true || panel.allLocked;
}

export function CutsFreeCount({
  panel,
  lead = copy.lead,
  cutCount = 0,
  headingRef,
  band,
  after,
  divider = null,
  onPress,
}: {
  panel: CutsPanel;
  /** The sentences after the bold over line. Defaults to the count's own. */
  lead?: string;
  /** Cuts this tool made toward the line (cut, and still standing: `cutStands`), for C8's head once the
   *  deck is back at its body size. Zero reads the neutral `Back to 99 / 99.` */
  cutCount?: number;
  headingRef?: Ref<HTMLHeadingElement>;
  /** In place of the offer. Omitted: the offer. `null`: nothing. */
  band?: ReactNode;
  after?: ReactNode;
  /** The rule over the count once a result shows above it. */
  divider?: string | null;
  /** Look deeper. Omitted where nothing may act on it (the About figure, which is inert). */
  onPress?: () => void;
}) {
  const { over } = panel;
  const standing = cutsStanding(panel);
  const headline = copy.overLead(overWords(over), panel.bodySize);
  return (
    <>
      <div className="flex flex-col gap-[3px] md:flex-row md:items-baseline md:gap-[12px]">
        <h2 id="cuts-heading" ref={headingRef} tabIndex={-1} className="font-display text-[17px] font-semibold outline-none md:text-[19px]" style={{ color: "var(--fg)" }}>
          {copy.heading}
        </h2>
        <span className="font-mono text-[10.5px]" style={{ color: "var(--fg-faint)" }}>{copy.sub}</span>
      </div>
      {over === 0 ? (
        // C8 / C8b, as drawn (R2 canvas C, the `done` box, lines 212-217): the same box at both widths.
        <div
          data-testid="cuts-done"
          className="mt-[14px] flex flex-col gap-[4px] rounded-[10px] px-[14px] py-[12px]"
          style={{ background: "var(--surface)", border: "1px solid var(--success)" }}
        >
          {/* `over` is clamped at zero, so a deck trimmed BELOW its size elsewhere while the tool was
              open also lands here (Copilot, PR #1809 round 2). The head claims the line, `Back to
              99 / 99.`, so it is drawn only for a deck exactly at it; under it, the body line alone,
              which is true of either. */}
          {panel.total >= DECK_TOTAL ? (
            <span className="text-[13.5px] font-semibold" style={{ color: "var(--fg)" }}>{copy.done.head(panel.bodySize, cutCount)}</span>
          ) : null}
          <span className="text-[12.5px] leading-[1.55]" style={{ color: "var(--fg-body)" }}>{copy.done.body}</span>
        </div>
      ) : (
        <p className="mt-[8px] text-[13px] leading-[1.5]" style={{ color: "var(--fg-body)" }}>
          <b className="font-semibold" style={{ color: "var(--fg)" }}>{headline}</b>{" "}
          {lead}
        </p>
      )}

      {over === 0 ? null : band !== undefined ? band : (
        <CutsBand>
          <CutsOffer panel={panel} variant="offer" blocked={cutsBlocked(panel)} standing={standing} onPress={onPress} />
        </CutsBand>
      )}
      {after}
      {over === 0 ? null : <Count panel={panel} divider={divider} />}
    </>
  );
}

export function CutsBand({ children, accent = false }: { children: ReactNode; accent?: boolean }) {
  const sweepRef = useAiSweepRef();
  return (
    <div ref={sweepRef} className={`mt-[14px] rounded-[10px] px-[14px] py-[14px] md:px-[16px]${accent ? " ai-sweep" : ""}`}
      style={{ background: "var(--surface)", border: `1px solid ${accent ? "var(--accent)" : "var(--border)"}` }}>
      {children}
    </div>
  );
}

/** Look deeper: the hub's one filled button, with its credit as a segment inside it. */
export function CutsOffer({ panel, variant, blocked, standing, onPress }: {
  panel: CutsPanel; variant: "offer" | "retry"; blocked: boolean; standing: string; onPress?: () => void;
}) {
  const spent = !hasCredit(panel.allowance);
  const d = copy.deeper;
  const press = onPress ?? (() => {});
  return (
    <div className={variant === "offer" ? "" : "mt-[12px]"}>
      {variant === "offer" ? (
        <div className="flex flex-col gap-[12px] md:flex-row md:items-start md:justify-between md:gap-[20px]">
          <div className="min-w-0">
            <h3 className="text-[14px] font-semibold" style={{ color: "var(--fg)" }}>{d.offerTitle(cutsAsk(panel.over))}</h3>
            <p className="mt-[5px] text-[12.5px] leading-[1.5]" style={{ color: "var(--fg-body)" }}>
              {panel.thin ? d.offerLeadThin : d.offerLead(cutsAsk(panel.over))}
            </p>
          </div>
          <CreditButton label={d.action} credit={d.credit} filled blocked={blocked} spent={spent} onPress={press} />
        </div>
      ) : (
        <CreditButton label={d.retry} credit={d.credit} filled={false} blocked={blocked} spent={spent} onPress={press} />
      )}
      <p className="mt-[10px] font-mono text-[10.5px]" style={{ color: "var(--fg-faint)" }}><CreditsText text={standing} /></p>
    </div>
  );
}

/** "What we counted": the model's input, as it is. Nothing here names a card. */
function Count({ panel, divider }: { panel: CutsPanel; divider: string | null }) {
  const f = copy.facts;
  return (
    <div className="mt-[18px]">
      {divider ? (
        <div className="mb-[10px] flex items-center gap-[10px]">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--fg-faint)" }}>{divider}</span>
          <span aria-hidden className="h-px flex-1" style={{ background: "var(--border)" }} />
        </div>
      ) : null}
      <div className="flex flex-col gap-[3px] md:flex-row md:items-baseline md:gap-[10px]">
        <h3 className="text-[13.5px] font-semibold" style={{ color: "var(--fg)" }}>{f.head}</h3>
        <span className="font-mono text-[10.5px]" style={{ color: "var(--fg-faint)" }}>
          {f.read(panel.total, panel.commander, panel.edhrecDecks, panel.declaredBracket)}
        </span>
      </div>
      {panel.rows.length === 0 ? (
        <p className="mt-[8px] text-[12.5px]" style={{ color: "var(--fg-body)" }}>{f.none}</p>
      ) : (
        <ul className="mt-[8px]" style={{ borderTop: "1px solid var(--border)" }}>
          {panel.rows.map((r) => <CountLine key={r.key} row={r} />)}
        </ul>
      )}
      <p className="mt-[10px] font-mono text-[10.5px] leading-[1.5]" style={{ color: "var(--fg-faint)" }}>
        {copy.neverCut(panel.commander, panel.lockedCount, panel.keyCount)}
      </p>
    </div>
  );
}

function CountLine({ row }: { row: CountRow }) {
  return (
    <li
      data-testid={`count-${row.key}`}
      className={`grid grid-cols-[64px_1fr_auto] items-baseline gap-x-[12px] py-[9px] md:grid-cols-[84px_1fr_auto_minmax(0,220px)] md:gap-x-[16px] ${row.thin ? "mt-[4px] rounded-[7px] px-[8px]" : ""}`}
      style={row.thin ? { border: "1px dashed var(--border-dashed)" } : { borderBottom: "1px solid var(--border)" }}
    >
      <span className="font-mono text-[9.5px] uppercase tracking-[0.1em]" style={{ color: "var(--fg-locked)" }}>{copy.sources[row.source]}</span>
      <span className="min-w-0 text-[13px]" style={{ color: row.thin ? "var(--fg-muted)" : "var(--fg)" }}>
        {row.label}
        <span className="block font-mono text-[11px] md:hidden" style={{ color: "var(--fg-muted)" }}>{row.note}</span>
      </span>
      {row.figure === null ? <span /> : <span className="text-right font-mono text-[13px] font-semibold" style={{ color: "var(--fg)" }}>{row.figure}</span>}
      <span className="hidden font-mono text-[11px] md:inline" style={{ color: "var(--fg-muted)" }}>{row.note}</span>
    </li>
  );
}

/**
 * The panel's frame: border, sunken fill, radius and padding, everything but its top margin, which stays with
 * `CutsPanelView`. Shared so About's specimen draws the same frame the panel does, never a copy of its classes.
 */
export function CutsFrame({
  className = "",
  children,
  ...rest
}: { className?: string; children: ReactNode } & Omit<ComponentPropsWithoutRef<"section">, "className" | "style">) {
  return (
    <section
      {...rest}
      className={`rounded-[11px] px-[14px] py-[16px] md:rounded-[12px] md:px-[20px] md:py-[18px] ${className}`.trim()}
      style={{ background: "var(--surface-sunken)", border: "1px solid var(--border)" }}
    >
      {children}
    </section>
  );
}
