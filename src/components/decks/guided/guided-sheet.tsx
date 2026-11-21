"use client";

// The guided build's picks sheet (handoff G1 to G5): Upgrade's chrome (a sheet on a phone, a 720 dialog from md), a tracker of Strategy,
// Bracket and Cards, and a confirm that starts the build. Nothing is pre-picked unless Help me choose carried an answer in, which says
// `from your answers` beside it. It holds picks only: the confirm hands them to `createDeck`, which re-checks every one.
import { useId, useRef, useState, type ReactNode } from "react";
import { useDialogA11y } from "../../../lib/a11y/dialog";
import { useInertWhileOpen } from "../../../lib/a11y/inert-page";
import { BRACKET_NAMES } from "../../../lib/copy/deck-analysis";
import { guidedBuildCopy } from "../../../lib/copy/guided-build";
import type { CarryIn } from "../../../lib/guided/carry-in";
import type { GuidedStrategy } from "../../../lib/guided/inputs";
import type { GuidedPicks } from "../../../lib/guided/run";
import { initialPicks, SHEET_STEPS, stepDone, toGuidedPicks, type SheetPicks, type SheetStep } from "../../../lib/guided/sheet";
import { BRACKET_TARGETS, type BracketTarget } from "../../../lib/precons/upgrade/targets";
import { CreditsText } from "../../ui/credits-text";
import { SheetGrabber } from "../../ui/sheet-grabber";
import { useVisualViewportFrame, VV_FRAME } from "../../ui/visual-viewport";
import { BracketMark, bracketInk } from "../bracket-mark";
import { StrategyIcon } from "../strategy-icon";
import type { StrategyKey } from "../../../lib/strategy/score";
import { ACCENT_PRESS, FOOT, FOOT_LINE, GHOST_PRESS } from "./guided-run-view";

const copy = guidedBuildCopy.sheet;
const OPTION = "flex w-full cursor-pointer gap-[12px] rounded-[10px] border border-solid p-[12px] text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] ";
const ON = "border-[color:var(--accent)] bg-[color:color-mix(in_oklab,var(--accent)_10%,var(--surface))]";
const OFF = "border-[color:var(--border)] bg-[color:var(--surface)]";

function Radio({ on }: { on: boolean }) {
  return (
    <span aria-hidden className="mt-[2px] flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border border-solid border-[color:var(--border-strong)]" style={on ? { borderColor: "var(--accent)" } : undefined}>
      {on && <span className="h-[10px] w-[10px] rounded-full" style={{ background: "var(--accent)" }} />}
    </span>
  );
}

function Step({ q, sub, children }: { q: string; sub: string; children: ReactNode }) {
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

/** `from your answers`, beside a pick Help me choose carried in. */
function Source() {
  return <span className="ml-[6px] font-mono text-[9.5px] uppercase tracking-[0.08em] text-[color:var(--fg-faint)]">{copy.source}</span>;
}

function Tracker({ picks, step, labels, onGo }: { picks: SheetPicks; step: SheetStep; labels: Record<SheetStep, string | null>; onGo: (s: SheetStep) => void }) {
  return (
    <ol className="m-0 flex flex-none list-none gap-[4px] rounded-[10px] bg-[color:var(--surface-sunken)] p-[4px]" aria-label={copy.steps.label}>
      {SHEET_STEPS.map((s, i) => {
        const here = s === step;
        const done = !here && stepDone(picks, s);
        const cls = "flex min-h-[44px] min-w-0 flex-1 items-center gap-[8px] rounded-[7px] px-[10px] py-[6px] text-left md:min-h-[40px] "
          + (here ? "border border-solid border-[color:var(--accent)] bg-[color:var(--elevated)] text-[color:var(--fg)]" : "border border-solid border-transparent text-[color:var(--fg-faint)]");
        const inner = (
          <>
            <span aria-hidden className={"flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full font-mono text-[10px] "
              + (done ? "bg-[color:var(--accent)] text-[color:var(--bg)]" : "border border-solid border-[color:var(--border-strong)]")}>{done ? "✓" : i + 1}</span>
            <span className="flex min-w-0 flex-col">
              <span className={"font-mono text-[9.5px] uppercase tracking-[0.08em] " + (here ? "font-semibold text-[color:var(--fg)]" : "")}>{copy.steps[s]}</span>
              {done && labels[s] && <span className="block min-w-0 truncate text-[12px] text-[color:var(--fg)]">{labels[s]}</span>}
            </span>
            {here && <span className="sr-only">{copy.choosing}</span>}
          </>
        );
        return (
          <li key={s} className="flex min-w-0 flex-1" aria-current={here ? "step" : undefined}>
            {done ? <button type="button" onClick={() => onGo(s)} className={`${cls} cursor-pointer bg-transparent`}>{inner}</button> : <span className={cls}>{inner}</span>}
          </li>
        );
      })}
    </ol>
  );
}

export function GuidedSheet({ commanderName, deckName, strategies, carry, extraKept, keeps, pending, onConfirm, onClose }: {
  /** The commander's short name, for the strategy line. */
  commanderName: string;
  deckName: string;
  strategies: GuidedStrategy[];
  /** Help me choose's answers as picks (H2 to H4); nothing when the deck did not come from it. */
  carry: CarryIn;
  /** The commander page's picks, kept beside any build-around card (the create places them; the sharpening never cuts them). */
  extraKept: readonly string[];
  /** What the Cards step lists under `It keeps`: the build-around card's line, and the picks' line. */
  keeps: readonly string[];
  /** The create is out. */
  pending: boolean;
  onConfirm: (picks: GuidedPicks) => void;
  onClose: () => void;
}) {
  const [picks, setPicks] = useState(() => {
    const p = initialPicks(carry);
    return { ...p, kept: [...new Set([...p.kept, ...extraKept])] };
  });
  const carried = { strategy: carry.strategyKey !== null && picks.strategyKey === carry.strategyKey, bracket: carry.bracket !== null && picks.bracket === carry.bracket, pool: carry.poolMode !== null && picks.poolMode === carry.poolMode };
  const [step, setStep] = useState<SheetStep>("strategy");
  const dialog = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  useDialogA11y(dialog, onClose, { initialFocusRef: closeRef });
  const inertRef = useInertWhileOpen(true);
  const visible = useVisualViewportFrame();
  const chosen = strategies.find((s) => s.key === picks.strategyKey) ?? null;
  const out = toGuidedPicks(picks);
  const labels: Record<SheetStep, string | null> = {
    strategy: chosen?.label ?? null,
    bracket: picks.bracket === null ? null : `${picks.bracket} · ${BRACKET_NAMES[picks.bracket]}`,
    cards: picks.poolMode === null ? null : picks.poolMode === "owned" ? copy.cards.own.name : picks.poolMode === "cap" ? copy.cards.buy.name : copy.cards.budget.name,
  };
  const set = (patch: Partial<SheetPicks>) => setPicks((p) => ({ ...p, ...patch }));
  const idx = SHEET_STEPS.indexOf(step);
  const last = step === "cards";
  const nextLabel = step === "strategy" ? copy.next.bracket : copy.next.cards;

  return (
    <div ref={inertRef} className={`fixed inset-0 ${VV_FRAME} z-50 flex flex-col justify-end md:justify-center md:px-[16px]`} style={visible}>
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-[rgba(16,13,10,0.74)]" />
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="relative z-10 mx-auto flex h-[calc(100dvh-24px)] w-full flex-col gap-[14px] overflow-hidden rounded-[16px_16px_0_0] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)] p-[10px_18px_18px] md:h-auto md:max-h-[88dvh] md:max-w-[720px] md:rounded-[14px] md:p-[24px_24px_20px]">
        <SheetGrabber className="pt-0" />
        <div className="flex flex-none items-start justify-between gap-[12px]">
          <h2 id={titleId} className="m-0 min-w-0 flex-1 font-display text-[20px] font-normal text-[color:var(--fg)]">{copy.title(deckName)}</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={copy.close} className="-mr-[10px] -mt-[10px] flex h-[44px] w-[44px] flex-none cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-[15px] text-[color:var(--fg-muted)]">{"✕"}</button>
        </div>
        <Tracker picks={picks} step={step} labels={labels} onGo={setStep} />
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="-m-[6px] flex min-h-0 flex-1 flex-col gap-[16px] overflow-y-auto overflow-x-hidden p-[6px]">
            {step === "strategy" && (
              <Step q={copy.strategy.q} sub={copy.strategy.sub(commanderName)}>
                <div role="radiogroup" aria-label={copy.strategy.q} className="grid gap-[10px] md:grid-cols-2">
                  {strategies.map((s) => {
                    const on = s.key === picks.strategyKey;
                    const shown = s.backing.slice(0, 3);
                    return (
                      <button key={s.key} type="button" role="radio" aria-checked={on} onClick={() => set({ strategyKey: s.key })} className={`${OPTION}flex-col ${on ? ON : OFF}`}>
                        <span className="flex items-start gap-[10px]">
                          <span className="flex h-[32px] w-[32px] flex-none items-center justify-center rounded-full bg-[color:var(--elevated)] text-[color:var(--accent-text)]"><StrategyIcon strategy={s.key as StrategyKey} size={18} /></span>
                          <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                            <span className="font-sans text-[14px] font-semibold text-[color:var(--fg)]">{s.label}{on && carried.strategy && <Source />}</span>
                            <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{copy.strategy.count(s.backing.length)}</span>
                          </span>
                          <Radio on={on} />
                        </span>
                        <span className="text-[12.5px] leading-[1.5] text-[color:var(--fg-body)]">{s.blurb}</span>
                        <span className="text-[11.5px] leading-[1.5] text-[color:var(--fg-muted)]">
                          {shown.map((c) => c.name).join(" · ")}{s.backing.length > shown.length ? ` · ${copy.strategy.more(s.backing.length - shown.length)}` : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Step>
            )}
            {step === "bracket" && (
              <Step q={copy.bracket.q} sub={copy.bracket.sub}>
                <div role="radiogroup" aria-label={copy.bracket.q} className="flex flex-col gap-[8px]">
                  {BRACKET_TARGETS.map((b: BracketTarget) => {
                    const on = b === picks.bracket;
                    const ink = bracketInk(b);
                    return (
                      <button key={b} type="button" role="radio" aria-checked={on} onClick={() => set({ bracket: b })} data-bracket={b} className={`${OPTION}items-start ${on ? "" : OFF}`}
                        // eslint-disable-next-line no-restricted-syntax -- background and border follow the picked rank's ink; genuinely dynamic
                        style={on ? { background: `color-mix(in oklab, ${ink} 12%, var(--surface))`, borderColor: ink } : undefined}>
                        <BracketMark bracket={b} px={on ? 26 : 22} />
                        <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                          <span className="text-[13px] font-semibold text-[color:var(--fg)]">{BRACKET_NAMES[b]}{on && carried.bracket && <Source />}</span>
                          <span className="text-[12.5px] leading-[1.5] text-[color:var(--fg-body)]">{copy.bracket.blurbs[b]}</span>
                        </span>
                        <Radio on={on} />
                      </button>
                    );
                  })}
                </div>
              </Step>
            )}
            {step === "cards" && (
              <Step q={copy.cards.q} sub={copy.cards.sub}>
                <div role="radiogroup" aria-label={copy.cards.q} className="flex flex-col gap-[8px]">
                  {([["owned", copy.cards.own], ["cap", copy.cards.buy], ["budget", copy.cards.budget]] as const).map(([mode, c]) => {
                    const on = picks.poolMode === mode;
                    return (
                      <button key={mode} type="button" role="radio" aria-checked={on} onClick={() => set({ poolMode: mode })} className={`${OPTION}items-start ${on ? ON : OFF}`}>
                        <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                          <span className="text-[13px] font-semibold text-[color:var(--fg)]">{c.name}{on && carried.pool && <Source />}</span>
                          <span className="text-[12.5px] leading-[1.5] text-[color:var(--fg-body)]">{c.line}</span>
                        </span>
                        <Radio on={on} />
                      </button>
                    );
                  })}
                </div>
                {picks.poolMode === "budget" && (
                  <label className="flex flex-col gap-[6px]">
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">{copy.cards.budgetLabel}</span>
                    <input
                      inputMode="numeric"
                      value={picks.budgetText}
                      onChange={(e) => set({ budgetText: e.target.value })}
                      aria-invalid={picks.budgetText !== "" && !stepDone(picks, "cards")}
                      aria-describedby="guided-budget-error"
                      className="h-[44px] w-full max-w-[200px] rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] px-[12px] font-mono text-[14px] text-[color:var(--fg)] md:h-[40px]"
                    />
                    <span id="guided-budget-error" role="status" className="font-mono text-[11px]" style={{ color: "var(--warning)" }}>
                      {picks.budgetText !== "" && !stepDone(picks, "cards") ? copy.cards.budgetError : ""}
                    </span>
                  </label>
                )}
                {keeps.length > 0 && (
                  <div className="flex flex-col gap-[4px] rounded-[10px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-sunken)] p-[12px]">
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">{copy.cards.keeps}</span>
                    <ul className="m-0 list-none p-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-body)]">
                      {keeps.map((k) => <li key={k}>{k}</li>)}
                    </ul>
                    <p className="m-0 text-[12px] text-[color:var(--fg-muted)]">{copy.cards.keepsLine}</p>
                  </div>
                )}
              </Step>
            )}
          </div>
        </div>
        <div className={FOOT}>
          <div className="flex gap-[8px] md:order-2 md:flex-row-reverse">
            {last ? (
              <button type="button" disabled={out === null || pending} aria-busy={pending || undefined} onClick={() => out && onConfirm(out)} className={`${ACCENT_PRESS} flex-[2] md:flex-none`}>
                {copy.confirm.press(chosen?.label ?? "")}
              </button>
            ) : (
              <button type="button" disabled={!stepDone(picks, step)} onClick={() => setStep(SHEET_STEPS[idx + 1])} className={`${ACCENT_PRESS} flex-[2] md:flex-none`}>{nextLabel}</button>
            )}
            {idx > 0 && <button type="button" onClick={() => setStep(SHEET_STEPS[idx - 1])} className={`${GHOST_PRESS} flex-1 md:flex-none`}>{copy.back}</button>}
          </div>
          <p className={FOOT_LINE}>{last ? <CreditsText text={copy.confirm.line} /> : null}</p>
        </div>
      </div>
    </div>
  );
}
