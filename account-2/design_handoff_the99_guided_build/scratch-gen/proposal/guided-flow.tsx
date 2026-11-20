"use client";

// Guided build R1 (proposal). The Upgrade flow's chrome (upgrade-flow.tsx: S1 sheet on a phone, 720 dialog at md, bare ✕, Cinzel
// title, bounded step tracker, foot with the press and its line), with the steps Strategy › Bracket › Cards. The step bodies copy
// pick-steps.tsx's markup with this flow's words; the wait copies wait-view.tsx; the result copies result-view.tsx's facts strip
// and the Overview's stages (synopsis-stages.tsx GamePlan). Static: every frame is a props snapshot.
import type { ReactNode } from "react";
import { guidedBuildCopy } from "../../../lib/copy/guided-build";
import { BRACKET_NAMES } from "../../../lib/copy/deck-analysis";
import { BracketMark, bracketInk } from "../bracket-mark";
import { StrategyIcon } from "../strategy-icon";
import type { StrategyKey } from "@/lib/strategy/score";
import { SheetGrabber } from "../../ui/sheet-grabber";
import { CreditsText } from "../../ui/credits-text";

const copy = guidedBuildCopy;
const ACCENT_PRESS = "h-[46px] cursor-pointer rounded-[8px] border-0 bg-[color:var(--accent)] px-[16px] font-sans text-[13px] font-semibold text-[color:var(--bg)] disabled:cursor-default disabled:bg-[color:var(--elevated)] disabled:text-[color:var(--fg-faint)] md:h-[40px]";
const GHOST_PRESS = "h-[46px] cursor-pointer rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[16px] font-sans text-[13px] font-semibold text-[color:var(--fg)] md:h-[40px]";
const OPTION = "flex w-full cursor-pointer gap-[12px] rounded-[10px] border border-solid p-[12px] text-left ";
const SRC = "font-mono text-[8.5px] uppercase tracking-[0.1em] text-[color:var(--accent-text)] md:text-[9px]";

export type Step = "strategy" | "bracket" | "cards";
export type Strategy = { key: string; label: string; count: number; blurb: string; examples: { name: string; img: string }[]; more: number };
export type Picks = { strategy: string | null; bracket: 2 | 3 | 4 | null; cards: "own" | "buy" | "budget" | null };
export type Stage =
  | { kind: "pick"; step: Step }
  | { kind: "wait"; clock: string; phase: "sharpen" | "plan" }
  | { kind: "failed" }
  | { kind: "result"; short?: number };

function Radio({ on, ink }: { on: boolean; ink?: string }) {
  return (
    <span aria-hidden className="mt-[2px] flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border border-solid border-[color:var(--border-strong)]" style={on ? { borderColor: ink ?? "var(--accent)" } : undefined}>
      {on && <span className="h-[10px] w-[10px] rounded-full" style={{ background: ink ?? "var(--accent)" }} />}
    </span>
  );
}

function Tracker({ cells, current }: { cells: { step: Step; pick: string | null }[]; current: Step | null }) {
  return (
    <ol className="m-0 flex flex-none list-none gap-[4px] rounded-[10px] bg-[color:var(--surface-sunken)] p-[4px]">
      {cells.map((cell, i) => {
        const here = cell.step === current;
        const done = !here && cell.pick !== null;
        return (
          <li key={cell.step} className="flex min-w-0 flex-1">
            <span className={"flex min-h-[44px] min-w-0 flex-1 items-center gap-[8px] rounded-[7px] px-[10px] py-[6px] text-left md:min-h-[40px] "
              + (here ? "border border-solid border-[color:var(--accent)] bg-[color:var(--elevated)] text-[color:var(--fg)]" : "border border-solid border-transparent text-[color:var(--fg-faint)]")}>
              <span aria-hidden className={"flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full font-mono text-[10px] "
                + (done ? "bg-[color:var(--accent)] text-[color:var(--bg)]" : here ? "border border-solid border-[color:var(--accent)] text-[color:var(--accent-text)]" : "border border-solid border-[color:var(--border-strong)]")}>
                {done ? "✓" : i + 1}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className={"font-mono text-[9.5px] uppercase tracking-[0.08em] " + (here ? "font-semibold text-[color:var(--fg)]" : "")}>{copy.flow.steps[cell.step]}</span>
                {done && <span className="block min-w-0 truncate text-[12px] text-[color:var(--fg)]">{cell.pick}</span>}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function StepHead({ q, sub, children }: { q: string; sub: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-[14px]">
      <div className="flex flex-col gap-[4px]">
        <p className="m-0 font-sans text-[16px] font-semibold text-[color:var(--fg)]">{q}</p>
        <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-muted)]">{sub}</p>
      </div>
      {children}
    </div>
  );
}

function StrategyBody({ commander, options, picked, fromAnswers }: { commander: string; options: Strategy[]; picked: string | null; fromAnswers?: boolean }) {
  return (
    <StepHead q={copy.strategy.q} sub={copy.strategy.sub(commander)}>
      <div role="radiogroup" className="grid gap-[10px] md:grid-cols-2">
        {options.map((s) => {
          const on = s.key === picked;
          return (
            <div key={s.key} role="radio" aria-checked={on} className={`${OPTION}flex-col ${on ? "border-[color:var(--accent)] bg-[color:color-mix(in_oklab,var(--accent)_10%,var(--surface))]" : "border-[color:var(--border)] bg-[color:var(--surface)]"}`}>
              <span className="flex items-start gap-[10px]">
                <span className="flex h-[32px] w-[32px] flex-none items-center justify-center rounded-full bg-[color:var(--elevated)] text-[color:var(--accent-text)]">
                  <StrategyIcon strategy={s.key as StrategyKey} size={18} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <span className="font-sans text-[14px] font-semibold text-[color:var(--fg)]">{s.label}</span>
                  <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{s.count} of your cards{on && fromAnswers ? <span className={`${SRC} ml-[8px]`}>{copy.source}</span> : null}</span>
                </span>
                <Radio on={on} />
              </span>
              <span className="text-[12.5px] leading-[1.5] text-[color:var(--fg-body)]">{s.blurb}</span>
              <span className="grid grid-cols-3 gap-[8px]">
                {s.examples.map((c) => (
                  <span key={c.name} className="flex min-w-0 flex-col items-center gap-[4px] text-center">
                    <img src={c.img} alt="" className="aspect-[5/7] w-full max-w-[64px] rounded-[4px] object-cover" />
                    <span className="w-full truncate text-[11px] text-[color:var(--fg-muted)]">{c.name}</span>
                  </span>
                ))}
              </span>
              <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">and {s.more} more</span>
            </div>
          );
        })}
      </div>
    </StepHead>
  );
}

function BracketBody({ picked, fromAnswers }: { picked: 2 | 3 | 4 | null; fromAnswers?: boolean }) {
  return (
    <StepHead q={copy.bracket.q} sub={copy.bracket.sub}>
      <div role="radiogroup" className="flex flex-col gap-[8px]">
        {([2, 3, 4] as const).map((b) => {
          const on = b === picked;
          const ink = bracketInk(b);
          return (
            <div key={b} role="radio" aria-checked={on} data-bracket={b}
              className={`grid min-h-[44px] gap-[7px] rounded-[8px] border border-solid px-[11px] py-[10px] text-left md:grid-cols-[186px_1fr] md:items-center md:gap-[14px] md:px-[12px] ${on ? "" : "border-[color:var(--border)]"}`}
              style={on ? { background: `color-mix(in oklab, ${ink} 12%, var(--surface))`, borderColor: ink } : undefined}>
              <span className="flex items-center gap-[8px] md:gap-[9px]">
                <span className="md:hidden"><BracketMark bracket={b} px={on ? 26 : 22} /></span>
                <span className="hidden md:inline-flex"><BracketMark bracket={b} px={on ? 36 : 26} /></span>
                <span className="flex flex-1 items-baseline gap-[8px] md:flex-none md:flex-col md:items-start md:gap-[2px]">
                  <span className={on ? "text-[13px] font-semibold text-[color:var(--fg)]" : "text-[12.5px] font-semibold text-[color:var(--fg-body)]"}>{BRACKET_NAMES[b]}</span>
                  {on && fromAnswers && <span className={`ml-auto md:ml-0 ${SRC}`}>{copy.source}</span>}
                </span>
                <span className="md:hidden"><Radio on={on} ink={ink} /></span>
              </span>
              <span className="flex items-start gap-[10px]">
                <span className="flex-1 text-[12.5px] leading-[1.5] text-[color:var(--fg-body)]">{copy.bracket.blurbs[b]}</span>
                <span className="hidden md:block"><Radio on={on} ink={ink} /></span>
              </span>
            </div>
          );
        })}
      </div>
    </StepHead>
  );
}

function CardsBody({ picked, budget, keeps, fromAnswers }: { picked: Picks["cards"]; budget?: number; keeps?: { name: string; img: string; line: string }[]; fromAnswers?: boolean }) {
  const rows = [
    { key: "own" as const, ...copy.cards.own },
    budget ? { key: "budget" as const, ...copy.cards.budget(budget) } : { key: "buy" as const, ...copy.cards.buy },
  ];
  return (
    <StepHead q={copy.cards.q} sub={copy.cards.sub}>
      <div role="radiogroup" className="flex flex-col gap-[8px]">
        {rows.map((r) => {
          const on = r.key === picked;
          return (
            <div key={r.key} role="radio" aria-checked={on} className={`${OPTION}${on ? "border-[color:var(--accent)] bg-[color:color-mix(in_oklab,var(--accent)_10%,var(--surface))]" : "border-[color:var(--border)] bg-[color:var(--surface)]"}`}>
              <span className="flex min-w-0 flex-1 flex-col gap-[4px]">
                <span className="flex items-baseline gap-[8px]">
                  <span className="font-sans text-[14px] font-semibold text-[color:var(--fg)]">{r.name}</span>
                  {on && fromAnswers && <span className={SRC}>{copy.source}</span>}
                </span>
                <span className="text-[12.5px] leading-[1.5] text-[color:var(--fg-body)]">{r.line}</span>
              </span>
              <Radio on={on} />
            </div>
          );
        })}
      </div>
      {keeps && keeps.length > 0 && (
        <div className="flex flex-col gap-[8px] rounded-[10px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-sunken)] p-[12px]">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">{copy.cards.keeps}</span>
          {keeps.map((k) => (
            <span key={k.name} className="flex items-center gap-[10px]">
              <img src={k.img} alt="" className="h-[42px] w-[30px] flex-none rounded-[3px] object-cover" />
              <span className="flex min-w-0 flex-col">
                <span className="text-[13px] font-semibold text-[color:var(--fg)]">{k.name}</span>
                <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{k.line}</span>
              </span>
            </span>
          ))}
          <span className="text-[12px] text-[color:var(--fg-muted)]">{copy.cards.keepsLine}</span>
        </div>
      )}
    </StepHead>
  );
}

function PicksLine({ parts }: { parts: string[] }) {
  return (
    <p className="m-0 font-mono text-[11px] text-[color:var(--fg-faint)]">
      {parts.map((p, i) => <span key={p}>{i > 0 ? " · " : ""}<b className="font-semibold text-[color:var(--fg-body)]">{p}</b></span>)}
    </p>
  );
}

function Wait({ parts, strategy, clock, phase }: { parts: string[]; strategy: string; clock: string; phase: "sharpen" | "plan" }) {
  const Row = ({ state, children }: { state: "done" | "now" | "next"; children: ReactNode }) => (
    <li className="flex items-center gap-[10px] text-[13px]">
      <span aria-hidden className={"flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full font-mono text-[10px] "
        + (state === "done" ? "bg-[color:var(--accent)] text-[color:var(--bg)]" : state === "now" ? "border border-solid border-[color:var(--accent)]" : "border border-solid border-[color:var(--border-strong)]")}>
        {state === "done" ? "✓" : state === "now" ? <span className="h-[6px] w-[6px] rounded-full bg-[color:var(--accent)]" /> : null}
      </span>
      <span className={state === "next" ? "text-[color:var(--fg-faint)]" : "text-[color:var(--fg-body)]"}>{children}</span>
    </li>
  );
  return (
    <div className="flex flex-col gap-[12px]" aria-busy="true">
      <PicksLine parts={parts} />
      <div role="status" className="ai-sweep flex flex-col gap-[8px] rounded-[10px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-sunken)] p-[12px_14px]">
        <p className="m-0 flex flex-wrap items-baseline gap-x-[10px] text-[13px] text-[color:var(--fg-body)]">
          <span className="font-mono text-[13px] font-semibold text-[color:var(--fg)]">{clock}</span>
          <span>{copy.wait.building(strategy)}</span>
          <span className="font-mono text-[12px] text-[color:var(--fg-muted)]">{copy.wait.usual}</span>
        </p>
        <p className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-body)]">{copy.wait.leave}</p>
        <span aria-hidden className="mt-[4px] block h-[2px] rounded-full bg-[color:var(--accent)]" style={{ width: phase === "plan" ? "78%" : "40%" }} />
      </div>
      <ol className="m-0 flex list-none flex-col gap-[10px] p-0 pl-[2px]">
        <Row state="done">{copy.wait.filled(99)}</Row>
        <Row state={phase === "sharpen" ? "now" : "done"}>Sharpening 12 to 18 cards toward {strategy}</Row>
        <Row state={phase === "plan" ? "now" : "next"}>Writing the plan</Row>
      </ol>
    </div>
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

export type Plan = { line: string; img: string; name: string }[];

function Result({ strategy, strategyLabel, bracket, sharpened, toBuy, plan, short }: {
  strategy: string; strategyLabel: string; bracket: 2 | 3 | 4; sharpened: number; toBuy: { n: number; dollars: string } | null; plan: Plan; short?: number;
}) {
  return (
    <div className="flex flex-col gap-[16px]">
      <div className="grid grid-cols-2 gap-[2px] rounded-[10px] bg-[color:var(--surface-sunken)] p-[3px] md:grid-cols-4">
        <Fact label={copy.result.facts.strategy}><span className="text-[color:var(--accent-text)]"><StrategyIcon strategy={strategy as StrategyKey} size={14} /></span>{strategyLabel}</Fact>
        <Fact label={copy.result.facts.bracket}>{bracket} <span className="font-mono text-[12px] font-normal text-[color:var(--fg-body)]">{BRACKET_NAMES[bracket]}</span></Fact>
        <Fact label={copy.result.facts.sharpened}>{sharpened} <span className="font-mono text-[12px] font-normal text-[color:var(--fg-body)]">cards</span></Fact>
        <Fact label={copy.result.facts.toBuy}>{toBuy ? <>{toBuy.n} <span className="font-mono text-[12px] font-normal text-[color:var(--fg-body)]">{toBuy.dollars}</span></> : "none"}</Fact>
      </div>
      {short !== undefined && <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-body)]">{copy.result.short(short, bracket)}</p>}
      <div className="flex flex-col gap-[10px] rounded-[12px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-raised)] p-[14px] md:p-[16px]">
        <div className="flex items-baseline gap-[10px]">
          <h3 className="m-0 font-display text-[16px] font-normal text-[color:var(--fg)]">{copy.result.plan}</h3>
          <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">the deck’s Overview</span>
        </div>
        <div className="relative mt-[4px] flex flex-col gap-[12px] md:grid md:grid-cols-3 md:gap-[16px] md:pt-[6px]">
          <span aria-hidden className="absolute bottom-[8px] left-[4.5px] top-[8px] w-px bg-[var(--fg-faint)] opacity-[0.55] md:hidden" />
          {plan.map((p, i) => {
            const last = i === plan.length - 1;
            return (
              <div key={i} className="relative pl-[22px] md:flex md:flex-col md:pl-0 md:pt-[23px]">
                <i aria-hidden className={`absolute left-0 top-[4px] block h-[10px] w-[10px] rotate-45 shadow-[0_0_0_4px_var(--surface-raised)] md:top-[1.5px] ${last ? "bg-[var(--accent)]" : "bg-[var(--fg-faint)]"}`} />
                <div className="relative grid min-w-0 flex-1 grid-cols-[52px_minmax(0,1fr)] gap-[12px] rounded-[10px] border border-[var(--border)] bg-[var(--surface-sunken)] px-[12px] py-[11px] md:flex md:flex-col md:gap-[10px] md:p-[12px]">
                  <img src={p.img} alt="" className="block h-[72px] w-[52px] flex-none rounded-[4.5%/3.2%] object-cover shadow-[0_3px_10px_rgba(0,0,0,0.5)] md:h-[100px] md:w-[72px]" />
                  <div className="min-w-0">
                    <div className="md:absolute md:left-[18px] md:right-[-14px] md:top-[-24px] md:flex md:items-center md:gap-[8px]">
                      <span className="mb-[5px] block font-mono text-[10px] font-medium uppercase leading-[13px] tracking-[0.14em] text-[var(--fg-body)] md:relative md:z-[1] md:mb-0 md:bg-[var(--surface-raised)] md:pr-[8px]">{copy.result.stages[i]}</span>
                      {last ? null : <span aria-hidden className="hidden h-px min-w-0 flex-1 bg-[var(--fg-faint)] opacity-[0.55] md:block" />}
                    </div>
                    <p className="m-0 text-[13px] leading-[1.55] text-[var(--fg-body)] [text-wrap:pretty]"><b className="font-semibold text-[color:var(--fg)]">{p.name}</b> {p.line}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function GuidedFlow({ deck, commander, stage, picks, strategies, lot, fromAnswers, budget, keeps, result, failedParts }: {
  deck: string; commander: string; stage: Stage; picks: Picks; strategies: Strategy[]; lot: string;
  fromAnswers?: boolean; budget?: number; keeps?: { name: string; img: string; line: string }[];
  result?: { sharpened: number; toBuy: { n: number; dollars: string } | null; plan: Plan };
  failedParts?: string[];
}) {
  const s = strategies.find((x) => x.key === picks.strategy) ?? null;
  const cardsPick = picks.cards === "own" ? copy.cards.own.name : picks.cards === "budget" && budget ? copy.cards.budget(budget).name : picks.cards === "buy" ? copy.cards.buy.name : null;
  const cells: { step: Step; pick: string | null }[] = [
    { step: "strategy", pick: s?.label ?? null },
    { step: "bracket", pick: picks.bracket ? `${picks.bracket} · ${BRACKET_NAMES[picks.bracket]}` : null },
    { step: "cards", pick: cardsPick },
  ];
  const parts = [s?.label ?? "", `bracket ${picks.bracket}`, (cardsPick ?? "").toLowerCase()];
  const step = stage.kind === "pick" ? stage.step : null;
  const next: Record<Step, string> = { strategy: `Next · ${copy.flow.steps.bracket}`, bracket: `Next · ${copy.flow.steps.cards}`, cards: copy.confirm.press(s?.label ?? "") };
  const chosen = step === "strategy" ? picks.strategy : step === "bracket" ? picks.bracket : picks.cards;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:px-[16px]">
      <div aria-hidden="true" className="absolute inset-0 bg-[rgba(16,13,10,0.74)]" />
      <div role="dialog" aria-modal="true" className="relative z-10 mx-auto flex h-[calc(100dvh-24px)] w-full flex-col gap-[14px] overflow-hidden rounded-[16px_16px_0_0] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)] p-[10px_18px_18px] md:h-auto md:max-h-[88dvh] md:max-w-[720px] md:rounded-[14px] md:p-[24px_24px_20px]">
        <SheetGrabber className="pt-0" />
        <div className="flex flex-none items-start justify-between gap-[12px]">
          <h2 className="m-0 min-w-0 flex-1 font-display text-[20px] font-normal text-[color:var(--fg)]">{stage.kind === "result" ? copy.result.title(deck) : copy.flow.title(deck)}</h2>
          <button type="button" aria-label="Close" className="-mr-[10px] -mt-[10px] flex h-[44px] w-[44px] flex-none items-center justify-center border-0 bg-transparent p-0 text-[15px] text-[color:var(--fg-muted)]">✕</button>
        </div>
        {stage.kind === "pick" && <Tracker cells={cells} current={step} />}
        {(stage.kind === "wait" || stage.kind === "failed") && <Tracker cells={cells} current={null} />}
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="-m-[6px] flex min-h-0 flex-1 flex-col gap-[16px] overflow-y-auto overflow-x-hidden p-[6px]">
            {step === "strategy" && <StrategyBody commander={commander} options={strategies} picked={picks.strategy} fromAnswers={fromAnswers} />}
            {step === "bracket" && <BracketBody picked={picks.bracket} fromAnswers={fromAnswers} />}
            {step === "cards" && <CardsBody picked={picks.cards} budget={budget} keeps={keeps} fromAnswers={fromAnswers} />}
            {stage.kind === "wait" && <Wait parts={parts} strategy={s?.label ?? ""} clock={stage.clock} phase={stage.phase} />}
            {stage.kind === "failed" && (
              <div className="flex flex-col gap-[10px]">
                <PicksLine parts={failedParts ?? parts} />
                <p role="alert" className="m-0 font-mono text-[11.5px] leading-[1.55]" style={{ color: "var(--danger)" }}>{copy.failed.line}</p>
                <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-body)]">{copy.failed.kept(deck)}</p>
              </div>
            )}
            {stage.kind === "result" && result && picks.bracket && s && (
              <Result strategy={s.key} strategyLabel={s.label} bracket={picks.bracket} sharpened={stage.short ?? result.sharpened} toBuy={result.toBuy} plan={result.plan} short={stage.short} />
            )}
          </div>
        </div>
        {stage.kind === "pick" && step && (
          <div className="flex flex-none flex-col gap-[8px] md:flex-row md:items-center md:justify-between md:gap-[16px]">
            <div className="flex gap-[8px] md:order-2 md:ml-auto md:flex-row-reverse">
              <button type="button" disabled={chosen === null} className={`${ACCENT_PRESS} flex-[2] md:flex-none`}>{next[step]}</button>
              <button type="button" className={`${GHOST_PRESS} flex-1 md:flex-none`}>Back</button>
            </div>
            {step === "cards" && <p className="m-0 font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-faint)] md:order-1 md:min-w-0 md:flex-1"><CreditsText text={copy.confirm.line(lot)} /></p>}
          </div>
        )}
        {stage.kind === "wait" && (
          <div className="flex flex-none flex-col gap-[8px] md:flex-row md:items-center md:justify-between md:gap-[16px]">
            <div className="flex gap-[8px] md:order-2 md:flex-row-reverse">
              <button type="button" disabled className={`${ACCENT_PRESS} flex-1 md:flex-none`}>{copy.confirm.press(s?.label ?? "")}</button>
            </div>
            <p className="m-0 font-mono text-[10.5px] text-[color:var(--fg-faint)] md:order-1 md:flex-1">{copy.wait.held}</p>
          </div>
        )}
        {stage.kind === "failed" && (
          <div className="flex flex-none flex-col gap-[8px] md:flex-row md:items-center md:justify-between md:gap-[16px]">
            <div className="flex gap-[8px] md:order-2 md:flex-row-reverse">
              <button type="button" className={`${ACCENT_PRESS} flex-[2] md:flex-none`}>{copy.failed.retry}</button>
              <button type="button" className={`${GHOST_PRESS} flex-1 md:flex-none`}>{copy.failed.open}</button>
            </div>
            <p className="m-0 font-mono text-[10.5px] text-[color:var(--fg-faint)] md:order-1 md:flex-1">{copy.failed.retryLine}</p>
          </div>
        )}
        {stage.kind === "result" && (
          <div className="flex flex-none md:justify-end">
            <button type="button" className={`${ACCENT_PRESS} flex-1 md:flex-none`}>{copy.result.open(deck)}</button>
          </div>
        )}
      </div>
    </div>
  );
}
