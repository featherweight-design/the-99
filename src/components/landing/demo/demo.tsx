"use client";
// Try it, the live dummy app (public landing, 5l): the stage replaces the start card in place, one press per step, Skip to the
// end at any step. The words sit left of the app on a desktop and above it on a phone with Back and Next below: ONE component
// at both widths, laid out by CSS alone. The app is the signed-in drawing halves fed by the committed fixture data and wrapped
// in the demo's inert providers; nothing typed or pressed here reaches any account. The end carries the real launch form.

import { useCallback, useState } from "react";

import { landingCopy } from "../../../lib/copy/landing";
import { DEMO_PLAYER } from "../../../lib/demo/player";
import type { Projected } from "../../../lib/demo/projected";
import { LaunchPanel } from "../launch-panel";
import { Lead, Section, rise } from "../section";
import { DemoProviders } from "./demo-providers";
import { StepBody } from "./demo-steps";

const c = landingCopy.demo;
const STEPS = c.steps.length;

type Phase = { kind: "start" } | { kind: "step"; index: number } | { kind: "end"; skippedFrom: number | null };

const BUTTON =
  "inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-[8px] border border-solid px-[16px] text-[13.5px] font-medium";
const PRIMARY = `${BUTTON} border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--bg)] hover:bg-[color:var(--accent-hover)]`;
const SECONDARY = `${BUTTON} border-[color:var(--border-strong)] bg-transparent text-[color:var(--fg-body)]`;
const CHIP = "inline-flex items-center rounded-[6px] border border-solid border-[color:var(--border-strong)] px-[7px] py-[2px] font-mono text-[10.5px] text-[color:var(--fg-muted)]";

export function Demo({ data }: { data: Projected }) {
  const [phase, setPhase] = useState<Phase>({ kind: "start" });
  const [opened, setOpened] = useState<string | null>(null);
  const openCard = useCallback((oracleId: string) => setOpened(oracleId), []);
  const go = (next: Phase) => {
    setOpened(null);
    setPhase(next);
  };

  if (phase.kind === "start") {
    return (
      <Section id="landing-demo" testId="demo" eyebrow={c.eyebrow} title={c.title(DEMO_PLAYER)} lead={<Lead>{c.lead(DEMO_PLAYER)}</Lead>}>
        <button type="button" data-testid="demo-start" onClick={() => go({ kind: "step", index: 0 })} className={`${PRIMARY} mt-[20px]`} style={rise(1)}>
          {c.start}
        </button>
      </Section>
    );
  }

  if (phase.kind === "end") {
    const skipped = phase.skippedFrom;
    return (
      <Section id="landing-demo" testId="demo" eyebrow={c.end.eyebrow} title={c.end.title(DEMO_PLAYER)} lead={<Lead>{c.end.lead}</Lead>}>
        {skipped !== null ? (
          <p className="m-0 mt-[14px] text-[14px] text-[color:var(--fg-muted)]" data-testid="demo-skipped">
            {c.end.skipped(skipped + 1, STEPS)}{" "}
            <button type="button" onClick={() => go({ kind: "step", index: skipped })} className="cursor-pointer border-0 bg-transparent p-0 text-[14px] text-[color:var(--accent-text)] underline">
              {c.end.goBack(skipped + 1)}
            </button>
          </p>
        ) : null}
        <div className="mt-[22px] max-w-[560px]">
          <h3 className="m-0 mb-[10px] font-display text-[18px] font-semibold text-[color:var(--fg)]">{c.end.form}</h3>
          <LaunchPanel />
        </div>
        <button type="button" onClick={() => go({ kind: "start" })} className={`${SECONDARY} mt-[22px]`}>
          {c.end.startOver}
        </button>
      </Section>
    );
  }

  const { index } = phase;
  const step = c.steps[index];
  const title = step.title(DEMO_PLAYER);
  const line = index === 0 ? step.line(DEMO_PLAYER, `${data.collection.totalCards.toLocaleString("en-US")} cards`) : step.line(DEMO_PLAYER, "");
  const last = index === STEPS - 1;
  return (
    <Section id="landing-demo" testId="demo" eyebrow={c.stepTitle(index + 1, title)} title={title}>
      <div className="mt-[18px] grid gap-[18px] md:grid-cols-[minmax(0,300px)_minmax(0,1fr)] md:gap-x-[36px] md:gap-y-[16px]">
        <div className="md:col-start-1 md:row-start-1">
          <p className="m-0 flex flex-wrap items-center gap-[8px] font-mono text-[11px] uppercase tracking-[0.12em] text-[color:var(--fg-muted)]">
            <span data-testid="demo-step">{c.step(index + 1, STEPS)}</span>
            <span className={CHIP}>{step.tag}</span>
          </p>
          <div aria-hidden className="mt-[10px] grid grid-cols-8 gap-[4px]">
            {c.steps.map((s, i) => (
              <span key={s.id} data-on={i <= index || undefined} className="h-[4px] rounded-full bg-[color:var(--border-strong)] data-[on]:bg-[color:var(--accent)]" />
            ))}
          </div>
          <p className="m-0 mt-[14px] text-pretty text-[15px] leading-[1.6] text-[color:var(--fg-body)]">{line}</p>
          <p className="m-0 mt-[8px] font-mono text-[11px] text-[color:var(--fg-faint)]">{step.press}</p>
        </div>
        <div className="min-w-0 md:col-start-2 md:row-span-2 md:row-start-1">
          <p className="m-0 mb-[8px] font-mono text-[10.5px] uppercase tracking-[0.12em] text-[color:var(--fg-faint)]">{c.stage(DEMO_PLAYER)}</p>
          <div data-testid="demo-app" className="overflow-hidden rounded-[12px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)] p-[10px] md:p-[16px]">
            <DemoProviders onOpenCard={openCard} openOracleId={opened}>
              <StepBody index={index} data={data} onOpenCard={openCard} />
            </DemoProviders>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-[10px] md:col-start-1 md:row-start-2">
          <button type="button" onClick={() => go(index === 0 ? { kind: "start" } : { kind: "step", index: index - 1 })} className={SECONDARY}>
            {c.back}
          </button>
          <button type="button" data-testid="demo-next" onClick={() => go(last ? { kind: "end", skippedFrom: null } : { kind: "step", index: index + 1 })} className={PRIMARY}>
            {last ? c.seeEnd : c.next}
          </button>
          {last ? null : (
            <button type="button" onClick={() => go({ kind: "end", skippedFrom: index })} className="cursor-pointer border-0 bg-transparent p-0 text-[13px] text-[color:var(--fg-muted)] underline">
              {c.skip}
            </button>
          )}
          <p className="m-0 basis-full text-[12.5px] text-[color:var(--fg-muted)]">{c.foot}</p>
        </div>
      </div>
    </Section>
  );
}
