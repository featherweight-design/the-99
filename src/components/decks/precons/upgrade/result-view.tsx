"use client";

// Results (handoff Results.dc, R1 and R2): the run as four facts, then the commander when the run changed who leads, then the swaps grouped by the
// theme each cut came from. The date sits on the title line. A short run (under 12 at the chosen bracket) is counted, refunded and still startable.
import type { ReactNode } from "react";
import { preconUpgradeCopy } from "../../../../lib/copy/precon-upgrade";
import { dollars } from "../../../../lib/copy/credits-page";
import { WUBRG_COLOR, inWubrgOrder } from "../../../../lib/cards/colors";
import type { OfferedCommander, PanelCard, PanelRun, UpgradePanel } from "../../../../lib/precons/upgrade/run";
import type { UpgradePair } from "../../../../lib/precons/upgrade/validate";
import { StrategyIcon } from "../../strategy-icon";
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
export function groupPairs(run: PanelRun): { theme: string; pairs: UpgradePair[] }[] {
  const groups = new Map<string, UpgradePair[]>();
  for (const p of run.pairs) {
    const t = run.themes[p.cutId] ?? REST;
    groups.set(t, [...(groups.get(t) ?? []), p]);
  }
  const rest = groups.get(REST);
  groups.delete(REST);
  return [...groups.entries(), ...(rest ? [[REST, rest] as const] : [])].map(([theme, pairs]) => ({ theme, pairs }));
}

function Pips({ card }: { card: PanelCard | undefined }) {
  if (!card) return null;
  return (
    <span className="flex flex-none items-center gap-[3px]" aria-hidden>
      <span className="flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-[color:var(--elevated)] px-[3px] font-mono text-[9px] text-[color:var(--fg)]">{card.cmc}</span>
      {inWubrgOrder(card.identity).map((c) => <span key={c} className="h-[10px] w-[10px] rounded-full" style={{ background: WUBRG_COLOR[c] }} />)}
    </span>
  );
}

/** One side of a swap: `−` or `+`, the owned dot (filled: a copy is yours), the name, then what it carries. */
function Side({ sign, name, owned, card, end }: { sign: "−" | "+"; name: string; owned: boolean | null; card: PanelCard | undefined; end: ReactNode }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-[8px] rounded-[8px] bg-[color:var(--surface-sunken)] px-[10px] py-[8px] text-[13px] text-[color:var(--fg)]">
      <span aria-hidden className={sign === "+" ? "text-[color:var(--accent-text)]" : "text-[color:var(--fg-faint)]"}>{sign}</span>
      {owned !== null && (
        <span aria-hidden className={"h-[8px] w-[8px] flex-none rounded-full " + (owned ? "bg-[color:var(--success)]" : "border border-dashed border-[color:var(--fg-faint)]")} />
      )}
      <span className="min-w-0 flex-1 truncate">{name}</span>
      <Pips card={card} />
      {end}
    </span>
  );
}

function Swap({ cutName, cutCard, addName, addCard, aside, reason }: {
  cutName: string; cutCard: PanelCard | undefined; addName: string; addCard: PanelCard | undefined; aside: [ReactNode, ReactNode]; reason: string | null;
}) {
  return (
    <li className="m-0 flex list-none flex-col gap-[6px] border-x-0 border-b border-t-0 border-solid border-b-[color:var(--border)] py-[10px] last:border-b-0">
      <span className="flex flex-col gap-[6px] md:flex-row md:items-center md:gap-[10px]">
        <Side sign="−" name={cutName} owned={cutCard ? cutCard.owned : null} card={cutCard} end={aside[0]} />
        <span aria-hidden className="hidden text-[color:var(--fg-faint)] md:block">→</span>
        <Side sign="+" name={addName} owned={addCard ? addCard.owned : null} card={addCard} end={aside[1]} />
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
      {run.refunded && <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-body)]">{copy.short(run.bracketTarget ?? run.bracketAfter ?? 0, run.pairs.length)}</p>}
      {changed && box && lead && (
        <section className="flex flex-col gap-[8px]">
          <h4 className="m-0 flex items-baseline gap-[8px] text-[14px] font-semibold text-[color:var(--fg)]">
            {copy.commanderGroup} <span className="font-mono text-[10.5px] font-normal text-[color:var(--fg-faint)]">{copy.commanderAside}</span>
          </h4>
          <ul className="m-0 flex list-none flex-col p-0">
            <Swap
              cutName={box.cards.map((c) => c.name).join(" + ")} cutCard={panel.cards[box.cards[0].oracleId]}
              addName={leadName} addCard={panel.cards[lead.cards[0].oracleId]}
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
              return (
                <Swap
                  key={p.position}
                  cutName={p.cut} cutCard={panel.cards[p.cutId]} addName={p.add} addCard={add} reason={p.reason}
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
