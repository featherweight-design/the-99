"use client";

// Results (handoff Results.dc, R1 and R2): the run as four facts, then the commander when the run changed who leads, then the swaps grouped by the
// theme each cut came from. The date sits on the title line. A short run (under 12 at the chosen bracket) is counted, refunded and still startable.
// A3 (calls 7 to 11): each side of a swap carries the deck row's bracket marks right after its name, and the key under the facts
// glosses only the marks this result draws.
import type { ReactNode } from "react";
import { preconUpgradeCopy } from "../../../../lib/copy/precon-upgrade";
import { dollars } from "../../../../lib/copy/credits-page";
import { WUBRG_COLOR, inWubrgOrder } from "../../../../lib/cards/colors";
import type { OfferedCommander, PanelCard, PanelRun, UpgradePanel } from "../../../../lib/precons/upgrade/run";
import type { StoredPair, SwapCombo } from "../../../../lib/precons/upgrade/validate";
import { CARD_FACTS, cardMarkCopy } from "../../../../lib/copy/card-mark";
import { comboAwarenessCopy } from "../../../../lib/copy/combo-awareness";
import { ComboGlyph } from "../../../cards/combo-glyph";
import { FactTooltip } from "../../../cards/fact-tooltip";
import { FoldedMarks, type FoldMark } from "../../../cards/folded-marks";
import { MarkKey } from "../../mark-key";
import { factComboEntries } from "../../mark-key-entries";
import { StrategyIcon } from "../../strategy-icon";
import { CardDetailTrigger, useCardDetailIfAny } from "../../../cards/card-detail-context";
import type { StrategyKey } from "@/lib/strategy/score";

const copy = preconUpgradeCopy.results;

/** A cut no strategy the deck backs claims has no theme in the handoff: those are grouped last, under one heading. */
const REST = "";

/** The day as `Nov 10`, in the reader's own zone (this draws only after the reader opens the flow). */
export const runDay = (d: Date) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** The commander option a run was made under: its key leads the run's stored key. */
export function leadOf(panel: UpgradePanel, run: PanelRun): OfferedCommander | null {
  return panel.commanders.find((c) => run.strategyKey.startsWith(`${c.key}/`)) ?? null;
}

/** The pairs by cut theme, in the order the themes first appear, with the cuts no theme claims last. */
export function groupPairs(run: PanelRun): { theme: string; pairs: StoredPair[] }[] {
  const groups = new Map<string, StoredPair[]>();
  for (const p of run.pairs) {
    const t = run.themes[p.cutId] ?? REST;
    groups.set(t, [...(groups.get(t) ?? []), p]);
  }
  const rest = groups.get(REST);
  groups.delete(REST);
  return [...groups.entries(), ...(rest ? [[REST, rest] as const] : [])].map(([theme, pairs]) => ({ theme, pairs }));
}

/** One card's facts for a commander option: a partner pair draws the union of its colors and owns only what the reader owns of both; its mana value is no one number, so none is drawn.
 *  Its bracket facts are the union of both cards' in the shipped `CARD_FACTS` order (readiness clarification 2), absent when neither carries one. */
export function combined(ids: string[], cards: Record<string, PanelCard>): PanelCard | undefined {
  const all = ids.map((id) => cards[id]);
  if (all.length === 0 || all.some((c) => !c)) return undefined;
  if (all.length === 1) return all[0];
  const facts = CARD_FACTS.filter((f) => all.some((c) => c.facts?.includes(f)));
  return { owned: all.every((c) => c.owned), identity: [...new Set(all.flatMap((c) => c.identity ?? []))], ...(facts.length ? { facts } : {}) };
}

/** A mark a side draws after its name: a bracket fact, or the combo mark with its hover sentence. */
type Mark = FoldMark;

/** The swap's combo mark: the glyph is silent, so its sentence is spoken from an `sr-only` span, as the deck row's description speaks it. */
function SwapCombo({ sentence }: { sentence: string }) {
  return (
    <>
      <FactTooltip sentence={sentence}>
        <ComboGlyph />
      </FactTooltip>
      <span className="sr-only">{sentence}</span>
    </>
  );
}

/**
 * The combo mark's sentence on a swap, which is not applied yet (A3 call 10): an add's partner is in the deck after the swaps,
 * and a cut's partner stays, so the cut breaks the combo. The deck row's `Both are in this deck.` would be false on either.
 */
export function swapComboSentence(side: "cut" | "add", combo: SwapCombo): string {
  const t = comboAwarenessCopy.swapTooltip;
  const more = combo.otherPartners ?? 0;
  if (side === "add") return more > 0 ? t.addMore(combo.name, more) : t.add(combo.name);
  return more > 0 ? t.cutMore(combo.name, more) : t.cut(combo.name);
}

/** A side's marks in the deck row's order: its facts (CARD_FACTS order, as read), then the combo mark. A run stored before
 *  partners were kept has no `cutCombo`/`addCombo`, so it draws facts alone (absence is the design). */
export function marksOf(card: PanelCard | undefined, combo: { side: "cut" | "add"; partner: SwapCombo | null | undefined } | null): Mark[] {
  return [
    ...(card?.facts ?? []).map((fact) => ({ kind: "fact" as const, fact })),
    ...(combo?.partner ? [(() => {
      const sentence = swapComboSentence(combo.side, combo.partner);
      return { kind: "combo" as const, sentence, glyph: <SwapCombo sentence={sentence} /> };
    })()] : []),
  ];
}

/**
 * The marks right after the name, 16px bare, each in its shipped `FactTooltip` (pointer-fine only), folded by the deck row's own
 * rule (`FoldedMarks`): by the SIDE's width, a container query on `Side`, with the deck row's tiers. Wide (480 and up) keeps four
 * and folds a 5th; middle (360 to 479) keeps two; tight (under 360, a phone side and a desktop dialog's half) keeps one. A tier
 * that would fold exactly one mark folds none, so two marks never fold and a `+N` always counts two or more.
 */
function Marks({ marks }: { marks: Mark[] }) {
  if (marks.length === 0) return null;
  return (
    <span className="flex flex-none items-center gap-[4px]">
      <FoldedMarks marks={marks} />
    </span>
  );
}

function Pips({ card }: { card: PanelCard | undefined }) {
  // A card the catalog does not hold has no facts: its row draws no mana value and no colors rather than a false 0.
  if (!card || (card.cmc === undefined && !card.identity?.length)) return null;
  return (
    <span className="flex flex-none items-center gap-[3px]" aria-hidden>
      {card.cmc !== undefined && <span className="flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-[color:var(--elevated)] px-[3px] font-mono text-[9px] text-[color:var(--fg)]">{card.cmc}</span>}
      {inWubrgOrder(card.identity ?? []).map((c) => <span key={c} className="h-[10px] w-[10px] rounded-full" style={{ background: WUBRG_COLOR[c] }} />)}
    </span>
  );
}

/** The name, as a card details press where the page has card details and the side is one card (Hugh, 2026-11-12: names in
 *  the swaps did not open). The box's own commander pair, two cards on one side, stays text. */
function Name({ name, oracleId }: { name: string; oracleId: string | null }) {
  const detail = useCardDetailIfAny();
  if (!detail || !oracleId) return <span className="min-w-0 truncate">{name}</span>;
  return (
    <CardDetailTrigger oracleId={oracleId} name={name} title={name} preview className="min-w-0 cursor-pointer truncate border-0 bg-transparent p-0 text-left font-sans text-[13px] text-[color:var(--fg)] underline-offset-2 hover:underline">
      {name}
    </CardDetailTrigger>
  );
}

/** One side of a swap: `−` or `+`, the owned dot (filled: a copy is yours), the name and its marks, then what it carries.
 *  The name and the marks share one `min-w-0 flex-1` box (readiness clarification 5): the name truncates and gives up room
 *  first, the marks are `flex-none` right after it, and the pips stay at the row's end. */
function Side({ sign, name, oracleId, owned, card, marks, end }: { sign: "−" | "+"; name: string; oracleId: string | null; owned: boolean | null; card: PanelCard | undefined; marks: Mark[]; end: ReactNode }) {
  return (
    // `@container`: the marks fold by this side's own width, as the deck row's fold by the row's (`FoldedMarks`).
    <span className="@container flex min-w-0 flex-1 items-center gap-[8px] rounded-[8px] bg-[color:var(--surface-sunken)] px-[10px] py-[8px] text-[13px] text-[color:var(--fg)]">
      <span aria-hidden className={sign === "+" ? "text-[color:var(--accent-text)]" : "text-[color:var(--fg-faint)]"}>{sign}</span>
      {owned !== null && (
        <span aria-hidden className={"h-[8px] w-[8px] flex-none rounded-full " + (owned ? "bg-[color:var(--success)]" : "border border-dashed border-[color:var(--fg-faint)]")} />
      )}
      <span className="flex min-w-0 flex-1 items-center gap-[6px]" data-name-box="">
        <Name name={name} oracleId={oracleId} />
        <Marks marks={marks} />
      </span>
      <Pips card={card} />
      {end}
    </span>
  );
}

function Swap({ cutName, cutId = null, cutCard, cutMarks, addName, addId = null, addCard, addMarks, aside, reason }: {
  cutName: string; cutId?: string | null; cutCard: PanelCard | undefined; cutMarks: Mark[]; addName: string; addId?: string | null; addCard: PanelCard | undefined; addMarks: Mark[]; aside: [ReactNode, ReactNode]; reason: string | null;
}) {
  return (
    <li className="m-0 flex list-none flex-col gap-[6px] border-x-0 border-b border-t-0 border-solid border-b-[color:var(--border)] py-[10px] last:border-b-0">
      <span className="flex flex-col gap-[6px] md:flex-row md:items-center md:gap-[10px]">
        <Side sign="−" name={cutName} oracleId={cutId} owned={cutCard ? cutCard.owned : null} card={cutCard} marks={cutMarks} end={aside[0]} />
        <span aria-hidden className="hidden text-[color:var(--fg-faint)] md:block">→</span>
        <Side sign="+" name={addName} oracleId={addId} owned={addCard ? addCard.owned : null} card={addCard} marks={addMarks} end={aside[1]} />
      </span>
      {reason && <span className="text-[12px] leading-[1.5] text-[color:var(--fg-muted)]">{reason}</span>}
    </li>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-[3px] rounded-[7px] px-[12px] py-[8px]">
      <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-[color:var(--fg-faint)]">{label}</span>
      <span className="flex items-baseline gap-[6px] text-[14px] font-semibold text-[color:var(--fg)]">{children}</span>
    </div>
  );
}

export function ResultView({ panel, run }: { panel: UpgradePanel; run: PanelRun }) {
  const lead = leadOf(panel, run);
  const leadName = lead ? lead.cards.map((c) => c.name).join(" + ") : "";
  const box = panel.commanders.find((c) => c.isFace) ?? null;
  const changed = lead !== null && box !== null && lead.key !== box.key;
  const key = run.strategyKey.split("/")[2] ?? "";
  const groups = groupPairs(run);
  const boxCard = box ? combined(box.cards.map((c) => c.oracleId), panel.cards) : undefined;
  const leadCard = lead ? combined(lead.cards.map((c) => c.oracleId), panel.cards) : undefined;
  // The key is the result's closed set (A3 call 9): the sides this view draws, the commander pair only when its group shows.
  const keyEntries = factComboEntries(
    [...(changed ? [boxCard, leadCard] : []), ...run.pairs.flatMap((p) => [panel.cards[p.cutId], panel.cards[p.addId]])].filter((c): c is PanelCard => c !== undefined),
    { combo: run.pairs.some((p) => p.cutCombo || p.addCombo) },
  );
  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex items-center gap-[10px]">
        <span className="flex h-[32px] w-[32px] flex-none items-center justify-center rounded-full border border-solid border-[color:var(--accent)] text-[color:var(--accent-text)]">
          <StrategyIcon strategy={key as StrategyKey} size={18} />
        </span>
        <h3 className="m-0 min-w-0 flex-1 font-display text-[16px] font-normal uppercase text-[color:var(--fg)]">{copy.title(run.pairs.length, run.strategyLabel)}</h3>
        <span className="flex-none font-mono text-[10.5px] text-[color:var(--fg-faint)]">{runDay(run.createdAt)}</span>
      </div>
      <div className="grid grid-cols-2 gap-[2px] rounded-[10px] bg-[color:var(--surface-sunken)] p-[3px] md:grid-cols-4">
        <Fact label={copy.facts.ledBy}>{leadName}</Fact>
        <Fact label={copy.facts.bracket}>
          <span className="text-[color:var(--accent-text)]">{run.bracketBefore ?? "?"} → {run.bracketAfter ?? run.bracketTarget ?? "?"}</span>
        </Fact>
        <Fact label={copy.facts.toBuy}>{run.toBuy.cards} <span className="font-mono text-[12px] font-normal text-[color:var(--fg-body)]">{dollars(run.toBuy.cents)}</span></Fact>
        <Fact label={copy.facts.yours}>{run.owned}</Fact>
      </div>
      {keyEntries.length > 0 && <MarkKey marks={keyEntries} regionAria={cardMarkCopy.keyRegionAria} />}
      {run.refunded && <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-body)]">{copy.short(run.bracketTarget ?? run.bracketAfter ?? 0, run.pairs.length)}</p>}
      {changed && box && lead && (
        <section className="flex flex-col gap-[8px]">
          <h4 className="m-0 flex items-baseline gap-[8px] text-[14px] font-semibold text-[color:var(--fg)]">
            {copy.commanderGroup} <span className="font-mono text-[10.5px] font-normal text-[color:var(--fg-faint)]">{copy.commanderAside}</span>
          </h4>
          <ul className="m-0 flex list-none flex-col p-0">
            <Swap
              cutName={box.cards.map((c) => c.name).join(" + ")} cutId={box.cards.length === 1 ? box.cards[0].oracleId : null} cutCard={boxCard} cutMarks={marksOf(boxCard, null)}
              addName={leadName} addId={lead.cards.length === 1 ? lead.cards[0].oracleId : null} addCard={leadCard} addMarks={marksOf(leadCard, null)}
              aside={[<span key="a" className="font-mono text-[10.5px] text-[color:var(--fg-muted)]">{copy.toThe99}</span>, <span key="b" className="font-mono text-[10.5px] text-[color:var(--accent-text)]">{copy.leads}</span>]}
              reason={copy.commanderWhy(leadName, box.cards.map((c) => c.name).join(" + "))}
            />
          </ul>
        </section>
      )}
      {groups.map((g) => (
        <section key={g.theme || "rest"} className="flex flex-col gap-[8px]">
          <h4 className="m-0 flex items-baseline gap-[8px] text-[14px] font-semibold text-[color:var(--fg)]">
            {g.theme === REST ? copy.cutsFromRest : copy.cutsFrom(g.theme)} <span className="font-mono text-[10.5px] font-normal text-[color:var(--fg-faint)]">{g.pairs.length}</span>
          </h4>
          <ul className="m-0 flex list-none flex-col p-0">
            {g.pairs.map((p) => {
              const add = panel.cards[p.addId];
              const cut = panel.cards[p.cutId];
              return (
                <Swap
                  key={p.position}
                  cutName={p.cut} cutId={p.cutId} cutCard={cut} cutMarks={marksOf(cut, { side: "cut", partner: p.cutCombo })}
                  addName={p.add} addId={p.addId} addCard={add} addMarks={marksOf(add, { side: "add", partner: p.addCombo })} reason={p.reason}
                  aside={[null, <span key="p" className="font-mono text-[11px] text-[color:var(--fg-body)]">{add?.owned ? copy.youOwnIt : dollars(p.addCents)}</span>]}
                />
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
